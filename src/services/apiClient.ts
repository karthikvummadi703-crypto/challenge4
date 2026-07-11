import { auth } from '../firebase';

/**
 * fetch() wrapper that attaches the current Firebase user's ID token as a
 * Bearer Authorization header. The server verifies this token (see
 * lib/firebaseAdmin.ts requireAuth/requireAdmin) before serving
 * /api/config or /api/ai/command — without it those endpoints reject the
 * request with 401.
 */
export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, { ...options, headers });
}
