import { ApiError, api } from './api';
import { auth } from '../config/firebase';
import { BillingPeriod, normalizePlanId } from '../config/planCatalog';

export type MobileSubscriptionSession = {
  subscriptionId: string;
  customerId: string;
  paymentIntentClientSecret: string;
  customerEphemeralKeySecret?: string;
  ephemeralKeySecret?: string;
  customerSessionClientSecret?: string;
  merchantDisplayName?: string;
  publishableKey?: string;
};

export class MobileSubscriptionError extends Error {
  constructor(message: string, public readonly status?: number) { super(message); this.name = 'MobileSubscriptionError'; }
}

const idempotencyKey = () => {
  const randomUUID = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID;
  if (randomUUID) return randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

export const mobileSubscriptionService = {
  async create(planId: string, billingPeriod: BillingPeriod) {
    const user = auth.currentUser;
    if (!user) throw new MobileSubscriptionError('Faça login novamente para continuar.', 401);
    try {
      const token = await user.getIdToken(true);
      return await api.post<MobileSubscriptionSession>('/api/create-mobile-subscription', {
        planId: normalizePlanId(planId), billingPeriod,
      }, true, { 'Idempotency-Key': idempotencyKey() }, token);
    } catch (error) {
      if (error instanceof ApiError) throw new MobileSubscriptionError(error.message, error.status);
      throw new MobileSubscriptionError('Não foi possível preparar o pagamento.');
    }
  },
};

