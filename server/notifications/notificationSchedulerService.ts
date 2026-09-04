import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb, adminMessaging } from './firebaseAdmin';
import { SystemNotificationPushWorker } from './systemNotificationPushWorker';
import type { NotificationCandidate, PushTokenRecord, SchedulerConfig, SchedulerRunResult } from './types';

const USERS_COLLECTION = 'users';
const SETTINGS_COLLECTION = 'settings';
const PUSH_SETTINGS_DOC = 'push_notifications';
const PUSH_TOKENS_COLLECTION = 'push_tokens';
const SYSTEM_NOTIFICATIONS_COLLECTION = 'system_notifications';
const NOTIFICATION_EVENTS_COLLECTION = 'notification_events';
const SCHEDULER_LOGS_COLLECTION = 'notification_scheduler_logs';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CONFIG: SchedulerConfig = {
  intervalMs: Number(process.env.NOTIFICATION_SCHEDULER_INTERVAL_MS || 5 * 60 * 1000),
  lookaheadDays: Number(process.env.NOTIFICATION_LOOKAHEAD_DAYS || 3),
  budgetWarningThreshold: Number(process.env.BUDGET_WARNING_THRESHOLD || 0.8),
  dryRun: false,
};

type AnyDoc = Record<string, any> & { id: string };

const sanitizeEventKey = (key: string) => key.replace(/[^a-zA-Z0-9:._-]/g, '_');

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const toYmd = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const parseDateValue = (value: any, baseDate = new Date()): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return startOfDay(value);
  if (value instanceof Timestamp) return startOfDay(value.toDate());
  if (typeof value?.toDate === 'function') return startOfDay(value.toDate());
  if (typeof value?.seconds === 'number') return startOfDay(new Date(value.seconds * 1000));

  if (typeof value === 'number') return startOfDay(new Date(value));
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));

  const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (dmy) {
    const year = dmy[3] ? Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]) : baseDate.getFullYear();
    return new Date(year, Number(dmy[2]) - 1, Number(dmy[1]));
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
};

const dateFromMonthDay = (day: any, baseDate = new Date()) => {
  const numericDay = typeof day === 'number' ? day : Number.parseInt(String(day || ''), 10);
  if (!Number.isFinite(numericDay) || numericDay < 1 || numericDay > 31) return null;
  const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), Math.min(numericDay, lastDay));
};

const currency = (amount: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(amount) ? amount : 0);

const isActiveRecord = (item: AnyDoc) =>
  item.enabled !== false && item.active !== false && item.isActive !== false && item.status !== 'canceled' && item.status !== 'cancelled' && item.status !== 'paused';

const normalizeAmount = (amount: any) => Math.abs(Number(amount || 0));

const getUserIds = async () => {
  const users = await adminDb.collection(USERS_COLLECTION).get();
  return users.docs.map((doc) => doc.id);
};

const getPushState = async (userId: string) => {
  const preference = await adminDb
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(SETTINGS_COLLECTION)
    .doc(PUSH_SETTINGS_DOC)
    .get();

  const enabled = preference.exists && preference.data()?.enabled === true;
  const tokensSnapshot = await adminDb
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(PUSH_TOKENS_COLLECTION)
    .where('enabled', '==', true)
    .get();

  const tokens = tokensSnapshot.docs
    .map((doc) => ({ ...(doc.data() as PushTokenRecord), id: doc.id }))
    .filter((item) => typeof item.token === 'string' && item.token.length > 0);

  return { enabled, tokens };
};

const getByUser = async (collectionName: string, userId: string) => {
  const snapshot = await adminDb.collection(collectionName).where('userId', '==', userId).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as AnyDoc[];
};

