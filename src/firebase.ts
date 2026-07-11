import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// @ts-ignore
const env = import.meta.env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || env.GOOGLE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "fifa-world-cup-38005.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "fifa-world-cup-38005",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "fifa-world-cup-38005.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "670256209889",
  appId: env.VITE_FIREBASE_APP_ID || "1:670256209889:web:2d9718c3463c4874a47ca0",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-PGR7Z00BVP"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
