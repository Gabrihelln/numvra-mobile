import Config from 'react-native-config';

export const STRIPE_PUBLISHABLE_KEY = Config.STRIPE_PUBLISHABLE_KEY?.trim() || '';
export const resolveStripePublishableKey = (response?: Record<string, unknown>) => {
  const backendKey = [response?.publishableKey, response?.stripePublishableKey, response?.stripe_publishable_key].find((value): value is string => typeof value === 'string' && value.trim().startsWith('pk_'))?.trim();
  const localKey = STRIPE_PUBLISHABLE_KEY.startsWith('pk_') ? STRIPE_PUBLISHABLE_KEY : '';
  console.log('[Stripe] Publishable key source:', backendKey ? 'backend' : localKey ? 'local-config' : 'missing');
  return backendKey || localKey;
};
export const MOBILE_PAYMENT_SHEET_ENABLED = Config.ENABLE_MOBILE_PAYMENT_SHEET?.toLowerCase() !== 'false';
export const STRIPE_RETURN_URL = 'numvra://stripe-redirect';

