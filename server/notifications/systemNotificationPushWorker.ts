import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb, adminMessaging } from './firebaseAdmin';
import type { PushTokenRecord } from './types';

const USERS_COLLECTION = 'users';
const PUSH_TOKENS_COLLECTION = 'push_tokens';
const SYSTEM_NOTIFICATIONS_COLLECTION = 'system_notifications';

const MANUAL_LOOKBACK_MINUTES = Number(process.env.MANUAL_NOTIFICATION_LOOKBACK_MINUTES || 1440);
const FCM_BATCH_SIZE = 500;

type ManualNotificationDoc = Record<string, any> & {
  id: string;
  title?: string;
  text?: string;
  body?: string;
  message?: string;
  userId?: string;
  targetUserId?: string;
  targetUid?: string;
  userIds?: string[];
  recipientIds?: string[];
  audience?: string;
  sendPush?: boolean;
  pushStatus?: string;
  pushSent?: boolean;
  source?: string;
};

export interface ManualPushResult {
  scannedNotifications: number;
  sentNotifications: number;
  skippedNotifications: number;
  pushSuccessCount: number;
  pushFailureCount: number;
  errors: string[];
}

const tokenToDocId = (token: string) => token.replace(/[^a-zA-Z0-9._-]/g, '_');

const getTimestampMs = (value: any) => {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  return 0;
};

const isGlobalAudience = (notification: ManualNotificationDoc) => {
  if (typeof notification.audience === 'string') {
    return ['all', 'everyone', 'users', 'all_users', 'global'].includes(notification.audience);
  }

  return !notification.userId &&
    !notification.targetUserId &&
    !notification.targetUid &&
    !notification.userIds &&
    !notification.recipientIds;
};

const shouldProcessManualNotification = (notification: ManualNotificationDoc, createTimeMs: number) => {
  if (notification.source === 'notification_scheduler') return false;
  if (notification.pushSent === true) return false;
  if (['sent', 'sent_with_errors', 'processing', 'ignored'].includes(notification.pushStatus || '')) return false;
  if (notification.enabled === false || notification.active === false || notification.isActive === false) return false;

  if (notification.pushStatus === 'pending' || notification.sendPush === true) return true;

  const createdAtMs = getTimestampMs(notification.createdAt) || createTimeMs;
  const ageMs = Date.now() - createdAtMs;
  return ageMs >= 0 && ageMs <= MANUAL_LOOKBACK_MINUTES * 60 * 1000;
};

const getAllUserIds = async () => {
  const users = await adminDb.collection(USERS_COLLECTION).get();
  return users.docs.map((doc) => doc.id);
};

const getRecipients = async (notification: ManualNotificationDoc) => {
  if (isGlobalAudience(notification)) return getAllUserIds();

  const ids = new Set<string>();
  [notification.userId, notification.targetUserId, notification.targetUid].forEach((id) => {
    if (typeof id === 'string' && id.length > 0) ids.add(id);
  });
  [notification.userIds, notification.recipientIds].forEach((items) => {
    if (Array.isArray(items)) {
      items.forEach((id) => {
        if (typeof id === 'string' && id.length > 0) ids.add(id);
      });
    }
  });
  return Array.from(ids);
};

const getEnabledTokensForUsers = async (userIds: string[]) => {
  const tokens: Array<PushTokenRecord & { userId: string }> = [];

  await Promise.all(userIds.map(async (userId) => {
    const preference = await adminDb
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection('settings')
      .doc('push_notifications')
      .get();

    if (preference.exists && preference.data()?.enabled !== true) return;

    const snapshot = await adminDb
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(PUSH_TOKENS_COLLECTION)
      .where('enabled', '==', true)
      .get();

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as PushTokenRecord;
      if (typeof data.token === 'string' && data.token.length > 0) tokens.push({ ...data, userId });
    });
  }));

  return tokens;
};

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
};

