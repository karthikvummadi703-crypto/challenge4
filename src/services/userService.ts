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
  email: string
) => {
  const userRef = doc(db, 'volunteers', uid);
  await setDoc(userRef, {
    uid,
    fullName,
    email,
    role: 'volunteer',
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
  // 1. Try by UID as document ID
  const docRefByUid = doc(db, collectionName, uid);
  const snapByUid = await getDoc(docRefByUid);
  if (snapByUid.exists()) {
    return snapByUid;
  }

  // 2. Try by email as document ID (if auth currentUser has email)
  const authInstance = getAuth();
  const currentUser = authInstance.currentUser;
  const userEmail = currentUser?.email;

  if (userEmail) {
    const docRefByEmail = doc(db, collectionName, userEmail);
    const snapByEmail = await getDoc(docRefByEmail);
    if (snapByEmail.exists()) {
      try {
        await setDoc(docRefByUid, {
          ...snapByEmail.data(),
          uid,
          email: userEmail
        }, { merge: true });
      } catch (err) {
        console.warn("Could not auto-migrate document from email key to uid key:", err);
      }
      return snapByEmail;
    }

    // 3. Try querying by email field
    const q = query(collection(db, collectionName), where('email', '==', userEmail));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const firstDoc = querySnapshot.docs[0];
      try {
        await setDoc(docRefByUid, {
          ...firstDoc.data(),
          uid,
          email: userEmail
        }, { merge: true });
      } catch (err) {
        console.warn("Could not auto-migrate queried document to uid key:", err);
      }
      return firstDoc;
    }
  }

  // 4. Try querying by uid field
  const qUid = query(collection(db, collectionName), where('uid', '==', uid));
  const querySnapshotUid = await getDocs(qUid);
  if (!querySnapshotUid.empty) {
    const firstDoc = querySnapshotUid.docs[0];
    try {
      await setDoc(docRefByUid, {
        ...firstDoc.data(),
        uid
      }, { merge: true });
    } catch (err) {
      console.warn("Could not auto-migrate queried uid document to uid key:", err);
    }
    return firstDoc;
  }

  // 5. Try querying by email field using uid if email matches (or search for doc matching any email/uid field combo)
  return null;
};

export const getUserRole = async (uid: string): Promise<'admin' | 'volunteer' | 'fan' | null> => {
  // Check admins collection
  const adminDoc = await findUserDocument(uid, 'admins');
  if (adminDoc) {
    return 'admin';
  }

  // Check volunteers collection
  const volunteerDoc = await findUserDocument(uid, 'volunteers');
  if (volunteerDoc) {
    return 'volunteer';
  }

  // Check fans collection
  const fanDoc = await findUserDocument(uid, 'fans');
  if (fanDoc) {
    return 'fan';
  }

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
    // If updateDoc fails (e.g. volunteers or admins without lastLogin field write permissions), we handle gracefully
    console.warn('Could not update lastLogin:', err);
  });
};

export const adminCreateVolunteer = async (
  fullName: string,
  email: string,
  password: string
) => {
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
  
  const existingApps = getApps();
  const secondaryApp = existingApps.find(app => app.name === 'SecondaryAdminApp')
    ? getApp('SecondaryAdminApp')
    : initializeApp(firebaseConfig, 'SecondaryAdminApp');
    
  const secondaryAuth = getAuth(secondaryApp);
  
  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = userCredential.user.uid;
    await createVolunteerProfile(uid, fullName, email);
    await signOut(secondaryAuth);
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch (e) {
      console.warn("Failed to delete secondary app:", e);
    }
  }
};

