import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "../services/firebase";
import {
  getUserProfile,
  loginWithUsername,
  logout,
  updateUserProfile,
  uploadUserAvatar,
  type UsernameMode,
} from "../services/authService";
import type { AppUser } from "../game/types";

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  role: "admin" | "user" | "guest";
  loading: boolean;
  loginUsername: (
    displayName: string,
    avatarUrl: string,
    mode: UsernameMode,
    avatarBlob?: Blob,
  ) => Promise<void>;
  updateProfileData: (displayName: string, avatarUrl: string, avatarBlob?: Blob) => Promise<void>;
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
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginUsername = async (
    displayName: string,
    avatarUrl: string,
    mode: UsernameMode,
    avatarBlob?: Blob,
  ) => {
    setLoading(true);
    try {
      let profile = await loginWithUsername(displayName, avatarUrl, mode);
      if (avatarBlob && mode === 'create') {
        try {
          const uploadedAvatarUrl = await uploadUserAvatar(avatarBlob);
          profile = await updateUserProfile(profile.displayName, uploadedAvatarUrl);
        } catch (error) {
          // Không chặn người chơi vào game nếu Storage tạm lỗi; avatar preset đã
          // được lưu trong transaction và có thể đổi lại sau.
          const message = error instanceof Error ? error.message : 'Không thể tải avatar tùy chọn.';
          console.warn('Không thể tải avatar tùy chọn, giữ avatar mặc định:', message);
          if (typeof sessionStorage !== 'undefined') {
            try {
              sessionStorage.setItem('avatar_upload_warning', message);
            } catch {
              // Bỏ qua lỗi sessionStorage nếu bị chặn
            }
          }
        }
      }
      setUser(profile);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileData = async (displayName: string, avatarUrl: string, avatarBlob?: Blob) => {
    setLoading(true);
    try {
      const nextAvatarUrl = avatarBlob ? await uploadUserAvatar(avatarBlob) : avatarUrl;
      const updated = await updateUserProfile(displayName, nextAvatarUrl);
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
        loginUsername,
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
