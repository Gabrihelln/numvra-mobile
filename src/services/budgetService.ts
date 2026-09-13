import { 
  collection, 
  addDoc, 
  setDoc,
  getDoc,
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType, removeUndefinedFields } from '../lib/firestoreUtils';
import { BudgetCategory } from '../types';
import { DEFAULT_BUDGET_CATEGORIES, getSharedCategoryByName } from '../constants/categories';

const COLLECTION_NAME = 'budgets';

export const budgetService = {
  subscribeToBudgetCategories: (
    callback: (categories: BudgetCategory[]) => void,
    onError?: (error: Error) => void,
  ) => {
    if (!auth.currentUser) return () => {};

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', auth.currentUser.uid)
    );

    return onSnapshot(q, async (snapshot) => {
      const categories = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id,
      })) as BudgetCategory[];

      categories.sort((a, b) => {
        const orderA = a.sortOrder ?? a.order ?? a.position;
        const orderB = b.sortOrder ?? b.order ?? b.position;
        if (typeof orderA === 'number' || typeof orderB === 'number') {
          return (typeof orderA === 'number' ? orderA : Number.MAX_SAFE_INTEGER)
            - (typeof orderB === 'number' ? orderB : Number.MAX_SAFE_INTEGER);
        }
        const getMillis = (val: any) => {
          if (!val) return 0;
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          if (typeof val.toMillis === 'function') return val.toMillis();
          if (val.seconds) return val.seconds * 1000;
          return new Date(val).getTime() || 0;
        };
        return getMillis(a.createdAt) - getMillis(b.createdAt);
      });

      callback(categories);
    }, (error) => {
      onError?.(error instanceof Error ? error : new Error('Não foi possível carregar as categorias.'));
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    });
  },

  addBudgetCategory: async (category: Omit<BudgetCategory, 'id'>) => {
    if (!auth.currentUser) throw new Error('Usuário não autenticado');

    try {
      await addDoc(collection(db, COLLECTION_NAME), removeUndefinedFields({
        ...category,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  updateBudgetCategory: async (id: string, category: Partial<BudgetCategory>) => {
    if (!auth.currentUser) throw new Error('Usuário não autenticado');
    try {
      if (id.startsWith('default-')) {
        const base = DEFAULT_BUDGET_CATEGORIES.find((item) => item.id === id);
        if (!base) throw new Error('Categoria não encontrada');
        const { id: defaultCategoryId, ...data } = base;
        await setDoc(doc(db, COLLECTION_NAME, `${auth.currentUser.uid}_${id}`), removeUndefinedFields({
          ...data, ...category, defaultCategoryId, userId: auth.currentUser.uid, updatedAt: serverTimestamp(),
        }), { merge: true });
        return;
      }
      const docRef = doc(db, COLLECTION_NAME, id);
      const previous = await getDoc(docRef);
      const previousData = previous.data();
      const original = getSharedCategoryByName(previousData?.name);
      await updateDoc(docRef, removeUndefinedFields({
        ...category,
        defaultCategoryId: previousData?.defaultCategoryId || (original ? 'default-' + original.id : undefined),
        updatedAt: serverTimestamp(),
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  deleteBudgetCategory: async (id: string) => {
    try {
      await budgetService.updateBudgetCategory(id, { deleted: true, active: false, isActive: false, enabled: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  },

  seedDefaultCategories: async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const defaults = DEFAULT_BUDGET_CATEGORIES;


    try {
      const q = query(collection(db, COLLECTION_NAME), where('userId', '==', uid));
      const s = await getDocs(q);
      if (!s.empty) return;

      for (const { id, ...item } of defaults) {
        await setDoc(doc(db, COLLECTION_NAME, `${uid}_${id}`), removeUndefinedFields({
          ...item,
          defaultCategoryId: id,
          userId: uid,
          createdAt: serverTimestamp()
        }));
      }
    } catch (err) {
      console.error("Failed to seed default budgets [Mobile]", err);
    }
  }
};
