import 'dotenv/config';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const parseServiceAccount = (): ServiceAccount | undefined => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return undefined;

  const parsed = JSON.parse(raw) as ServiceAccount & { private_key?: string };
  return {
    ...parsed,
    privateKey: parsed.private_key?.replace(/\\n/g, '\n') || parsed.privateKey,
  };
};

export const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) return;

  const serviceAccount = parseServiceAccount();

  initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT,
  });
};

initializeFirebaseAdmin();

export const adminDb = getFirestore();
export const adminMessaging = getMessaging();
