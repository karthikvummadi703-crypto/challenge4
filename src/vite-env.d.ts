/// <reference types="vite/client" />

/**
 * Declare all VITE_* environment variables so TypeScript recognises them
 * on import.meta.env without "does not exist on type" errors.
 */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_FIRESTORE_DATABASE_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  readonly VITE_N8N_WEBHOOK_PRODUCTION_URL: string;
  /** reCAPTCHA v3 site key for Firebase App Check; App Check stays off when unset. See README.md. */
  readonly VITE_FIREBASE_APPCHECK_SITE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
