import { Linking } from 'react-native';
import { ApiError, api } from './api';
import { auth } from '../config/firebase';

type BillingPeriod = 'monthly' | 'semiannual' | 'annual';

export class CheckoutError extends Error {}

const isStripeCheckoutUrl = (value: string) => {
  const match = /^https:\/\/([^/:?#]+)(?:[/:?#]|$)/i.exec(value.trim());
  const host = match?.[1]?.toLowerCase();
  return !!host && (host === 'stripe.com' || host.endsWith('.stripe.com'));
};

export const checkoutService = {
  async startCheckout(planId: string, planName: string, billingPeriod: BillingPeriod, price: number) {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new CheckoutError('Faça login novamente para continuar.');

    let payload: { url?: string };
    try {
      payload = await api.post('/api/create-checkout-session', {
        planId,
        planName,
        billingPeriod,
        price,
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
      });
    } catch (error) {
      throw new CheckoutError(error instanceof ApiError ? error.message : 'Não foi possível iniciar o checkout.');
    }

    if (!payload.url) throw new CheckoutError('O servidor não retornou uma sessão de checkout.');

    if (!isStripeCheckoutUrl(payload.url)) {
      throw new CheckoutError('O servidor retornou uma URL de checkout inválida.');
    }

    const canOpen = await Linking.canOpenURL(payload.url);
    if (!canOpen) {
      throw new CheckoutError('Não foi possível abrir o checkout no navegador.');
    }

    await Linking.openURL(payload.url);
  },
};
