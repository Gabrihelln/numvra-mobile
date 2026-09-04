export type NotificationEventType =
  | 'bill_due'
  | 'bill_overdue'
  | 'subscription_due'
  | 'subscription_overdue'
  | 'budget_threshold'
  | 'budget_exceeded'
  | 'goal_reached'
  | 'goal_due'
  | 'goal_overdue';

export interface SchedulerConfig {
  intervalMs: number;
  lookaheadDays: number;
  budgetWarningThreshold: number;
  dryRun: boolean;
}

export interface PushTokenRecord {
  token: string;
  enabled?: boolean;
  platform?: string;
}

export interface NotificationCandidate {
  eventKey: string;
  userId: string;
  type: NotificationEventType;
  title: string;
  body: string;
  targetCollection?: string;
  targetId?: string;
  period?: string;
  data?: Record<string, string | number | boolean | null | undefined>;
}

export interface SchedulerRunResult {
  runId: string;
  scannedUsers: number;
  detectedEvents: number;
  createdNotifications: number;
  skippedDuplicates: number;
  pushSuccessCount: number;
  pushFailureCount: number;
  errors: string[];
}
