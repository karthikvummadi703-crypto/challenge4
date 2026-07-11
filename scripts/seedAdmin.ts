/**
 * One-time admin account seeding script.
 *
 * Run this from a trusted shell (never the browser) to create the single
 * Nexus AI admin account. It uses the Firebase Admin SDK, which is not
 * subject to Firestore security rules, so it is the only supported way to
 * create the first /admins/{uid} document — client code can never do this
 * (see firestore.rules: admin/volunteer role documents require an existing
 * admin to create them).
 *
 * Usage:
 *   ADMIN_EMAIL=admin@nexusai.com ADMIN_PASSWORD='choose-a-strong-password' \
 *     npx tsx scripts/seedAdmin.ts
 *
 * Requires the FIREBASE_SERVICE_ACCOUNT_KEY secret to be set (full service
 * account JSON key content, as one string) — see README.md.
 */
import 'dotenv/config';
import { getAdminAuth, getAdminDb, isAdminSdkConfigured } from '../lib/firebaseAdmin';

async function main() {
  if (!isAdminSdkConfigured()) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it as a Replit secret before running this script.');
    process.exit(1);
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running this script.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const auth = getAdminAuth();
  const db = getAdminDb();

  const existingAdmins = await db.collection('admins').limit(1).get();
  if (!existingAdmins.empty) {
    console.error('An admin account already exists. Refusing to create a second one — Nexus AI supports exactly one admin.');
    process.exit(1);
  }

  let uid: string;
  try {
    const existingUser = await auth.getUserByEmail(email);
    uid = existingUser.uid;
    console.log(`Found existing Firebase Auth user for ${email} (uid: ${uid}); attaching admin role.`);
  } catch {
    const created = await auth.createUser({ email, password });
    uid = created.uid;
    console.log(`Created new Firebase Auth user for ${email} (uid: ${uid}).`);
  }

  await db.collection('admins').doc(uid).set({
    uid,
    email: email.toLowerCase().trim(),
    role: 'admin',
    createdAt: new Date(),
  });

  console.log(`Admin profile created for ${email}. You can now log in from the Organizer Dashboard.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to seed admin account:', err);
  process.exit(1);
});
