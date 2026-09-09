import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Account } from '../types';
import { accountService } from '../services/accountService';

export const useAccounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = accountService.subscribeToAccounts((nextAccounts) => {
      setAccounts(nextAccounts);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return {
    accounts,
    loading,
    addAccount: accountService.addAccount,
    updateAccount: accountService.updateAccount,
    deleteAccount: accountService.deleteAccount,
  };
};