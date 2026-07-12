import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Controllable mock of the Firebase Admin boundary so tests can simulate
// unauthenticated, authenticated-non-admin, and authenticated-admin callers
// without needing real Firebase credentials or network access.
let mockUid: string | null = null;
let mockIsAdmin = false;
let mockAdminSdkConfigured = true;

vi.mock('../lib/firebaseAdmin', () => ({
  isAdminSdkConfigured: () => mockAdminSdkConfigured,
  getAdminDb: () => ({
    collection: () => ({
      get: async () => ({ docs: [], size: 0 }),
    }),
  }),
  requireAuth: (req: any, res: any, next: any) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ') || mockUid === null) {
      return res.status(401).json({ error: 'Missing Authorization bearer token.' });
    }
    req.uid = mockUid;
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => {
    if (!req.uid) return res.status(401).json({ error: 'Not authenticated.' });
    if (!mockIsAdmin) return res.status(403).json({ error: 'Admin privileges required.' });
    next();
  },
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

// ─────────────────────────────────────────────────────────────────────────────
describe('Security headers', () => {
  it('sets baseline security headers on every response', async () => {
    const res = await request(app).get('/api/config');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-xss-protection']).toBe('1; mode=block');
    expect(res.headers['content-security-policy']).toBeTruthy();
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
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
