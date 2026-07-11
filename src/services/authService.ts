import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../firebase';

export const getFriendlyErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected error occurred.';
  const code = error.code || '';
  
  switch (code) {
    case 'auth/weak-password':
      return 'The password is too weak. It must be at least 6 characters.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please check your credentials. (Note: If this is a new Firebase setup, make sure the "Email/Password" sign-in provider is enabled in your Firebase Console under Authentication > Sign-in method).';
    case 'auth/operation-not-allowed':
      return 'Email/Password authentication is disabled. Please enable "Email/Password" in your Firebase Console (Authentication > Sign-in method).';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/network-request-failed':
      return 'A network error occurred. Please check your connection.';
    case 'auth/too-many-requests':
      return 'Too many login attempts. Access has been temporarily disabled. Please reset your password or try again later.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    default:
      return error.message || 'An error occurred. Please try again.';
  }
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};
