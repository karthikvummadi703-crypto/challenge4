/**
 * Standalone integrity check for the one-admin invariant.
 *
 * The entire "only the seeded admin can access the Organizer portal" security
 * model depends on there only ever being exactly one document in the
 * `admins` collection (see scripts/seedAdmin.ts, which already refuses to
 * seed a second one). This script re-verifies that invariant against the
 * live database at any later point in time — e.g. run it after a deploy, on
 * a schedule, or by hand whenever you want to double-check nothing slipped
 * through (a manually-added doc via the Firebase console, a bug, etc).
 *
 * Usage:
 *   npx tsx scripts/verifyAdminIntegrity.ts
 *
 * Requires the FIREBASE_SERVICE_ACCOUNT_KEY secret (Admin SDK credentials —
 * this deliberately bypasses Firestore rules, which is why it must only ever
 * run from a trusted shell/CI context, never from client code).
 *
 * Exit code 0 = exactly one admin doc (healthy).
 * Exit code 1 = zero or 2+ admin docs, or the Admin SDK isn't configured.
 */
import dotenv from 'dotenv';
import { getAdminDb, isAdminSdkConfigured } from '../lib/firebaseAdmin';

dotenv.config();

async function main() {
  if (!isAdminSdkConfigured()) {
    console.error(
      '[verifyAdminIntegrity] FIREBASE_SERVICE_ACCOUNT_KEY is not set — cannot verify against the live database.'
    );
    process.exit(1);
  }

  const db = getAdminDb();
  const snap = await db.collection('admins').get();

  if (snap.size === 0) {
    console.error('[verifyAdminIntegrity] FAIL: 0 admin documents found. No one can access the Organizer portal — run scripts/seedAdmin.ts.');
    process.exit(1);
  }

  if (snap.size > 1) {
    console.error(`[verifyAdminIntegrity] FAIL: ${snap.size} admin documents found. Exactly 1 is required.`);
    snap.docs.forEach((d) => {
      const data = d.data();
      console.error(`  - uid=${d.id} email=${data.email ?? '(unknown)'} createdAt=${data.createdAt ?? '(unknown)'}`);
    });
    process.exit(1);
  }

  const only = snap.docs[0];
  console.log(`[verifyAdminIntegrity] OK: exactly 1 admin document — uid=${only.id} email=${only.data().email ?? '(unknown)'}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[verifyAdminIntegrity] Unexpected error:', err);
  process.exit(1);
});
