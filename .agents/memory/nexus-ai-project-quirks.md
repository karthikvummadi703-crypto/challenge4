---
name: Nexus AI project quirks
description: Non-obvious setup/architecture facts about the Nexus AI FIFA stadium project, needed before touching it again.
---

## Missing secrets block the app entirely on fresh import
On import, `.replit` userenv had all `VITE_FIREBASE_*` vars except `VITE_FIREBASE_API_KEY`, so Firebase Auth threw `auth/invalid-api-key` and the app was unusable. `GEMINI_API_KEY` was also absent. Both must be requested from the user (env var + secret respectively) before the app is functional — this isn't visible from reading the code, only from running it and checking browser console logs.

**Why:** The repo's `.env.example` documents `GEMINI_API_KEY` and Firebase vars, but they were never carried into Replit env/secrets on import.
**How to apply:** After importing/re-importing this project, always check `viewEnvVars` and restart the workflow after adding secrets — env vars set mid-session are not picked up by an already-running `tsx server.ts` process.

## Two backends for the same data coexist
`server.ts` has legacy in-memory Express endpoints (`/api/matches`, `/api/volunteers`, `/api/organizer/stats`, `/api/config`) left over from before the app adopted Firestore. Most dashboard components (Organizer/Volunteer/Fan) already read/write Firestore directly via `onSnapshot`/`addDoc`, bypassing those REST routes. Don't assume server.ts in-memory arrays are the source of truth — check whether the specific component you're editing uses Firestore or the legacy REST API before changing either side.

## AI chat fallback chain
`/api/ai/command` tries n8n webhook (if `N8N_AI_ASSISTANT_URL`/config is set) → Gemini (`@google/genai`, `GEMINI_API_KEY`) → local rule-based canned responses, in that order. `@google/genai` v2 usage: `new GoogleGenAI({apiKey})` then `ai.models.generateContent({model: 'gemini-2.5-flash', contents: string})`, response text via `result.text`. A transient Gemini 503 ("high demand") is normal and falls through gracefully — not a bug.

## Auth failures across ALL logins (admin/volunteer/fan)
`requireAuth` in `lib/firebaseAdmin.ts` (used by `/api/ai/command` and other authenticated routes) verifies ID tokens via the Firebase Admin SDK, which only initializes when `FIREBASE_SERVICE_ACCOUNT_KEY` is set. Without it, every authenticated endpoint 401s for every role — not just admin-gated ones. Symptom reported by users: "AI chat / API doesn't work for any login type." Fix: request the `FIREBASE_SERVICE_ACCOUNT_KEY` secret (Firebase Console → Project Settings → Service Accounts → Generate new private key, paste full JSON as the secret value).
