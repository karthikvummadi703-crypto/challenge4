import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// @ts-ignore
const env = import.meta.env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyA59SvwxHIbZE8whPEnh6hIeJlS1ZX9agY",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "random-password-generato-e4466.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "random-password-generato-e4466",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "random-password-generato-e4466.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "894235631815",
  appId: env.VITE_FIREBASE_APP_ID || "1:894235631815:web:b0b5a4ccfd9ec04f68dee2"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

const databaseId = env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-nexusaififastadi-bc442396-6d24-4193-a983-33c56303f6a0";

export const db = initializeFirestore(app, {
  databaseId: databaseId
} as any);