const createDueCandidate = (
  item: AnyDoc,
  userId: string,
  dueDate: Date,
  today: Date,
  lookaheadDays: number,
  kind: 'subscription' | 'bill'
): NotificationCandidate | null => {
  const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / DAY_MS);
  const dueYmd = toYmd(dueDate);
  const label = item.name || item.cardName || item.title || 'Conta';
  const amount = typeof item.amount === 'number' ? ` de ${currency(item.amount)}` : '';

  if (diffDays < 0) {
    return {
      eventKey: `${kind}_overdue:${item.id}:${dueYmd}`,
      userId,
      type: kind === 'subscription' ? 'subscription_overdue' : 'bill_overdue',
      title: kind === 'subscription' ? 'Assinatura vencida' : 'Conta vencida',
      body: `${label}${amount} venceu em ${dueYmd}.`,
      targetCollection: kind === 'subscription' ? 'subscriptions' : 'cards',
      targetId: item.id,
      period: dueYmd,
      data: { dueDate: dueYmd, sourceType: kind },
    };
  }

  if (diffDays <= lookaheadDays) {
    return {
      eventKey: `${kind}_due:${item.id}:${dueYmd}`,
      userId,
      type: kind === 'subscription' ? 'subscription_due' : 'bill_due',
      title: kind === 'subscription' ? 'Assinatura vencendo' : 'Conta vencendo',
      body: diffDays === 0 ? `${label}${amount} vence hoje.` : `${label}${amount} vence em ${diffDays} dia(s).`,
      targetCollection: kind === 'subscription' ? 'subscriptions' : 'cards',
      targetId: item.id,
      period: dueYmd,
      data: { dueDate: dueYmd, daysUntilDue: diffDays, sourceType: kind },
    };
  }

  return null;
};

const collectSubscriptionEvents = async (userId: string, today: Date, config: SchedulerConfig) => {
  const subscriptions = await getByUser('subscriptions', userId);
  return subscriptions
    .filter(isActiveRecord)
    .map((item) => {
      const dueDate = parseDateValue(item.nextBilling || item.renewalDate, today);
      return dueDate ? createDueCandidate(item, userId, dueDate, today, config.lookaheadDays, 'subscription') : null;
    })
    .filter(Boolean) as NotificationCandidate[];
};

const collectCardBillEvents = async (userId: string, today: Date, config: SchedulerConfig) => {
  const cards = await getByUser('cards', userId);
  return cards
    .filter(isActiveRecord)
    .map((item) => {
      const dueDate = parseDateValue(item.dueDate, today) || dateFromMonthDay(item.dueDay, today);
      return dueDate ? createDueCandidate(item, userId, dueDate, today, config.lookaheadDays, 'bill') : null;
    })
    .filter(Boolean) as NotificationCandidate[];
};

const collectBudgetEvents = async (userId: string, today: Date, config: SchedulerConfig) => {
  const period = monthKey(today);
  const [budgets, transactions] = await Promise.all([getByUser('budgets', userId), getByUser('transactions', userId)]);
  const currentMonthTransactions = transactions.filter((transaction) => {
    const date = parseDateValue(transaction.date || transaction.createdAt, today);
    return date ? monthKey(date) === period : false;
  });

  const monthlyIncome = currentMonthTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0);

  const candidates: NotificationCandidate[] = [];

  budgets.filter(isActiveRecord).forEach((budget) => {
    const limit = Number(budget.limitAmount || 0) || (monthlyIncome * Number(budget.percentage || 0)) / 100;
    if (!Number.isFinite(limit) || limit <= 0) return;

    const spent = currentMonthTransactions
      .filter((transaction) => transaction.type === 'expense' && transaction.category === budget.name)
      .reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0);

    const ratio = spent / limit;
    if (ratio >= 1) {
      candidates.push({
        eventKey: `budget_threshold:${budget.id}:100:${period}`,
        userId,
        type: 'budget_exceeded',
        title: 'Orcamento acima do limite',
        body: `${budget.name} passou do limite mensal: ${currency(spent)} de ${currency(limit)}.`,
        targetCollection: 'budgets',
        targetId: budget.id,
        period,
        data: { period, threshold: 100, spent, limit },
      });
    } else if (ratio >= config.budgetWarningThreshold) {
      const threshold = Math.round(config.budgetWarningThreshold * 100);
      candidates.push({
        eventKey: `budget_threshold:${budget.id}:${threshold}:${period}`,
        userId,
        type: 'budget_threshold',
        title: 'Orcamento proximo do limite',
        body: `${budget.name} ja usou ${Math.round(ratio * 100)}% do limite mensal.`,
        targetCollection: 'budgets',
        targetId: budget.id,
        period,
        data: { period, threshold, spent, limit },
      });
    }
  });

  return candidates;
};

