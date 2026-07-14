# Nexus AI — FIFA World Cup 2026 Stadium Intelligence Platform

**Nexus AI** is a full-stack, real-time stadium operations platform built for the FIFA World Cup 2026. It gives three distinct roles — **Admin** (Organizer), **Volunteer**, and **Fan** — purpose-built dashboards that handle everything from crowd telemetry and volunteer dispatch to fan food ordering and emergency escalation. A three-tier AI pipeline (n8n webhook → Gemini generative AI → local rule engine) powers an always-available command assistant that degrades gracefully when any upstream service is absent. The platform ships with a **Demo Mode** that runs entirely in-browser with no Firebase setup required, making it instantly evaluable by any judge or reviewer.

---

## Try It in 30 Seconds — Demo Mode

Demo Mode requires **zero accounts, zero API keys, and zero configuration**. Everything runs in the browser against an in-memory fixture dataset.

1. Open the app (or run `npm run dev` — see [Development](#development) below).
2. Click **"Try Demo Mode"** on the landing page.
3. Pick a role — **Organizer**, **Volunteer**, or **Fan**.
4. Explore the full dashboard. All actions (food orders, task completion, AI chat, emergency alerts) work against live seeded data.

A persistent **DEMO MODE** banner and a **Reset Demo Data** button appear on every dashboard while active. Exiting Demo Mode returns you to the landing page.

---

## Development

### Prerequisites

- Node.js 20+
- `npm install` (run once)

### Run in development

```bash
npm run dev
```

Starts the Express + Vite dev server on **port 5000**. Open `http://localhost:5000` (or the Replit preview URL).

### Other scripts

| Script | What it does |
|---|---|
| `npm run dev` | Express + Vite HMR dev server on port 5000 |
| `npm run build` | Vite client bundle + esbuild server bundle → `dist/` |
| `npm start` | Production server (`node dist/server.cjs`) |
| `npm run lint` | `tsc --noEmit` + `eslint .` |
| `npm test` | 715 Vitest unit tests across 45 files |
| `npm run test:coverage` | Same, with V8 coverage report |
| `npm run test:e2e` | 4 Playwright E2E journey tests (Chromium) |
| `npm run test:rules` | Firestore security rules tests against a local emulator |
| `npm run verify:admin` | Live Firestore check: exactly one admin document must exist |

### Production deployment

```bash
npm run build
npm start   # runs dist/server.cjs
```

---

## Architecture

```
Browser
  └─ React 19 + TypeScript + Vite (SPA)
       ├─ src/context/authContext.tsx      — Firebase Auth session, role detection
       ├─ src/context/demoModeContext.tsx  — Demo Mode state + in-memory store routing
       ├─ src/services/dataSource.ts       — single abstraction for Firestore / demoStore
       ├─ src/services/demoStore.ts        — in-memory fixture data (sessionStorage-backed)
       └─ src/services/apiClient.ts        — typed fetch wrapper (App Check token injection)

Express (server.ts, port 5000)
  ├─ Vite middleware in dev, static dist/ in prod
  ├─ POST /api/ai/command       — authed AI chat (Admin/Volunteer)
  ├─ POST /api/ai/demo-command  — unauthenticated AI chat (Demo Mode only)
  ├─ GET/POST /api/config       — admin n8n webhook config (reads/writes Firestore systemConfig)
  └─ lib/firebaseAdmin.ts       — Admin SDK: token verification, App Check enforcement

AI pipeline (both /api/ai/* routes)
  n8n webhook → Gemini (@google/genai) → local rule-based engine
  Each hop is skipped gracefully when the upstream is absent or fails.

Firebase
  ├─ Auth           — Fan self-registration, Volunteer/Admin login
  └─ Firestore      — admins, volunteers, fans, tasks, foodOrders,
                       emergencyRequests, issueReports, matches, systemConfig
```

### Security model

- **Role is document-existence only.** `authContext.tsx` signs the user out immediately if their Firebase UID has no document in the matching collection (`admins/{uid}`, `volunteers/{uid}`, `fans/{uid}`). No email pattern matching, no client-supplied flags.
- **`firestore.rules` enforces the same invariant at the database layer.** No client code can create or escalate an `admins/{uid}` document. The single admin account is seeded once via `scripts/seedAdmin.ts` (Admin SDK, refuses to run if a doc already exists).
- **Boot-time integrity check.** `server.ts` checks the `admins` collection on every startup and logs `⚠ ADMIN INTEGRITY WARNING` if the count is ever anything other than 1. Run `npm run verify:admin` for an on-demand live check.
- **Production CSP** has no `'unsafe-eval'`, sends `frame-ancestors 'none'`, `Permissions-Policy` (camera/mic/geolocation/payment/usb all denied), and `HSTS` (production only).

---

## Features by Role

### Admin (Organizer Dashboard)

- **Match setup panel** — create/publish match configurations that activate volunteer and fan portals.
- **Volunteer management** — create volunteer accounts (Firebase Auth + Firestore doc, secure auto-generated password shown once), view roster, monitor task assignments.
- **Dashboard analytics** — live stat cards: Food Orders, Medical Cases, Issue Reports, Active Volunteers.
- **AI Command Center** — chat interface routed through n8n → Gemini → local engine with suggested quick-chip prompts ("How many food orders are pending?", "Show available volunteers", etc.).
- **Integration Center** — configure n8n webhook URLs at runtime, persisted to Firestore `systemConfig`.
- **Demo Mode** — one-click Organizer demo with pre-seeded matches, volunteers, tasks, and telemetry.

### Volunteer (Volunteer Dashboard)

- **Active task stack** — real-time Firestore `onSnapshot` feed of assigned tasks (Deliver Food, Medical Response, etc.).
- **Task acceptance and completion** — accept open tasks from the live queue; complete them to resolve linked orders or emergencies.
- **Stadium seat map** — SVG coordinate map highlighting the volunteer's current assignment seat.
- **AI Route Assistant** — AI chat for navigation guidance and shift information.
- **Demo Mode** — pre-assigned task "Deliver 2x Chicken Burger, 1x Coke" → complete → verify cleared.

### Fan (Fan Portal)

- **Self-registration** — Firebase Auth account + Firestore profile (name, email, phone, country, preferred language, favorite team, auto-generated unique seat number).
- **Stadium seat display** — persistent sidebar showing seat assignment and stadium map.
- **Food ordering** — browse menu, add items, place catering order to seat, get confirmation.
- **Issue reporting** — submit comfort or security incidents.
- **Medical emergency beacon** — high-priority alert dispatched to Volunteers in real time.
- **AI chat** — ask questions about the stadium, match, or services.
- **Demo Mode** — pre-assigned seat A-118 with full food ordering and AI chat.

### Demo Mode (all roles)

- Entirely in-browser — no Firebase Auth, no Firestore reads/writes, no network dependencies.
- `src/services/dataSource.ts` routes all dashboard calls to `src/services/demoStore.ts` transparently; dashboards never know which backend they're using.
- `sessionStorage`-backed (survives page refresh within the same tab; cleared on tab close). `BroadcastChannel` keeps multiple open tabs in sync.
- AI chat in Demo Mode uses the unauthenticated `/api/ai/demo-command` route — same n8n → Gemini → local-engine pipeline; the GEMINI_API_KEY secret is optional but makes AI responses generative.

---

## Quality and Engineering

### Test suite

| Layer | Count | Runner |
|---|---|---|
| Unit + integration | **715 tests, 45 files** | Vitest |
| E2E user journeys | **4 tests** (Fan, Volunteer, Admin Demo, Admin login rejection) | Playwright / Chromium |
| Firestore rules | Security rules against live emulator | `npm run test:rules` |

Coverage (V8, `npm run test:coverage`, enforced in CI):

| Scope | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| All measured files | 90.47% | 87.21% | 94.79% | 91.02% |
| `server.ts` (threshold-enforced) | ≥65% | ≥70% | ≥50% | ≥65% |

### CI pipeline (GitHub Actions)

Two parallel jobs on every push and pull request (`.github/workflows/ci.yml`):

- **`unit`** — `tsc --noEmit` → `eslint .` → `npm test` → `npm run test:coverage` → `npm run build`. Passes with placeholder Firebase values; no secrets required.
- **`e2e`** — Playwright Chromium. Journeys 1–3 (Demo Mode) pass with placeholders. Journey 4 (real Firebase Auth call) self-skips with a visible reason when only placeholder credentials are present; add `VITE_FIREBASE_*` as GitHub repo secrets to enable it (see [Environment Variables](#environment-variables) below).

### Accessibility

- 115+ `aria-label`, `aria-live`, `role`, and `aria-*` attributes across all components.
- Shared `useModalA11y` hook enforces focus-trap and `aria-modal` on every dialog.
- `aria-live="polite"` regions on all real-time update areas (task stack, order status, AI chat).
- Skip-to-content link; `focus-visible` outline CSS for keyboard navigation.
- `prefers-reduced-motion: reduce` respected — SplashScreen completes immediately, no animations.

### Performance

- Role-specific bundles (`OrganizerDashboard`, `VolunteerDashboard`, `FanDashboard`) are lazy-loaded; the SplashScreen masks the download delay.
- Vendor code-splitting: Firebase, Three.js, Framer Motion (`motion` package) each in their own chunk.
- Google Fonts loaded via `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html`, not CSS `@import`.
- Full SEO meta tags and `favicon.svg` in `index.html`.

---

## Environment Variables

All variables are documented in `.env.example`. This table matches it exactly.

### Required — app refuses to start without these

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key (public client identifier) |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `your-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Numeric sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | GA measurement ID |

> **Demo Mode does not use these.** All seven are only needed for real Firebase Auth and Firestore. `src/firebase.ts` throws at startup if any are missing.

### Optional — app degrades gracefully without these

| Variable | Default behavior when absent |
|---|---|
| `GEMINI_API_KEY` | AI chat skips Gemini; falls back to local rule engine |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | `/api/config`, `/api/ai/command`, `npm run verify:admin`, and `scripts/seedAdmin.ts` are unavailable; everything else works |
| `N8N_WEBHOOK_URL` | n8n hop skipped in AI pipeline |
| `N8N_AI_ASSISTANT_URL` | n8n AI assistant hop skipped |
| `VITE_N8N_WEBHOOK_PRODUCTION_URL` | n8n production webhook not linked |
| `VITE_FIREBASE_APPCHECK_SITE_KEY` | App Check never initializes; no UX change |
| `ENFORCE_APP_CHECK` | App Check not enforced server-side (any value other than `"true"` means off) |
| `GOOGLE_API_KEY` | Alternate source for Firebase API key — not needed if `VITE_FIREBASE_API_KEY` is set |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Only used by `scripts/seedAdmin.ts` one-time admin seeding; never read by the running app |
| `DISABLE_HMR` | Set to `"true"` to disable Vite HMR and file-watching (useful in constrained sandboxes) |

### Firebase App Check (optional, unactivated by default)

App Check verifies that API requests originate from the real app. Code is fully implemented; activation requires two steps:

1. Firebase Console → App Check → register this web app with a reCAPTCHA v3 site key. Set that key as `VITE_FIREBASE_APPCHECK_SITE_KEY`.
2. Set `ENFORCE_APP_CHECK=true` on the server **only after** step 1. Without a client-side site key the server would reject every request.

---

## Known Limitations and Accepted Tradeoffs

| Item | Detail |
|---|---|
| **11 moderate `npm audit` advisories** | All are in `firebase-admin`'s transitive dependency chain: `google-gax` → `retry-request` → `teeny-request` → an old `uuid` version. No non-breaking fix exists — the only path is `npm audit fix --force`, which would downgrade `firebase-admin` itself. Accepted as a known moderate-severity transitive risk; re-check after the next `firebase-admin` release. |
| **App Check is opt-in** | The enforcement code is fully implemented in `lib/firebaseAdmin.ts` but unactivated. Activating it requires a Firebase Console step that cannot be done from code. See [Firebase App Check](#firebase-app-check-optional-unactivated-by-default) above. |
| **Firestore rules not auto-deployed** | `firestore.rules` is in the repo but deploying it to the production Firebase project requires either `FIREBASE_SERVICE_ACCOUNT_KEY` or an interactive `firebase login` + `firebase deploy --only firestore:rules`. The rules are tested against a local emulator via `npm run test:rules`. |
| **E2E Journey 4 in CI without secrets** | The admin login rejection test makes a real Firebase Auth call. When only CI placeholder credentials are present it self-skips with a printed reason rather than failing. Add `VITE_FIREBASE_*` as GitHub repo secrets to enable it. |
| **WebGL on server-side render** | The Three.js `Antigravity` background component logs WebGL context errors in headless/non-GPU environments (e.g., Playwright screenshots). This is cosmetic — the component has a canvas-unavailable fallback and no application functionality depends on WebGL. |
| **Single admin account** | The security model enforces exactly one document in the `admins` Firestore collection. Multiple admin accounts would require a UI change and updated Firestore rules — intentional simplification for a stadium with a single operations controller. |

---

## Project Structure

```
.
├── .github/workflows/ci.yml       # GitHub Actions CI (unit + e2e jobs)
├── lib/
│   └── firebaseAdmin.ts           # Admin SDK init, requireAuth, requireAdmin, App Check
├── scripts/
│   ├── seedAdmin.ts               # One-time admin account seeder (run once, refuses duplicates)
│   └── verifyAdminIntegrity.ts    # Live Firestore check: exactly 1 admin doc
├── src/
│   ├── components/
│   │   ├── fan/                   # FanDashboard tabs, auth, AI chat, food, medical, issue
│   │   ├── organizer/             # Dashboard overview, match setup, volunteers, login panels
│   │   ├── volunteer/             # Task stack, login, AI chat, map, header
│   │   ├── LandingPage.tsx        # Role entry point + Demo Mode entry
│   │   ├── SplashScreen.tsx       # Boot animation (respects prefers-reduced-motion)
│   │   ├── StadiumSeatMap.tsx     # SVG seat map with alert overlays
│   │   └── WebhookSettingsModal.tsx
│   ├── context/
│   │   ├── authContext.tsx        # Firebase Auth session, role-based sign-in/out
│   │   └── demoModeContext.tsx    # Demo Mode state, enter/exit/reset
│   ├── hooks/
│   │   └── useModalA11y.ts        # Focus-trap + aria-modal for all dialogs
│   ├── services/
│   │   ├── apiClient.ts           # Typed fetch wrapper with App Check token injection
│   │   ├── authService.ts         # Firebase Auth helpers
│   │   ├── dataSource.ts          # Firestore ↔ demoStore routing abstraction
│   │   ├── demoStore.ts           # In-memory fixture store (sessionStorage + BroadcastChannel)
│   │   └── userService.ts         # Volunteer/fan/admin CRUD via Admin SDK or Firestore
│   ├── utils/
│   │   └── generatePassword.ts    # Secure auto-generated volunteer passwords
│   ├── firebase.ts                # Firebase client SDK init (throws if VITE_FIREBASE_* missing)
│   └── App.tsx                    # Top-level role router
├── tests/
│   ├── components/                # 31 component test files (jsdom, React Testing Library)
│   ├── services/                  # dataSource service tests
│   ├── e2e/
│   │   └── journeys.spec.ts       # 4 Playwright user journey tests
│   ├── server.test.ts             # Express route + middleware tests
│   ├── demoStore.test.ts          # demoStore unit tests
│   └── firestoreRules.test.ts     # Firestore rules tests (requires local emulator)
├── playwright.config.ts           # Playwright config (system Chromium detection for NixOS)
├── vitest.config.ts               # Vitest config (coverage thresholds on server.ts)
├── firestore.rules                # Firestore security rules
├── server.ts                      # Express server (AI routes, config route, Vite middleware)
├── .env.example                   # Complete annotated environment variable reference
└── index.html                     # Entry HTML (SEO meta, preconnect for fonts, favicon)
```
