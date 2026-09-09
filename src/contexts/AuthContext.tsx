import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, query, collection, where } from 'firebase/firestore';
import { Alert } from 'react-native';
import { auth, db } from '../config/firebase';
import { authService } from '../services/authService';
import { UserProfile } from '../types';
import { getPlanRule, normalizePlanId, PlanId } from '../config/planCatalog';

export interface PlanLimitCheck {
  allowed: boolean;
  limitValue: number | boolean;
  reason: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  activePlan: PlanId;
  isPlanExpired: boolean;
  subscriptionsCount: number;
  goalsCount: number;
  cardsCount: number;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  checkLimit: (type: 'subscription' | 'goal' | 'budget' | 'upcomingBills' | 'card' | 'alert' | 'notification') => PlanLimitCheck;
  triggerUpgrade?: (feature: string, reason: string) => void;
  closeUpgradeModal?: () => void;
  upgradeModalState?: { isOpen: boolean; feature: string; reason: string } | null;
  homeIntroPlayed: boolean;
  markHomeIntroPlayed: () => void;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [subscriptionsCount, setSubscriptionsCount] = useState<number>(0);
  const [goalsCount, setGoalsCount] = useState<number>(0);
  const [cardsCount, setCardsCount] = useState<number>(0);
  const [upgradeModalState, setUpgradeModalState] = useState<{ isOpen: boolean; feature: string; reason: string } | null>(null);
  const [homeIntroPlayed, setHomeIntroPlayed] = useState(false);
  const lastAuthUserIdRef = useRef<string | null>(null);

  // Derive active plan taking expiration into account
  const activePlan: PlanId = (() => {
    if (!profile) return 'basic';
    const plan = normalizePlanId(profile.plan);

    if (plan !== 'basic' && profile.planActiveUntil) {
      try {
        const activeUntil = new Date(profile.planActiveUntil);
        if (activeUntil.getTime() < Date.now()) return 'basic';
      } catch (err) {
        console.warn('Error parsing planActiveUntil timestamp:', err);
      }
    }

    return plan;
  })();

  const isPlanExpired = !!(
    profile?.planActiveUntil && 
    profile?.plan !== 'basic' &&
    new Date(profile.planActiveUntil).getTime() < Date.now()
  );

  const checkLimit = (type: 'subscription' | 'goal' | 'budget' | 'upcomingBills' | 'card' | 'alert' | 'notification'): PlanLimitCheck => {
    const plan = getPlanRule(activePlan);
    const limits = plan.limits;

    if (type === 'subscription') {
      const limit = limits.subscriptions;
      if (limit === Infinity) return { allowed: true, limitValue: Infinity, reason: '' };
      return {
        allowed: subscriptionsCount < limit,
        limitValue: limit,
        reason: `Seu plano ${plan.displayName} permite até ${limit} assinaturas ou contas ativas. Faça upgrade para ampliar seus limites.`,
      };
    }

    if (type === 'goal') {
      const limit = limits.goals;
      if (limit === Infinity) return { allowed: true, limitValue: Infinity, reason: '' };
      return {
        allowed: goalsCount < limit,
        limitValue: limit,
        reason: `Seu plano ${plan.displayName} permite ${limit} meta financeira. Faça upgrade para criar metas ilimitadas.`,
      };
    }

    if (type === 'budget') {
      return limits.budgets
        ? { allowed: true, limitValue: true, reason: '' }
        : { allowed: false, limitValue: false, reason: 'Limites por categoria estão disponíveis nos planos Pro e Premium.' };
    }

    if (type === 'upcomingBills' || type === 'alert') {
      return limits.alerts
        ? { allowed: true, limitValue: true, reason: '' }
        : { allowed: false, limitValue: false, reason: 'Alertas de vencimento estão disponíveis nos planos Pro e Premium.' };
    }

    if (type === 'card') {
      return limits.cards
        ? { allowed: true, limitValue: true, reason: '' }
        : { allowed: false, limitValue: false, reason: 'Cartões estão disponíveis nos planos do Numvra.' };
    }

    if (type === 'notification') {
      return limits.notifications
        ? { allowed: true, limitValue: true, reason: '' }
        : { allowed: false, limitValue: false, reason: 'Notificações não estão disponíveis no seu plano.' };
    }

    return { allowed: true, limitValue: true, reason: '' };
  };
  const triggerUpgrade = (feature: string, reason: string) => {
    setUpgradeModalState({ isOpen: true, feature, reason });
    Alert.alert('Recurso indisponível no seu plano', reason);
  };

