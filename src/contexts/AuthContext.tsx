import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, query, collection, where } from 'firebase/firestore';
import { Alert } from 'react-native';
import { auth, db } from '../config/firebase';
import { authService } from '../services/authService';
import { UserProfile, PlanTier } from '../types';

export interface PlanLimitCheck {
  allowed: boolean;
  limitValue: number | boolean;
  reason: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  activePlan: 'basic' | 'pro' | 'premium';
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

  // Derive active plan taking expiration into account
  const activePlan: 'basic' | 'pro' | 'premium' = (() => {
    if (!profile) return 'basic';
    const plan = (profile.plan || 'basic') as PlanTier;
    if (plan === 'basic' || plan === 'free') return 'basic';

    if (profile.planActiveUntil) {
      try {
        const activeUntil = new Date(profile.planActiveUntil);
        if (activeUntil.getTime() < Date.now()) {
          return 'basic';
        }
      } catch (err) {
        console.warn('Error parsing planActiveUntil timestamp:', err);
      }
    }
    return (plan === 'premium' ? 'premium' : plan === 'pro' ? 'pro' : 'basic');
  })();

  const isPlanExpired = !!(
    profile?.planActiveUntil && 
    profile?.plan !== 'basic' &&
    new Date(profile.planActiveUntil).getTime() < Date.now()
  );

  const checkLimit = (type: 'subscription' | 'goal' | 'budget' | 'upcomingBills' | 'card' | 'alert' | 'notification'): PlanLimitCheck => {
    const plan = activePlan;

    if (type === 'subscription') {
      if (plan === 'basic') {
        return {
          allowed: subscriptionsCount < 3,
          limitValue: 3,
          reason: 'Seu plano Basic permite até 3 assinaturas ou contas ativas. Faça upgrade para o Pro para até 5 ou para o Premium para ilimitado.'
        };
      }
      if (plan === 'pro') {
        return {
          allowed: subscriptionsCount < 5,
          limitValue: 5,
          reason: 'Seu plano Pro permite até 5 assinaturas ou contas ativas. Faça upgrade para o Premium para ter assinaturas ilimitadas.'
        };
      }
      return { allowed: true, limitValue: Infinity, reason: '' };
    }

    if (type === 'goal') {
      if (plan === 'basic') {
        return {
          allowed: goalsCount < 1,
          limitValue: 1,
          reason: 'Seu plano Basic permite 1 meta de poupança. Faça upgrade para o Pro ou Premium para criar metas ilimitadas.'
        };
      }
      return { allowed: true, limitValue: Infinity, reason: '' };
    }

    if (type === 'budget') {
      if (plan !== 'premium') {
        return {
          allowed: false,
          limitValue: false,
          reason: 'Budgets por categoria são exclusivos do plano Premium.'
        };
      }
      return { allowed: true, limitValue: true, reason: '' };
    }

    if (type === 'upcomingBills') {
      if (plan === 'basic') {
        return {
          allowed: false,
          limitValue: false,
          reason: 'Alertas de vencimento estão disponíveis nos planos Pro e Premium.'
        };
      }
      return { allowed: true, limitValue: true, reason: '' };
    }

    if (type === 'card') {
      if (plan !== 'premium') {
        return {
          allowed: false,
          limitValue: false,
          reason: 'Cartões de crédito são exclusivos do plano Premium.'
        };
      }
      return { allowed: true, limitValue: true, reason: '' };
    }

    if (type === 'alert') {
      if (plan === 'basic') {
        return {
          allowed: false,
          limitValue: false,
          reason: 'Alertas de vencimento estão disponíveis nos planos Pro e Premium.'
        };
      }
      return { allowed: true, limitValue: true, reason: '' };
    }

    if (type === 'notification') {
      return { allowed: true, limitValue: true, reason: '' };
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
