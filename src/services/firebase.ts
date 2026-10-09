import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBn6gF9Nbx8Dz_mHTeTt-pg6fvoj6PRvjo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "masoi-27dc7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "masoi-27dc7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "masoi-27dc7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "769115731847",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:769115731847:web:8f548f57eabc1f06ddc522",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-BF4QFXNPZ1",
};

export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
