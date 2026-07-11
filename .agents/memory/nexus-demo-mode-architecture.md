---
name: Nexus AI Demo Mode architecture
description: Pattern used to add a judge-facing "Demo Mode" without forking dashboard components.
---

- Dashboards never call Firestore SDK functions directly for their live
  collections — they call through `src/services/dataSource.ts`
  (`subscribeCollection`/`addRecord`/`updateRecord`/`deleteRecord`), which
  branches on a module-level `demoModeActive` flag to route to either real
  Firestore or the in-memory `src/services/demoStore.ts`.
  **Why:** lets the exact same dashboard UI code run against both backends —
  no forked "DemoOrganizerDashboard" component to keep in sync.
  **How to apply:** any new Firestore call site added to a dashboard must go
  through `dataSource.ts`, not `onSnapshot`/`addDoc`/etc. directly, or it will
  silently write to production Firestore even while Demo Mode is active.
- Demo Mode persists only to `sessionStorage` (never `localStorage`) and syncs
  across tabs/views via `BroadcastChannel` — this is what makes "real-time
  sync across roles" work without a backend, and keeps it from leaking beyond
  the browser tab/session.
- AI chat needs a demo-safe variant when the real chat endpoint requires
  Firebase Auth: added an unauthenticated sibling route fed by
  client-supplied sanitized numbers instead of a live database read, since the
  underlying answer logic doesn't mutate any datastore.
