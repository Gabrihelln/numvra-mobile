import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { SubscriptionPlan } from '../types';

const COLLECTION_NAME = 'subscription_plans';

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "Basic",
    description: "Recursos essenciais para o dia a dia",
    monthlyPrice: 0,
    semiannualPrice: 0,
    annualPrice: 0,
    features: [
      "Extrato ilimitado",
      "Até 3 assinaturas ou contas ativas",
      "1 meta de poupança"
    ]
  },
  {
    id: "pro",
    name: "Pro",
    description: "Recursos avançados e análise de dados",
    monthlyPrice: 9.90,
    semiannualPrice: 8.91,
    annualPrice: 7.92,
    features: [
      "Extrato ilimitado",
      "Até 5 assinaturas ou contas ativas",
      "Metas de poupança ilimitadas",
      "Alertas de vencimento ativos"
    ]
  },
  {
    id: "premium",
    name: "Premium",
    description: "A experiência financeira definitiva",
    monthlyPrice: 19.90,
    semiannualPrice: 17.91,
    annualPrice: 15.92,
    badge: "COMPLETO",
    features: [
      "Tudo do Pro",
      "Assinaturas e contas ativas ilimitadas",
      "Cartões de crédito ativos",
      "Budgets por categoria ilimitados",
      "Notificações ativas"
    ]
  }
];

export const planService = {
  getSubscriptionPlans: async (): Promise<SubscriptionPlan[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      if (querySnapshot.empty) return DEFAULT_PLANS;
      
      const plans = querySnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as SubscriptionPlan[];
      
      const order = ["basic", "pro", "premium"];
      return plans.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
      return DEFAULT_PLANS;
    }
  },
};
