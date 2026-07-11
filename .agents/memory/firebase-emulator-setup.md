---
name: Firebase Firestore rules emulator setup
description: How to get `firebase emulators:exec` running for rules-unit-tests in this Replit/Nix environment, and the Java version gotcha.
---

- `firebase-tools` (npx or devDependency) requires **JDK 21+** for the Firestore
  emulator — JDK 17 fails at emulator startup with an explicit version error.
  Install both is unnecessary; just install jdk21 via `installSystemDependencies`
  and confirm `java -version` resolves to 21 (Nix may have multiple JDKs on PATH;
  the first one found wins).
- `.firebaserc` needs `projects.default` set to the real Firebase project ID.
  `firebase.json` needs `firestore.database` set explicitly if the project uses a
  **named** (non-default) Firestore database ID — check for this before assuming
  the default database is being deployed to/tested against.
- `@firebase/rules-unit-testing` tests must exclude themselves from the default
  `vitest run` (they need a live emulator on a fixed port) — give them a
  separate npm script that wraps them in `firebase emulators:exec`, and add the
  test file to the main vitest config's `exclude` list.
