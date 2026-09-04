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
import { Subscription } from '../types';

const COLLECTION_NAME = 'subscriptions';

export const subscriptionService = {
  subscribeToSubscriptions: (callback: (subscriptions: Subscription[]) => void) => {
    if (!auth.currentUser) return () => {};

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', auth.currentUser.uid)
    );

    return onSnapshot(q, (snapshot) => {
      const subscriptions = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Subscription[];

      subscriptions.sort((a, b) => {
        const dateA = a.nextBilling || a.renewalDate || '';
        const dateB = b.nextBilling || b.renewalDate || '';
        return dateA.localeCompare(dateB);
      });

      callback(subscriptions);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    });
  },

  addSubscription: async (subscription: Omit<Subscription, 'id'>) => {
    if (!auth.currentUser) throw new Error('Usuário não autenticado');

    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        ...subscription,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  updateSubscription: async (id: string, subscription: Partial<Subscription>) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...subscription,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  deleteSubscription: async (id: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  }
};
