import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { CreditCardType } from '../types';

type CardWriteData = Partial<CreditCardType> & {
  expirationDate?: string;
  limit?: number;
  isMonthPaid?: boolean;
};

const COLLECTION_NAME = 'cards';

const normalizeCardWriteData = (card: CardWriteData): CardWriteData => {
  const expiration = card.expiration || card.expirationDate || '12/28';
  const totalLimit = card.totalLimit ?? card.creditLimit ?? card.limit ?? 0;

  return {
    ...card,
    expiration,
    expirationDate: card.expirationDate || expiration,
    totalLimit,
  };
};

export const cardService = {
  subscribeToCards: (callback: (cards: CreditCardType[]) => void) => {
    if (!auth.currentUser) return () => {};

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', auth.currentUser.uid)
    );

    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback([]);
        return;
      }

      const cards = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as CreditCardType[];

      cards.sort((a, b) => (a.name || a.cardName || '').localeCompare(b.name || b.cardName || ''));
      callback(cards);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    });
  },

  getCards: async (): Promise<CreditCardType[]> => {
    if (!auth.currentUser) return [];

    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const cards = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as CreditCardType[];
      cards.sort((a, b) => (a.name || a.cardName || '').localeCompare(b.name || b.cardName || ''));
      return cards;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      return [];
    }
  },

  addCard: async (card: Omit<CreditCardType, 'id'> & CardWriteData) => {
    if (!auth.currentUser) throw new Error('Usuário não autenticado');

    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...normalizeCardWriteData(card),
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  updateCard: async (id: string, card: Partial<CreditCardType> & CardWriteData) => {
    if (!auth.currentUser) throw new Error('Usuário não autenticado');

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists() || docSnap.data().userId !== auth.currentUser.uid) {
        throw new Error('Cartão não encontrado.');
      }

      await updateDoc(docRef, {
        ...normalizeCardWriteData({ ...docSnap.data(), ...card }),
        userId: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  adjustUsedLimit: async (id: string, amountOffset: number) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentLimit = docSnap.data().usedLimit || 0;
        const newUsedLimit = Math.max(0, Number((currentLimit + amountOffset).toFixed(2)));
        await updateDoc(docRef, {
          ...normalizeCardWriteData(docSnap.data()),
          usedLimit: newUsedLimit,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  deleteCard: async (id: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  }
};
