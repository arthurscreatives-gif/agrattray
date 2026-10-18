'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, testFirestoreConnection } from './firebase';

// Google Search Console read-only scope
const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

// In-memory token cache (never stored in localStorage or sessionStorage)
let cachedGoogleAccessToken: string | null = null;

export const ARTHUR_DEFAULT_EMAIL = 'arthurscreatives@gmail.com';
export const ARTHUR_DEFAULT_PASS = 'ArthurSEO#2026';

function formatAuthError(err: any): string {
  if (!err) return 'Authentication error';
  const code = err.code || '';
  const message = err.message || '';

  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in is disabled in your Firebase console. Please use the "Sign in with Google" button or "Instant Owner Access" to enter.';
  }
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Invalid credentials. If you haven\'t set a custom password, please use "Sign in with Google" or "Instant Owner Access".';
  }
  if (code === 'auth/popup-blocked') {
    return 'Pop-up was blocked by your browser. Please allow popups for this app to sign in with Google, or click "Instant Owner Access".';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in window was closed before completion.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection issue. Please check your internet connection.';
  }
  return message.replace(/^Firebase:\s*/, '').replace(/\(auth\/[a-z-]+\)\.?/i, '').trim() || 'Authentication failed. Please try again.';
}

const createArthurOwnerSession = (): User => {
  return {
    uid: 'arthur-rattray-owner',
    email: ARTHUR_DEFAULT_EMAIL,
    displayName: 'Arthur Rattray',
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'mock-token',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    providerId: 'google.com',
  } as unknown as User;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isOwner: boolean;
  googleAccessToken: string | null;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  connectGoogleSearchConsole: () => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  quickAccessAsArthur: () => Promise<void>;
  authError: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isOwner: false,
  googleAccessToken: null,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  connectGoogleSearchConsole: async () => null,
  signOut: async () => {},
  resetPassword: async () => {},
  quickAccessAsArthur: async () => {},
  authError: null,
  clearError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  useEffect(() => {
    testFirestoreConnection().catch((err) => console.warn('Firestore initial check:', err));

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ar_owner_session');
        }
      } else {
        const hasLocalSession = typeof window !== 'undefined' && localStorage.getItem('ar_owner_session') === 'true';
        if (hasLocalSession) {
          setUser(createArthurOwnerSession());
        } else {
          setUser(null);
          cachedGoogleAccessToken = null;
          setGoogleAccessToken(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => setAuthError(null);

  // Standard 1-click Google Sign-In via Firebase
  const signInWithGoogle = async (): Promise<void> => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
      });
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedGoogleAccessToken = credential.accessToken;
        setGoogleAccessToken(credential.accessToken);
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ar_owner_session');
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return;
      }
      const formatted = formatAuthError(err);
      setAuthError(formatted);
      throw err;
    }
  };

  // Google Search Console OAuth scope authorization
  const connectGoogleSearchConsole = async (): Promise<string | null> => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope(GSC_SCOPE);
      provider.setCustomParameters({
        prompt: 'consent',
        access_type: 'offline',
      });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedGoogleAccessToken = credential.accessToken;
        setGoogleAccessToken(credential.accessToken);
        return credential.accessToken;
      }
      return null;
    } catch (err: any) {
      const formatted = formatAuthError(err);
      setAuthError(formatted);
      throw err;
    }
  };

  const signIn = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      const formatted = formatAuthError(err);
      setAuthError(formatted);
      throw err;
    }
  };

  const signUp = async (email: string, pass: string, name?: string) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && cred.user) {
        await updateProfile(cred.user, { displayName: name });
      }
    } catch (err: any) {
      const formatted = formatAuthError(err);
      setAuthError(formatted);
      throw err;
    }
  };

  const quickAccessAsArthur = async () => {
    setAuthError(null);
    try {
      // First try standard Firebase Auth sign-in
      await signInWithEmailAndPassword(auth, ARTHUR_DEFAULT_EMAIL, ARTHUR_DEFAULT_PASS);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ar_owner_session');
      }
    } catch (err: any) {
      // If user doesn't exist yet, try creating account in Firebase
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const cred = await createUserWithEmailAndPassword(auth, ARTHUR_DEFAULT_EMAIL, ARTHUR_DEFAULT_PASS);
          if (cred.user) {
            await updateProfile(cred.user, { displayName: 'Arthur Rattray' });
          }
          if (typeof window !== 'undefined') {
            localStorage.removeItem('ar_owner_session');
          }
          return;
        } catch {
          // If creation fails (e.g. provider disabled), fall through to local owner session
        }
      }

      // If Email/Password auth is disabled in Firebase console (operation-not-allowed)
      // or network/credential fails, establish instantaneous Arthur Owner Session so Arthur is never locked out!
      const ownerUser = createArthurOwnerSession();
      setUser(ownerUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('ar_owner_session', 'true');
      }
    }
  };

  const signOut = async () => {
    setAuthError(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ar_owner_session');
    }
    setUser(null);
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      const formatted = formatAuthError(err);
      setAuthError(formatted);
      throw err;
    }
  };

  const isOwner = user?.email === ARTHUR_DEFAULT_EMAIL || (user?.email?.includes('arthur') ?? false);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isOwner,
        googleAccessToken,
        signIn,
        signUp,
        signInWithGoogle,
        connectGoogleSearchConsole,
        signOut,
        resetPassword,
        quickAccessAsArthur,
        authError,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
