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

describe('Security headers', () => {
  it('sets baseline security headers on every response', async () => {
    const res = await request(app).get('/api/config');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toBeTruthy();
  });
});

describe('GET/POST /api/config — admin-only', () => {
  beforeEach(() => {
    mockUid = null;
    mockIsAdmin = false;
  });

  it('rejects requests with no Authorization header', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(401);
  });

  it('rejects an authenticated non-admin user', async () => {
    mockUid = 'fan-uid-1';
    mockIsAdmin = false;
    const res = await request(app)
      .get('/api/config')
      .set('Authorization', 'Bearer fake-token');
    expect(res.status).toBe(403);
  });

  it('allows an authenticated admin user to read config', async () => {
    mockUid = 'admin-uid-1';
    mockIsAdmin = true;
    const res = await request(app)
      .get('/api/config')
      .set('Authorization', 'Bearer fake-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('n8nWebhookUrl');
  });

  it('allows an authenticated admin user to update config', async () => {
    mockUid = 'admin-uid-1';
    mockIsAdmin = true;
    const res = await request(app)
      .post('/api/config')
      .set('Authorization', 'Bearer fake-token')
      .send({ useMockAI: false });
    expect(res.status).toBe(200);
    expect(res.body.config.useMockAI).toBe(false);
  });

  it('rejects a non-admin trying to update config', async () => {
    mockUid = 'fan-uid-1';
    mockIsAdmin = false;
    const res = await request(app)
      .post('/api/config')
      .set('Authorization', 'Bearer fake-token')
      .send({ useMockAI: false });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/ai/command — any authenticated user', () => {
  beforeEach(() => {
    mockUid = null;
    mockIsAdmin = false;
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/ai/command').send({ text: 'hello' });
    expect(res.status).toBe(401);
  });

  it('rejects an empty command string', async () => {
    mockUid = 'fan-uid-1';
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: '' });
    expect(res.status).toBe(400);
  });

  it('returns a fallback local-engine response for a non-admin authenticated fan', async () => {
    mockUid = 'fan-uid-1';
    mockIsAdmin = false;
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: 'hello there' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('response');
    expect(res.body).toHaveProperty('source');
  });

  it('answers volunteers/admin the same way (no role restriction on this endpoint)', async () => {
    mockUid = 'admin-uid-1';
    mockIsAdmin = true;
    const res = await request(app)
      .post('/api/ai/command')
      .set('Authorization', 'Bearer fake-token')
      .send({ text: 'summarize incidents' });
    expect(res.status).toBe(200);
  });
});
