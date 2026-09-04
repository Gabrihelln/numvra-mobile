import { budgetService } from '../services/budgetService';
import { useCategories } from '../contexts/CategoryContext';

export const useBudgets = () => {
  const { categories, activeCategories, loading, error, reload } = useCategories();

  return {
    budgetCategories: categories,
    activeBudgetCategories: activeCategories,
    loading,
    error,
    reload,
    addBudgetCategory: budgetService.addBudgetCategory,
    updateBudgetCategory: budgetService.updateBudgetCategory,
    deleteBudgetCategory: budgetService.deleteBudgetCategory,
    seedDefaultCategories: budgetService.seedDefaultCategories,
  };
};
