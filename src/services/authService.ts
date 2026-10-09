import {
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  type User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { AppUser } from "../game/types";

const googleProvider = new GoogleAuthProvider();

export async function getUserProfile(firebaseUser: FirebaseUser): Promise<AppUser> {
  const userRef = doc(db, "users", firebaseUser.uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: firebaseUser.uid,
        displayName: data.displayName || firebaseUser.displayName || "Người chơi",
        email: data.email || firebaseUser.email || "",
        role: "user",
        avatar: data.avatar || data.photoURL || firebaseUser.photoURL || "",
        photoURL: data.photoURL || data.avatar || firebaseUser.photoURL || ""
      };
    } else {
      // Tạo user profile mới
      const newUser: AppUser = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || "Quản trò",
        email: firebaseUser.email || "",
        role: "user",
        avatar: firebaseUser.photoURL || "",
        photoURL: firebaseUser.photoURL || ""
      };
      await setDoc(userRef, {
        ...newUser,
        createdAt: Date.now()
      });
      return newUser;
    }
  } catch (error) {
    console.error("Lỗi khi tải thông tin user từ Firestore:", error);
    return {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || "Quản trò",
      email: firebaseUser.email || "",
      role: "user",
      avatar: firebaseUser.photoURL || "",
      photoURL: firebaseUser.photoURL || ""
    };
  }
}

export async function updateUserProfile(displayName: string, avatarUrl: string): Promise<AppUser> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Chưa đăng nhập");

  const trimmedName = displayName.trim() || "Quản trò";
  const trimmedAvatar = avatarUrl.trim();

  try {
    await updateProfile(currentUser, {
      displayName: trimmedName,
      photoURL: trimmedAvatar
    });
  } catch (e) {
    console.warn("Không thể cập nhật Firebase Auth user profile:", e);
  }

  const userRef = doc(db, "users", currentUser.uid);

  const updatedUser: AppUser = {
    uid: currentUser.uid,
    displayName: trimmedName,
    email: currentUser.email || "",
    role: "user",
    avatar: trimmedAvatar,
    photoURL: trimmedAvatar
  };

  await setDoc(userRef, {
    ...updatedUser,
    updatedAt: Date.now()
  }, { merge: true });

  return updatedUser;
}

export async function loginWithGoogle(): Promise<AppUser> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return await getUserProfile(cred.user);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "auth/popup-blocked" || error.code === "auth/cancelled-popup-request") {
      await signInWithRedirect(auth, googleProvider);
      throw new Error("Đang chuyển hướng để đăng nhập...");
    }
    throw err;
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<AppUser> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return await getUserProfile(cred.user);
}

export async function registerWithEmail(email: string, pass: string): Promise<AppUser> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  const userRef = doc(db, "users", cred.user.uid);
  const newUser: AppUser = {
    uid: cred.user.uid,
    displayName: email.split("@")[0] || "Quản trò",
    email: email.trim(),
    role: "user",
    avatar: "",
    photoURL: ""
  };
  await setDoc(userRef, {
    ...newUser,
    createdAt: Date.now()
  });
  return newUser;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
