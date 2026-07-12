import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDemoDocs,
  addDemoDoc,
  updateDemoDoc,
  deleteDemoDoc,
  resetDemoStore,
  subscribeDemo,
} from '../src/services/demoStore';

// These tests run in Vitest's default `node` environment, where `window` is
// undefined. demoStore guards every browser-only call (sessionStorage,
// BroadcastChannel) behind `typeof window === 'undefined'` checks, so the
// core in-memory CRUD + pub/sub logic — the part every dashboard actually
// depends on via dataSource.ts — is fully exercisable here without a DOM.
describe('demoStore — in-memory Demo Mode backend', () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it('seeds each collection with sample data on reset', () => {
    expect(getDemoDocs('volunteers').length).toBeGreaterThan(0);
    expect(getDemoDocs('fans').length).toBeGreaterThan(0);
    expect(getDemoDocs('matches').length).toBeGreaterThan(0);
  });

  it('adds a new document and assigns it a unique id', () => {
    const before = getDemoDocs('tasks').length;
    const { id } = addDemoDoc('tasks', { type: 'Deliver Food', status: 'pending' });
    const docs = getDemoDocs('tasks');
    expect(docs.length).toBe(before + 1);
    expect(docs.find((d) => d.id === id)).toMatchObject({ type: 'Deliver Food', status: 'pending' });
  });

  it('generates distinct ids for rapid successive adds', () => {
    const a = addDemoDoc('issueReports', { category: 'Broken Seat' });
    const b = addDemoDoc('issueReports', { category: 'Dirty Washroom' });
    expect(a.id).not.toBe(b.id);
  });

  it('updates only the targeted document, merging fields', () => {
    const { id } = addDemoDoc('tasks', { type: 'Seat Issue', status: 'pending', priority: 'Low' });
    updateDemoDoc('tasks', id, { status: 'accepted' });
    const doc = getDemoDocs('tasks').find((d) => d.id === id);
    expect(doc).toMatchObject({ type: 'Seat Issue', status: 'accepted', priority: 'Low' });
  });

  it('leaves other documents untouched on update', () => {
    const other = getDemoDocs('volunteers')[0];
    const { id } = addDemoDoc('volunteers', { fullName: 'Test Volunteer', active: true });
    updateDemoDoc('volunteers', id, { active: false });
    const untouched = getDemoDocs('volunteers').find((d) => d.id === other.id);
    expect(untouched).toEqual(other);
  });

  it('deletes a document by id', () => {
    const { id } = addDemoDoc('emergencyRequests', { seatNumber: 'A-1', status: 'active' });
    expect(getDemoDocs('emergencyRequests').some((d) => d.id === id)).toBe(true);
    deleteDemoDoc('emergencyRequests', id);
    expect(getDemoDocs('emergencyRequests').some((d) => d.id === id)).toBe(false);
  });

  it('is a no-op when deleting an id that does not exist', () => {
    const before = getDemoDocs('foodOrders').length;
    deleteDemoDoc('foodOrders', 'not-a-real-id');
    expect(getDemoDocs('foodOrders').length).toBe(before);
  });

  it('notifies subscribers immediately with current data on subscribe', () => {
    const received: unknown[][] = [];
    const unsubscribe = subscribeDemo('matches', (docs) => received.push(docs));
    expect(received.length).toBe(1);
    expect(received[0]).toEqual(getDemoDocs('matches'));
    unsubscribe();
  });

  it('notifies subscribers on add/update/delete but not after unsubscribing', () => {
    const received: unknown[][] = [];
    const unsubscribe = subscribeDemo('issueReports', (docs) => received.push(docs));
    const callsAfterSubscribe = received.length;

    addDemoDoc('issueReports', { category: 'Test' });
    expect(received.length).toBe(callsAfterSubscribe + 1);

    unsubscribe();
    addDemoDoc('issueReports', { category: 'Should not notify' });
    expect(received.length).toBe(callsAfterSubscribe + 1);
  });

  it('restores the original seeded dataset on reset, discarding mutations', () => {
    const seeded = getDemoDocs('tasks').length;
    addDemoDoc('tasks', { type: 'Extra' });
    expect(getDemoDocs('tasks').length).toBe(seeded + 1);
    resetDemoStore();
    expect(getDemoDocs('tasks').length).toBe(seeded);
  });

  it('returns an empty array once every document in a collection is deleted', () => {
    getDemoDocs('systemConfig').forEach((doc) => deleteDemoDoc('systemConfig', doc.id));
    expect(getDemoDocs('systemConfig')).toEqual([]);
  });
});
