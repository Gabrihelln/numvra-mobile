import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Goal, GoalHistoryItem } from '../types';

const COLLECTION_NAME = 'goals';

export const goalService = {
  subscribeToGoals: (callback: (goals: Goal[]) => void) => {
    if (!auth.currentUser) return () => {};

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', auth.currentUser.uid)
    );

    return onSnapshot(q, (snapshot) => {
      const goals = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Goal[];

      goals.sort((a, b) => {
        const getMillis = (val: any) => {
          if (!val) return 0;
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          if (typeof val.toMillis === 'function') return val.toMillis();
          if (val.seconds) return val.seconds * 1000;
          return new Date(val).getTime() || 0;
        };
        return getMillis(b.createdAt) - getMillis(a.createdAt);
      });

      callback(goals);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    });
  },

  addGoal: async (goal: Omit<Goal, 'id'>) => {
    if (!auth.currentUser) throw new Error('Usuário não autenticado');

    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        ...goal,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  updateGoal: async (id: string, goal: Partial<Goal>) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...goal,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  addGoalFunds: async (goalId: string, amount: number, description: string, currentGoal: Goal) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, goalId);
      const newHistoryItem: GoalHistoryItem = {
        id: Math.random().toString(36).substring(2, 11),
        type: 'deposit',
        amount,
        description,
        date: new Date().toISOString()
      };
      const existingHistory = currentGoal.history || [];
      await updateDoc(docRef, {
        currentAmount: (currentGoal.currentAmount || 0) + amount,
        history: [...existingHistory, newHistoryItem],
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${goalId}`);
    }
  },

  withdrawGoalFunds: async (goalId: string, amount: number, description: string, currentGoal: Goal) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, goalId);
      const newHistoryItem: GoalHistoryItem = {
        id: Math.random().toString(36).substring(2, 11),
        type: 'withdraw',
        amount,
        description,
        date: new Date().toISOString()
      };
      const existingHistory = currentGoal.history || [];
      await updateDoc(docRef, {
        currentAmount: Math.max(0, (currentGoal.currentAmount || 0) - amount),
        history: [...existingHistory, newHistoryItem],
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${goalId}`);
    }
  },

  deleteGoal: async (id: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  }
};
