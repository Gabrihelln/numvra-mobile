import { useState, useEffect } from 'react';
import { transactionService } from '../services/transactionService';
import { Transaction } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = transactionService.subscribeToTransactions((data) => {
      setTransactions(data);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  return {
    transactions,
    loading,
    addTransaction: transactionService.addTransaction,
    updateTransaction: transactionService.updateTransaction,
    deleteTransaction: transactionService.deleteTransaction,
  };
};
