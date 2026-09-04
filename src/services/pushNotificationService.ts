import { PermissionsAndroid, Platform } from 'react-native';
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  hasPermission,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
  setAutoInitEnabled,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export type PushPermissionStatus = 'authorized' | 'denied' | 'notDetermined' | 'unavailable';

export interface PushPreference {
  enabled: boolean;
  permissionStatus: PushPermissionStatus;
  token?: string | null;
  updatedAt?: any;
}

export interface SystemNotification {
  id: string;
  title: string;
  text: string;
  type: 'bill' | 'goal' | 'login' | 'system';
  read: boolean;
  createdAt?: any;
  time?: string;
}

const PUSH_SETTINGS_COLLECTION = 'settings';
const PUSH_SETTINGS_DOC = 'push_notifications';
const PUSH_TOKENS_COLLECTION = 'push_tokens';
const SYSTEM_NOTIFICATIONS_COLLECTION = 'system_notifications';

const messagingInstance = getMessaging();

const isAuthorized = (status: number) =>
  status === AuthorizationStatus.AUTHORIZED ||
  status === AuthorizationStatus.PROVISIONAL ||
  status === AuthorizationStatus.EPHEMERAL;

const tokenToDocId = (token: string) => token.replace(/[^a-zA-Z0-9._-]/g, '_');

const getPlatformVersion = () => {
  if (Platform.OS !== 'android') return 0;
  return typeof Platform.Version === 'number' ? Platform.Version : Number.parseInt(String(Platform.Version), 10);
};

const getPushSettingsRef = (userId: string) =>
  doc(db, 'users', userId, PUSH_SETTINGS_COLLECTION, PUSH_SETTINGS_DOC);

const getPushTokenRef = (userId: string, token: string) =>
  doc(db, 'users', userId, PUSH_TOKENS_COLLECTION, tokenToDocId(token));

const getNotificationTimestamp = (notification: SystemNotification) => {
  const value = notification.createdAt;
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'string') return new Date(value).getTime();
  return 0;
};

const isNotificationForUser = (data: any, userId: string) => {
  if (data.enabled === false || data.active === false || data.isActive === false) return false;
  if (data.userId === userId || data.targetUserId === userId || data.targetUid === userId) return true;
  if (Array.isArray(data.userIds) && data.userIds.includes(userId)) return true;
  if (Array.isArray(data.recipientIds) && data.recipientIds.includes(userId)) return true;
  if (typeof data.audience === 'string') {
    return ['all', 'everyone', 'users', 'all_users'].includes(data.audience);
  }
  return !data.userId && !data.targetUserId && !data.targetUid && !data.userIds && !data.recipientIds;
};

