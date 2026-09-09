import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType, removeUndefinedFields } from '../lib/firestoreUtils';
import { Transaction, TransactionEvent } from '../types';
import { cardService } from './cardService';

const COLLECTION_NAME = 'transactions';

const createPublicId = () => String(Math.floor(100000000 + Math.random() * 900000000));
const createEventId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createTransactionEvent = (
  type: TransactionEvent['type'],
  title: string,
  description?: string,
): TransactionEvent => ({
  id: createEventId(),
  type,
  title,
  description,
  createdMs: Date.now(),
  createdAt: new Date().toISOString(),
});

export const getTransactionTimestamp = (t: Transaction): number => {
  if (t.createdAt) {
    if (typeof t.createdAt.toMillis === 'function') return t.createdAt.toMillis();
    if (typeof t.createdAt.toDate === 'function') return t.createdAt.toDate().getTime();
    if (typeof t.createdAt === 'number') return t.createdAt;
    if (typeof t.createdAt === 'string') {
      const ms = new Date(t.createdAt).getTime();
      if (!isNaN(ms)) return ms;
    }
    if (typeof t.createdAt.seconds === 'number') {
      return t.createdAt.seconds * 1000 + (t.createdAt.nanoseconds ? t.createdAt.nanoseconds / 1000000 : 0);
    }
  }
  if (t.createdMs && typeof t.createdMs === 'number') {
    return t.createdMs;
  }
  if (t.date) {
    const parts = t.date.split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0).getTime();
    }
    const ms = new Date(t.date).getTime();
    if (!isNaN(ms)) return ms;
  }
  return 0;
};

export const transactionService = {
  subscribeToTransactions: (callback: (transactions: Transaction[]) => void) => {
    if (!auth.currentUser) return () => {};

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', auth.currentUser.uid)
    );

    return onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Transaction[];

      transactions.sort((a, b) => {
        const msA = getTransactionTimestamp(a);
        const msB = getTransactionTimestamp(b);
        if (msB !== msA) {
          return msB - msA;
        }
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA);
      });

      callback(transactions);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    });
  },

  addTransaction: async (transaction: Omit<Transaction, 'id'>) => {
    if (!auth.currentUser) throw new Error('Usuário não autenticado');

    try {
      const events = transaction.transactionEvents?.length
        ? transaction.transactionEvents
        : [createTransactionEvent('created', 'Movimentação criada', 'Transação registrada no Numvra.')];
      const payload = removeUndefinedFields({
        ...transaction,
        publicId: transaction.publicId || createPublicId(),
        status: transaction.status || 'completed',
        userId: auth.currentUser.uid,
        createdMs: transaction.createdMs || Date.now(),
        transactionEvents: events,
        createdAt: serverTimestamp(),
      });
      const docRef = await addDoc(collection(db, COLLECTION_NAME), payload);

      if (transaction.isCardCharge && transaction.cardId && transaction.type === 'expense') {
        await cardService.adjustUsedLimit(transaction.cardId, Math.abs(transaction.amount));
      }

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  updateTransaction: async (id: string, transaction: Partial<Transaction>) => {
    try {
      const nextEvents = transaction.transactionEvents;
      const payload = removeUndefinedFields({
        ...transaction,
        ...(nextEvents ? { transactionEvents: nextEvents } : {}),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, COLLECTION_NAME, id), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  duplicateTransaction: async (transaction: Transaction) => {
    const { id, createdAt, updatedAt, publicId, transactionEvents, ...copy } = transaction;
    return transactionService.addTransaction({
      ...copy,
      publicId: createPublicId(),
      transactionEvents: [createTransactionEvent('duplicated', 'Movimentação duplicada', 'Nova movimentação criada a partir de outra existente.')],
    });
  },

  deleteTransaction: async (id: string, cardInfo?: { cardId?: string; amount?: number; isCardCharge?: boolean }) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      if (cardInfo?.isCardCharge && cardInfo.cardId && cardInfo.amount) {
        await cardService.adjustUsedLimit(cardInfo.cardId, -Math.abs(cardInfo.amount));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  }
};