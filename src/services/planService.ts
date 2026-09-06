import { SubscriptionPlan } from '../types';

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Recursos essenciais para o dia a dia',
    monthlyPrice: 0,
    semiannualPrice: 0,
    annualPrice: 0,
    features: [
      'Extrato ilimitado',
      'At\u00e9 3 assinaturas ou contas ativas',
      '1 meta de poupan\u00e7a',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Recursos avan\u00e7ados e an\u00e1lise de dados',
    monthlyPrice: 9.90,
    semiannualPrice: 8.91,
    annualPrice: 7.92,
    features: [
      'Extrato ilimitado',
      'At\u00e9 5 assinaturas ou contas ativas',
      'Metas de poupan\u00e7a ilimitadas',
      'Alertas de vencimento ativos',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'A experi\u00eancia financeira definitiva',
    monthlyPrice: 19.90,
    semiannualPrice: 17.91,
    annualPrice: 15.92,
    badge: 'COMPLETO',
    features: [
      'Tudo do Pro',
      'Assinaturas e contas ativas ilimitadas',
      'Cart\u00f5es de cr\u00e9dito ativos',
      'Budgets por categoria ilimitados',
      'Notifica\u00e7\u00f5es ativas',
    ],
  },
];

export const planService = {
  getSubscriptionPlans: async (): Promise<SubscriptionPlan[]> => DEFAULT_PLANS,
};
