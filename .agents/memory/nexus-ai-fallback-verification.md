---
name: Nexus AI chat fallback verification
description: How to prove the n8n->Gemini->local-engine chat fallback chain actually works, and n8n test-webhook gotcha
---

## n8n test-mode webhooks cannot back a persistent feature
An n8n URL under `/webhook-test/<path>` only fires ONE time, immediately after a human manually
clicks "Execute workflow" in the n8n editor canvas — it then goes dead (404 "not registered")
until clicked again. It is a debug aid for building the workflow, not a live endpoint. Only
`/webhook/<path>` (published/production) is always-on. Never wire `N8N_AI_ASSISTANT_URL` (or any
persistent integration) to a `webhook-test` URL — flag it to the user instead.

## Response-shape mismatches are silent
`answerStadiumQuestion()` in `server.ts` expects the n8n response body to contain `output`/`text`/
`response`. If the actual n8n workflow returns a different shape (e.g. an intent-router payload
with `status`/`intent`/`clarificationMessage`), the code doesn't error — it just
`JSON.stringify()`s the whole object as the "answer". A 200 OK from n8n is not sufficient proof
the integration works end-to-end; always inspect the actual body shape against what the code reads.

## Cheap way to prove the AI fallback chain with real evidence
`POST /api/ai/demo-command` (unauthenticated, rate-limited, demo-telemetry only) runs the exact
same `answerStadiumQuestion()` pipeline as the authenticated endpoint. Curl it directly to get real
proof of which `source` ("n8n Webhook" / "Gemini AI" / "Nexus Local Engine") is answering, without
needing a Firebase ID token or App Check token.

## A secret named case-differently is a silent dead integration
`gemini_api_key` (lowercase, stale/wrong value) and `GEMINI_API_KEY` (correct casing) coexisted as
separate secrets. Code only reads `process.env.GEMINI_API_KEY` — the lowercase one was pure noise
that could mislead a "yes it's set" check. Always confirm the exact casing the code reads, not just
that *a* secret with a similar name exists.

**Why:** these caused a real incident — Gemini fallback looked "configured" but `genAI` was `null`
at runtime, and n8n looked "reachable" (200 OK) but produced garbage output — both invisible without
hitting the actual answer pipeline and checking the real payload/source.
