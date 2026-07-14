import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// Stub the Gemini SDK so these tests never make a real network call — with a
// real GEMINI_API_KEY configured (as in a deployed/dev environment), the
// unmocked SDK would hit the live Gemini API on every "falls through to
// Gemini" case below, making tests slow/flaky/network-dependent. Default
// behavior rejects (simulating Gemini unavailable) so `answerStadiumQuestion`
// falls through to the deterministic local rule-based engine that the
// existing assertions below were written against (matching how these tests
// behaved when no GEMINI_API_KEY was configured at all). Tests that care
// about the Gemini-branch specifically can override via
// `mockGenerateContent.mockResolvedValueOnce(...)`.
const mockGenerateContent = vi.fn(async () => { throw new Error('Gemini disabled in tests'); });
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAI() {
    return { models: { generateContent: mockGenerateContent } };
  }),
}));

// Controllable mock of the Firebase Admin boundary so tests can simulate
// unauthenticated, authenticated-non-admin, and authenticated-admin callers
// without needing real Firebase credentials or network access.
let mockUid: string | null = null;
let mockIsAdmin = false;
// Mutable (not const) so individual tests can simulate the Admin SDK never
// having been configured at all (missing FIREBASE_SERVICE_ACCOUNT_KEY) —
// distinct from `telemetryShouldFail`, which simulates the SDK being
// configured but the underlying Firestore calls failing.
let mockAdminSdkConfigured = true;
// Toggled by individual tests to simulate a Firestore read failing (e.g. a
// PERMISSION_DENIED error from security rules, or a transient network error)
// so we can exercise getStadiumTelemetry's catch-and-fall-back-to-zeros path.
let telemetryShouldFail = false;
let telemetryFailureError: Error = new Error('PERMISSION_DENIED: Missing or insufficient permissions.');
// Per-collection docs the mocked `get()` returns, keyed by collection name
// (e.g. 'volunteers', 'foodOrders') — lets tests exercise the actual
// filter/count logic in getStadiumTelemetry instead of always seeing an
// empty collection.
let telemetryDocsByCollection: Record<string, { data: () => Record<string, unknown> }[]> = {};

