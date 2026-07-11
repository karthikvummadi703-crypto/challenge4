import { signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';

/** Maps Firebase Auth and Firestore error codes to human-readable messages. */
export const getFriendlyErrorMessage = (error: unknown): string => {
  if (!error) return 'An unexpected error occurred.';

  const err = error as { code?: string; message?: string };
  const code = err.code ?? '';

  switch (code) {
    // Auth errors
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please check your credentials.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Account temporarily locked — reset your password or try again later.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact your administrator.';

    // Firestore errors (can surface during getUserRole)
    case 'permission-denied':
    case 'firestore/permission-denied':
      return 'Access denied. Your account may not be registered in this portal.';
    case 'unavailable':
    case 'firestore/unavailable':
      return 'Database temporarily unavailable. Please try again in a moment.';

    default:
      // Surface the raw message only when there is no matching code,
      // so developers get actionable feedback during setup.
      return err.message ?? 'An error occurred. Please try again.';
  }
};

/** Returns the currently authenticated Firebase user, or null. */
export const getCurrentUser = (): FirebaseUser | null => auth.currentUser;

/** Signs the current user out of Firebase Auth. */
export const logout = async (): Promise<void> => {
  await signOut(auth);
};
