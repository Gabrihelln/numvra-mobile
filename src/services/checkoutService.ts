import { Linking } from 'react-native';
import { ApiError, api } from './api';
import { auth } from '../config/firebase';
import { BillingPeriod, isBillingPeriod, normalizePlanId } from '../config/planCatalog';

export class CheckoutError extends Error {}

const isStripeUrl = (value: string) => {
  const match = /^https:\/\/([^/:?#]+)(?:[/:?#]|$)/i.exec(value.trim());
  const host = match?.[1]?.toLowerCase();
  return !!host && (host === 'stripe.com' || host.endsWith('.stripe.com'));
};

const openStripeUrl = async (url: string) => {
  if (!isStripeUrl(url)) {
    throw new CheckoutError('O servidor retornou uma URL do Stripe inválida.');
  }

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new CheckoutError('Não foi possível abrir o Stripe no navegador.');
  }

  await Linking.openURL(url);
};

export const checkoutService = {
  async startCheckout(planId: string, planName: string, billingPeriod: BillingPeriod) {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new CheckoutError('Faça login novamente para continuar.');
    if (!isBillingPeriod(billingPeriod)) throw new CheckoutError('Período de cobrança inválido.');

    let payload: { url?: string };
    try {
      payload = await api.post('/api/create-checkout-session', {
        planId: normalizePlanId(planId),
        billingPeriod,
      });
    } catch (error) {
      throw new CheckoutError(error instanceof ApiError ? error.message : 'Não foi possível iniciar o checkout.');
    }

    if (!payload.url) throw new CheckoutError('O servidor não retornou uma sessão de checkout.');
    await openStripeUrl(payload.url);
  },

  async openCustomerPortal() {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new CheckoutError('Faça login novamente para continuar.');

    let payload: { url?: string };
    try {
      payload = await api.post('/api/create-customer-portal-session', {});
    } catch (error) {
      throw new CheckoutError(error instanceof ApiError ? error.message : 'Não foi possível abrir o gerenciamento da assinatura.');
    }

    if (!payload.url) throw new CheckoutError('O servidor não retornou o portal da assinatura.');
    await openStripeUrl(payload.url);
  },
};

