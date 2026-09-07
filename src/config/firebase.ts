import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore - React Native specific persistence
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, Firestore } from 'firebase/firestore';
import Config from 'react-native-config';

const firebaseConfig = {
  apiKey: Config.FIREBASE_API_KEY || "AIzaSyBlwEGeh5rrTjc66U2-9aiiYU0BFUx50y0",
  authDomain: Config.FIREBASE_AUTH_DOMAIN || "numvra-main.firebaseapp.com",
  projectId: Config.FIREBASE_PROJECT_ID || "numvra-main",
  messagingSenderId: Config.FIREBASE_MESSAGING_SENDER_ID || "999637138962",
  appId: Config.FIREBASE_APP_ID || "1:999637138962:web:234cb1b5a215a5420ba2cb"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  auth = getAuth(app);
}

export const db: Firestore = getFirestore(app);
export { auth };
export default app;
