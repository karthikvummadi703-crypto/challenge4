import { doc, getDoc, setDoc, updateDoc, serverTimestamp, getDocs, collection, query, where } from 'firebase/firestore';
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
  createdAt?: any;
  lastLogin?: any;
  profileCompleted?: boolean;
  seatNumber?: string;
}

export const createFanProfile = async (uid: string, fullName: string, email: string, seatNumber: string = 'A12-24') => {
  const userRef = doc(db, 'fans', uid);
  let assignedGate = 'Gate A';
  if (seatNumber.startsWith('B')) assignedGate = 'Gate B';
  else if (seatNumber.startsWith('C')) assignedGate = 'Gate C';
  else if (seatNumber.startsWith('VIP')) assignedGate = 'Gate D';

  await setDoc(userRef, {
    uid,
    fullName,
    email,
    role: 'fan',
    seatNumber,
    assignedGate,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    profileCompleted: true
  });
};

export const createVolunteerProfile = async (
  uid: string,
  fullName: string,
  email: string,
  assignedGate: string = 'Gate A'
) => {
  const userRef = doc(db, 'volunteers', uid);
  await setDoc(userRef, {
    uid,
    fullName,
    email,
    role: 'volunteer',
    assignedGate,
    active: true,
    profileCompleted: true,
    createdAt: serverTimestamp()
  });
};

export const createAdminProfile = async (uid: string, email: string) => {
  const userRef = doc(db, 'admins', uid);
  await setDoc(userRef, {
    uid,
    email,
    role: 'admin',
    createdAt: serverTimestamp()
  });
};

const findUserDocument = async (uid: string, collectionName: string) => {
  // 1. Try by UID as document ID (canonical path)
  const docRefByUid = doc(db, collectionName, uid);
  const snapByUid = await getDoc(docRefByUid);
  if (snapByUid.exists()) {
    return snapByUid;
  }

  const authInstance = getAuth();
  const currentUser = authInstance.currentUser;
  const userEmail = currentUser?.email;

  if (userEmail) {
    // 2. Try by email as document ID (legacy migration path)
    const docRefByEmail = doc(db, collectionName, userEmail);
    const snapByEmail = await getDoc(docRefByEmail);
    if (snapByEmail.exists()) {
      // Migrate: copy to uid-keyed doc so future lookups are O(1)
      try {
        await setDoc(docRefByUid, { ...snapByEmail.data(), uid, email: userEmail }, { merge: true });
      } catch (err) {
        console.warn('Could not migrate email-keyed document to uid-keyed:', err);
      }
      return snapByEmail;
    }

    // 3. Query by email field
    const qEmail = query(collection(db, collectionName), where('email', '==', userEmail));
    const qEmailSnap = await getDocs(qEmail);
    if (!qEmailSnap.empty) {
      const firstDoc = qEmailSnap.docs[0];
      try {
        await setDoc(docRefByUid, { ...firstDoc.data(), uid, email: userEmail }, { merge: true });
      } catch (err) {
        console.warn('Could not migrate queried email document to uid-keyed:', err);
      }
      return firstDoc;
    }
  }

  // 4. Query by uid field (documents keyed differently)
  const qUid = query(collection(db, collectionName), where('uid', '==', uid));
  const qUidSnap = await getDocs(qUid);
  if (!qUidSnap.empty) {
    const firstDoc = qUidSnap.docs[0];
    try {
      await setDoc(docRefByUid, { ...firstDoc.data(), uid }, { merge: true });
    } catch (err) {
      console.warn('Could not migrate uid-field document to uid-keyed:', err);
    }
    return firstDoc;
  }

  return null;
};

export const getUserRole = async (uid: string): Promise<'admin' | 'volunteer' | 'fan' | null> => {
  const adminDoc = await findUserDocument(uid, 'admins');
  if (adminDoc) return 'admin';

  const volunteerDoc = await findUserDocument(uid, 'volunteers');
  if (volunteerDoc) return 'volunteer';

  const fanDoc = await findUserDocument(uid, 'fans');
  if (fanDoc) return 'fan';

  return null;
};

export const getUserProfile = async (uid: string, role: 'admin' | 'volunteer' | 'fan'): Promise<UserProfile | null> => {
  const collectionName = role === 'admin' ? 'admins' : role === 'volunteer' ? 'volunteers' : 'fans';
  const userDoc = await findUserDocument(uid, collectionName);
  if (userDoc) {
    return { uid, ...userDoc.data() } as UserProfile;
  }
  return null;
};

export const updateLastLogin = async (uid: string, role: 'admin' | 'volunteer' | 'fan') => {
  const collectionName = role === 'admin' ? 'admins' : role === 'volunteer' ? 'volunteers' : 'fans';
  const userRef = doc(db, collectionName, uid);
  await updateDoc(userRef, {
    lastLogin: serverTimestamp()
  }).catch((err) => {
    console.warn('Could not update lastLogin:', err);
  });
};

/**
 * Creates a Firebase Auth account and Firestore profile for a volunteer
 * without disrupting the currently signed-in admin session.
 * Uses a secondary Firebase app instance that is created and destroyed per call.
 */
export const adminCreateVolunteer = async (
  fullName: string,
  email: string,
  password: string,
  assignedGate: string = 'Gate A'
) => {
  // @ts-ignore
  const env = import.meta.env || {};

  // Use the same project config as the main app — critical fix:
  // previously this used a hardcoded wrong project, causing volunteers to be
  // registered in a different Firebase project than where they tried to log in.
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || env.GOOGLE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "fifa-world-cup-38005.firebaseapp.com",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "fifa-world-cup-38005",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "fifa-world-cup-38005.firebasestorage.app",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "670256209889",
    appId: env.VITE_FIREBASE_APP_ID || "1:670256209889:web:2d9718c3463c4874a47ca0"
  };

  const existingApps = getApps();
  const secondaryApp = existingApps.find(a => a.name === 'SecondaryAdminApp')
    ? getApp('SecondaryAdminApp')
    : initializeApp(firebaseConfig, 'SecondaryAdminApp');

  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = userCredential.user.uid;
    await createVolunteerProfile(uid, fullName, email, assignedGate);
    await signOut(secondaryAuth);
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch (e) {
      console.warn('Failed to clean up secondary Firebase app:', e);
    }
  }
};
