---
name: Volunteer Login Root Cause Fix
description: Why volunteer login failed and how it was fixed — critical for any future auth changes
---

## The Bug
Admin-created volunteers could not log in because `adminCreateVolunteer()` in `userService.ts` used a secondary Firebase app with **hardcoded config pointing to the wrong Firebase project** (`random-password-generato-e4466` instead of `fifa-world-cup-38005`). Volunteers were registered in a completely different Firebase project than the one the app authenticated against.

## The Fix
- `adminCreateVolunteer()` now reads Firebase config from `import.meta.env` (same env vars as the main `firebase.ts`), with the correct project as fallback.
- `firebase.ts` was simplified: removed `initializeFirestore` with a stale custom `databaseId`; now uses `getFirestore(app)` (default Firestore database).
- `createVolunteerProfile` now includes `assignedGate`, `active: true`, and `profileCompleted: true` fields.
- `OrganizerDashboard` passes `newVolunteerGate` to `adminCreateVolunteer`.

**Why:** The secondary app pattern is correct (avoids signing out the admin), but it must use identical Firebase config to the primary app.
