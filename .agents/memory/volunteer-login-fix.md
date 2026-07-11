---
name: Volunteer Login Root Cause Fix
description: Why volunteer login failed (two bugs) and the complete fix applied
---

## Bug 1 — PERMISSION_DENIED kills the login flow
`findUserDocument()` in `userService.ts` checks three collections in order (admins → volunteers → fans).
After the UID-keyed lookup returns not-found, it falls through to try `getDoc(doc(db, 'admins', 'user@email.com'))`.
Firestore rule: `isOwner(uid)` = `request.auth.uid == 'user@email.com'` → FALSE → **PERMISSION_DENIED** thrown.
This exception propagated all the way through `getUserRole` → `loginUser` → UI, showing "Access denied" and killing login.

**Fix:** Every Firestore call inside `findUserDocument` is individually wrapped in try-catch. PERMISSION_DENIED is silently treated as "not found in this collection" and the function returns null.

## Bug 2 — Wrong Firebase project for volunteer creation
`adminCreateVolunteer()` used a secondary Firebase app with a hardcoded config pointing to project `random-password-generato-e4466` instead of `fifa-world-cup-38005`. Volunteers were being registered in the wrong project; login used the correct project → credentials never matched.

**Fix:** Secondary app now reads config from `import.meta.env` (same env vars as the primary app). Correct project hardcoded as fallback.

## Bug 3 — Missing Firestore rules for operational collections
`tasks`, `foodOrders`, `emergencyRequests`, `issueReports`, `matches`, `systemConfig` had no rules → default DENY. Volunteers and fans could not use any features after login.

**Fix:** Added full rules for all collections in `firestore.rules`. Rules must be deployed to Firebase console to take effect in production.

**Why:** The secondary app pattern is correct (avoids signing out the admin), but must use identical project config. findUserDocument's fallback strategies must be resilient to permission errors.
