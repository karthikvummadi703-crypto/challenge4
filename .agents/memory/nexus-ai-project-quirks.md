---
name: Nexus AI project quirks
description: Import/setup gotchas for the Nexus AI (FIFA World Cup stadium) project.
---

- Fresh import ships with `node_modules` absent — workflow fails with
  `tsx: No such file or directory` until `npm install` runs once.
- `VITE_FIREBASE_*` values (including the API key) are pre-set as shared env
  vars in `.replit`, not secrets — they're public client config, not sensitive.
- `GEMINI_API_KEY` and `FIREBASE_SERVICE_ACCOUNT_KEY` are the two secrets that
  are NOT pre-provisioned on import; app runs and degrades gracefully without
  them (AI chat falls back to a local rule-based engine; `npm run verify:admin`
  simply can't run), so treat them as optional/ask-first rather than blocking.
- server.ts still has legacy in-memory REST endpoints alongside Firestore (see
  replit.md "Data flow" section for the current, authoritative list — it gets
  updated as endpoints are removed, don't trust this note over replit.md).
