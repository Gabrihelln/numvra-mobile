import { useState, useEffect } from 'react';
import { subscriptionService } from '../services/subscriptionService';
import { Subscription } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useSubscriptions = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscriptionService.subscribeToSubscriptions((data) => {
      setSubscriptions(data);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  return {
    subscriptions,
    loading,
    addSubscription: subscriptionService.addSubscription,
    updateSubscription: subscriptionService.updateSubscription,
    deleteSubscription: subscriptionService.deleteSubscription,
  };
};