const collectGoalEvents = async (userId: string, today: Date) => {
  const goals = await getByUser('goals', userId);
  const candidates: NotificationCandidate[] = [];

  goals.filter(isActiveRecord).forEach((goal) => {
    const title = goal.title || goal.name || 'Meta';
    const target = Number(goal.targetAmount || 0);
    const current = Number(goal.currentAmount || 0);

    if (target > 0 && current >= target) {
      candidates.push({
        eventKey: `goal_reached:${goal.id}`,
        userId,
        type: 'goal_reached',
        title: 'Meta alcancada',
        body: `${title} atingiu o valor planejado.`,
        targetCollection: 'goals',
        targetId: goal.id,
        data: { currentAmount: current, targetAmount: target },
      });
      return;
    }

    const dueDate = parseDateValue(goal.estimatedDate || goal.dueDate, today);
    if (!dueDate) return;

    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / DAY_MS);
    const dueYmd = toYmd(dueDate);
    if (diffDays < 0) {
      candidates.push({
        eventKey: `goal_overdue:${goal.id}:${dueYmd}`,
        userId,
        type: 'goal_overdue',
        title: 'Meta vencida',
        body: `${title} passou da data estimada em ${dueYmd}.`,
        targetCollection: 'goals',
        targetId: goal.id,
        period: dueYmd,
        data: { dueDate: dueYmd },
      });
    } else if (diffDays === 0) {
      candidates.push({
        eventKey: `goal_due:${goal.id}:${dueYmd}`,
        userId,
        type: 'goal_due',
        title: 'Meta para hoje',
        body: `${title} tem data estimada para hoje.`,
        targetCollection: 'goals',
        targetId: goal.id,
        period: dueYmd,
        data: { dueDate: dueYmd },
      });
    }
  });

  return candidates;
};

const collectCandidatesForUser = async (userId: string, config: SchedulerConfig) => {
  const today = startOfDay(new Date());
  const groups = await Promise.all([
    collectSubscriptionEvents(userId, today, config),
    collectCardBillEvents(userId, today, config),
    collectBudgetEvents(userId, today, config),
    collectGoalEvents(userId, today),
  ]);
  return groups.flat();
};

