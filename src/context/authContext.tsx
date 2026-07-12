import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../firebase';
import {
  getUserRole,
  getUserProfile,
  createFanProfile,
  updateLastLogin,
  verifyAdminAccess,
  UserProfile,
  FanRegistrationDetails,
} from '../services/userService';
import { getFriendlyErrorMessage, logout } from '../services/authService';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: 'admin' | 'volunteer' | 'fan' | null;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  signUpFan: (
    fullName: string,
    email: string,
    password: string,
    seatNumber?: string,
    details?: FanRegistrationDetails
  ) => Promise<void>;
  loginUser: (
    email: string,
    password: string,
    expectedRole?: 'admin' | 'volunteer' | 'fan'
  ) => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole]       = useState<'admin' | 'volunteer' | 'fan' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError]     = useState<string | null>(null);

  /**
   * While loginUser() is running, suppress onAuthStateChanged updates.
   * loginUser() manages state atomically — it only commits user/role to React
   * state after ALL role checks pass. Without this lock, the listener fires
   * when signInWithEmailAndPassword() succeeds and races to set state.
   */
  const loginLock = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Let loginUser() finish; it will set state itself.
      if (loginLock.current) return;

      setLoading(true);
      setError(null);

      if (firebaseUser) {
        try {
          // Determine role BEFORE touching user state — no "flash" of user=X, role=null
          const userRole = await getUserRole(firebaseUser.uid);
          if (userRole) {
            const userProfile = await getUserProfile(firebaseUser.uid, userRole);
            // Commit everything together
            setUser(firebaseUser);
            setRole(userRole);
            setProfile(userProfile);
            await updateLastLogin(firebaseUser.uid, userRole);
          } else {
            // Authenticated with Firebase but not in any Firestore collection
            await logout();
            setUser(null);
            setRole(null);
            setProfile(null);
          }
        } catch (err: unknown) {
          console.error('Error restoring user profile:', err);
          setError(getFriendlyErrorMessage(err));
          setUser(null);
          setRole(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUpFan = async (
    fullName: string,
    email: string,
    password: string,
    seatNumber?: string,
    details?: FanRegistrationDetails
  ) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      await createFanProfile(firebaseUser.uid, fullName, email, seatNumber, details);
      setUser(firebaseUser);
      setRole('fan');
      setProfile({
        uid: firebaseUser.uid,
        email,
        role: 'fan',
        fullName,
        seatNumber,
        phone: details?.phone,
        country: details?.country,
        preferredLanguage: details?.preferredLanguage,
        favoriteTeam: details?.favoriteTeam,
        profileCompleted: true,
      });
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (
    email: string,
    password: string,
    expectedRole?: 'admin' | 'volunteer' | 'fan'
  ) => {
    // Acquire the lock so onAuthStateChanged doesn't race us
    loginLock.current = true;
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // ── STEP 1: Admin portal hard gate ────────────────────────────────────
      // verifyAdminAccess is fail-closed: if Firestore is unreachable it
      // returns false and access is denied. This runs before getUserRole so
      // the multi-strategy fallback in that function cannot bypass the check.
      if (expectedRole === 'admin') {
        const isAdmin = await verifyAdminAccess(
          firebaseUser.uid,
          firebaseUser.email ?? email
        );
        if (!isAdmin) {
          await logout();
          setUser(null);
          setProfile(null);
          setRole(null);
          const err = new Error(
            'Access Denied: This email is not registered as an organizer. ' +
            'Only pre-registered admin accounts may access this portal.'
          );
          setError(err.message);
          throw err;
        }
      }

      // ── STEP 2: Cross-collection role resolution ───────────────────────────
      const userRole = await getUserRole(firebaseUser.uid);

      if (!userRole) {
        await logout();
        setUser(null);
        setProfile(null);
        setRole(null);
        const err = new Error('Access Denied: Account has no role assigned.');
        setError(err.message);
        throw err;
      }

      if (expectedRole && userRole !== expectedRole) {
        await logout();
        setUser(null);
        setProfile(null);
        setRole(null);
        const err = new Error(
          `Access Denied: This account is registered as "${userRole}", ` +
          `not "${expectedRole}". Please use the correct portal.`
        );
        setError(err.message);
        throw err;
      }

      // ── STEP 3: Commit state only after ALL checks pass ────────────────────
      const userProfile = await getUserProfile(firebaseUser.uid, userRole);
      setUser(firebaseUser);
      setRole(userRole);
      setProfile(userProfile);
      await updateLastLogin(firebaseUser.uid, userRole);
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err));
      throw err;
    } finally {
      // Always release the lock; if logout() was called the subsequent
      // onAuthStateChanged(null) will run normally and clear state.
      loginLock.current = false;
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    setLoading(true);
    setError(null);
    try {
      await logout();
      setUser(null);
      setProfile(null);
      setRole(null);
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, role, loading, error, setError, signUpFan, loginUser, logoutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
