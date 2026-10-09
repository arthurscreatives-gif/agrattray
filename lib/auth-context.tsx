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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isOwner: boolean;
  googleAccessToken: string | null;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<string | null>;
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
  signInWithGoogle: async () => null,
  connectGoogleSearchConsole: async () => null,
  signOut: async () => {},
  resetPassword: async () => {},
  quickAccessAsArthur: async () => {},
  authError: null,
  clearError: () => {},
});

const ARTHUR_DEFAULT_EMAIL = 'arthurscreatives@gmail.com';
const ARTHUR_DEFAULT_PASS = 'ArthurSEO#2026';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  useEffect(() => {
    testFirestoreConnection().catch((err) => console.warn('Firestore initial check:', err));

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        cachedGoogleAccessToken = null;
        setGoogleAccessToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => setAuthError(null);

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
      setAuthError(err.message || 'Google authorization failed.');
      throw err;
    }
  };

  const signInWithGoogle = async (): Promise<string | null> => {
    return connectGoogleSearchConsole();
  };

  const signIn = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign in. Please verify credentials.');
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
      setAuthError(err.message || 'Failed to create account.');
      throw err;
    }
  };

  const quickAccessAsArthur = async () => {
    setAuthError(null);
    try {
      // Attempt sign in with Arthur's default credentials
      await signInWithEmailAndPassword(auth, ARTHUR_DEFAULT_EMAIL, ARTHUR_DEFAULT_PASS);
    } catch (err: any) {
      // If user doesn't exist yet in the freshly provisioned Firebase project, create it automatically!
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const cred = await createUserWithEmailAndPassword(auth, ARTHUR_DEFAULT_EMAIL, ARTHUR_DEFAULT_PASS);
          if (cred.user) {
            await updateProfile(cred.user, { displayName: 'Arthur Rattray' });
          }
          return;
        } catch (createErr: any) {
          // If creation also fails because user actually exists with different pass, report clear message
          setAuthError('Could not auto-authenticate Arthur. Please enter your password.');
          throw createErr;
        }
      }
      setAuthError(err.message || 'Quick access failed');
      throw err;
    }
  };

  const signOut = async () => {
    setAuthError(null);
    await fbSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setAuthError(err.message || 'Password reset request failed.');
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
