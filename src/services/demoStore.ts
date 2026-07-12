/**
 * In-memory "Demo Mode" data store.
 *
 * This is a self-contained mock backend that mimics the shape of the
 * Firestore calls used throughout the dashboards (onSnapshot-style
 * subscriptions + add/update/delete) WITHOUT ever touching real Firebase
 * Auth or Firestore. It is only ever read from/written to when Demo Mode
 * is active (see `demoModeContext.tsx` and `dataSource.ts`).
 *
 * Sync model:
 * - Single source of truth lives in memory (`collections`).
 * - Every mutation is persisted to `sessionStorage` so a page refresh in the
 *   same tab keeps demo state.
 * - Every mutation is also broadcast over a `BroadcastChannel` so multiple
 *   dashboard views/tabs opened in the same browser session (e.g. an Admin
 *   tab and a Volunteer tab) see the same live updates — this is what
 *   demonstrates "real-time sync across roles" without a real backend.
 */

import { TaskStatus, OrderStatus, EmergencyStatus, IssueStatus } from '../types';

export type DemoCollectionName =
  | 'volunteers'
  | 'fans'
  | 'tasks'
  | 'foodOrders'
  | 'emergencyRequests'
  | 'issueReports'
  | 'matches'
  | 'systemConfig';

type DemoDoc = Record<string, unknown> & { id: string };

type Listener = (docs: DemoDoc[]) => void;

const STORAGE_KEY = 'nexus-demo-store-v1';
const CHANNEL_NAME = 'nexus-demo-sync';

interface BroadcastPayload {
  origin: string;
  type: 'mutation' | 'reset';
  collectionName?: DemoCollectionName;
}

const ORIGIN_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<BroadcastPayload>) => {
      const payload = event.data;
      if (!payload || payload.origin === ORIGIN_ID) return;
      // Another tab/view mutated the store — reload from sessionStorage and
      // notify our own local subscribers so this view stays in sync too.
      hydrateFromStorage();
      if (payload.type === 'reset') {
        notifyAll();
      } else if (payload.collectionName) {
        notify(payload.collectionName);
      } else {
        notifyAll();
      }
    };
  }
  return channel;
}

function broadcast(payload: Omit<BroadcastPayload, 'origin'>) {
  getChannel()?.postMessage({ ...payload, origin: ORIGIN_ID });
}

function seedData(): Record<DemoCollectionName, DemoDoc[]> {
  const now = Date.now();
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  return {
    volunteers: [
      { id: 'demo-vol-1', uid: 'demo-vol-1', fullName: 'Marco Silva', email: 'marco.silva@demo.nexusai.com', role: 'volunteer', assignedGate: 'Gate A', active: true, createdAt: iso(-86_400_000) },
      { id: 'demo-vol-2', uid: 'demo-vol-2', fullName: 'Amara Okafor', email: 'amara.okafor@demo.nexusai.com', role: 'volunteer', assignedGate: 'Gate B', active: true, createdAt: iso(-72_000_000) },
      { id: 'demo-vol-3', uid: 'demo-vol-3', fullName: 'Yuki Tanaka', email: 'yuki.tanaka@demo.nexusai.com', role: 'volunteer', assignedGate: 'Gate C', active: true, createdAt: iso(-43_200_000) },
    ],
    fans: [
      { id: 'demo-fan-1', uid: 'demo-fan-1', fullName: 'Jordan Alvarez', email: 'jordan.alvarez@demo.nexusai.com', role: 'fan', seatNumber: 'A-118', assignedGate: 'Gate A', phone: '+1 555 0101', country: 'USA', preferredLanguage: 'English', favoriteTeam: 'USA', createdAt: iso(-90_000_000) },
      { id: 'demo-fan-2', uid: 'demo-fan-2', fullName: 'Sofia Rossi', email: 'sofia.rossi@demo.nexusai.com', role: 'fan', seatNumber: 'B-204', assignedGate: 'Gate B', phone: '+39 555 0102', country: 'Italy', preferredLanguage: 'Italian', favoriteTeam: 'Italy', createdAt: iso(-50_000_000) },
      { id: 'demo-fan-3', uid: 'demo-fan-3', fullName: 'Kwame Mensah', email: 'kwame.mensah@demo.nexusai.com', role: 'fan', seatNumber: 'VIP-012', assignedGate: 'Gate D', phone: '+233 555 0103', country: 'Ghana', preferredLanguage: 'English', favoriteTeam: 'Ghana', createdAt: iso(-20_000_000) },
    ],
    tasks: [
      { id: 'demo-task-1', type: 'Deliver Food', details: 'Deliver 2x Chicken Burger, 1x Coke', seatNumber: 'A-118', priority: 'Medium', status: 'pending' satisfies TaskStatus, assignedTo: 'VOL-DEMO1', timestamp: iso(-600_000) },
      { id: 'demo-task-2', type: 'Seat Issue', details: 'Reported broken seat armrest', seatNumber: 'B-204', priority: 'Low', status: 'accepted' satisfies TaskStatus, assignedTo: 'VOL-DEMO2', timestamp: iso(-1_200_000) },
      { id: 'demo-task-3', type: 'Medical Emergency', details: 'Fan reporting dizziness, requesting medic', seatNumber: 'VIP-012', priority: 'High', status: 'pending' satisfies TaskStatus, assignedTo: 'VOL-DEMO3', timestamp: iso(-300_000) },
    ],
    foodOrders: [
      { id: 'demo-order-1', items: [{ name: 'Chicken Burger', quantity: 2, price: 7.99 }, { name: 'Coke', quantity: 1, price: 2.49 }], seatNumber: 'A-118', totalPrice: 18.47, status: 'pending' satisfies OrderStatus, timestamp: iso(-600_000) },
      { id: 'demo-order-2', items: [{ name: 'Veg Burger', quantity: 1, price: 6.99 }, { name: 'French Fries', quantity: 1, price: 3.49 }], seatNumber: 'B-204', totalPrice: 10.48, status: 'delivered' satisfies OrderStatus, timestamp: iso(-3_600_000) },
    ],
    emergencyRequests: [
      { id: 'demo-emergency-1', seatNumber: 'VIP-012', status: 'active' satisfies EmergencyStatus, timestamp: iso(-300_000) },
    ],
    issueReports: [
      { id: 'demo-issue-1', category: 'Broken Seat', seatNumber: 'B-204', description: 'Armrest is loose and wobbling', status: 'open' satisfies IssueStatus, timestamp: iso(-1_200_000) },
      { id: 'demo-issue-2', category: 'Dirty Washroom', seatNumber: 'Gate C', description: 'Washroom near Gate C needs cleaning', status: 'resolved' satisfies IssueStatus, timestamp: iso(-7_200_000) },
    ],
    matches: [
      { id: 'demo-match-1', stadiumName: 'Estádio do Nexus', matchName: 'Portugal vs Argentina', matchDate: '18/07/2026', matchTime: '19:30', ticketPrice: 120, published: true, timestamp: iso(-172_800_000) },
      { id: 'demo-match-2', stadiumName: 'Estádio do Nexus', matchName: 'Brazil vs Ghana', matchDate: '21/07/2026', matchTime: '16:00', ticketPrice: 95, published: true, timestamp: iso(-86_400_000) },
    ],
    systemConfig: [
      { id: 'demo-config-1', isPublished: true, publishedAt: iso(-172_800_000) },
    ],
  };
}

