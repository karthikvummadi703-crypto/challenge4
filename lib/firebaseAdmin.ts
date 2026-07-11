import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import type { Request, Response, NextFunction } from 'express';

/**
 * Server-side Firebase Admin SDK, initialized from a service account key
 * supplied ONLY via the FIREBASE_SERVICE_ACCOUNT_KEY secret (the full JSON
 * key content, as one string). This key must never be committed to the repo
 * or written to disk — Admin SDK credentials bypass Firestore security rules
 * entirely, so this is the one place in the app allowed to do privileged
 * operations like seeding the admin account or verifying ID tokens.
 */

let app: App | null = null;
let authAdmin: Auth | null = null;
let dbAdmin: Firestore | null = null;
let initError: string | null = null;

function init() {
  if (app || initError) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    initError = 'FIREBASE_SERVICE_ACCOUNT_KEY secret is not set.';
    return;
  }
  try {
    const serviceAccount = JSON.parse(raw);
    app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
    authAdmin = getAuth(app);
    dbAdmin = getFirestore(app);
  } catch (err) {
    initError = `Failed to parse/initialize FIREBASE_SERVICE_ACCOUNT_KEY: ${(err as Error).message}`;
  }
}

export function getAdminAuth(): Auth {
  init();
  if (!authAdmin) throw new Error(initError || 'Firebase Admin SDK is not initialized.');
  return authAdmin;
}

export function getAdminDb(): Firestore {
  init();
  if (!dbAdmin) throw new Error(initError || 'Firebase Admin SDK is not initialized.');
  return dbAdmin;
}

export function isAdminSdkConfigured(): boolean {
  init();
  return !!app;
}

export interface AuthedRequest extends Request {
  uid?: string;
  userEmail?: string;
}

/** Requires a valid Firebase Auth ID token in the Authorization header. Any role. */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Missing Authorization bearer token.' });

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    req.uid = decoded.uid;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/** Requires the caller's uid to exist in the /admins collection. Must run after requireAuth. */
export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.uid) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const snap = await getAdminDb().collection('admins').doc(req.uid).get();
    if (!snap.exists) return res.status(403).json({ error: 'Admin privileges required.' });
    next();
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify admin privileges.' });
  }
}
