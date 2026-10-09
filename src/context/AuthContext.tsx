import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "../services/firebase";
import { getUserProfile, loginWithGoogle, loginWithEmail, registerWithEmail, logout, updateUserProfile } from "../services/authService";
import type { AppUser } from "../game/types";

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  role: "admin" | "user" | "guest";
  loading: boolean;
  loginGoogle: () => Promise<void>;
  loginEmail: (email: string, pass: string) => Promise<void>;
  registerEmail: (email: string, pass: string) => Promise<void>;
  updateProfileData: (displayName: string, avatarUrl: string) => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const profile = await getUserProfile(fbUser);
          setUser(profile);
        } catch {
          setUser({
            uid: fbUser.uid,
            displayName: fbUser.displayName || "Quản trò",
            email: fbUser.email || "",
            role: "user"
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginGoogle = async () => {
    setLoading(true);
    try {
      const profile = await loginWithGoogle();
      setUser(profile);
    } finally {
      setLoading(false);
    }
  };

  const loginEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const profile = await loginWithEmail(email, pass);
      setUser(profile);
    } finally {
      setLoading(false);
    }
  };

  const registerEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const profile = await registerWithEmail(email, pass);
      setUser(profile);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileData = async (displayName: string, avatarUrl: string) => {
    setLoading(true);
    try {
      const updated = await updateUserProfile(displayName, avatarUrl);
      setUser(updated);
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    setLoading(true);
    try {
      await logout();
      setUser(null);
      setFirebaseUser(null);
    } finally {
      setLoading(false);
    }
  };

  const role: "admin" | "user" | "guest" = user ? "user" : "guest";

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        role,
        loading,
        loginGoogle,
        loginEmail,
        registerEmail,
        updateProfileData,
        logoutUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
