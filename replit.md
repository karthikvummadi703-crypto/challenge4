# Nexus AI — FIFA World Cup 2026 Stadium Intelligence Platform

## Overview
A React 19 + TypeScript + Vite single-page app with an Express backend, using
Firebase Authentication + Cloud Firestore for real-time data, Gemini for AI
chat, and optional n8n webhooks for external automation/routing.

Roles: **Admin** (Organizer Dashboard), **Volunteer** (Volunteer Dashboard),
**Fan** (Fan Portal). See `README.md` for the full feature/API map.

## Running the app
- Dev: `npm run dev` (bound to the "Start application" workflow, serves on port 5000 — Express + Vite middleware).
- Build: `npm run build` (Vite client build + esbuild server bundle to `dist/`).
- Start (prod): `npm start` (runs `dist/server.cjs`).
- Tests: `npm test` (Vitest, `tests/server.test.ts` + `tests/demoStore.test.ts`).
- Coverage: `npm run test:coverage` — enforces a floor on `server.ts` (65% statements/lines, 70% branches, 50% functions) via `vitest.config.ts` `coverage.thresholds` so it fails loudly if coverage regresses.
- Lint: `npm run lint` (`tsc --noEmit` + `eslint .`, flat config in `eslint.config.js`). Scoped to real bugs (unused vars, prefer-const, hook rules) — deliberately excludes `eslint-plugin-react-hooks`'s newer "purity"/set-state-in-effect rules, which are React-Compiler-oriented and would require an unrelated architectural rewrite of this codebase's effect patterns.
- Firestore rules test: `npm run test:rules` (boots a local Firestore emulator via `firebase emulators:exec` and runs `tests/firestoreRules.test.ts` against it — excluded from the default `npm test` run since it needs the emulator).
- Admin integrity check: `npm run verify:admin` (fails if the live `admins` collection doesn't have exactly one document; requires the `FIREBASE_SERVICE_ACCOUNT_KEY` secret).

## Data flow
- Firestore is the source of truth for `admins`, `volunteers`, `fans`,
  `tasks`, `foodOrders`, `emergencyRequests`, `issueReports`, `matches`,
  `systemConfig` — most dashboards subscribe with `onSnapshot` for live updates.
- The single Admin account (`admin@nexusai.com`) is lazily bootstrapped on
  first login from `OrganizerDashboard.tsx` — no manual Firestore edits needed.
- Admin creates Volunteer accounts (Firebase Auth + Firestore doc) via
  `adminCreateVolunteer` using a secondary Firebase app instance so the admin
  session isn't disrupted.
- Fans self-register with Firebase Auth; their Firestore profile includes
  `fullName`, `email`, `phone`, `country`, `preferredLanguage`, `favoriteTeam`,
  and a uniqueness-checked auto-generated `seatNumber` (refresh icon).
- `/api/ai/command` (server.ts) routes AI chat: n8n webhook first (if
  configured in Organizer → Integration Center), then Gemini
  (`@google/genai`, `GEMINI_API_KEY`) for real generative answers, then a
  local rule-based engine as final fallback.
- `server.ts` only exposes `/api/config` (admin-only n8n settings) and the two
  AI chat routes — the old in-memory `/api/matches`, `/api/volunteers`,
  `/api/organizer/stats` endpoints from before the Firestore migration have
  already been removed; all dashboards read/write Firestore directly via
  `dataSource.ts`.

## Admin security model
- Role is determined purely by Firestore document existence
  (`admins/{uid}`, `volunteers/{uid}`, `fans/{uid}`) — never by email pattern
  matching or client-supplied flags. `loginUser` (`src/context/authContext.tsx`)
  signs the user out immediately and throws "Access Denied" if their UID has
  no matching role doc for the portal they tried to enter.
- No client code can create an `admins/{uid}` document — `firestore.rules`
  only allows `create`/privileged `update`/`delete` on `admins` and
  `volunteers` when the requester is already an admin. The single admin is
  seeded once via `scripts/seedAdmin.ts` (Firebase Admin SDK, bypasses rules,
  refuses to run if an admin doc already exists).
- `npm run verify:admin` re-checks the one-admin invariant against the live
  database at any later point (manual admin console edits, etc).
- `npm run test:rules` proves at the rules layer (not just app code) that a
  non-admin can never read/write another user's `admins/{uid}` doc or
  self-escalate a `volunteers/{uid}` doc beyond `lastLogin`.
- Actually deploying `firestore.rules` to production requires either the
  `FIREBASE_SERVICE_ACCOUNT_KEY` secret (not set in this environment) or
  running `npx firebase login` + `npx firebase deploy --only firestore:rules`
  interactively from the Replit shell — ask before doing either.

## Demo Mode (judge-facing, no real Firebase Auth/Firestore)
- Entry point: "Try Demo Mode" on `LandingPage.tsx` → role picker → lands
  directly in that dashboard with seeded sample data.
- `src/services/demoStore.ts` — in-memory mock collections, persisted to
  `sessionStorage` (never `localStorage`) and synced across tabs/views in the
  same browser session via `BroadcastChannel`. Has a `resetDemoStore()` used
  by the "Reset Demo Data" control.
- `src/services/dataSource.ts` — the ONLY place dashboards call for Firestore
  reads/writes (`subscribeCollection`/`addRecord`/`updateRecord`/`deleteRecord`).
  It routes to `demoStore` when Demo Mode is active and to real Firestore
  otherwise — dashboards never fork or know which backend they're using.
- `src/context/demoModeContext.tsx` — `enterDemoMode`/`exitDemoMode`/
  `resetDemoData`; signs a real user out (with confirmation) before entering
  Demo Mode so real and mock sessions can never coexist.
- AI chat in Demo Mode calls the unauthenticated `/api/ai/demo-command` route
  (server.ts) instead of the authed `/api/ai/command` — same n8n → Gemini →
  local-engine pipeline, fed sanitized client-supplied demo numbers instead of
  real Firestore telemetry. Safe to leave unauthenticated: it can only ever
  produce chat text, never read/write Firestore.
- `DemoBadge.tsx` renders a persistent "DEMO MODE" banner + reset/exit
  controls on every dashboard while active.

## Required secrets/env vars
- `VITE_FIREBASE_API_KEY` — Firebase Web API key (client-side, public but required).
- `GEMINI_API_KEY` — Gemini API key for AI chat.
- `N8N_AI_ASSISTANT_URL` / `N8N_WEBHOOK_URL` (optional) — configurable from the
  Organizer Dashboard's Integration Center modal, stored server-side in-memory
  (resets on restart) plus mirrored to Firestore `systemConfig`.
- Other `VITE_FIREBASE_*` values and n8n URLs are already set as shared env vars.

## Replit setup (import checklist)
1. `npm install` — installs all Node dependencies (run once after import).
2. Workflow **Start application** runs `npm run dev` → Express + Vite on port 5000.
3. Production build: `npm run build` → Vite client bundle + esbuild server to `dist/`.
4. Deployment target: **autoscale** (`node dist/server.cjs`), configured in `.replit`.
5. `VITE_FIREBASE_*` shared env vars already set in `.replit [userenv.shared]`.
6. Set `GEMINI_API_KEY` secret for live AI chat (app falls back gracefully without it).

## Security hardening (2026-07-12)
- Production `Content-Security-Policy` no longer includes `'unsafe-eval'` in
  `script-src` (only needed by Vite's dev-time HMR client; the prod bundle is
  pre-compiled and never calls `eval`) and now sends `frame-ancestors 'none'`.
- Added `Permissions-Policy` (denies camera/mic/geolocation/payment/usb — the
  app never uses them) and `Strict-Transport-Security` (prod only, since HSTS
  is meaningless without HTTPS) response headers.
- Known accepted risk: `npm audit` reports moderate-severity advisories in
  `firebase-admin`'s transitive dependency chain (`google-gax` → `retry-request`
  → `teeny-request` → old `uuid`). No non-breaking fix exists yet — the only
  fix path is a breaking downgrade of `firebase-admin` itself via
  `npm audit fix --force`, which is not worth the risk for moderate-severity
  transitive advisories. Re-check with `npm audit` after the next
  `firebase-admin` version bump.

