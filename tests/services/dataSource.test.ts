// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock firebase/firestore ───────────────────────────────────────────────────
const mockOnSnapshot   = vi.fn();
const mockAddDoc       = vi.fn().mockResolvedValue({ id: 'fs-id' });
const mockUpdateDoc    = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc    = vi.fn().mockResolvedValue(undefined);
const mockCollection   = vi.fn().mockReturnValue('col-ref');
const mockDoc          = vi.fn().mockReturnValue('doc-ref');

vi.mock('firebase/firestore', () => ({
  collection:  (...a: unknown[]) => mockCollection(...a),
  onSnapshot:  (...a: unknown[]) => mockOnSnapshot(...a),
  addDoc:      (...a: unknown[]) => mockAddDoc(...a),
  updateDoc:   (...a: unknown[]) => mockUpdateDoc(...a),
  deleteDoc:   (...a: unknown[]) => mockDeleteDoc(...a),
  doc:         (...a: unknown[]) => mockDoc(...a),
}));

vi.mock('../../src/firebase', () => ({ db: {} }));

// ── Mock demoStore ────────────────────────────────────────────────────────────
const mockSubscribeDemo = vi.fn();
const mockAddDemoDoc    = vi.fn().mockResolvedValue({ id: 'demo-id' });
const mockUpdateDemoDoc = vi.fn();
const mockDeleteDemoDoc = vi.fn();

vi.mock('../../src/services/demoStore', () => ({
  subscribeDemo:  (...a: unknown[]) => mockSubscribeDemo(...a),
  addDemoDoc:     (...a: unknown[]) => mockAddDemoDoc(...a),
  updateDemoDoc:  (...a: unknown[]) => mockUpdateDemoDoc(...a),
  deleteDemoDoc:  (...a: unknown[]) => mockDeleteDemoDoc(...a),
}));

const {
  setDemoModeActive,
  isDemoModeActive,
  subscribeCollection,
  addRecord,
  updateRecord,
  deleteRecord,
  createRecordWithTask,
  publishSystemConfig,
} = await import('../../src/services/dataSource');

