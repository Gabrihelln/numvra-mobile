import { auth } from '../config/firebase';
import { OperationType, FirestoreErrorInfo } from '../types';

export { OperationType };
export type { FirestoreErrorInfo };

/**
 * Firestore rejects `undefined`. Optional fields are omitted while preserving
 * every other meaningful value, including false, 0, empty strings and null.
 */
export const removeUndefinedFields = <T extends object>(payload: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).filter(([, value]) => value !== undefined),
  ) as Partial<T>;

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuth = auth.currentUser;
  
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.uid || null,
      email: currentAuth?.email || null,
      emailVerified: currentAuth?.emailVerified || null,
      isAnonymous: currentAuth?.isAnonymous || null,
      tenantId: currentAuth?.tenantId || null,
      providerInfo: currentAuth?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };

  console.error('Firestore Error [Numvra Mobile]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
