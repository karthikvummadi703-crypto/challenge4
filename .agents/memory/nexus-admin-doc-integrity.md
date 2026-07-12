---
name: Nexus admin doc integrity
description: How admin access is actually granted in the Nexus AI project and how it silently breaks when Firestore is edited by hand.
---

## The rule
`verifyAdminAccess` (src/services/userService.ts) and the `isAdmin()` Firestore rule both grant admin purely by checking whether a document exists at `admins/{the signed-in Firebase Auth uid}` — there is no password or extra field check beyond that. Firebase Authentication already validated the password before this check runs.

**Why this matters:** anyone who can edit Firestore directly (the Firebase console, not the app) bypasses `firestore.rules` entirely. Manually adding a document to `admins` — even for testing — with a real account's UID as the doc ID instantly makes that account a full admin, with no trace in the app's own code.

## Root cause seen in practice
Live `admins` collection had 3 documents instead of the intended 1: the real admin, a junk doc literally keyed `"Firebase uid"` (placeholder text pasted as a doc ID by mistake), and a volunteer account's UID that had been given an admin doc directly in the console — so that volunteer could log into the Organizer Dashboard.

**How to apply:** when a user reports "the wrong account/credentials can get into the admin page," don't assume it's an app-code bug — first run `npm run verify:admin` (scripts/verifyAdminIntegrity.ts, requires `FIREBASE_SERVICE_ACCOUNT_KEY`) to check the actual `admins` collection for extra/stray documents before touching login code. Confirm with the user which UID is the real admin before deleting any docs — one of the docs is often someone else's account that now has unintended access.