export const pushNotificationService = {
  async getPermissionStatus(): Promise<PushPermissionStatus> {
    if (Platform.OS === 'android' && getPlatformVersion() >= 33) {
      const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (!granted) return 'notDetermined';
    }

    const status = await hasPermission(messagingInstance);
    if (isAuthorized(status)) return 'authorized';
    if (status === AuthorizationStatus.NOT_DETERMINED) return 'notDetermined';
    return 'denied';
  },

  async requestUserPermission(): Promise<PushPermissionStatus> {
    if (Platform.OS === 'android' && getPlatformVersion() >= 33) {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (result !== PermissionsAndroid.RESULTS.GRANTED) return 'denied';
    }

    const status = await requestPermission(messagingInstance);
    if (!isAuthorized(status)) return status === AuthorizationStatus.NOT_DETERMINED ? 'notDetermined' : 'denied';

    if (Platform.OS === 'ios') {
      await registerDeviceForRemoteMessages(messagingInstance);
    }

    return 'authorized';
  },

  async getPreference(userId: string): Promise<PushPreference> {
    const snapshot = await getDoc(getPushSettingsRef(userId));
    if (!snapshot.exists()) {
      return {
        enabled: false,
        permissionStatus: await this.getPermissionStatus(),
        token: null,
      };
    }

    const data = snapshot.data() as Partial<PushPreference>;
    return {
      enabled: !!data.enabled,
      permissionStatus: data.permissionStatus || (await this.getPermissionStatus()),
      token: data.token ?? null,
      updatedAt: data.updatedAt,
    };
  },

  async enable(userId: string): Promise<PushPreference> {
    const permissionStatus = await this.requestUserPermission();
    if (permissionStatus !== 'authorized') {
      await setDoc(
        getPushSettingsRef(userId),
        { enabled: false, permissionStatus, updatedAt: serverTimestamp() },
        { merge: true }
      );
      return { enabled: false, permissionStatus, token: null };
    }

    await setAutoInitEnabled(messagingInstance, true);
    const token = await getToken(messagingInstance);
    await this.saveToken(userId, token, true);

    const preference = {
      enabled: true,
      permissionStatus,
      token,
      updatedAt: serverTimestamp(),
    };
    await setDoc(getPushSettingsRef(userId), preference, { merge: true });
    return { enabled: true, permissionStatus, token };
  },

  async disable(userId: string): Promise<PushPreference> {
    let token: string | null = null;
    try {
      token = await getToken(messagingInstance);
      await this.saveToken(userId, token, false);
    } catch (err) {
      console.warn('Unable to read push token while disabling notifications:', err);
    }

    const permissionStatus = await this.getPermissionStatus();
    await setDoc(
      getPushSettingsRef(userId),
      { enabled: false, permissionStatus, token, updatedAt: serverTimestamp() },
      { merge: true }
    );

    return { enabled: false, permissionStatus, token };
  },

  async saveToken(userId: string, token: string, enabled: boolean) {
    const tokenRef = getPushTokenRef(userId, token);
    const existingToken = await getDoc(tokenRef);

    await setDoc(
      tokenRef,
      {
        token,
        enabled,
        platform: Platform.OS,
        updatedAt: serverTimestamp(),
        ...(existingToken.exists() ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true }
    );
  },

  listenToPreference(
    userId: string,
    callback: (preference: PushPreference) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    return onSnapshot(getPushSettingsRef(userId), async (snapshot) => {
      const permissionStatus = await this.getPermissionStatus();
      if (!snapshot.exists()) {
        callback({ enabled: false, permissionStatus, token: null });
        return;
      }

      const data = snapshot.data() as Partial<PushPreference>;
      callback({
        enabled: !!data.enabled,
        permissionStatus: data.permissionStatus || permissionStatus,
        token: data.token ?? null,
        updatedAt: data.updatedAt,
      });
    }, (error) => {
      console.error('Push preference listener error:', error);
      onError?.(error);
    });
  },

  listenToTokenRefresh(userId: string): Unsubscribe {
    return onTokenRefresh(messagingInstance, async (token) => {
      const preference = await this.getPreference(userId);
      if (!preference.enabled) return;
      await this.saveToken(userId, token, true);
      await setDoc(
        getPushSettingsRef(userId),
        { token, permissionStatus: 'authorized', updatedAt: serverTimestamp() },
        { merge: true }
      );
    });
  },

  listenToForegroundMessages(callback: (message: RemoteMessage) => void): Unsubscribe {
    return onMessage(messagingInstance, callback);
  },

  listenToNotificationOpens(callback: (message: RemoteMessage) => void): Unsubscribe {
    return onNotificationOpenedApp(messagingInstance, callback);
  },

  async getInitialNotification() {
    return getInitialNotification(messagingInstance);
  },

  listenToSystemNotifications(
    userId: string,
    callback: (notifications: SystemNotification[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    return onSnapshot(collection(db, SYSTEM_NOTIFICATIONS_COLLECTION), (snapshot) => {
      const notifications = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          if (!isNotificationForUser(data, userId)) return null;

          return {
            id: docSnap.id,
            title: data.title || data.name || 'Notificacao',
            text: data.text || data.body || data.message || '',
            type: data.type || 'system',
            read: !!data.read,
            createdAt: data.createdAt || data.sentAt || data.updatedAt,
            time: data.time,
          } as SystemNotification;
        })
        .filter(Boolean) as SystemNotification[];

      callback(notifications.sort((a, b) => getNotificationTimestamp(b) - getNotificationTimestamp(a)));
    }, (error) => {
      console.error('System notifications listener error:', error);
      onError?.(error);
    });
  },
};
