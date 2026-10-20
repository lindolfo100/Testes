import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db, getOrCreateDeviceUid } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  effectiveUid: string;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  effectiveUid: getOrCreateDeviceUid(),
  loading: true,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
});

let anonymousSignInAttempted = false;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser && !anonymousSignInAttempted) {
        anonymousSignInAttempted = true;
        try {
          await signInAnonymously(auth);
          return; // onAuthStateChanged will fire again with the anonymous user
        } catch {
          // Anonymous Auth is optional in Firebase Console; fall back to device UID silently
        }
      }

      setUser(currentUser);

      // Sync teacher profile document only for non-anonymous (Google) accounts
      if (currentUser && !currentUser.isAnonymous) {
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Professor(a)',
              photoURL: currentUser.photoURL || '',
              createdAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('Failed to sync user document to firestore:', error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Google Sign In Error:', err);
      throw err;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign Out Error:', err);
    }
  };

  const effectiveUid = user?.uid || getOrCreateDeviceUid();

  return (
    <AuthContext.Provider value={{ user, effectiveUid, loading, signInWithGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