const sendPush = async (candidate: NotificationCandidate, tokens: PushTokenRecord[], dryRun: boolean) => {
  if (tokens.length === 0 || dryRun) return { successCount: 0, failureCount: 0 };

  const tokenValues = Array.from(new Set(tokens.map((item) => item.token)));
  const response = await adminMessaging.sendEachForMulticast({
    tokens: tokenValues,
    notification: {
      title: candidate.title,
      body: candidate.body,
    },
    data: {
      eventKey: candidate.eventKey,
      type: candidate.type,
      targetCollection: candidate.targetCollection || '',
      targetId: candidate.targetId || '',
      period: candidate.period || '',
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

  await Promise.all(
    response.responses.map(async (result, index) => {
      if (result.success) return;
      const code = result.error?.code || '';
      if (!['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'].includes(code)) return;
      const token = tokenValues[index];
      const tokenDocId = token.replace(/[^a-zA-Z0-9._-]/g, '_');
      await adminDb.collection(USERS_COLLECTION).doc(candidate.userId).collection(PUSH_TOKENS_COLLECTION).doc(tokenDocId).set(
        { enabled: false, invalidatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    })
  );

  return { successCount: response.successCount, failureCount: response.failureCount };
};

const getInternalNotificationPayload = (candidate: NotificationCandidate) => ({
  eventKey: candidate.eventKey,
  userId: candidate.userId,
  title: candidate.title,
  text: candidate.body,
  body: candidate.body,
  message: candidate.body,
  type: candidate.type.startsWith('goal') ? 'goal' : candidate.type.startsWith('bill') || candidate.type.startsWith('subscription') ? 'bill' : 'system',
  notificationType: candidate.type,
  read: false,
  enabled: true,
  source: 'notification_scheduler',
  targetCollection: candidate.targetCollection || null,
  targetId: candidate.targetId || null,
  period: candidate.period || null,
  data: candidate.data || {},
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
});

const processCandidate = async (
  candidate: NotificationCandidate,
  tokens: PushTokenRecord[],
  config: SchedulerConfig,
  result: SchedulerRunResult
) => {
  const eventId = sanitizeEventKey(candidate.eventKey);
  const eventRef = adminDb.collection(NOTIFICATION_EVENTS_COLLECTION).doc(eventId);

  if (config.dryRun) {
    console.log(`[dry-run] ${candidate.eventKey} -> ${candidate.userId}: ${candidate.title}`);
    result.createdNotifications += 1;
    return;
  }

  const notificationRef = adminDb.collection(SYSTEM_NOTIFICATIONS_COLLECTION).doc(eventId);
  const created = await adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(eventRef);
    if (existing.exists) return false;

    transaction.set(eventRef, {
      eventKey: candidate.eventKey,
      userId: candidate.userId,
      type: candidate.type,
      targetCollection: candidate.targetCollection || null,
      targetId: candidate.targetId || null,
      period: candidate.period || null,
      status: 'created',
      notificationId: eventId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(notificationRef, getInternalNotificationPayload(candidate));
    return true;
  });

  if (!created) {
    result.skippedDuplicates += 1;
    return;
  }

  result.createdNotifications += 1;

  const pushResult = await sendPush(candidate, tokens, false);
  result.pushSuccessCount += pushResult.successCount;
  result.pushFailureCount += pushResult.failureCount;

  await eventRef.set(
    {
      status: pushResult.failureCount > 0 ? 'sent_with_errors' : 'sent',
      tokenCount: tokens.length,
      successCount: pushResult.successCount,
      failureCount: pushResult.failureCount,
      sentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};

export class NotificationSchedulerService {
  private config: SchedulerConfig;
  private manualPushWorker = new SystemNotificationPushWorker();

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async runOnce(): Promise<SchedulerRunResult> {
    const runId = `notification_scheduler:${new Date().toISOString()}`;
    const result: SchedulerRunResult = {
      runId,
      scannedUsers: 0,
      detectedEvents: 0,
      createdNotifications: 0,
      skippedDuplicates: 0,
      pushSuccessCount: 0,
      pushFailureCount: 0,
      errors: [],
    };

    const startedAt = Date.now();
    console.log(`[scheduler] starting run ${runId}`);

    try {
      if (!this.config.dryRun) {
        const manualPushResult = await this.manualPushWorker.runOnce();
        result.pushSuccessCount += manualPushResult.pushSuccessCount;
        result.pushFailureCount += manualPushResult.pushFailureCount;
        result.errors.push(...manualPushResult.errors.map((error) => `manual:${error}`));
      }

      const userIds = await getUserIds();
      result.scannedUsers = userIds.length;

      for (const userId of userIds) {
        try {
          const pushState = await getPushState(userId);
          const candidates = await collectCandidatesForUser(userId, this.config);
          result.detectedEvents += candidates.length;

          for (const candidate of candidates) {
            await processCandidate(candidate, pushState.enabled ? pushState.tokens : [], this.config, result);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          result.errors.push(`${userId}: ${message}`);
          console.error(`[scheduler] user ${userId} failed`, error);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(message);
      console.error('[scheduler] run failed', error);
    }

    const finishedAt = Date.now();
    console.log(
      `[scheduler] finished ${runId}: users=${result.scannedUsers} events=${result.detectedEvents} created=${result.createdNotifications} duplicates=${result.skippedDuplicates} push=${result.pushSuccessCount}/${result.pushFailureCount}`
    );

    if (!this.config.dryRun) {
      await adminDb.collection(SCHEDULER_LOGS_COLLECTION).doc(sanitizeEventKey(runId)).set({
        ...result,
        durationMs: finishedAt - startedAt,
        startedAt: Timestamp.fromMillis(startedAt),
        finishedAt: Timestamp.fromMillis(finishedAt),
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return result;
  }

  start() {
    let running = false;

    const tick = async () => {
      if (running) {
        console.warn('[scheduler] previous run still active, skipping tick');
        return;
      }
      running = true;
      try {
        await this.runOnce();
      } finally {
        running = false;
      }
    };

    void tick();
    return setInterval(tick, this.config.intervalMs);
  }
}



