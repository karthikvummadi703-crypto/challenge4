/**
 * Unit tests for src/services/apiClient.ts
 *
 * Both exported functions (authedFetch and sendAICommand) are tested via
 * fetch mocking so no real network calls are made.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoist mutable state so vi.mock factories can close over it ────────────────
const { mockGetIdToken, demoModeRef } = vi.hoisted(() => ({
  mockGetIdToken: vi.fn().mockResolvedValue('mock-token-abc'),
  demoModeRef:    { active: false },
}));

// ── Mock firebase auth ────────────────────────────────────────────────────────
vi.mock('../src/firebase', () => ({
  auth: {
    currentUser: { getIdToken: mockGetIdToken },
  },
}));

// ── Mock dataSource (controls demo mode flag) ─────────────────────────────────
vi.mock('../src/services/dataSource', () => ({
  isDemoModeActive: () => demoModeRef.active,
}));

// ── Mock demoStore (telemetry data used in demo AI command) ───────────────────
vi.mock('../src/services/demoStore', () => ({
  getDemoDocs: (name: string) => {
    const data: Record<string, Array<Record<string, unknown>>> = {
      volunteers:        [{ active: true }, { active: true }, { active: false }],
      foodOrders:        [{ status: 'pending' }, { status: 'delivered' }],
      issueReports:      [{ status: 'open' }, { status: 'resolved' }],
      emergencyRequests: [{ status: 'active' }],
    };
    return data[name] ?? [];
  },
}));

import { authedFetch, sendAICommand } from '../src/services/apiClient';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch(body: unknown, status = 200): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  demoModeRef.active = false;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── authedFetch ───────────────────────────────────────────────────────────────

describe('authedFetch', () => {
  it('attaches a Bearer Authorization header when a user is logged in', async () => {
    const fetchSpy = mockFetch({ ok: true });
    vi.stubGlobal('fetch', fetchSpy);

    await authedFetch('/api/config');

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer mock-token-abc');
  });

  it('calls the correct URL', async () => {
    const fetchSpy = mockFetch({});
    vi.stubGlobal('fetch', fetchSpy);

    await authedFetch('/api/some-endpoint');

    expect(fetchSpy.mock.calls[0][0]).toBe('/api/some-endpoint');
  });

  it('merges caller-supplied headers with the auth header', async () => {
    const fetchSpy = mockFetch({});
    vi.stubGlobal('fetch', fetchSpy);

    await authedFetch('/api/config', {
      headers: { 'Content-Type': 'application/json' },
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer mock-token-abc');
  });

  it('forwards the method and body from options', async () => {
    const fetchSpy = mockFetch({});
    vi.stubGlobal('fetch', fetchSpy);

    await authedFetch('/api/config', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"key":"value"}');
  });

  it('returns the raw Response object', async () => {
    const fetchSpy = mockFetch({ data: 42 }, 200);
    vi.stubGlobal('fetch', fetchSpy);

    const res = await authedFetch('/api/config');
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBe(42);
  });
});

// ── sendAICommand — live mode ─────────────────────────────────────────────────

describe('sendAICommand (live mode)', () => {
  it('POSTs to /api/ai/command with the message text', async () => {
    const fetchSpy = mockFetch({ response: 'AI response', source: 'gemini' });
    vi.stubGlobal('fetch', fetchSpy);

    await sendAICommand('How many fans today?');

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/ai/command');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string) as { text: string };
    expect(body.text).toBe('How many fans today?');
  });

  it('returns the parsed response and source fields', async () => {
    vi.stubGlobal('fetch', mockFetch({ response: 'Looks good!', source: 'gemini' }));
    const result = await sendAICommand('Status?');
    expect(result.response).toBe('Looks good!');
    expect(result.source).toBe('gemini');
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'Server error' }, 500));
    await expect(sendAICommand('Fail please')).rejects.toThrow('AI command failed.');
  });
});

// ── sendAICommand — demo mode ─────────────────────────────────────────────────

describe('sendAICommand (demo mode)', () => {
  beforeEach(() => { demoModeRef.active = true; });

  it('POSTs to /api/ai/demo-command (unauthenticated demo endpoint)', async () => {
    const fetchSpy = mockFetch({ response: 'Demo AI response', source: 'demo' });
    vi.stubGlobal('fetch', fetchSpy);

    await sendAICommand('Demo question');

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/ai/demo-command');
  });

  it('includes telemetry computed from demo store data', async () => {
    const fetchSpy = mockFetch({ response: 'ok', source: 'demo' });
    vi.stubGlobal('fetch', fetchSpy);

    await sendAICommand('Tell me the stats');

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      text: string;
      telemetry: Record<string, number>;
    };
    expect(body.text).toBe('Tell me the stats');
    // volunteers: 2 active out of 3
    expect(body.telemetry.volunteersActive).toBe(2);
    expect(body.telemetry.volunteersTotal).toBe(3);
    // foodOrders: 2 total, 1 pending
    expect(body.telemetry.totalOrders).toBe(2);
    expect(body.telemetry.pendingOrders).toBe(1);
    // issueReports: 2 total, 1 open
    expect(body.telemetry.totalIssues).toBe(2);
    expect(body.telemetry.openIssues).toBe(1);
    // emergencyRequests: 1 active
    expect(body.telemetry.activeEmergencies).toBe(1);
  });

  it('does NOT attach an Authorization header (demo uses public endpoint)', async () => {
    const fetchSpy = mockFetch({ response: 'ok', source: 'demo' });
    vi.stubGlobal('fetch', fetchSpy);

    await sendAICommand('Anon demo question');

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = new Headers((init?.headers as HeadersInit) || {});
    expect(headers.get('Authorization')).toBeNull();
  });

  it('throws when demo endpoint returns non-ok status', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'Demo server error' }, 503));
    await expect(sendAICommand('Fail demo')).rejects.toThrow('Demo AI command failed.');
  });
});
