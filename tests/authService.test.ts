import { describe, it, expect, vi } from 'vitest';

// Mock Firebase Auth so the module can be imported without real credentials.
vi.mock('firebase/auth', () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
  getAuth: vi.fn(() => ({ currentUser: null })),
}));
vi.mock('../src/firebase', () => ({ auth: { currentUser: null } }));

const { getFriendlyErrorMessage, getCurrentUser, logout } = await import('../src/services/authService');

describe('getFriendlyErrorMessage', () => {
  it('returns a generic message for null / undefined errors', () => {
    expect(getFriendlyErrorMessage(null)).toBe('An unexpected error occurred.');
    expect(getFriendlyErrorMessage(undefined)).toBe('An unexpected error occurred.');
  });

  it('maps auth/weak-password to a readable string', () => {
    const msg = getFriendlyErrorMessage({ code: 'auth/weak-password' });
    expect(msg).toMatch(/password/i);
    expect(msg).toMatch(/6/);
  });

  it('maps auth/wrong-password to a readable string', () => {
    const msg = getFriendlyErrorMessage({ code: 'auth/wrong-password' });
    expect(msg).toMatch(/incorrect|password/i);
  });

  it('maps auth/invalid-credential identically to auth/wrong-password', () => {
    const a = getFriendlyErrorMessage({ code: 'auth/wrong-password' });
    const b = getFriendlyErrorMessage({ code: 'auth/invalid-credential' });
    expect(a).toBe(b);
  });

  it('maps auth/user-not-found', () => {
    const msg = getFriendlyErrorMessage({ code: 'auth/user-not-found' });
    expect(msg).toMatch(/no account|email/i);
  });

  it('maps auth/email-already-in-use', () => {
    const msg = getFriendlyErrorMessage({ code: 'auth/email-already-in-use' });
    expect(msg).toMatch(/already exists|already in use/i);
  });

  it('maps auth/network-request-failed', () => {
    const msg = getFriendlyErrorMessage({ code: 'auth/network-request-failed' });
    expect(msg).toMatch(/network/i);
  });

  it('maps auth/too-many-requests', () => {
    const msg = getFriendlyErrorMessage({ code: 'auth/too-many-requests' });
    expect(msg).toMatch(/too many|locked/i);
  });

  it('maps auth/invalid-email', () => {
    const msg = getFriendlyErrorMessage({ code: 'auth/invalid-email' });
    expect(msg).toMatch(/valid email/i);
  });

  it('maps auth/user-disabled', () => {
    const msg = getFriendlyErrorMessage({ code: 'auth/user-disabled' });
    expect(msg).toMatch(/disabled/i);
  });

  it('maps auth/operation-not-allowed', () => {
    const msg = getFriendlyErrorMessage({ code: 'auth/operation-not-allowed' });
    expect(msg).toMatch(/disabled|sign-in/i);
  });

  it('maps Firestore permission-denied', () => {
    const msg = getFriendlyErrorMessage({ code: 'permission-denied' });
    expect(msg).toMatch(/access denied/i);
  });

  it('maps firestore/permission-denied', () => {
    const msg = getFriendlyErrorMessage({ code: 'firestore/permission-denied' });
    expect(msg).toMatch(/access denied/i);
  });

  it('maps firestore/unavailable', () => {
    const msg = getFriendlyErrorMessage({ code: 'firestore/unavailable' });
    expect(msg).toMatch(/unavailable/i);
  });

  it('maps unavailable (without prefix)', () => {
    const msg = getFriendlyErrorMessage({ code: 'unavailable' });
    expect(msg).toMatch(/unavailable/i);
  });

  it('falls back to the error.message for unknown codes', () => {
    const msg = getFriendlyErrorMessage({ code: 'unknown/code', message: 'Some raw error' });
    expect(msg).toBe('Some raw error');
  });

  it('returns generic fallback when code is unknown and message is absent', () => {
    const msg = getFriendlyErrorMessage({ code: 'unknown/code' });
    expect(msg).toMatch(/error/i);
  });

  it('handles a plain Error object (no code property)', () => {
    const msg = getFriendlyErrorMessage(new Error('Something broke'));
    expect(msg).toBe('Something broke');
  });

  it('handles an empty-string code gracefully', () => {
    const msg = getFriendlyErrorMessage({ code: '' });
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });
});

describe('getCurrentUser', () => {
  it('returns null when no Firebase user is signed in', () => {
    expect(getCurrentUser()).toBeNull();
  });
});

describe('logout', () => {
  it('calls signOut on the Firebase auth instance', async () => {
    const { signOut } = await import('firebase/auth');
    await logout();
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('resolves without throwing', async () => {
    await expect(logout()).resolves.toBeUndefined();
  });
});
