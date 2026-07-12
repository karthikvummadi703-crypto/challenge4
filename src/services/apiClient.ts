import { getToken } from 'firebase/app-check';
import { auth, appCheck } from '../firebase';
import { isDemoModeActive } from './dataSource';
import { getDemoDocs } from './demoStore';

/**
 * fetch() wrapper that attaches the current Firebase user's ID token as a
 * Bearer Authorization header, plus an App Check token when App Check is
 * configured (see src/firebase.ts). The server verifies these (see
 * lib/firebaseAdmin.ts requireAuth/requireAdmin/requireAppCheck) before
 * serving /api/config or /api/ai/command — without a valid Authorization
 * header those endpoints reject the request with 401; App Check is only
 * enforced server-side when explicitly turned on (see README.md).
 */
export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  if (appCheck) {
    try {
      const appCheckToken = await getToken(appCheck, /* forceRefresh */ false);
      headers.set('X-Firebase-AppCheck', appCheckToken.token);
    } catch {
      /* App Check token fetch failing must never block the request — the
         server only enforces it when explicitly configured to. */
    }
  }

  return fetch(url, { ...options, headers });
}

/**
 * AI chat entry point used by every dashboard's assistant. Routes to the real,
 * authenticated `/api/ai/command` endpoint in production, and to the
 * unauthenticated `/api/ai/demo-command` endpoint (fed with demo telemetry
 * numbers, never real Firestore data) while Demo Mode is active — so judges
 * see the AI assistant work without needing real credentials.
 */
export async function sendAICommand(text: string): Promise<{ response: string; source: string }> {
  if (isDemoModeActive()) {
    const telemetry = {
      volunteersActive: getDemoDocs('volunteers').filter(v => v.active !== false).length,
      volunteersTotal: getDemoDocs('volunteers').length,
      totalOrders: getDemoDocs('foodOrders').length,
      pendingOrders: getDemoDocs('foodOrders').filter(o => o.status === 'pending').length,
      totalIssues: getDemoDocs('issueReports').length,
      openIssues: getDemoDocs('issueReports').filter(i => i.status === 'open').length,
      activeEmergencies: getDemoDocs('emergencyRequests').filter(e => e.status === 'active').length,
    };
    const response = await fetch('/api/ai/demo-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, telemetry }),
    });
    if (!response.ok) throw new Error('Demo AI command failed.');
    return response.json();
  }

  const response = await authedFetch('/api/ai/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error('AI command failed.');
  return response.json();
}