## Firebase App Check (optional, currently unactivated)

App Check adds an additional layer of backend protection by verifying that API
requests originate from the legitimate app (not scrapers or bots).  The code is
fully implemented and production-ready — it is deliberately unactivated so that
the app works without extra Firebase Console setup.

**To activate App Check:**

1. **Firebase Console** → your project → App Check.  Register the web app with a
   reCAPTCHA v3 site key (`https://www.google.com/recaptcha/admin`).  Copy the
   **site key**.

2. **Client (Vite)** — add the site key as a Replit secret:
   ```
   VITE_FIREBASE_APPCHECK_SITE_KEY=<your-recaptcha-v3-site-key>
   ```
   The client (`src/firebase.ts`) reads this at build time.  When present it calls
   `initializeAppCheck()` and attaches the token to every API request via
   `src/services/apiClient.ts`.  When absent the client silently skips token
   generation — no errors, no change in UX.

3. **Server** — add an environment variable (not a secret — it is not sensitive):
   ```
   ENFORCE_APP_CHECK=true
   ```
   The server (`lib/firebaseAdmin.ts → requireAppCheck`) checks this flag at the
   top of its middleware.  When the flag is absent (or anything other than `"true"`)
   all requests pass through unchecked — existing deployments keep working
   unchanged.  When the flag is `"true"` requests to `/api/config` (GET + POST)
   and `/api/ai/command` are rejected with HTTP 401 unless they carry a valid
   `X-Firebase-AppCheck` token.

