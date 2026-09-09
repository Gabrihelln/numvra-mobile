import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType, removeUndefinedFields } from '../lib/firestoreUtils';
import { Account } from '../types';

const COLLECTION_NAME = 'accounts';

export const accountService = {
  subscribeToAccounts: (callback: (accounts: Account[]) => void) => {
    if (!auth.currentUser) return () => {};

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', auth.currentUser.uid)
    );

    return onSnapshot(q, (snapshot) => {
      const accounts = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })) as Account[];

      accounts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      callback(accounts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    });
  },

  addAccount: async (account: Omit<Account, 'id'>) => {
    if (!auth.currentUser) throw new Error('Usuário não autenticado');

    try {
      const payload = removeUndefinedFields({
        ...account,
        userId: auth.currentUser.uid,
        source: account.source || 'manual',
        isManual: account.isManual !== false,
        isActive: account.isActive !== false,
        currency: account.currency || 'BRL',
        balance: account.balance ?? 0,
        createdAt: serverTimestamp(),
      });
      const docRef = await addDoc(collection(db, COLLECTION_NAME), payload);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  updateAccount: async (id: string, account: Partial<Account>) => {
    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), removeUndefinedFields({
        ...account,
        updatedAt: serverTimestamp(),
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  deleteAccount: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  },
};