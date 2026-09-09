import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Account } from '../types';
import { accountService } from '../services/accountService';

export const useAccounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = accountService.subscribeToAccounts((nextAccounts) => {
      setAccounts(nextAccounts);
      setLoading(false);
    }, (listenerError) => {
      setAccounts([]);
      setError(listenerError);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return {
    accounts,
    loading,
    error,
    addAccount: accountService.addAccount,
    updateAccount: accountService.updateAccount,
    deleteAccount: accountService.deleteAccount,
  };
};