let collections: Record<DemoCollectionName, DemoDoc[]> = seedData();
const listeners: Record<DemoCollectionName, Set<Listener>> = {
  volunteers: new Set(), fans: new Set(), tasks: new Set(), foodOrders: new Set(),
  emergencyRequests: new Set(), issueReports: new Set(), matches: new Set(), systemConfig: new Set(),
};

function persist() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
  } catch {
    /* sessionStorage may be unavailable (private mode, quota) — demo still works in-memory */
  }
}

function hydrateFromStorage() {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) collections = JSON.parse(raw);
  } catch {
    /* corrupted/missing — keep current in-memory state */
  }
}

function notify(collectionName: DemoCollectionName) {
  const docs = collections[collectionName] || [];
  listeners[collectionName].forEach((cb) => cb(docs));
}

function notifyAll() {
  (Object.keys(listeners) as DemoCollectionName[]).forEach(notify);
}

/** Call once when Demo Mode is entered so a fresh tab picks up any other open demo session. */
export function initDemoStore() {
  hydrateFromStorage();
  persist();
  getChannel();
}

/** Subscribe to a demo collection. Mirrors the Firestore onSnapshot(collection) contract. */
export function subscribeDemo(collectionName: DemoCollectionName, cb: Listener): () => void {
  listeners[collectionName].add(cb);
  cb(collections[collectionName] || []);
  return () => listeners[collectionName].delete(cb);
}

/** Returns the current snapshot of all documents in a demo collection without subscribing. */
export function getDemoDocs(collectionName: DemoCollectionName): DemoDoc[] {
  return collections[collectionName] || [];
}

/** Appends a new document to a demo collection and notifies all subscribers. Returns the generated id. */
export function addDemoDoc(collectionName: DemoCollectionName, data: Record<string, unknown>): { id: string } {
  const id = `demo-${collectionName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const doc: DemoDoc = { id, ...data };
  collections[collectionName] = [...(collections[collectionName] || []), doc];
  persist();
  notify(collectionName);
  broadcast({ type: 'mutation', collectionName });
  return { id };
}

/** Merges `data` into the matching document and notifies subscribers. No-op when `id` does not exist. */
export function updateDemoDoc(collectionName: DemoCollectionName, id: string, data: Record<string, unknown>) {
  collections[collectionName] = (collections[collectionName] || []).map((d) =>
    d.id === id ? { ...d, ...data } : d
  );
  persist();
  notify(collectionName);
  broadcast({ type: 'mutation', collectionName });
}

/** Removes the document with the given `id` from a demo collection and notifies subscribers. */
export function deleteDemoDoc(collectionName: DemoCollectionName, id: string) {
  collections[collectionName] = (collections[collectionName] || []).filter((d) => d.id !== id);
  persist();
  notify(collectionName);
  broadcast({ type: 'mutation', collectionName });
}

/** Restores the seeded dataset — used by the "Reset Demo Data" control. */
export function resetDemoStore() {
  collections = seedData();
  persist();
  notifyAll();
  broadcast({ type: 'reset' });
}

/**
 * Clears the session-storage key and reinitialises the in-memory store to seed
 * data. Unlike `resetDemoStore`, this does NOT broadcast to other tabs — it is
 * only intended to be called on final demo exit when the session ends.
 */
export function clearDemoStore() {
  if (typeof window !== 'undefined') {
    try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
  collections = seedData();
}
