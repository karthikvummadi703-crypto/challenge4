---
name: Nexus telemetry test-cache masking
description: Why getStadiumTelemetry "failure fallback" tests in tests/server.test.ts can pass for the wrong reason, and how to avoid it.
---

`getStadiumTelemetry()` in `server.ts` caches successful Firestore reads in a
module-level variable for 10s (`TELEMETRY_TTL_MS`). Any `/api/ai/command` or
`/api/ai/demo-command` call earlier in the same test file populates that
cache. A later test that flips `telemetryShouldFail`/`mockAdminSdkConfigured`
to exercise the catch/early-return branches never actually reaches Firestore
— it silently gets served the still-fresh cached (already-zeroed) value, so
the assertion passes without exercising the code path it claims to test.

**Why:** discovered via `coverage-final.json` statement analysis — lines
inside the try/catch and the `!isAdminSdkConfigured()` early return showed
0 hits despite dedicated-looking tests existing for them.

**How to apply:** any test that needs to force a *fresh* Firestore read in
this file must first make the cache look stale, e.g. spy `Date.now()` to
return `realNow + 15_000` for the duration of the request (see
`withStaleTelemetryCache` helper in `tests/server.test.ts`), then restore the
spy immediately. Don't trust that a test "about Firestore failure" actually
reaches Firestore — check the cache state first.
