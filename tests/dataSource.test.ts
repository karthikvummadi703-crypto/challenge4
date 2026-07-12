/**
 * Tests for src/services/dataSource.ts
 *
 * The data source module is a thin router that dispatches to either the
 * in-memory demo store or real Firestore depending on the `demoModeActive`
 * flag. These tests verify the routing logic without touching a real database.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firebase stubs ────────────────────────────────────────────────────────────
const mockUnsubscribe = vi.fn();
const mockOnSnapshot = vi.fn(() => mockUnsubscribe);
const mockAddDoc     = vi.fn().mockResolvedValue({ id: 'firestore-id' });
const mockUpdateDoc  = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc  = vi.fn().mockResolvedValue(undefined);
const mockCollection = vi.fn((db: unknown, name: string) => ({ _name: name }));
const mockDoc        = vi.fn((db: unknown, name: string, id: string) => ({ _name: name, _id: id }));

vi.mock('firebase/firestore', () => ({
  collection:  mockCollection,
  onSnapshot:  mockOnSnapshot,
  addDoc:      mockAddDoc,
  updateDoc:   mockUpdateDoc,
  deleteDoc:   mockDeleteDoc,
  doc:         mockDoc,
}));
vi.mock('../src/firebase', () => ({ db: {} }));

// ── Demo-store stubs ──────────────────────────────────────────────────────────
const mockSubscribeDemo = vi.fn(() => mockUnsubscribe);
const mockAddDemoDoc    = vi.fn().mockReturnValue({ id: 'demo-id' });
const mockUpdateDemoDoc = vi.fn();
const mockDeleteDemoDoc = vi.fn();

vi.mock('../src/services/demoStore', () => ({
  subscribeDemo:  mockSubscribeDemo,
  addDemoDoc:     mockAddDemoDoc,
  updateDemoDoc:  mockUpdateDemoDoc,
  deleteDemoDoc:  mockDeleteDemoDoc,
}));

// Import AFTER mocks are registered.
const {
  setDemoModeActive,
  isDemoModeActive,
  subscribeCollection,
  addRecord,
  updateRecord,
  deleteRecord,
  createRecordWithTask,
} = await import('../src/services/dataSource');

// ─────────────────────────────────────────────────────────────────────────────

describe('isDemoModeActive / setDemoModeActive', () => {
  it('starts in live mode (false)', () => {
    setDemoModeActive(false);
    expect(isDemoModeActive()).toBe(false);
  });

  it('reflects true after being set to true', () => {
    setDemoModeActive(true);
    expect(isDemoModeActive()).toBe(true);
    setDemoModeActive(false); // restore
  });

  it('can toggle back to false', () => {
    setDemoModeActive(true);
    setDemoModeActive(false);
    expect(isDemoModeActive()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('subscribeCollection routing', () => {
  beforeEach(() => {
    setDemoModeActive(false);
    vi.clearAllMocks();
  });

  it('calls onSnapshot (Firestore) when demo mode is off', () => {
    const cb = vi.fn();
    subscribeCollection('tasks', cb);
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
    expect(mockSubscribeDemo).not.toHaveBeenCalled();
  });

  it('calls subscribeDemo when demo mode is on', () => {
    setDemoModeActive(true);
    const cb = vi.fn();
    subscribeCollection('tasks', cb);
    expect(mockSubscribeDemo).toHaveBeenCalledTimes(1);
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it('returns the unsubscribe function from the underlying store', () => {
    const cb = vi.fn();
    const unsub = subscribeCollection('tasks', cb);
    expect(unsub).toBe(mockUnsubscribe);
  });

  it('returns the unsubscribe function from the demo store', () => {
    setDemoModeActive(true);
    const cb = vi.fn();
    const unsub = subscribeCollection('volunteers', cb);
    expect(unsub).toBe(mockUnsubscribe);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('addRecord routing', () => {
  beforeEach(() => {
    setDemoModeActive(false);
    vi.clearAllMocks();
  });

  it('calls addDoc (Firestore) when demo mode is off', async () => {
    const result = await addRecord('tasks', { type: 'Deliver Food' });
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDemoDoc).not.toHaveBeenCalled();
    expect(result.id).toBe('firestore-id');
  });

  it('calls addDemoDoc when demo mode is on', async () => {
    setDemoModeActive(true);
    const result = await addRecord('foodOrders', { item: 'Pizza' });
    expect(mockAddDemoDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc).not.toHaveBeenCalled();
    expect(result.id).toBe('demo-id');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('updateRecord routing', () => {
  beforeEach(() => {
    setDemoModeActive(false);
    vi.clearAllMocks();
  });

  it('calls updateDoc (Firestore) when demo mode is off', async () => {
    await updateRecord('tasks', 'task-1', { status: 'completed' });
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDemoDoc).not.toHaveBeenCalled();
  });

  it('calls updateDemoDoc when demo mode is on', async () => {
    setDemoModeActive(true);
    await updateRecord('tasks', 'task-1', { status: 'completed' });
    expect(mockUpdateDemoDoc).toHaveBeenCalledWith('tasks', 'task-1', { status: 'completed' });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('deleteRecord routing', () => {
  beforeEach(() => {
    setDemoModeActive(false);
    vi.clearAllMocks();
  });

  it('calls deleteDoc (Firestore) when demo mode is off', async () => {
    await deleteRecord('issueReports', 'report-1');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(mockDeleteDemoDoc).not.toHaveBeenCalled();
  });

  it('calls deleteDemoDoc when demo mode is on', async () => {
    setDemoModeActive(true);
    await deleteRecord('issueReports', 'report-1');
    expect(mockDeleteDemoDoc).toHaveBeenCalledWith('issueReports', 'report-1');
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('createRecordWithTask', () => {
  beforeEach(() => {
    setDemoModeActive(false);
    vi.clearAllMocks();
  });

  it('creates the primary record then a linked task with matching linkedId (Firestore)', async () => {
    mockAddDoc
      .mockResolvedValueOnce({ id: 'order-1' })
      .mockResolvedValueOnce({ id: 'task-1' });

    const result = await createRecordWithTask(
      'foodOrders',
      { status: 'pending' },
      { type: 'Deliver Food', status: 'pending' }
    );

    expect(mockAddDoc).toHaveBeenCalledTimes(2);
    // Second call creates the task with linkedId pointing at the first record.
    const [, taskData] = mockAddDoc.mock.calls[1] as [unknown, Record<string, unknown>];
    expect(taskData.linkedId).toBe('order-1');
    expect(taskData.type).toBe('Deliver Food');
    expect(result).toEqual({ recordId: 'order-1', taskId: 'task-1' });
  });

  it('routes both writes through the demo store when demo mode is on', async () => {
    setDemoModeActive(true);
    mockAddDemoDoc
      .mockReturnValueOnce({ id: 'demo-order-1' })
      .mockReturnValueOnce({ id: 'demo-task-1' });

    const result = await createRecordWithTask(
      'issueReports',
      { category: 'Broken Seat' },
      { type: 'Seat Issue' }
    );

    expect(mockAddDemoDoc).toHaveBeenCalledTimes(2);
    expect(mockAddDoc).not.toHaveBeenCalled();
    const [, taskData] = mockAddDemoDoc.mock.calls[1] as [unknown, Record<string, unknown>];
    expect(taskData.linkedId).toBe('demo-order-1');
    expect(result).toEqual({ recordId: 'demo-order-1', taskId: 'demo-task-1' });
  });

  it('propagates an error and never creates the task when the primary record write fails', async () => {
    mockAddDoc.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));

    await expect(
      createRecordWithTask('emergencyRequests', { status: 'active' }, { type: 'Medical Emergency' })
    ).rejects.toThrow('PERMISSION_DENIED');

    // Only the (failed) primary-record write should have been attempted.
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });
});

describe('subscribeCollection — Firestore snapshot adapter', () => {
  beforeEach(() => {
    setDemoModeActive(false);
    vi.clearAllMocks();
  });

  it('adapts a Firestore QuerySnapshot into the FakeQuerySnapshot shape', () => {
    const firestoreDocs = [
      { id: 'doc-1', data: () => ({ name: 'Alpha' }) },
      { id: 'doc-2', data: () => ({ name: 'Beta' }) },
    ];
    const fakeFirestoreSnapshot = { docs: firestoreDocs, size: 2 };

    // Capture the onSnapshot callback and invoke it with the fake snapshot.
    mockOnSnapshot.mockImplementationOnce((...args: unknown[]) => {
      const cb = args[1] as (snap: typeof fakeFirestoreSnapshot) => void;
      cb(fakeFirestoreSnapshot);
      return mockUnsubscribe;
    });

    const received: unknown[] = [];
    subscribeCollection('volunteers', (snap) => received.push(snap));

    expect(received).toHaveLength(1);
    const adapted = received[0] as { docs: { id: string; data: () => Record<string, unknown> }[]; size: number };
    expect(adapted.size).toBe(2);
    expect(adapted.docs[0].id).toBe('doc-1');
    expect(adapted.docs[0].data()).toEqual({ name: 'Alpha' });
  });
});
