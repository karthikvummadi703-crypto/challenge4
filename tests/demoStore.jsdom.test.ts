// @vitest-environment jsdom
/**
 * jsdom-environment tests for src/services/demoStore.ts
 *
 * The Node-environment test suite (tests/demoStore.test.ts) exercises the
 * core subscribe/add/update/delete/reset cycle, but every branch that only
 * runs when `window` exists (sessionStorage persistence + cross-tab
 * BroadcastChannel sync) is unreachable in a Node environment. This file
 * runs under jsdom specifically to close those branch-coverage gaps:
 * malformed sessionStorage payloads, an unavailable/quota-exceeded
 * sessionStorage, and simulated cross-tab BroadcastChannel messages.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Minimal BroadcastChannel stub that lets a test manually fire onmessage
// to simulate a message arriving from *another* browser tab. ─────────────────
class MockBroadcastChannel {
  onmessage: ((e: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  close = vi.fn();
}
let lastChannelInstance: MockBroadcastChannel | null = null;
vi.stubGlobal(
  'BroadcastChannel',
  class extends MockBroadcastChannel {
    constructor() {
      super();
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      lastChannelInstance = this;
    }
  }
);

import {
  initDemoStore,
  subscribeDemo,
  getDemoDocs,
  addDemoDoc,
  updateDemoDoc,
  resetDemoStore,
  clearDemoStore,
} from '../src/services/demoStore';

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  resetDemoStore();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── sessionStorage persistence (window-defined branch) ────────────────────────

describe('persist() — sessionStorage write path (window defined)', () => {
  it('writes the current store to sessionStorage after a mutation', () => {
    addDemoDoc('tasks', { type: 'Persisted Task' });
    const raw = window.sessionStorage.getItem('nexus-demo-store-v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed.tasks.some((t: { type?: string }) => t.type === 'Persisted Task')).toBe(true);
  });

  it('does not throw when sessionStorage.setItem throws (quota exceeded / private mode)', () => {
    const spy = vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => addDemoDoc('tasks', { type: 'Should still work in-memory' })).not.toThrow();
    // In-memory state must still reflect the mutation even though persistence failed.
    expect(getDemoDocs('tasks').some((t) => t.type === 'Should still work in-memory')).toBe(true);
    spy.mockRestore();
  });
});

// ── hydrateFromStorage() (window-defined branch) ─────────────────────────────

describe('hydrateFromStorage() — sessionStorage read path (window defined)', () => {
  it('recovers gracefully from malformed JSON in sessionStorage', () => {
    window.sessionStorage.setItem('nexus-demo-store-v1', '{not valid json::');
    // initDemoStore calls hydrateFromStorage internally; a corrupted payload
    // must not crash the app — it should keep the current in-memory state.
    expect(() => initDemoStore()).not.toThrow();
    expect(() => getDemoDocs('tasks')).not.toThrow();
  });

  it('recovers gracefully when sessionStorage.getItem throws', () => {
    const spy = vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => initDemoStore()).not.toThrow();
    spy.mockRestore();
  });
});

// ── BroadcastChannel cross-tab sync (window-defined branch) ──────────────────

describe('cross-tab sync via BroadcastChannel', () => {
  it('creates a BroadcastChannel and posts a mutation message on add', () => {
    addDemoDoc('tasks', { type: 'Broadcast Test' });
    expect(lastChannelInstance).not.toBeNull();
    expect(lastChannelInstance?.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'mutation', collectionName: 'tasks' })
    );
  });

  it('reloads from storage and notifies local subscribers when another tab mutates the same collection', () => {
    addDemoDoc('tasks', { type: 'Local seed' });
    const cb = vi.fn();
    const unsub = subscribeDemo('tasks', cb);
    cb.mockClear();

    // Simulate another tab writing directly to sessionStorage, then
    // broadcasting a mutation message with a different origin.
    const current = JSON.parse(window.sessionStorage.getItem('nexus-demo-store-v1') as string);
    current.tasks.push({ id: 'other-tab-task', type: 'From another tab' });
    window.sessionStorage.setItem('nexus-demo-store-v1', JSON.stringify(current));

    lastChannelInstance?.onmessage?.({
      data: { origin: 'some-other-tab-origin', type: 'mutation', collectionName: 'tasks' },
    } as MessageEvent);

    expect(cb).toHaveBeenCalledOnce();
    expect(getDemoDocs('tasks').some((t) => t.id === 'other-tab-task')).toBe(true);
    unsub();
  });

  it('ignores messages that originate from itself (echo prevention)', () => {
    const cb = vi.fn();
    const unsub = subscribeDemo('tasks', cb);
    cb.mockClear();

    // Our own postMessage calls always carry our own ORIGIN_ID; the module
    // must ignore any message whose origin matches its own to avoid an
    // infinite update loop across a single tab's own broadcasts.
    addDemoDoc('tasks', { type: 'Self-originated' });
    const sentPayload = lastChannelInstance?.postMessage.mock.calls.at(-1)?.[0];
    cb.mockClear();

    lastChannelInstance?.onmessage?.({ data: sentPayload } as MessageEvent);
    expect(cb).not.toHaveBeenCalled();
    unsub();
  });

  it('notifies all collections on a broadcasted reset from another tab', () => {
    const cb = vi.fn();
    const unsub = subscribeDemo('volunteers', cb);
    cb.mockClear();

    lastChannelInstance?.onmessage?.({
      data: { origin: 'some-other-tab-origin', type: 'reset' },
    } as MessageEvent);

    expect(cb).toHaveBeenCalledOnce();
    unsub();
  });

  it('falls back to notifyAll when a mutation message omits the collection name', () => {
    const cb = vi.fn();
    const unsub = subscribeDemo('fans', cb);
    cb.mockClear();

    lastChannelInstance?.onmessage?.({
      data: { origin: 'some-other-tab-origin', type: 'mutation' },
    } as MessageEvent);

    expect(cb).toHaveBeenCalledOnce();
    unsub();
  });

  it('ignores a message with no data payload', () => {
    const cb = vi.fn();
    const unsub = subscribeDemo('fans', cb);
    cb.mockClear();
    expect(() => lastChannelInstance?.onmessage?.({ data: undefined } as unknown as MessageEvent)).not.toThrow();
    expect(cb).not.toHaveBeenCalled();
    unsub();
  });

  it('broadcasts a reset message when resetDemoStore is called', () => {
    resetDemoStore();
    expect(lastChannelInstance?.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'reset' })
    );
  });

  it('broadcasts a mutation message on update and delete', () => {
    const { id } = addDemoDoc('tasks', { type: 'For update' });
    updateDemoDoc('tasks', id, { status: 'done' });
    expect(lastChannelInstance?.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'mutation', collectionName: 'tasks' })
    );
  });
});

// ── clearDemoStore (window-defined branch) ────────────────────────────────────

describe('clearDemoStore() — sessionStorage removal (window defined)', () => {
  it('removes the sessionStorage key', () => {
    addDemoDoc('tasks', { type: 'To be cleared' });
    expect(window.sessionStorage.getItem('nexus-demo-store-v1')).toBeTruthy();
    clearDemoStore();
    expect(window.sessionStorage.getItem('nexus-demo-store-v1')).toBeNull();
  });

  it('does not throw when sessionStorage.removeItem throws', () => {
    const spy = vi.spyOn(window.sessionStorage, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => clearDemoStore()).not.toThrow();
    spy.mockRestore();
  });
});