4. Rebuild and redeploy (`npm run build` → `npm start`).

**Do not set `ENFORCE_APP_CHECK=true` without also setting
`VITE_FIREBASE_APPCHECK_SITE_KEY`** — the server would then reject every API
request because the client would not attach any token.

## CI / GitHub Secrets

The CI pipeline (`.github/workflows/ci.yml`) runs two parallel jobs on every push and PR:

- **`unit`** — `tsc --noEmit`, `eslint`, `npm test`, `npm run test:coverage`, `npm run build`. Passes with placeholder Firebase values; no secrets needed.
- **`e2e`** — Playwright Chromium. Journeys 1–3 use Demo Mode (no real Firebase); they pass with placeholders. **Journey 4** (Admin login rejection) makes a real Firebase Auth call and **self-skips with a visible reason** when only placeholder credentials are present.

### To unlock Journey 4 in GitHub Actions
Add the following as **GitHub repo secrets** (Settings → Secrets and variables → Actions → New repository secret):

| Secret name | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `your-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Numeric sender ID |
| `VITE_FIREBASE_APP_ID` | e.g. `1:000000000000:web:abc123` |
| `VITE_FIREBASE_MEASUREMENT_ID` | GA measurement ID |

When these secrets are present the `ci.yml` env block picks them up automatically (via `${{ secrets.NAME || 'ci-placeholder-...' }}`) and Journey 4 runs on every push without any workflow changes needed.

## User preferences
- Preserve the existing dark neon "stadium command center" UI — do not redesign.

## Fixed: unintended accounts could log into the Admin Portal (2026-07-12)
`npm run verify:admin` found 3 documents in the live Firestore `admins`
collection instead of the required 1 — all added by hand via the Firebase
console (which bypasses `firestore.rules` entirely), not through the app or
`scripts/seedAdmin.ts`. Since admin access is granted purely by the existence
of a doc at `admins/{uid}` (see `verifyAdminAccess` in
`src/services/userService.ts`), each stray doc gave full Organizer Dashboard
access to whichever account's UID it was keyed to:
- `3Nztt8sbKlbpKcTQWoY6ZfeIx2h2` (karthikvummadi703@gmail.com) — the real admin, kept.
- `Firebase uid` — a literal placeholder string mistakenly used as a doc ID, deleted (junk, matched no real account).
- `MgbxdWoCuKYzbKq6YwvEsBufd1B3` (volenteer9@gmail.com) — a volunteer account that had been given admin rights by mistake, deleted. This was the actual login bug the user hit.

Remediation: deleted the 2 stray documents via the Admin SDK, normalized the
remaining doc's field names to lowercase (`email`, not `Email`), and
re-ran `npm run verify:admin`, which now reports exactly 1 admin document.
No application code changed for the original fix — the bug was bad Firestore
data, not faulty logic.

To make this recur loudly instead of silently, `server.ts` now runs the same
one-admin-doc check on every server boot (`checkAdminIntegrityOnBoot`) and
logs a clear `⚠ ADMIN INTEGRITY WARNING` if the live count is ever anything
but 1, pointing at `npm run verify:admin` for details. It never blocks
startup or touches request handling — pure observability.