const sendPush = async (notification: ManualNotificationDoc, tokens: Array<PushTokenRecord & { userId: string }>) => {
  const title = notification.title || notification.name || 'Numvra';
  const body = notification.text || notification.body || notification.message || '';
  const uniqueTokens = Array.from(new Map(tokens.map((item) => [item.token, item])).values());

  let successCount = 0;
  let failureCount = 0;

  for (const group of chunk(uniqueTokens, FCM_BATCH_SIZE)) {
    const response = await adminMessaging.sendEachForMulticast({
      tokens: group.map((item) => item.token),
      notification: { title, body },
      data: {
        notificationId: notification.id,
        type: String(notification.type || notification.notificationType || 'system'),
        source: 'system_notifications',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
          icon: 'ic_stat_numvra',
          color: '#6C5CE7',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    await Promise.all(response.responses.map(async (result, index) => {
      if (result.success) return;
      const code = result.error?.code || '';
      if (!['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'].includes(code)) return;
      const token = group[index];
      await adminDb
        .collection(USERS_COLLECTION)
        .doc(token.userId)
        .collection(PUSH_TOKENS_COLLECTION)
        .doc(tokenToDocId(token.token))
        .set({ enabled: false, invalidatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }));
  }

  return { successCount, failureCount, tokenCount: uniqueTokens.length };
};

export class SystemNotificationPushWorker {
  async runOnce(): Promise<ManualPushResult> {
    const result: ManualPushResult = {
      scannedNotifications: 0,
      sentNotifications: 0,
      skippedNotifications: 0,
      pushSuccessCount: 0,
      pushFailureCount: 0,
      errors: [],
    };

    const scanLimit = Number(process.env.MANUAL_NOTIFICATION_SCAN_LIMIT || 100);
    const notificationRefs = new Map<string, any>();
    const baseCollection = adminDb.collection(SYSTEM_NOTIFICATIONS_COLLECTION);
    const snapshots = await Promise.all([
      baseCollection.where('pushStatus', '==', 'pending').limit(scanLimit).get(),
      baseCollection.where('sendPush', '==', true).limit(scanLimit).get(),
      baseCollection.limit(scanLimit).get(),
    ]);

    snapshots.forEach((snapshot) => {
      snapshot.docs.forEach((doc) => notificationRefs.set(doc.id, doc));
    });

    const docs = Array.from(notificationRefs.values());
    result.scannedNotifications = docs.length;

    for (const docSnap of docs) {
      const notification = { id: docSnap.id, ...docSnap.data() } as ManualNotificationDoc;
      const createTimeMs = docSnap.createTime?.toMillis() || 0;

      if (!shouldProcessManualNotification(notification, createTimeMs)) {
        result.skippedNotifications += 1;
        continue;
      }

      const docRef = adminDb.collection(SYSTEM_NOTIFICATIONS_COLLECTION).doc(docSnap.id);
      const reserved = await adminDb.runTransaction(async (transaction) => {
        const fresh = await transaction.get(docRef);
        const freshData = fresh.data() as ManualNotificationDoc | undefined;
        if (!freshData || freshData.pushSent === true || ['sent', 'sent_with_errors', 'processing'].includes(freshData.pushStatus || '')) {
          return false;
        }
        transaction.set(docRef, {
          pushStatus: 'processing',
          pushProcessingAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
      });

      if (!reserved) {
        result.skippedNotifications += 1;
        continue;
      }

      try {
        const recipients = await getRecipients(notification);
        const tokens = await getEnabledTokensForUsers(recipients);
        const pushResult = await sendPush(notification, tokens);

        result.sentNotifications += 1;
        result.pushSuccessCount += pushResult.successCount;
        result.pushFailureCount += pushResult.failureCount;

        await docRef.set({
          pushSent: true,
          pushStatus: pushResult.failureCount > 0 ? 'sent_with_errors' : 'sent',
          pushSentAt: FieldValue.serverTimestamp(),
          pushRecipientCount: recipients.length,
          pushTokenCount: pushResult.tokenCount,
          pushSuccessCount: pushResult.successCount,
          pushFailureCount: pushResult.failureCount,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`${docSnap.id}: ${message}`);
        result.pushFailureCount += 1;
        await docRef.set({
          pushStatus: 'failed',
          pushError: message,
          pushFailedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    if (result.sentNotifications > 0 || result.errors.length > 0) {
      console.log(
        `[manual-push] scanned=${result.scannedNotifications} sent=${result.sentNotifications} skipped=${result.skippedNotifications} push=${result.pushSuccessCount}/${result.pushFailureCount}`
      );
    }

    return result;
  }
}



