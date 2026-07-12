import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
  getDocs, collection, query, where
} from 'firebase/firestore';
import { db } from '../firebase';
import { initializeApp, deleteApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'volunteer' | 'fan';
  fullName?: string;
  volunteerId?: string;
  assignedGate?: string;
  active?: boolean;
  /** Firestore server timestamp on creation; string when read back from emulator/REST. */
  createdAt?: unknown;
  /** Firestore server timestamp on last login; string when read back from emulator/REST. */
  lastLogin?: unknown;
  profileCompleted?: boolean;
  seatNumber?: string;
  phone?: string;
  country?: string;
  preferredLanguage?: string;
  favoriteTeam?: string;
}

export interface FanRegistrationDetails {
  phone?: string;
  country?: string;
  preferredLanguage?: string;
  favoriteTeam?: string;
}

export type UserRole = 'admin' | 'volunteer' | 'fan';

/** Shared email-format regex (RFC 5322 simplified). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Throws a descriptive Error when a registration field is invalid. */
function validateRegistrationFields(fields: {
  fullName?: string;
  email?: string;
  password?: string;
}): void {
  if (fields.fullName !== undefined) {
    const name = fields.fullName.trim();
    if (!name) throw new Error('Full name is required.');
    if (name.length > 100) throw new Error('Full name must be 100 characters or fewer.');
  }
  if (fields.email !== undefined) {
    const email = fields.email.trim();
    if (!email) throw new Error('Email address is required.');
    if (!EMAIL_RE.test(email)) throw new Error('Please enter a valid email address.');
    if (email.length > 254) throw new Error('Email address is too long.');
  }
  if (fields.password !== undefined) {
    if (fields.password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (fields.password.length > 128) throw new Error('Password must be 128 characters or fewer.');
  }
}

/** Creates a fan Firestore profile keyed by UID. */
export const createFanProfile = async (
  uid: string,
  fullName: string,
  email: string,
  seatNumber: string = 'A12-24',
  details: FanRegistrationDetails = {}
): Promise<void> => {
  validateRegistrationFields({ fullName, email });

  let assignedGate = 'Gate A';
  if (seatNumber.startsWith('B')) assignedGate = 'Gate B';
  else if (seatNumber.startsWith('C')) assignedGate = 'Gate C';
  else if (seatNumber.startsWith('VIP')) assignedGate = 'Gate D';

  await setDoc(doc(db, 'fans', uid), {
    uid,
    fullName: fullName.trim(),
    email: email.toLowerCase().trim(),
    role: 'fan',
    seatNumber,
    assignedGate,
    phone: (details.phone || '').trim(),
    country: (details.country || '').trim(),
    preferredLanguage: details.preferredLanguage || 'English',
    favoriteTeam: (details.favoriteTeam || '').trim(),
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    profileCompleted: true,
  });
};

/** Creates a volunteer Firestore profile keyed by UID. */
export const createVolunteerProfile = async (
  uid: string,
  fullName: string,
  email: string,
  assignedGate: string = 'Gate A'
): Promise<void> => {
  validateRegistrationFields({ fullName, email });
  await setDoc(doc(db, 'volunteers', uid), {
    uid,
    fullName: fullName.trim(),
    email: email.toLowerCase().trim(),
    role: 'volunteer',
    assignedGate,
    active: true,
    profileCompleted: true,
    createdAt: serverTimestamp(),
  });
};

/** Creates an admin Firestore profile keyed by UID. */
export const createAdminProfile = async (uid: string, email: string): Promise<void> => {
  await setDoc(doc(db, 'admins', uid), {
    uid,
    email: email.toLowerCase().trim(),
    role: 'admin',
    createdAt: serverTimestamp(),
  });
};

/**
 * Looks up a user document in a given collection by multiple strategies:
 * UID key → email key (legacy migration) → email field query → uid field query.
 *
 * IMPORTANT: Every Firestore call is individually wrapped in try-catch.
 * Firestore Security Rules deny cross-collection access (e.g. a volunteer
 * trying to read `admins/{volunteerEmail}` gets PERMISSION_DENIED). Without
 * these guards the error propagates up and breaks the entire login flow.
 */
const findUserDocument = async (uid: string, collectionName: string) => {
  // Strategy 1: canonical path — document keyed by Firebase Auth UID
  try {
    const snap = await getDoc(doc(db, collectionName, uid));
    if (snap.exists()) return snap;
  } catch {
    // PERMISSION_DENIED means this user doesn't own a doc here — return null
    return null;
  }

  const currentUser = getAuth().currentUser;
  const userEmail = currentUser?.email;

  if (userEmail) {
    // Strategy 2: legacy documents keyed by email string
    try {
      const snap = await getDoc(doc(db, collectionName, userEmail));
      if (snap.exists()) {
        // Auto-migrate to UID key so future lookups are O(1)
        try {
          await setDoc(
            doc(db, collectionName, uid),
            { ...snap.data(), uid, email: userEmail },
            { merge: true }
          );
        } catch { /* migration is best-effort */ }
        return snap;
      }
    } catch { /* PERMISSION_DENIED — not in this collection */ }

    // Strategy 3: query by email field
    try {
      const result = await getDocs(
        query(collection(db, collectionName), where('email', '==', userEmail))
      );
      if (!result.empty) {
        const first = result.docs[0];
        try {
          await setDoc(
            doc(db, collectionName, uid),
            { ...first.data(), uid, email: userEmail },
            { merge: true }
          );
        } catch { /* migration is best-effort */ }
        return first;
      }
    } catch { /* PERMISSION_DENIED — not in this collection */ }
  }

  // Strategy 4: query by uid field (documents stored with non-UID key)
  try {
    const result = await getDocs(
      query(collection(db, collectionName), where('uid', '==', uid))
    );
    if (!result.empty) {
      const first = result.docs[0];
      try {
        await setDoc(
          doc(db, collectionName, uid),
          { ...first.data(), uid },
          { merge: true }
        );
      } catch { /* migration is best-effort */ }
      return first;
    }
  } catch { /* PERMISSION_DENIED — not in this collection */ }

  return null;
};

/**
 * STRICT admin verification — the ONLY function that should gate admin portal
 * access. Checks the /admins collection exclusively, with no cross-collection
 * fallback. If Firestore is unreachable the call throws and the caller must
 * treat the result as a denial (fail-closed).
 *
 * Legacy migration: if the admin doc was stored by email key instead of UID,
 * this function finds and migrates it to the UID key for future O(1) lookups.
 */
export const verifyAdminAccess = async (uid: string, email: string): Promise<boolean> => {
  // Path 1 — canonical: document keyed by UID (all new accounts)
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    if (snap.exists()) return true;
  } catch {
    // PERMISSION_DENIED or network failure → fail closed
    return false;
  }

  const lowerEmail = email.toLowerCase().trim();

  // Path 2 — legacy: document keyed by email string
  try {
    const snap = await getDoc(doc(db, 'admins', lowerEmail));
    if (snap.exists()) {
      // Migrate to UID key so future logins are O(1)
      try {
        await setDoc(doc(db, 'admins', uid), { ...snap.data(), uid, email: lowerEmail }, { merge: true });
      } catch { /* migration is best-effort */ }
      return true;
    }
  } catch { /* PERMISSION_DENIED → not an admin */ }

  // Path 3 — fallback: query by email field
  try {
    const result = await getDocs(query(collection(db, 'admins'), where('email', '==', lowerEmail)));
    if (!result.empty) {
      try {
        await setDoc(doc(db, 'admins', uid), { ...result.docs[0].data(), uid, email: lowerEmail }, { merge: true });
      } catch { /* migration is best-effort */ }
      return true;
    }
  } catch { /* PERMISSION_DENIED → not an admin */ }

  return false;
};

