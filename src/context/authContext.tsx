import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserRole, getUserProfile, createFanProfile, updateLastLogin, verifyAdminAccess, UserProfile, FanRegistrationDetails } from '../services/userService';
import { getFriendlyErrorMessage, logout } from '../services/authService';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: 'admin' | 'volunteer' | 'fan' | null;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  signUpFan: (fullName: string, email: string, password: string, seatNumber?: string, details?: FanRegistrationDetails) => Promise<void>;
  loginUser: (email: string, password: string, expectedRole?: 'admin' | 'volunteer' | 'fan') => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<'admin' | 'volunteer' | 'fan' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);
      if (firebaseUser) {
        try {
          setUser(firebaseUser);
          const userRole = await getUserRole(firebaseUser.uid);
          if (userRole) {
            setRole(userRole);
            const userProfile = await getUserProfile(firebaseUser.uid, userRole);
            setProfile(userProfile);
            await updateLastLogin(firebaseUser.uid, userRole);
          } else {
            // No registered role in any collection
            setUser(null);
            setRole(null);
            setProfile(null);
          }
        } catch (err: any) {
          console.error("Error restoring user profile:", err);
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

  const signUpFan = async (fullName: string, email: string, password: string, seatNumber?: string, details?: FanRegistrationDetails) => {
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
        profileCompleted: true
      });
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (email: string, password: string, expectedRole?: 'admin' | 'volunteer' | 'fan') => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // ── Admin portal: strict admins-collection check ──────────────────────
      // This MUST run before getUserRole so that no multi-strategy fallback
      // can accidentally grant dashboard access to a non-admin Firebase user.
      // The check is fail-closed: if Firestore is unreachable, access is denied.
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
            'Only accounts pre-registered in the admin portal may log in here.'
          );
          setError(err.message);
          throw err;
        }
      }

      const userRole = await getUserRole(firebaseUser.uid);

      if (!userRole) {
        await logout();
        setUser(null);
        setProfile(null);
        setRole(null);
        const err = new Error("Access Denied: Account is not configured in any role.");
        setError(err.message);
        throw err;
      }

      if (expectedRole && userRole !== expectedRole) {
        await logout();
        setUser(null);
        setProfile(null);
        setRole(null);
        const err = new Error(`Access Denied: Incorrect portal for role "${userRole}".`);
        setError(err.message);
        throw err;
      }

      setUser(firebaseUser);
      setRole(userRole);
      const userProfile = await getUserProfile(firebaseUser.uid, userRole);
      setProfile(userProfile);
      await updateLastLogin(firebaseUser.uid, userRole);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
      throw err;
    } finally {
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
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        error,
        setError,
        signUpFan,
        loginUser,
        logoutUser
      }}
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