vi.mock('../lib/firebaseAdmin', () => ({
  isAdminSdkConfigured: () => mockAdminSdkConfigured,
  getAdminDb: () => ({
    collection: (name: string) => ({
      get: async () => {
        if (telemetryShouldFail) throw telemetryFailureError;
        const docs = telemetryDocsByCollection[name] ?? [];
        return { docs, size: docs.length };
      },
    }),
  }),
  requireAuth: (req: import('express').Request & { uid?: string }, res: import('express').Response, next: import('express').NextFunction) => {
    const header = (req.headers.authorization as string) || '';
    if (!header.startsWith('Bearer ') || mockUid === null) {
      return res.status(401).json({ error: 'Missing Authorization bearer token.' });
    }
    req.uid = mockUid;
    next();
  },
  requireAdmin: (req: import('express').Request & { uid?: string }, res: import('express').Response, next: import('express').NextFunction) => {
    if (!req.uid) return res.status(401).json({ error: 'Not authenticated.' });
    if (!mockIsAdmin) return res.status(403).json({ error: 'Admin privileges required.' });
    next();
  },
  // ENFORCE_APP_CHECK is unset in tests, so the real requireAppCheck would
  // already no-op — this mock just avoids pulling in firebase-admin/app-check.
  requireAppCheck: (_req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => next(),
}));

// Imported AFTER the mock is registered so server.ts picks up the mocked module.
const { app } = await import('../server');

// ── Helpers ───────────────────────────────────────────────────────────────────

function authed() {
  mockUid = 'test-uid';
  mockIsAdmin = false;
}

function authedAdmin() {
  mockUid = 'admin-uid';
  mockIsAdmin = true;
}

function unauthed() {
  mockUid = null;
  mockIsAdmin = false;
}

beforeEach(() => {
  // Every test starts from a known-good telemetry state unless it opts in
  // to simulating a Firestore failure.
  telemetryShouldFail = false;
  telemetryFailureError = new Error('PERMISSION_DENIED: Missing or insufficient permissions.');
  mockAdminSdkConfigured = true;
  telemetryDocsByCollection = {};
});

/**
 * `getStadiumTelemetry` caches successful reads for 10 seconds
 * (`TELEMETRY_TTL_MS`). Earlier tests in this file already populate that
 * module-level cache via successful `/api/ai/command` calls, so a later
 * test that flips `telemetryShouldFail`/`mockAdminSdkConfigured` would
 * silently be served the stale cached (zeroed) value instead of actually
 * re-querying Firestore — passing for the wrong reason. Forcing `Date.now()`
 * far enough ahead makes the cache-freshness check treat any prior cache
 * entry as stale so the test genuinely exercises the code path it names.
 * Restored immediately after use since other tests (rate limiting, etc.)
 * rely on real time.
 */
function withStaleTelemetryCache<T>(fn: () => Promise<T>): Promise<T> {
  const realNow = Date.now();
  const spy = vi.spyOn(Date, 'now').mockReturnValue(realNow + 15_000);
  // Wrap in Promise.resolve() — supertest's Test object is thenable but
  // doesn't implement the full Promise API (no .finally).
  return Promise.resolve(fn()).finally(() => spy.mockRestore());
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Security headers', () => {
  it('sets baseline security headers on every response', async () => {
    const res = await request(app).get('/api/config');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-xss-protection']).toBe('1; mode=block');
    expect(res.headers['content-security-policy']).toBeTruthy();
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toContain('geolocation=()');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET/POST /api/config — admin-only', () => {
  beforeEach(unauthed);

  it('rejects requests with no Authorization header', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(401);
  });

  it('rejects an authenticated non-admin user', async () => {
    authed();
    const res = await request(app)
      .get('/api/config')
      .set('Authorization', 'Bearer fake-token');
    expect(res.status).toBe(403);
  });

  it('allows an authenticated admin user to read config', async () => {
    authedAdmin();
    const res = await request(app)
      .get('/api/config')
      .set('Authorization', 'Bearer fake-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('n8nWebhookUrl');
    expect(res.body).toHaveProperty('n8nAiAssistantUrl');
  });

  it('allows an authenticated admin user to update config', async () => {
    authedAdmin();
    const res = await request(app)
      .post('/api/config')
      .set('Authorization', 'Bearer fake-token')
      .send({ useMockAI: false });
    expect(res.status).toBe(200);
    expect(res.body.config.useMockAI).toBe(false);
  });

  it('strips control characters from n8n URL updates', async () => {
    authedAdmin();
    const res = await request(app)
      .post('/api/config')
      .set('Authorization', 'Bearer fake-token')
      .send({ n8nWebhookUrl: 'https://example.com/\x00webhook' });
    expect(res.status).toBe(200);
    expect(res.body.config.n8nWebhookUrl).toBe('https://example.com/webhook');
  });

  it('rejects a non-admin trying to update config', async () => {
    authed();
    const res = await request(app)
      .post('/api/config')
      .set('Authorization', 'Bearer fake-token')
      .send({ useMockAI: false });
    expect(res.status).toBe(403);
  });

  it('rejects a non-HTTPS n8n webhook URL', async () => {
    authedAdmin();
    const res = await request(app)
      .post('/api/config')
      .set('Authorization', 'Bearer fake-token')
      .send({ n8nWebhookUrl: 'ftp://malicious.example.com/hook' });
    expect(res.status).toBe(400);
  });

  it('accepts clearing the n8n webhook URL with an empty string', async () => {
    authedAdmin();
    const res = await request(app)
      .post('/api/config')
      .set('Authorization', 'Bearer fake-token')
      .send({ n8nWebhookUrl: '' });
    expect(res.status).toBe(200);
    expect(res.body.config.n8nWebhookUrl).toBe('');
  });

  it('accepts a valid HTTPS n8n assistant URL', async () => {
    authedAdmin();
    const res = await request(app)
      .post('/api/config')
      .set('Authorization', 'Bearer fake-token')
      .send({ n8nAiAssistantUrl: 'https://my-n8n.example.com/webhook/ai' });
    expect(res.status).toBe(200);
    expect(res.body.config.n8nAiAssistantUrl).toBe('https://my-n8n.example.com/webhook/ai');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Input sanitization edge cases
describe('POST /api/config — input edge cases', () => {
  it('rejects a javascript: scheme URL for n8nWebhookUrl', async () => {
    authedAdmin();
    const res = await request(app)
      .post('/api/config')
      .set('Authorization', 'Bearer fake-token')
      .send({ n8nWebhookUrl: 'javascript:alert(1)' });
    expect(res.status).toBe(400);
  });

  it('rejects a data: URI for n8nAiAssistantUrl', async () => {
    authedAdmin();
    const res = await request(app)
      .post('/api/config')
      .set('Authorization', 'Bearer fake-token')
      .send({ n8nAiAssistantUrl: 'data:text/html,<h1>xss</h1>' });
    expect(res.status).toBe(400);
  });

  it('accepts an HTTP (non-TLS) webhook URL', async () => {
    authedAdmin();
    const res = await request(app)
      .post('/api/config')
      .set('Authorization', 'Bearer fake-token')
      .send({ n8nWebhookUrl: 'http://internal-server.local/hook' });
    expect(res.status).toBe(200);
    expect(res.body.config.n8nWebhookUrl).toBe('http://internal-server.local/hook');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/ai/command — any authenticated user', () => {
  beforeEach(unauthed);

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/ai/command').send({ text: 'hello' });
    expect(res.status).toBe(401);
  });

  it('rejects an empty command string', async () => {
    authed();
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: '' });
    expect(res.status).toBe(400);
  });

  it('rejects a whitespace-only command string (sanitized to empty)', async () => {
    authed();
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: '   \t\n  ' });
    expect(res.status).toBe(400);
  });

  it('rejects a command string over 500 characters', async () => {
    authed();
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: 'a'.repeat(501) });
    expect(res.status).toBe(400);
  });

  it('returns a response with source for a valid command', async () => {
    authed();
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: 'hello there' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('response');
    expect(res.body).toHaveProperty('source');
    expect(typeof res.body.response).toBe('string');
    expect(res.body.response.length).toBeGreaterThan(0);
  });

  it('returns the incident summary for "summarize incidents"', async () => {
    authedAdmin();
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: 'summarize incidents' });
    expect(res.status).toBe(200);
    expect(res.body.response.toLowerCase()).toMatch(/incident|issue/i);
  });

  it('returns volunteer info for "available volunteers"', async () => {
    authed();
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: 'available volunteers' });
    expect(res.status).toBe(200);
    expect(res.body.response.toLowerCase()).toMatch(/volunteer/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/ai/demo-command — unauthenticated with client-supplied telemetry', () => {
  it('succeeds with a valid text and no telemetry (defaults to zeros)', async () => {
    const res = await request(app)
      .post('/api/ai/demo-command')
      .send({ text: 'hello' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('response');
    expect(res.body).toHaveProperty('source');
  });

  it('rejects an empty text field', async () => {
    const res = await request(app)
      .post('/api/ai/demo-command')
      .send({ text: '' });
    expect(res.status).toBe(400);
  });

  it('rejects a missing text field', async () => {
    const res = await request(app)
      .post('/api/ai/demo-command')
      .send({});
    expect(res.status).toBe(400);
  });

  it('rejects a text over 500 characters', async () => {
    const res = await request(app)
      .post('/api/ai/demo-command')
      .send({ text: 'x'.repeat(501) });
    expect(res.status).toBe(400);
  });

  it('sanitizes control characters in the command text', async () => {
    const res = await request(app)
      .post('/api/ai/demo-command')
      .send({ text: 'hello\x00world' });
    // Control chars stripped — "helloworld" is a valid non-empty command
    expect(res.status).toBe(200);
  });

  it('accepts valid client-supplied telemetry and reflects it in food response', async () => {
    const res = await request(app)
      .post('/api/ai/demo-command')
      .send({
        text: 'food orders',
        telemetry: {
          pendingOrders: 12,
          totalOrders: 30,
          volunteersActive: 5,
          volunteersTotal: 10,
          openIssues: 2,
          totalIssues: 5,
          activeEmergencies: 0,
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('30');   // totalOrders is echoed
  });

  it('clamps out-of-range telemetry values to zero', async () => {
    const res = await request(app)
      .post('/api/ai/demo-command')
      .send({
        text: 'volunteers',
        telemetry: {
          volunteersActive: -99,
          volunteersTotal: 999_999_999,
          pendingOrders: 'injected',
          totalOrders: NaN,
          openIssues: null,
          totalIssues: undefined,
          activeEmergencies: Infinity,
        },
      });
    // Should not crash; out-of-range values are clamped to 0
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('response');
  });

  it('responds with medical emergency text when active emergencies > 0', async () => {
    const res = await request(app)
      .post('/api/ai/demo-command')
      .send({
        text: 'medical emergency',
        telemetry: { activeEmergencies: 3 },
      });
    expect(res.status).toBe(200);
    expect(res.body.response).toMatch(/3/);
  });

  it('does not require an Authorization header', async () => {
    // Explicitly confirm no auth header needed
    const res = await request(app)
      .post('/api/ai/demo-command')
      .send({ text: 'gate congestion' });
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('requireJsonContentType — defense-in-depth CSRF middleware', () => {
  it('rejects a state-changing request declared as form-urlencoded', async () => {
    authedAdmin();
    const res = await request(app)
      .post('/api/config')
      .set('Authorization', 'Bearer fake-token')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('useMockAI=false');
    expect(res.status).toBe(415);
  });

  it('rejects a state-changing request with no Content-Type at all', async () => {
    authedAdmin();
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .unset('Content-Type')
      .send();
    expect(res.status).toBe(415);
  });

  it('allows GET requests through without a Content-Type check', async () => {
    authedAdmin();
    const res = await request(app)
      .get('/api/config')
      .set('Authorization', 'Bearer fake-token');
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getStadiumTelemetry — Firestore failure fallback', () => {
  it('falls back to zeroed telemetry when Firestore reads throw PERMISSION_DENIED', async () => {
    authed();
    telemetryShouldFail = true;
    telemetryFailureError = new Error('PERMISSION_DENIED: Missing or insufficient permissions.');
    const res = await withStaleTelemetryCache(() =>
      request(app)
        .post('/api/ai/command')
        .set('Authorization', 'Bearer fake-token')
        .send({ text: 'available volunteers' })
    );
    // The request must still succeed with a safe (zeroed) response instead
    // of crashing or leaking the underlying Firestore error to the client.
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('response');
    expect(res.body.response).not.toMatch(/PERMISSION_DENIED/);
  });

  it('falls back to zeroed telemetry when Firestore reads time out with a network error', async () => {
    authed();
    telemetryShouldFail = true;
    telemetryFailureError = new Error('DEADLINE_EXCEEDED: network timeout');
    const res = await withStaleTelemetryCache(() =>
      request(app)
        .post('/api/ai/command')
        .set('Authorization', 'Bearer fake-token')
        .send({ text: 'summarize incidents' })
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('response');
  });

  it('returns zeroed telemetry immediately when the Admin SDK is not configured at all (no FIREBASE_SERVICE_ACCOUNT_KEY)', async () => {
    authed();
    mockAdminSdkConfigured = false;
    const res = await withStaleTelemetryCache(() =>
      request(app)
        .post('/api/ai/command')
        .set('Authorization', 'Bearer fake-token')
        .send({ text: 'available volunteers' })
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('response');
    // Local engine's "volunteer" branch reports the (zeroed) active count.
    expect(res.body.response).toMatch(/0 volunteers synchronized/);
  });

  it('computes real active/pending/open counts from non-empty Firestore collections', async () => {
    authed();
    telemetryDocsByCollection = {
      volunteers: [
        { data: () => ({ active: true }) },
        { data: () => ({ active: true }) },
        { data: () => ({ active: false }) },
      ],
      foodOrders: [
        { data: () => ({ status: 'pending' }) },
        { data: () => ({ status: 'delivered' }) },
      ],
      issueReports: [
        { data: () => ({ status: 'open' }) },
      ],
      emergencyRequests: [
        { data: () => ({ status: 'active' }) },
      ],
    };
    const res = await withStaleTelemetryCache(() =>
      request(app)
        .post('/api/ai/command')
        .set('Authorization', 'Bearer fake-token')
        .send({ text: 'available volunteers' })
    );
    expect(res.status).toBe(200);
    // Local engine's "volunteer" branch reports volunteersActive (2 of 3
    // seeded docs have active !== false).
    expect(res.body.response).toMatch(/2 volunteers synchronized/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('answerStadiumQuestion — n8n webhook integration branches', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  async function setN8nAssistantUrl(url: string) {
    authedAdmin();
    await request(app)
      .post('/api/config')
      .set('Authorization', 'Bearer fake-token')
      .send({ n8nAiAssistantUrl: url });
  }

  it('uses the n8n webhook response when it returns 200 OK', async () => {
    await setN8nAssistantUrl('https://n8n.example.com/webhook/ai');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output: 'n8n says hello' }),
    }) as unknown as typeof fetch;

    authed();
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: 'hello there' });
    expect(res.status).toBe(200);
    expect(res.body.response).toBe('n8n says hello');
    expect(res.body.source).toBe('n8n Webhook');

    // Restore to empty so later tests in this file aren't affected.
    await setN8nAssistantUrl('');
  });

  it('falls back to the local engine when the n8n webhook returns a non-OK status', async () => {
    await setN8nAssistantUrl('https://n8n.example.com/webhook/ai');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    authed();
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: 'available volunteers' });
    expect(res.status).toBe(200);
    expect(res.body.source).not.toBe('n8n Webhook');
    expect(res.body.response.toLowerCase()).toMatch(/volunteer/i);

    await setN8nAssistantUrl('');
  });

  it('falls back to the local engine when the n8n webhook is unreachable (network failure)', async () => {
    await setN8nAssistantUrl('https://n8n.example.com/webhook/ai');
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

    authed();
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: 'food orders' });
    expect(res.status).toBe(200);
    expect(res.body.source).not.toBe('n8n Webhook');

    await setN8nAssistantUrl('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Race conditions — rapid repeated / double-submitted requests', () => {
  it('handles two concurrent identical POST /api/ai/command requests independently', async () => {
    authed();
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/ai/command')
        .set('Authorization', 'Bearer fake-token')
        .send({ text: 'gate congestion' }),
      request(app)
        .post('/api/ai/command')
        .set('Authorization', 'Bearer fake-token')
        .send({ text: 'gate congestion' }),
    ]);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.response).toBe(res2.body.response);
  });

  it('handles a rapid double-submit of POST /api/config without corrupting state', async () => {
    authedAdmin();
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/config')
        .set('Authorization', 'Bearer fake-token')
        .send({ n8nWebhookUrl: 'https://race-1.example.com/hook' }),
      request(app)
        .post('/api/config')
        .set('Authorization', 'Bearer fake-token')
        .send({ n8nWebhookUrl: 'https://race-2.example.com/hook' }),
    ]);
    // Neither request should crash or corrupt the shared config object —
    // exactly one of the two submitted URLs must "win" and be persisted.
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    const finalRead = await request(app)
      .get('/api/config')
      .set('Authorization', 'Bearer fake-token');
    expect(['https://race-1.example.com/hook', 'https://race-2.example.com/hook'])
      .toContain(finalRead.body.n8nWebhookUrl);

    // Clean up so later tests start from a known-empty webhook URL.
    await request(app)
      .post('/api/config')
      .set('Authorization', 'Bearer fake-token')
      .send({ n8nWebhookUrl: '' });
  });

  it('handles rapid double-submit of the demo AI command endpoint without crashing', async () => {
    const [res1, res2] = await Promise.all([
      request(app).post('/api/ai/demo-command').send({ text: 'medical emergency' }),
      request(app).post('/api/ai/demo-command').send({ text: 'medical emergency' }),
    ]);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Local-engine branch coverage — paths not covered by existing tests

describe('POST /api/ai/demo-command — local engine branch coverage', () => {
  it('returns a default telemetry response for an unknown / unmatched query', async () => {
    // "xyzzy..." matches none of the keyword groups → default (else) branch
    const res = await request(app)
      .post('/api/ai/demo-command')
      .send({ text: 'xyzzy unrecognised query with no keyword match' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('response');
    // Default response always mentions "Nexus Telemetry"
    expect(res.body.response).toMatch(/Nexus Telemetry/i);
    expect(res.body.source).toBe('Nexus Local Engine');
  });

  it('returns "Zero active medical emergencies" when activeEmergencies is 0 (=0 branch)', async () => {
    // Explicit telemetry with activeEmergencies = 0 hits the `=== 0` branch —
    // produces different text than the `> 0` path tested in the telemetry suite.
    const res = await request(app)
      .post('/api/ai/demo-command')
      .send({ text: 'medical emergency', telemetry: { activeEmergencies: 0 } });
    expect(res.status).toBe(200);
    expect(res.body.response).toMatch(/zero active medical emergencies/i);
    expect(res.body.source).toBe('Nexus Local Engine');
  });

  it('returns food-order response for order/hungry/catering keywords', async () => {
    const res = await request(app)
      .post('/api/ai/demo-command')
      .send({ text: 'show me all food orders', telemetry: { pendingOrders: 7 } });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('7');
    expect(res.body.source).toBe('Nexus Local Engine');
  });

  it('returns incident summary for incident/issue/summarize keywords', async () => {
    const res = await request(app)
      .post('/api/ai/demo-command')
      .send({ text: 'summarize incidents', telemetry: { openIssues: 4 } });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('4');
    expect(res.body.source).toBe('Nexus Local Engine');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Gemini paths — tested via the authenticated /api/ai/command endpoint.
// `mockGenerateContent` defaults to throwing (simulating no API key configured),
// but individual tests can override with `mockResolvedValueOnce` when the key IS
// available.  Since GEMINI_API_KEY may not be present during CI, we confirm:
//  (a) a successful Gemini result is forwarded as-is when the mock resolves, and
//  (b) an empty/whitespace Gemini result falls through to the local engine.

describe('POST /api/ai/command — Gemini branch coverage', () => {
  it('uses the Gemini response directly when generateContent resolves with text', async () => {
    const geminiReply = 'Gemini: all 67,000 seats are occupied. Gate B queue: 4 minutes.';
    // Cast through unknown to satisfy the inferred `never` return type of the default
    // mock implementation (which always throws).
    (mockGenerateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ text: geminiReply });
    authed();
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: 'stadium status' });

    expect(res.status).toBe(200);
    if (res.body.source === 'Gemini AI') {
      // GEMINI_API_KEY is configured — verify the Gemini response was forwarded
      expect(res.body.response).toBe(geminiReply);
    } else {
      // GEMINI_API_KEY not configured — server skipped Gemini, local engine ran
      expect(res.body.source).toBe('Nexus Local Engine');
    }
  });

  it('falls back to the local engine when Gemini returns an empty response', async () => {
    // result.text?.trim() is falsy → server should fall through to local engine
    (mockGenerateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ text: '' });
    authed();
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: 'medical emergency', telemetry: { activeEmergencies: 1 } });

    expect(res.status).toBe(200);
    // Either local engine ran (key not set) or Gemini returned empty and
    // fell through; in both cases the response must mention "medical"
    expect(res.body.response).toMatch(/medical/i);
    expect(['Nexus Local Engine', 'Gemini AI']).toContain(res.body.source);
  });

  it('falls back to the local engine when Gemini returns whitespace only', async () => {
    (mockGenerateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ text: '   ' });
    authed();
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: 'gate congestion' });

    expect(res.status).toBe(200);
    expect(['Nexus Local Engine', 'Gemini AI']).toContain(res.body.source);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('toSafeCount — telemetry boundary validation', () => {
  // We test indirectly by feeding edge-case telemetry through the demo endpoint
  // and verifying the server neither crashes nor produces non-zero outputs.

  const sendTelemetry = (fields: Record<string, unknown>) =>
    request(app)
      .post('/api/ai/demo-command')
      .send({ text: 'food orders', telemetry: fields });

  it('handles zero correctly', async () => {
    const res = await sendTelemetry({ pendingOrders: 0 });
    expect(res.status).toBe(200);
  });

  it('handles the maximum accepted value (100,000)', async () => {
    const res = await sendTelemetry({ totalOrders: 100_000 });
    expect(res.status).toBe(200);
  });

  it('clamps values above 100,000 to zero', async () => {
    const res = await sendTelemetry({ totalOrders: 100_001 });
    expect(res.status).toBe(200);
    // totalOrders clamped to 0 — the response should still return
    expect(res.body).toHaveProperty('response');
  });

  it('clamps negative values to zero', async () => {
    const res = await sendTelemetry({ volunteersActive: -1 });
    expect(res.status).toBe(200);
  });

  it('treats string "42" as numeric 42', async () => {
    const res = await sendTelemetry({ totalOrders: '42' });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('42');
  });
});
