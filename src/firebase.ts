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

// Every VITE_FIREBASE_* variable the client config needs. No committed
// fallback values are allowed here — a missing var must fail loudly at
// startup rather than silently pointing at a stale/wrong Firebase project.
const REQUIRED_FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID',
] as const;

const missingKeys: string[] = REQUIRED_FIREBASE_ENV_KEYS.filter((key) => !env[key]);
// apiKey has a secondary, legitimate env source (GOOGLE_API_KEY) rather than
// a hardcoded fallback, but it's still required — check it too.
if (!env.VITE_FIREBASE_API_KEY && !env.GOOGLE_API_KEY) {
  missingKeys.unshift('VITE_FIREBASE_API_KEY');
}

if (missingKeys.length > 0) {
  throw new Error(
    `[Nexus] Missing required Firebase environment variable(s): ${missingKeys.join(', ')}. ` +
    'Set them in Replit Secrets (or .env — see .env.example) before starting the app. ' +
    'Refusing to start with a committed fallback Firebase project.'
  );
}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || env.GOOGLE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
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
