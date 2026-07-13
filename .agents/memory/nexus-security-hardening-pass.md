---
name: Nexus security hardening pass
description: Firebase config fail-fast, prod CSP nonce, and auto-generated volunteer passwords — decisions and a pre-existing test:rules gap.
---

- `src/firebase.ts` throws at module load if any required `VITE_FIREBASE_*` var is missing — no committed fallback project. `apiKey` may still come from `GOOGLE_API_KEY` as a secondary *env* source (not a hardcoded value), but is otherwise required too.
- Production CSP `script-src` has no `'unsafe-inline'` — it uses a per-request nonce (`res.locals.cspNonce`, generated via `crypto.randomBytes`). Because a static `sendFile` can't carry a per-request value, prod index.html serving was changed from `express.static` auto-index to `{ index: false }` + a `app.get('*')` handler that reads the built `dist/index.html` once and does a `<script` → `<script nonce="...">` replace on every request. Dev CSP keeps `'unsafe-inline' 'unsafe-eval'` for Vite HMR, untouched.
  **Why:** removes a broad `unsafe-inline` XSS surface in production without breaking the two inline `<script>` tags in index.html (perf sentinel + JSON-LD) or the hashed module entry script.
- `vitest.config.ts` globally excludes `tests/firestoreRules.test.ts` from `include`/`exclude`, so `npm run test:rules` (which explicitly targets that file via `firebase emulators:exec ... vitest run tests/firestoreRules.test.ts`) prints "No test files found" and exits 1 — this is pre-existing/unrelated to any specific feature work, not a regression from unrelated changes. Vitest's `exclude` wins even when the file is passed explicitly on the CLI.
- New volunteer accounts get a crypto-secure auto-generated password (`src/utils/generatePassword.ts`, `crypto.getRandomValues`, 12+ chars) instead of a `'password123'` default; the admin UI shows it read-only + copy button and gates account creation behind an explicit "I copied this password" checkbox.
  **Why:** guessable default passwords for volunteer accounts were a real credential risk.
