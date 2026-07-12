/**
 * Firebase client-side SDK initialization.
 *
 * Exports `auth`, `db`, and (when a reCAPTCHA site key is configured)
 * `appCheck` for use across the React app. Configuration is read from
 * Vite environment variables (VITE_FIREBASE_*) so no secrets live in source.
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const env = import.meta.env;

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

// ── Firebase App Check ────────────────────────────────────────────────────
// Attests that requests to Firebase (Firestore/Auth) and to our own
// /api/* Admin SDK routes come from this real app build, not a scripted
// client hitting the APIs directly. Fully opt-in and additive: with no site
// key configured, App Check simply never initializes and every existing
// flow behaves exactly as before. See README.md "Firebase App Check" for
// the one manual Firebase Console step this requires before it can enforce.
const appCheckSiteKey = env.VITE_FIREBASE_APPCHECK_SITE_KEY;
export const appCheck = appCheckSiteKey
  ? (() => {
      if (env.DEV) {
        // Lets `npm run dev` (localhost, no real reCAPTCHA token) pass App
        // Check once a debug token is registered in Firebase Console →
        // App Check → "Manage debug tokens" — never used in production builds.
        (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      return initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    })()
  : null;

export const auth = getAuth(app);
export const db = getFirestore(app);
