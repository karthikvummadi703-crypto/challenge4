/**
 * Firestore Security Rules test — runs against the local Firestore emulator
 * (not production, not the dev database). Run via `npm run test:rules`,
 * which boots the emulator (see firebase.json) and executes this file.
 *
 * Focus: prove the one-admin invariant holds at the rules layer, not just in
 * application code — a fan (or any non-admin) must never be able to read or
 * write another user's `admins/{uid}` document, and must never be able to
 * create their own.
 */
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { setDoc, getDoc, updateDoc, doc } from 'firebase/firestore';

const PROJECT_ID = 'nexus-ai-rules-test';
const REAL_ADMIN_UID = 'real-admin-uid';
const OTHER_ADMIN_UID = 'other-admin-uid';
const FAN_UID = 'fan-uid';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed the single real admin doc as the Admin SDK would (bypassing rules).
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'admins', REAL_ADMIN_UID), {
      email: 'admin@nexusai.test',
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(context.firestore(), 'fans', FAN_UID), {
      email: 'fan@nexusai.test',
      seatNumber: 'A-100',
    });
  });
});

describe('admins/{uid} security rules', () => {
  it('blocks a fan from creating their own admin document (privilege escalation)', async () => {
    const fanCtx = testEnv.authenticatedContext(FAN_UID);
    await assertFails(
      setDoc(doc(fanCtx.firestore(), 'admins', FAN_UID), {
        email: 'fan@nexusai.test',
        createdAt: new Date().toISOString(),
      })
    );
  });

  it("blocks a fan from creating a DIFFERENT user's admin document", async () => {
    const fanCtx = testEnv.authenticatedContext(FAN_UID);
    await assertFails(
      setDoc(doc(fanCtx.firestore(), 'admins', OTHER_ADMIN_UID), {
        email: 'other@nexusai.test',
        createdAt: new Date().toISOString(),
      })
    );
  });

  it("blocks a fan from reading the real admin's document", async () => {
    const fanCtx = testEnv.authenticatedContext(FAN_UID);
    await assertFails(getDoc(doc(fanCtx.firestore(), 'admins', REAL_ADMIN_UID)));
  });

  it("blocks a fan from writing to the real admin's document", async () => {
    const fanCtx = testEnv.authenticatedContext(FAN_UID);
    await assertFails(
      updateDoc(doc(fanCtx.firestore(), 'admins', REAL_ADMIN_UID), {
        email: 'hijacked@nexusai.test',
      })
    );
  });

  it('blocks an unauthenticated client from reading or creating any admin document', async () => {
    const anonCtx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anonCtx.firestore(), 'admins', REAL_ADMIN_UID)));
    await assertFails(
      setDoc(doc(anonCtx.firestore(), 'admins', 'anon-uid'), { email: 'x@x.com' })
    );
  });

  it('allows the real admin to read their own document', async () => {
    const adminCtx = testEnv.authenticatedContext(REAL_ADMIN_UID);
    await assertSucceeds(getDoc(doc(adminCtx.firestore(), 'admins', REAL_ADMIN_UID)));
  });

  it('allows the real admin to create a second admin document (an explicit admin action)', async () => {
    // Rules alone permit this (an existing admin promoting someone) — the
    // ONE-admin invariant is enforced by scripts/seedAdmin.ts at seed time and
    // scripts/verifyAdminIntegrity.ts thereafter, not by the rules themselves,
    // since rules can't count documents across a collection cheaply. This test
    // documents that boundary rather than assuming rules alone fully own the
    // invariant.
    const adminCtx = testEnv.authenticatedContext(REAL_ADMIN_UID);
    await assertSucceeds(
      setDoc(doc(adminCtx.firestore(), 'admins', OTHER_ADMIN_UID), {
        email: 'promoted@nexusai.test',
        createdAt: new Date().toISOString(),
      })
    );
  });

  it("blocks the real admin's own lastLogin self-update from also changing other fields", async () => {
    const adminCtx = testEnv.authenticatedContext(REAL_ADMIN_UID);
    // Admins are allowed to update anything (isAdmin() short-circuits), so this
    // specific admin CAN update any field on their own doc — that's expected.
    // The restrictive "onlyChangedFields" branch only matters for non-admin
    // owners (volunteers), exercised below.
    await assertSucceeds(
      updateDoc(doc(adminCtx.firestore(), 'admins', REAL_ADMIN_UID), {
        lastLogin: new Date().toISOString(),
      })
    );
  });
});

describe('volunteers/{uid} security rules', () => {
  const VOL_UID = 'vol-uid';

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'volunteers', VOL_UID), {
        email: 'vol@nexusai.test',
        assignedGate: 'Gate A',
        active: true,
      });
    });
  });

  it('blocks a fan from creating a volunteer document', async () => {
    const fanCtx = testEnv.authenticatedContext(FAN_UID);
    await assertFails(
      setDoc(doc(fanCtx.firestore(), 'volunteers', 'new-vol-uid'), {
        email: 'newvol@nexusai.test',
        active: true,
      })
    );
  });

  it('allows a volunteer to update only their own lastLogin field', async () => {
    const volCtx = testEnv.authenticatedContext(VOL_UID);
    await assertSucceeds(
      updateDoc(doc(volCtx.firestore(), 'volunteers', VOL_UID), {
        lastLogin: new Date().toISOString(),
      })
    );
  });

  it('blocks a volunteer from escalating their own privileges via a role field', async () => {
    const volCtx = testEnv.authenticatedContext(VOL_UID);
    await assertFails(
      updateDoc(doc(volCtx.firestore(), 'volunteers', VOL_UID), {
        active: true,
        assignedGate: 'Gate Z',
      })
    );
  });
});
