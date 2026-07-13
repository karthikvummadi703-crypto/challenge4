/**
 * Crypto-secure random password generation.
 *
 * Used to auto-generate volunteer account passwords so admins never fall
 * back to a guessable default (e.g. "password123"). Uses
 * `crypto.getRandomValues` (Web Crypto API) rather than `Math.random()`,
 * which is not cryptographically secure.
 */

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';

/** Generates a random password of at least 12 characters (default 16). */
export function generateSecurePassword(length = 16): string {
  const safeLength = Math.max(12, length);
  const randomValues = new Uint32Array(safeLength);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (v) => CHARSET[v % CHARSET.length]).join('');
}
