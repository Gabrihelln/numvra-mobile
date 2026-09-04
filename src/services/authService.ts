import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  UserCredential,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import Config from 'react-native-config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

export const authService = {
  /**
   * Log in with email and password
   */
  signInWithEmail: async (email: string, password: string): Promise<UserCredential> => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      throw new Error('E-mail e senha são obrigatórios.');
    }
    return await signInWithEmailAndPassword(auth, cleanEmail, password);
  },

  /** Authenticate with the native Android Google Sign-In module and Firebase. */
  signInWithGoogle: async (): Promise<UserCredential> => {
    if (Platform.OS !== 'android') {
      throw new Error('O login com Google estÃ¡ disponÃ­vel apenas no Android.');
    }

    const webClientId = Config.GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) {
      throw new Error('Configure GOOGLE_WEB_CLIENT_ID para habilitar o login com Google.');
    }

    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    GoogleSignin.configure({ webClientId });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (response.type !== 'success') {
      throw new Error('Login com Google cancelado.');
    }
    if (!response.data.idToken) {
      throw new Error('O Google nÃ£o retornou um token de identificaÃ§Ã£o.');
    }

    return await signInWithCredential(
      auth,
      GoogleAuthProvider.credential(response.data.idToken)
    );
  },

  /** Authenticate with the native iOS Apple sheet and Firebase. */
  signInWithApple: async (): Promise<UserCredential> => {
    if (Platform.OS !== 'ios') {
      throw new Error('O login com Apple estÃ¡ disponÃ­vel apenas no iOS.');
    }

    const appleCredential = await appleAuth.performRequest({
      requestedScopes: [
        appleAuth.Scope.FULL_NAME,
        appleAuth.Scope.EMAIL,
      ],
      requestedOperation: appleAuth.Operation.LOGIN,
    });

    if (!appleCredential.identityToken) {
      throw new Error('A Apple nÃ£o retornou um token de identificaÃ§Ã£o.');
    }

    const provider = new OAuthProvider('apple.com');
    return await signInWithCredential(
      auth,
      provider.credential({
        idToken: appleCredential.identityToken,
        rawNonce: appleCredential.nonce,
      })
    );
  },

  /**
   * Register a new user with email, password, and display name
   */
  signUpWithEmail: async (name: string, email: string, password: string): Promise<UserCredential> => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      throw new Error('Nome é obrigatório.');
    }
    if (!cleanEmail || !password) {
      throw new Error('E-mail e senha são obrigatórios.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);

    try {
      await updateProfile(userCredential.user, {
        displayName: cleanName,
      });
    } catch (err) {
      console.warn('Failed to update Firebase Auth displayName:', err);
    }

    try {
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const initialProfile: UserProfile = {
        uid: userCredential.user.uid,
        email: cleanEmail,
        displayName: cleanName,
        photoURL: null,
        plan: 'basic',
        planBillingPeriod: null,
        planPrice: 0,
        planActiveUntil: null,
        planStatus: 'active',
        createdAt: serverTimestamp(),
      };
      await setDoc(userDocRef, initialProfile, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${userCredential.user.uid}`);
    }

    return userCredential;
  },

  /**
   * Send password reset email
   */
  sendPasswordReset: async (email: string): Promise<void> => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      throw new Error('Informe o e-mail para recuperação.');
    }
    await sendPasswordResetEmail(auth, cleanEmail);
  },

  /**
   * Sign out the current user
   */
  signOutUser: async (): Promise<void> => {
    await signOut(auth);
  },

  /**
   * Get user profile document from Firestore
   */
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      return null;
    }
  },

  /**
   * Update user profile document in Firestore
   */
  updateUserProfile: async (uid: string, profileData: Partial<UserProfile>): Promise<void> => {
    try {
      const docRef = doc(db, 'users', uid);
      await setDoc(docRef, { ...profileData, updatedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  },

  /**
   * Format Firebase authentication error codes into friendly user messages
   */
  formatAuthError: (error: any): string => {
    const code = error?.code || '';
    switch (code) {
      case 'auth/invalid-email':
        return 'O formato do e-mail é inválido.';
      case 'auth/user-disabled':
        return 'Esta conta foi desativada.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado em outra conta.';
      case 'auth/weak-password':
        return 'A senha deve ter pelo menos 6 caracteres.';
      case 'auth/network-request-failed':
        return 'Falha de conexão. Verifique sua internet.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas sem sucesso. Tente novamente mais tarde.';
      default:
        return error?.message || 'Ocorreu um erro na autenticação.';
    }
  },
};
