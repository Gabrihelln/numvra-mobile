import { useState, useEffect } from 'react';
import { goalService } from '../services/goalService';
import { Goal } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = goalService.subscribeToGoals((data) => {
      setGoals(data);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  return {
    goals,
    loading,
    addGoal: goalService.addGoal,
    updateGoal: goalService.updateGoal,
    addGoalFunds: goalService.addGoalFunds,
    withdrawGoalFunds: goalService.withdrawGoalFunds,
    deleteGoal: goalService.deleteGoal,
  };
};
