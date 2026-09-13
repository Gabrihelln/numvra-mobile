import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { BudgetCategory } from '../types';
import { budgetService } from '../services/budgetService';
import { useAuth } from './AuthContext';
import { mergeWithDefaultCategories } from '../constants/categories';

interface CategoryContextValue {
  categories: BudgetCategory[];
  activeCategories: BudgetCategory[];
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

const CategoryContext = createContext<CategoryContextValue | undefined>(undefined);
const isActive = (category: BudgetCategory) =>
  category.active !== false && category.isActive !== false && category.enabled !== false;

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    return budgetService.subscribeToBudgetCategories(
      (nextCategories) => { setCategories(nextCategories); setLoading(false); },
      (listenerError) => { setError(listenerError); setLoading(false); },
    );
  }, [user, reloadToken]);

  const value = useMemo<CategoryContextValue>(() => {
    const mergedCategories = user ? mergeWithDefaultCategories(categories) : [];
    return {
      categories: mergedCategories,
      activeCategories: mergedCategories.filter(isActive),
      loading,
      error,
      reload: () => setReloadToken((current) => current + 1),
    };
  }, [categories, error, loading, user]);

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (!context) throw new Error('useCategories must be used within CategoryProvider');
  return context;
};
