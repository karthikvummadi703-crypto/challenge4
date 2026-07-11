import { auth } from '../firebase';
import { isDemoModeActive } from './dataSource';
import { getDemoDocs } from './demoStore';

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
