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
- Tests: `npm test` (Vitest, 24 tests in `tests/server.test.ts`).

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
- `server.ts` also still serves a few in-memory REST endpoints
  (`/api/matches`, `/api/volunteers`, `/api/organizer/stats`, `/api/config`)
  that are legacy from before the Firestore migration; several dashboards
  already read/write Firestore directly instead. See proposed follow-up task
  for consolidating this.

## Required secrets/env vars
- `VITE_FIREBASE_API_KEY` — Firebase Web API key (client-side, public but required).
- `GEMINI_API_KEY` — Gemini API key for AI chat.
- `N8N_AI_ASSISTANT_URL` / `N8N_WEBHOOK_URL` (optional) — configurable from the
  Organizer Dashboard's Integration Center modal, stored server-side in-memory
  (resets on restart) plus mirrored to Firestore `systemConfig`.
- Other `VITE_FIREBASE_*` values and n8n URLs are already set as shared env vars.

## User preferences
- Preserve the existing dark neon "stadium command center" UI — do not redesign.
