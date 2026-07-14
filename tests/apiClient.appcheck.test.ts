/**
 * Tests the App Check token attachment path in authedFetch (lines 23-25 of
 * apiClient.ts), which is only reachable when the `appCheck` export from
 * src/firebase.ts is non-null.  This must be a separate test file from
 * tests/apiClient.test.ts because that file mocks appCheck as null (the
 * default, unconfigured state) — a Vitest module cache means we cannot
 * re-mock the same module with different values inside the same file.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

const mockGetToken = vi.fn().mockResolvedValue({ token: 'appcheck-token-xyz' });

vi.mock('firebase/app-check', () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
}));

// appCheck is truthy — exercises lines 23-25 in authedFetch
vi.mock('../src/firebase', () => ({
  auth: {
    currentUser: { getIdToken: vi.fn().mockResolvedValue('user-id-token') },
  },
  appCheck: { app: {} }, // truthy value triggers the App Check branch
}));

vi.mock('../src/services/dataSource', () => ({
  isDemoModeActive: () => false,
}));

vi.mock('../src/services/demoStore', () => ({
  getDemoDocs: () => [],
}));

const { authedFetch } = await import('../src/services/apiClient');

describe('authedFetch — App Check configured (appCheck is non-null)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('attaches X-Firebase-AppCheck header when App Check is configured', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchSpy);

    await authedFetch('/api/config');

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('X-Firebase-AppCheck')).toBe('appcheck-token-xyz');
  });

  it('attaches both Authorization and X-Firebase-AppCheck headers together', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchSpy);

    await authedFetch('/api/ai/command');

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer user-id-token');
    expect(headers.get('X-Firebase-AppCheck')).toBe('appcheck-token-xyz');
  });

  it('does not block the request when App Check token fetch throws', async () => {
    mockGetToken.mockRejectedValueOnce(new Error('App Check not initialised yet'));
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchSpy);

    // Must resolve without throwing — App Check failure is always silent
    await expect(authedFetch('/api/config')).resolves.toBeDefined();
    // fetch was still called (request not blocked)
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
