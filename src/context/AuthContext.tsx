
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import type { FirebaseError } from 'firebase/app';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loadingAuth: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthError = (error: FirebaseError) => {
    console.error("Firebase Auth Error:", error);
    let message = "An unexpected error occurred. Please try again.";
    switch (error.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
            message = "Invalid email or password.";
            break;
        case "auth/email-already-in-use":
            message = "This email address is already in use.";
            break;
        case "auth/weak-password":
            message = "Password is too weak. It should be at least 6 characters.";
            break;
        case "auth/invalid-email":
            message = "Please enter a valid email address.";
            break;
        case "auth/popup-closed-by-user":
            message = "Google Sign-In cancelled.";
            break;
        case "auth/cancelled-popup-request":
        case "auth/popup-blocked":
            message = "Popup blocked by browser. Please allow popups for this site.";
            break;
        default:
            message = error.message || message;
    }
    toast.error("Authentication Failed",{description: message});
  }

  const signInWithGoogle = async () => {
    setLoadingAuth(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
      toast.success("Signed In",{description: "Successfully signed in with Google." });
    } catch (error) {
      handleAuthError(error as FirebaseError);
    } finally {
      setLoadingAuth(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    setLoadingAuth(true);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      router.push('/dashboard');
      toast.success("Signed Up",{description: "Successfully created your account." });
    } catch (error) {
      handleAuthError(error as FirebaseError);
    } finally {
      setLoadingAuth(false);
    }
  };
  
  const signInWithEmail = async (email: string, pass: string) => {
    setLoadingAuth(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      router.push('/dashboard');
      toast.success("Signed In",{description: "Successfully signed in." });
    } catch (error) {
      handleAuthError(error as FirebaseError);
    } finally {
      setLoadingAuth(false);
    }
  };

  const signOut = async () => {
    setLoadingAuth(true);
    try {
      await firebaseSignOut(auth);
      router.push('/login');
      toast.info("Signed Out",{description: "You have been signed out." });
    } catch (error) {
      handleAuthError(error as FirebaseError);
    } finally {
      setLoadingAuth(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loadingAuth, signInWithGoogle, signUpWithEmail, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