  const closeUpgradeModal = () => {
    setUpgradeModalState(null);
  };

  const markHomeIntroPlayed = useCallback(() => {
    setHomeIntroPlayed(true);
  }, []);

  const signIn = async (email: string, password: string) => {
    await authService.signInWithEmail(email, password);
  };

  const signInWithGoogle = async () => {
    await authService.signInWithGoogle();
  };

  const signInWithApple = async () => {
    await authService.signInWithApple();
  };

  const signUp = async (name: string, email: string, password: string) => {
    await authService.signUpWithEmail(name, email, password);
  };

  const signOut = async () => {
    setHomeIntroPlayed(false);
    await authService.signOutUser();
    setUser(null);
    setProfile(null);
  };

  const sendPasswordReset = async (email: string) => {
    await authService.sendPasswordReset(email);
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    let unsubscribeSubs: (() => void) | undefined;
    let unsubscribeGoals: (() => void) | undefined;
    let unsubscribeCards: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      const nextUserId = authUser?.uid || null;
      if (lastAuthUserIdRef.current !== nextUserId) {
        setHomeIntroPlayed(false);
        lastAuthUserIdRef.current = nextUserId;
      }

      setUser(authUser);
      // Navigation is derived from Firebase Auth. Profile data is loaded in
      // parallel and must not delay the transition after a successful sign-in.
      setLoading(false);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }
      if (unsubscribeSubs) {
        unsubscribeSubs();
        unsubscribeSubs = undefined;
      }
      if (unsubscribeGoals) {
        unsubscribeGoals();
        unsubscribeGoals = undefined;
      }
      if (unsubscribeCards) {
        unsubscribeCards();
        unsubscribeCards = undefined;
      }

      if (authUser) {
        const userRef = doc(db, 'users', authUser.uid);

        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            const initialProfile: UserProfile = {
              uid: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName,
              photoURL: authUser.photoURL,
              plan: 'basic',
              planBillingPeriod: null,
              planPrice: 0,
              planActiveUntil: null,
              planStatus: 'active',
              createdAt: serverTimestamp(),
            };
            await setDoc(userRef, initialProfile);
          }
        } catch (err) {
          console.error('Failed to get/create user profile [Mobile]:', err);
        }

        // Listen to profile updates in real time
        unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          }
        }, (err) => {
          console.error('Profile snapshot error [Mobile]:', err);
        });

        // Listen to subscriptions count
        const subQuery = query(collection(db, 'subscriptions'), where('userId', '==', authUser.uid));
        unsubscribeSubs = onSnapshot(subQuery, (snapshot) => {
          setSubscriptionsCount(snapshot.docs.filter((docSnap) => {
            const status = docSnap.data()?.status;
            return !status || status === 'active';
          }).length);
        });

        // Listen to goals count
        const goalQuery = query(collection(db, 'goals'), where('userId', '==', authUser.uid));
        unsubscribeGoals = onSnapshot(goalQuery, (snapshot) => {
          setGoalsCount(snapshot.size);
        });

        // Listen to cards count
        const cardQuery = query(collection(db, 'cards'), where('userId', '==', authUser.uid));
        unsubscribeCards = onSnapshot(cardQuery, (snapshot) => {
          setCardsCount(snapshot.size);
        });
      } else {
        setProfile(null);
        setSubscriptionsCount(0);
        setGoalsCount(0);
        setCardsCount(0);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeSubs) unsubscribeSubs();
      if (unsubscribeGoals) unsubscribeGoals();
      if (unsubscribeCards) unsubscribeCards();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        activePlan,
        isPlanExpired,
        subscriptionsCount,
        goalsCount,
        cardsCount,
        signIn,
        signInWithGoogle,
        signInWithApple,
        signUp,
        signOut,
        sendPasswordReset,
        checkLimit,
        triggerUpgrade,
        closeUpgradeModal,
        upgradeModalState,
        homeIntroPlayed,
        markHomeIntroPlayed,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

