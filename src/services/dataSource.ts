/**
 * Data-source abstraction used by every dashboard component.
 *
 * Dashboards never talk to Firestore or the demo store directly for their
 * live collections — they call `subscribeCollection` / `addRecord` /
 * `updateRecord` / `deleteRecord`. This is what lets the exact same
 * dashboard UI code run against real Firestore in production and against
 * the in-memory demo store in Demo Mode: the branching happens once, here,
 * instead of being forked per-component.
 *
 * The callback shape passed to `subscribeCollection` mirrors a Firestore
 * `QuerySnapshot` closely enough that existing `snapshot.forEach(...)`,
 * `snapshot.docs`, and `snapshot.size` call sites keep working unchanged.
 */
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  DemoCollectionName,
  subscribeDemo,
  addDemoDoc,
  updateDemoDoc,
  deleteDemoDoc,
} from './demoStore';

let demoModeActive = false;

/** Flipped exclusively by DemoModeContext when the judge enters/exits Demo Mode. */
export function setDemoModeActive(active: boolean): void {
  demoModeActive = active;
}

/** Returns `true` when Demo Mode is currently active; used by apiClient to route AI calls. */
export function isDemoModeActive(): boolean {
  return demoModeActive;
}

interface FakeDocSnapshot {
  id: string;
  data: () => Record<string, unknown>;
}

interface FakeQuerySnapshot {
  docs: FakeDocSnapshot[];
  size: number;
  forEach: (cb: (doc: FakeDocSnapshot) => void) => void;
}

function toFakeSnapshot(records: Array<Record<string, unknown> & { id: string }>): FakeQuerySnapshot {
  const docs: FakeDocSnapshot[] = records.map((r) => {
    const { id, ...rest } = r;
    return { id, data: () => rest };
  });
  return {
    docs,
    size: docs.length,
    forEach: (cb) => docs.forEach(cb),
  };
}

/** Equivalent of onSnapshot(collection(db, name), cb) — routes to demo store when Demo Mode is on. */
export function subscribeCollection(
  name: DemoCollectionName,
  cb: (snapshot: FakeQuerySnapshot) => void
): () => void {
  if (demoModeActive) {
    return subscribeDemo(name, (records) => cb(toFakeSnapshot(records)));
  }
  return onSnapshot(collection(db, name), (snapshot) => {
    // Adapt the Firestore QuerySnapshot to the FakeQuerySnapshot shape so
    // components work identically in live and demo mode.
    const adapted: FakeQuerySnapshot = {
      docs: snapshot.docs.map((d) => ({ id: d.id, data: () => d.data() })),
      size: snapshot.size,
      forEach: (cb2) =>
        snapshot.docs.forEach((d) => cb2({ id: d.id, data: () => d.data() })),
    };
    cb(adapted);
  });
}

/** Equivalent of addDoc(collection(db, name), data). */
export async function addRecord(
  name: DemoCollectionName,
  data: Record<string, unknown>
): Promise<{ id: string }> {
  if (demoModeActive) {
    return addDemoDoc(name, data);
  }
  const ref = await addDoc(collection(db, name), data);
  return { id: ref.id };
}

/** Equivalent of updateDoc(doc(db, name, id), data). */
export async function updateRecord(
  name: DemoCollectionName,
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  if (demoModeActive) {
    updateDemoDoc(name, id, data);
    return;
  }
  await updateDoc(doc(db, name, id), data);
}

/** Equivalent of deleteDoc(doc(db, name, id)). */
export async function deleteRecord(name: DemoCollectionName, id: string): Promise<void> {
  if (demoModeActive) {
    deleteDemoDoc(name, id);
    return;
  }
  await deleteDoc(doc(db, name, id));
}
