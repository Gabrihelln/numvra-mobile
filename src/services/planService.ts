import { SubscriptionPlan } from '../types';
import { getPlans, toSubscriptionPlan } from '../config/planCatalog';

export const planService = {
  getSubscriptionPlans: async (): Promise<SubscriptionPlan[]> => getPlans().map(toSubscriptionPlan),
};
