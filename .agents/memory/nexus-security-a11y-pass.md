---
name: Nexus AI security/testing/accessibility pass decisions
description: Decisions made while hardening security, testing, and accessibility without changing visual/behavior — reference before touching helmet/CSRF/App Check config, modal accessibility, or coverage thresholds.
---

## CSRF model for bearer-token APIs
This app has no cookie-based session — every state-changing request carries a Firebase ID token as `Authorization: Bearer`. Cookie-oriented CSRF middleware (csurf, double-submit cookie) protects nothing here since a cross-site form can't set that header. Chose defense-in-depth instead: require `Content-Type: application/json` on all non-GET `/api/*` routes, since plain HTML forms can't send that content type without tripping a CORS preflight.
**Why:** adding an unrelated CSRF token would be security theater for this auth model, not a mitigation.
**How to apply:** if a future change introduces cookie-based sessions, revisit — real CSRF tokens become necessary then.

## helmet + custom security headers coexistence
`server.ts` already had a hand-rolled security-headers middleware (CSP, HSTS, X-Frame-Options, Referrer-Policy, X-XSS-Protection, tuned per dev/prod). When adding `helmet`, disabled `contentSecurityPolicy`, `hsts`, `frameguard`, `referrerPolicy`, `xssFilter` in helmet's config so it only adds headers the custom middleware didn't already set (hidePoweredBy, dnsPrefetchControl, crossOriginResourcePolicy, etc.).
**Why:** letting both set the same header risks silently overwriting the tailored dev/prod CSP.
**How to apply:** whenever adding a header-setting library to a project with existing manual header middleware, diff which headers each sets before wiring it in.

## Firebase App Check made fully opt-in
Client (`src/firebase.ts`) only initializes App Check if `VITE_FIREBASE_APPCHECK_SITE_KEY` is set; server (`lib/firebaseAdmin.ts` `requireAppCheck`) only enforces if `ENFORCE_APP_CHECK=true`. Both env vars are unset by default.
**Why:** App Check requires a one-time manual Firebase Console step (register app, create reCAPTCHA v3 site key) that can't be done from code — enforcing it unconditionally would have broken the app for every existing deployment.
**How to apply:** any security control that depends on an external manual setup step must degrade to a no-op, not a hard failure, until that step is confirmed done.

## Transitive npm audit vulnerabilities rooted in firebase-admin/firebase-tools
11 moderate vulnerabilities (uuid, gaxios, google-gax, @google-cloud/firestore, @google-cloud/storage, teeny-request, retry-request) come from firebase-admin/firebase-tools's own dependency tree. `npm audit fix` (non-force) fixes nothing. Bumping firebase-admin to ^14.x drops it to 9 but requires Node ≥22 (EBADENGINE on Node 20.20.0).
**Why:** don't force/break-fix transitive deps in a task scoped to "no behavior changes" — a Node major version bump is out of scope and risky without dedicated regression testing.
**How to apply:** if asked to clear these audit findings, first check whether the environment's Node version has since moved to 22+; if not, it's a real prerequisite, not busywork.

## Shared modal accessibility hook
Added `src/hooks/useModalA11y.ts` — a reusable hook (focus-trap Tab/Shift+Tab, Escape-to-close, focus restore on close) applied to every `role="dialog"` in the app (LandingPage demo picker, WebhookSettingsModal, OrganizerDashboard publish-success modal).
**Why:** each modal had ad hoc backdrop-click-to-close but no keyboard support; a shared hook avoids reimplementing focus-trap logic per modal and keeps behavior consistent.
**How to apply:** any new modal/dialog in this app should use this hook rather than writing its own focus/Escape handling.

## Coverage floor only enforced on server.ts
`vitest.config.ts`'s coverage thresholds apply only to `server.ts`; the three big dashboard components (FanDashboard, VolunteerDashboard, OrganizerDashboard) and a few supporting components sit at 0% coverage with no rendering tests at all — that gap is real, not a config oversight, and is proposed as a follow-up task rather than closed inline (would require introducing React Testing Library rendering tests for ~2500 lines of dashboard code).
