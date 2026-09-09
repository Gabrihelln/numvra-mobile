import { SubscriptionPlan } from '../types';

export type PlanId = 'basic' | 'pro' | 'premium';
export type BillingPeriod = 'monthly' | 'semiannual' | 'annual';
export type PlanFeatureKey =
  | 'transactions'
  | 'subscriptions'
  | 'goals'
  | 'alerts'
  | 'cards'
  | 'budgets'
  | 'notifications'
  | 'reports';

export interface PlanRule {
  id: PlanId;
  name: string;
  displayName: string;
  description: string;
  order: number;
  prices: Record<BillingPeriod, number>;
  featureLabels: string[];
  limits: {
    subscriptions: number;
    goals: number;
    budgets: boolean;
    upcomingBills: boolean;
    cards: boolean;
    alerts: boolean;
    notifications: boolean;
    reports: 'basic' | 'advanced';
  };
  badge?: string;
}

export const BILLING_PERIODS: BillingPeriod[] = ['monthly', 'semiannual', 'annual'];

export const PLAN_CATALOG: Record<PlanId, PlanRule> = {
  basic: {
    id: 'basic',
    name: 'Gratis',
    displayName: 'Gratuito',
    description: 'O essencial para começar',
    order: 1,
    prices: { monthly: 0, semiannual: 0, annual: 0 },
    featureLabels: [
      'Até 50 transações/mês',
      'Até 3 assinaturas ou contas ativas',
      'Até 2 cartões cadastrados',
      'Relatórios básicos',
      '1 meta financeira',
    ],
    limits: {
      subscriptions: 3,
      goals: 1,
      budgets: false,
      upcomingBills: false,
      cards: true,
      alerts: false,
      notifications: true,
      reports: 'basic',
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    displayName: 'Pro',
    description: 'Mais controle para sua vida financeira',
    order: 2,
    prices: { monthly: 19.9, semiannual: 16.52, annual: 13.33 },
    featureLabels: [
      'Transações ilimitadas',
      'Controle completo de receitas e despesas',
      'Até 10 cartões',
      'Relatórios avançados',
      'Metas ilimitadas',
      'Limites por categoria',
      'Backup em nuvem',
    ],
    limits: {
      subscriptions: 10,
      goals: Infinity,
      budgets: true,
      upcomingBills: true,
      cards: true,
      alerts: true,
      notifications: true,
      reports: 'advanced',
    },
    badge: 'Mais popular',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    displayName: 'Premium',
    description: 'O máximo de inteligência e praticidade',
    order: 3,
    prices: { monthly: 34.9, semiannual: 28.97, annual: 23.38 },
    featureLabels: [
      'Tudo do plano Pro',
      'Cartões ilimitados',
      'Open Finance',
      'Insights com IA',
      'Planejamento inteligente',
      'Alertas personalizados',
      'Suporte prioritário',
    ],
    limits: {
      subscriptions: Infinity,
      goals: Infinity,
      budgets: true,
      upcomingBills: true,
      cards: true,
      alerts: true,
      notifications: true,
      reports: 'advanced',
    },
  },
};

export const normalizePlanId = (value?: string | null): PlanId => {
  if (value === 'premium') return 'premium';
  if (value === 'pro') return 'pro';
  return 'basic';
};

export const isBillingPeriod = (value: string): value is BillingPeriod =>
  BILLING_PERIODS.includes(value as BillingPeriod);

export const getPlanRule = (value?: string | null) => PLAN_CATALOG[normalizePlanId(value)];

export const getPlanPrice = (planId: PlanId, period: BillingPeriod) => PLAN_CATALOG[planId].prices[period];

export const getPlans = () =>
  Object.values(PLAN_CATALOG).sort((a, b) => a.order - b.order);

export const toSubscriptionPlan = (plan: PlanRule): SubscriptionPlan => ({
  id: plan.id,
  name: plan.name,
  displayName: plan.displayName,
  description: plan.description,
  monthlyPrice: plan.prices.monthly,
  semiannualPrice: plan.prices.semiannual,
  annualPrice: plan.prices.annual,
  features: plan.featureLabels,
  limits: plan.limits,
  badge: plan.badge,
});
