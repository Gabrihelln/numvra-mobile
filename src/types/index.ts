export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export type AccountSource = 'manual' | 'open_finance';
export type AccountKind = 'bank' | 'wallet' | 'cash' | 'investment';
export type BankAccountType = 'checking' | 'savings' | 'salary' | 'payment' | 'investment' | 'cash';
export type OpenFinanceStatus = 'not_connected' | 'pending' | 'active' | 'expired' | 'revoked' | 'error';

export interface Account {
  id: string;
  userId?: string;
  name: string;
  accountType: BankAccountType;
  accountKind: AccountKind;
  institutionId: string;
  institutionName: string;
  institutionIcon?: string;
  agency?: string;
  accountNumber?: string;
  balance: number;
  currency: 'BRL';
  source: AccountSource;
  openFinanceProviderId?: string;
  openFinanceConsentId?: string;
  openFinanceStatus?: OpenFinanceStatus;
  isManual: boolean;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface TransactionEvent {
  id: string;
  type: 'created' | 'updated' | 'processed' | 'confirmed' | 'cancelled' | 'duplicated';
  title: string;
  description?: string;
  notes?: string;
  createdAt?: any;
  createdMs?: number;
}

export interface Transaction {
  id: string;
  title?: string;
  description?: string;
  notes?: string;
  amount: number;
  date: string;
  category: string;
  categoryColor?: string;
  type: 'income' | 'expense';
  icon?: string;
  status?: string;
  publicId?: string;
  isCardCharge?: boolean;
  cardId?: string;
  cardName?: string;
  paymentMethod?: string;
  sourceType?: 'account' | 'card';
  sourceName?: string;
  installments?: number;
  currentInstallment?: number;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  parentTransactionId?: string;
  isRecurring?: boolean;
  recurrencePeriod?: 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  nextBilling?: string;
  userId?: string;
  createdMs?: number;
  createdAt?: any;
  updatedAt?: any;
  transactionEvents?: TransactionEvent[];
}

export interface CreditCardType {
  id: string;
  name: string;
  cardName?: string;
  brand: string;
  finalDigits: string;
  lastFourDigits?: string;
  colorClass?: string;
  color?: string;
  theme?: string;
  expiration?: string;
  bestDay?: string;
  closingDay?: number | string;
  dueDay?: number | string;
  dueDate?: string;
  totalLimit?: number;
  creditLimit?: number;
  usedLimit: number;
  lastPaidMonth?: string;
  userId?: string;
  isVirtual?: boolean;
  isBlocked?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  period?: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';
  billingCycle?: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  nextBilling?: string;
  renewalDate?: string;
  icon?: string;
  iconUrl?: string;
  color?: string;
  category?: string;
  status?: 'active' | 'canceled' | 'paused';
  reminderEnabled?: boolean;
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface GoalHistoryItem {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  description: string;
  date: string;
  category?: string;
}

export interface Goal {
  id: string;
  title: string;
  subtitle?: string;
  currentAmount: number;
  targetAmount: number;
  estimatedDate: string;
  icon?: string;
  history?: GoalHistoryItem[];
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface SubscriptionTemplate {
  id: string;
  name: string;
  iconUrl?: string;
  icon?: string;
  defaultAmount?: number;
  category?: string;
  color?: string;
  type?: string;
  active?: boolean;
  isActive?: boolean;
  enabled?: boolean;
  order?: number;
  sortOrder?: number;
  position?: number;
  featured?: boolean;
  isFeatured?: boolean;
  popular?: boolean;
  priority?: number;
  searchTerms?: string[];
}

export interface BudgetCategory {
  id: string;
  name: string;
  percentage?: number;
  limitAmount?: number;
  icon?: string;
  color?: string;
  backgroundColor?: string;
  description?: string;
  aliases?: string[];
  type?: 'income' | 'expense';
  active?: boolean;
  isActive?: boolean;
  enabled?: boolean;
  order?: number;
  sortOrder?: number;
  position?: number;
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type PlanTier = 'basic' | 'pro' | 'premium' | 'free';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  plan?: PlanTier;
  planBillingPeriod?: 'monthly' | 'semiannual' | 'annual' | null;
  planPrice?: number;
  planActiveUntil?: string | null;
  planStatus?: 'active' | 'canceled' | 'past_due' | 'trialing';
  createdAt?: any;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  semiannualPrice: number;
  annualPrice: number;
  features: string[];
  badge?: string;
}