/** Determines the role of a Firebase Auth UID by checking all role collections. */
export const getUserRole = async (uid: string): Promise<UserRole | null> => {
  if (await findUserDocument(uid, 'admins')) return 'admin';
  if (await findUserDocument(uid, 'volunteers')) return 'volunteer';
  if (await findUserDocument(uid, 'fans')) return 'fan';
  return null;
};

/** Fetches the full profile document for a user. */
export const getUserProfile = async (
  uid: string,
  role: UserRole
): Promise<UserProfile | null> => {
  const collectionName =
    role === 'admin' ? 'admins' : role === 'volunteer' ? 'volunteers' : 'fans';
  const userDoc = await findUserDocument(uid, collectionName);
  if (userDoc) {
    return { uid, ...userDoc.data() } as UserProfile;
  }
  return null;
};

/** Stamps the lastLogin timestamp; silently swallows Firestore write errors. */
export const updateLastLogin = async (uid: string, role: UserRole): Promise<void> => {
  const collectionName =
    role === 'admin' ? 'admins' : role === 'volunteer' ? 'volunteers' : 'fans';
  try {
    await updateDoc(doc(db, collectionName, uid), { lastLogin: serverTimestamp() });
  } catch {
    /* Non-critical — some Firestore rule configs may not allow lastLogin updates */
  }
};

/**
 * Creates a Firebase Auth account and Firestore profile for a new volunteer
 * WITHOUT disrupting the currently signed-in admin session.
 *
 * Uses a named secondary Firebase app instance that is created and destroyed
 * per invocation. The secondary app uses the SAME Firebase project config as
 * the primary app — using a different project here was the original bug that
 * caused volunteers to be registered in a foreign project.
 */
export const adminCreateVolunteer = async (
  fullName: string,
  email: string,
  password: string,
  assignedGate: string = 'Gate A'
): Promise<void> => {
  validateRegistrationFields({ fullName, email, password });
  // import.meta.env is always defined in Vite — typed via src/vite-env.d.ts
  const firebaseConfig = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'fifa-world-cup-38005.firebaseapp.com',
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'fifa-world-cup-38005',
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'fifa-world-cup-38005.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '670256209889',
    appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:670256209889:web:2d9718c3463c4874a47ca0',
  };

  const existingApps = getApps();
  const secondaryApp = existingApps.find(a => a.name === 'SecondaryAdminApp')
    ? getApp('SecondaryAdminApp')
    : initializeApp(firebaseConfig, 'SecondaryAdminApp');

  const secondaryAuth = getAuth(secondaryApp);

  try {
    const { user } = await createUserWithEmailAndPassword(
      secondaryAuth,
      email.toLowerCase().trim(),
      password
    );
    await createVolunteerProfile(user.uid, fullName, email, assignedGate);
    await signOut(secondaryAuth);
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch {
      /* Ignore cleanup errors — app will be re-used or garbage collected */
    }
  }
};
