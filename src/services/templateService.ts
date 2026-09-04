import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SubscriptionTemplate } from '../types';

const COLLECTION_NAME = 'subscription_templates';

/** Read-only configuration source shared with the former Web application. */
export const templateService = {
  getTemplates: async (): Promise<SubscriptionTemplate[]> => {
    try {
      const snapshot = await getDocs(
        query(collection(db, COLLECTION_NAME), orderBy('name', 'asc')),
      );
      const templates = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })) as SubscriptionTemplate[];
      return templates.sort((a, b) => {
        const orderA = a.sortOrder ?? a.order ?? a.position;
        const orderB = b.sortOrder ?? b.order ?? b.position;
        if (typeof orderA === 'number' || typeof orderB === 'number') {
          return (typeof orderA === 'number' ? orderA : Number.MAX_SAFE_INTEGER)
            - (typeof orderB === 'number' ? orderB : Number.MAX_SAFE_INTEGER);
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('Error fetching subscription templates:', error);
      return [];
    }
  },
};