describe('dataSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDemoModeActive(false);
    mockAddDoc.mockResolvedValue({ id: 'fs-id' });
    mockAddDemoDoc.mockResolvedValue({ id: 'demo-id' });
    mockOnSnapshot.mockReturnValue(vi.fn());
    mockSubscribeDemo.mockReturnValue(vi.fn());
  });

  // ── setDemoModeActive / isDemoModeActive ────────────────────────────────────
  describe('isDemoModeActive', () => {
    it('returns false by default', () => {
      expect(isDemoModeActive()).toBe(false);
    });

    it('returns true after setDemoModeActive(true)', () => {
      setDemoModeActive(true);
      expect(isDemoModeActive()).toBe(true);
    });

    it('returns false after being reset to false', () => {
      setDemoModeActive(true);
      setDemoModeActive(false);
      expect(isDemoModeActive()).toBe(false);
    });
  });

  // ── subscribeCollection ─────────────────────────────────────────────────────
  describe('subscribeCollection', () => {
    it('routes to subscribeDemo when demo mode is active', () => {
      setDemoModeActive(true);
      subscribeCollection('tasks', vi.fn());
      expect(mockSubscribeDemo).toHaveBeenCalledWith('tasks', expect.any(Function));
      expect(mockOnSnapshot).not.toHaveBeenCalled();
    });

    it('wraps demo records in a FakeQuerySnapshot (toFakeSnapshot)', () => {
      setDemoModeActive(true);
      let demoCb: ((records: Record<string, unknown>[]) => void) | null = null;
      mockSubscribeDemo.mockImplementation((_n: string, cb: typeof demoCb) => {
        demoCb = cb;
        return vi.fn();
      });

      const outerCb = vi.fn();
      subscribeCollection('tasks', outerCb);

      const records = [{ id: 'r1', type: 'Deliver Food', status: 'pending' }];
      demoCb!(records);

      expect(outerCb).toHaveBeenCalledTimes(1);
      const snap = outerCb.mock.calls[0][0];
      expect(snap.size).toBe(1);
      expect(snap.docs[0].id).toBe('r1');
      expect(snap.docs[0].data()).toMatchObject({ type: 'Deliver Food', status: 'pending' });
    });

    it('FakeQuerySnapshot forEach iterates all docs', () => {
      setDemoModeActive(true);
      let demoCb: ((records: Record<string, unknown>[]) => void) | null = null;
      mockSubscribeDemo.mockImplementation((_n: string, cb: typeof demoCb) => {
        demoCb = cb;
        return vi.fn();
      });
      const outerCb = vi.fn();
      subscribeCollection('tasks', outerCb);
      demoCb!([{ id: 'a', x: 1 }, { id: 'b', x: 2 }]);

      const snap = outerCb.mock.calls[0][0];
      const collected: string[] = [];
      snap.forEach((d: { id: string }) => collected.push(d.id));
      expect(collected).toEqual(['a', 'b']);
    });

    it('routes to onSnapshot when demo mode is inactive', () => {
      subscribeCollection('volunteers', vi.fn());
      expect(mockOnSnapshot).toHaveBeenCalled();
      expect(mockSubscribeDemo).not.toHaveBeenCalled();
    });

    it('adapts Firestore QuerySnapshot to FakeQuerySnapshot in live mode', () => {
      let firestoreCb: ((snap: unknown) => void) | null = null;
      mockOnSnapshot.mockImplementation((_col: unknown, cb: typeof firestoreCb) => {
        firestoreCb = cb;
        return vi.fn();
      });

      const outerCb = vi.fn();
      subscribeCollection('volunteers', outerCb);

      const firestoreSnap = {
        docs: [{ id: 'v1', data: () => ({ fullName: 'Alice' }) }],
        size: 1,
      };
      firestoreCb!(firestoreSnap);

      const adapted = outerCb.mock.calls[0][0];
      expect(adapted.size).toBe(1);
      expect(adapted.docs[0].id).toBe('v1');
      expect(adapted.docs[0].data()).toMatchObject({ fullName: 'Alice' });

      const rows: string[] = [];
      adapted.forEach((d: { id: string }) => rows.push(d.id));
      expect(rows).toEqual(['v1']);
    });

    it('returns the unsubscribe function from onSnapshot in live mode', () => {
      const unsubFn = vi.fn();
      mockOnSnapshot.mockReturnValue(unsubFn);
      const unsub = subscribeCollection('fans', vi.fn());
      expect(typeof unsub).toBe('function');
    });
  });

  // ── addRecord ───────────────────────────────────────────────────────────────
  describe('addRecord', () => {
    it('calls addDemoDoc and returns its id when demo mode is active', async () => {
      setDemoModeActive(true);
      mockAddDemoDoc.mockResolvedValue({ id: 'demo-add' });
      const result = await addRecord('tasks', { type: 'Deliver Food' });
      expect(mockAddDemoDoc).toHaveBeenCalledWith('tasks', { type: 'Deliver Food' });
      expect(result).toEqual({ id: 'demo-add' });
      expect(mockAddDoc).not.toHaveBeenCalled();
    });

    it('calls addDoc and returns its id when demo mode is inactive', async () => {
      mockAddDoc.mockResolvedValue({ id: 'fs-add' });
      const result = await addRecord('fans', { name: 'Bob' });
      expect(mockAddDoc).toHaveBeenCalled();
      expect(result).toEqual({ id: 'fs-add' });
      expect(mockAddDemoDoc).not.toHaveBeenCalled();
    });
  });

  // ── updateRecord ────────────────────────────────────────────────────────────
  describe('updateRecord', () => {
    it('calls updateDemoDoc when demo mode is active', async () => {
      setDemoModeActive(true);
      await updateRecord('tasks', 'task-1', { status: 'accepted' });
      expect(mockUpdateDemoDoc).toHaveBeenCalledWith('tasks', 'task-1', { status: 'accepted' });
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('calls updateDoc when demo mode is inactive', async () => {
      await updateRecord('tasks', 'task-1', { status: 'completed' });
      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(mockUpdateDemoDoc).not.toHaveBeenCalled();
    });
  });

  // ── deleteRecord ────────────────────────────────────────────────────────────
  describe('deleteRecord', () => {
    it('calls deleteDemoDoc when demo mode is active', async () => {
      setDemoModeActive(true);
      await deleteRecord('volunteers', 'vol-1');
      expect(mockDeleteDemoDoc).toHaveBeenCalledWith('volunteers', 'vol-1');
      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });

    it('calls deleteDoc when demo mode is inactive', async () => {
      await deleteRecord('volunteers', 'vol-1');
      expect(mockDeleteDoc).toHaveBeenCalled();
      expect(mockDeleteDemoDoc).not.toHaveBeenCalled();
    });
  });

  // ── createRecordWithTask ────────────────────────────────────────────────────
  describe('createRecordWithTask', () => {
    it('creates primary record then linked task in demo mode, returning both ids', async () => {
      setDemoModeActive(true);
      mockAddDemoDoc
        .mockResolvedValueOnce({ id: 'primary-id' })
        .mockResolvedValueOnce({ id: 'task-id' });

      const result = await createRecordWithTask(
        'foodOrders',
        { item: 'Burger' },
        { type: 'Deliver Food', priority: 'High' }
      );

      expect(result).toEqual({ recordId: 'primary-id', taskId: 'task-id' });
      expect(mockAddDemoDoc).toHaveBeenCalledTimes(2);
      expect(mockAddDemoDoc.mock.calls[1][1]).toMatchObject({ linkedId: 'primary-id' });
    });

    it('creates primary record then linked task in live mode, returning both ids', async () => {
      mockAddDoc
        .mockResolvedValueOnce({ id: 'fs-primary' })
        .mockResolvedValueOnce({ id: 'fs-task' });

      const result = await createRecordWithTask(
        'foodOrders',
        { item: 'Pizza' },
        { type: 'Deliver Food', priority: 'Medium' }
      );

      expect(result).toEqual({ recordId: 'fs-primary', taskId: 'fs-task' });
      expect(mockAddDoc).toHaveBeenCalledTimes(2);
    });

    it('second addRecord call includes linkedId pointing at primary record', async () => {
      mockAddDoc
        .mockResolvedValueOnce({ id: 'primary-123' })
        .mockResolvedValueOnce({ id: 'task-456' });

      await createRecordWithTask('issueReports', { desc: 'Broken seat' }, { type: 'Complaint Resolution' });
      const secondCallArgs = mockAddDoc.mock.calls[1];
      expect(secondCallArgs[1]).toMatchObject({ linkedId: 'primary-123' });
    });
  });

  // ── publishSystemConfig ─────────────────────────────────────────────────────
  describe('publishSystemConfig', () => {
    it('writes isPublished: true to systemConfig in demo mode', async () => {
      setDemoModeActive(true);
      mockAddDemoDoc.mockResolvedValue({ id: 'config-demo' });
      const result = await publishSystemConfig();
      expect(result).toEqual({ id: 'config-demo' });
      expect(mockAddDemoDoc).toHaveBeenCalledWith(
        'systemConfig',
        expect.objectContaining({ isPublished: true })
      );
    });

    it('writes isPublished: true to systemConfig in live mode', async () => {
      mockAddDoc.mockResolvedValue({ id: 'config-fs' });
      const result = await publishSystemConfig();
      expect(result).toEqual({ id: 'config-fs' });
      expect(mockAddDoc).toHaveBeenCalled();
    });

    it('includes a publishedAt timestamp string', async () => {
      setDemoModeActive(true);
      mockAddDemoDoc.mockResolvedValue({ id: 'x' });
      await publishSystemConfig();
      const written = mockAddDemoDoc.mock.calls[0][1] as Record<string, unknown>;
      expect(typeof written.publishedAt).toBe('string');
      expect(new Date(written.publishedAt as string).getTime()).not.toBeNaN();
    });
  });
});
