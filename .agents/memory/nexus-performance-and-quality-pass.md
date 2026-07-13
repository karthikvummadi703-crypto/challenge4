---
name: Nexus AI performance and quality pass
description: Lazy-loading architecture change, test suite expansion, ESLint clean-up decisions made during the quality pass.
---

## Lazy-loading architecture (SplashScreen timing)

**Rule:** `App.tsx` must stay tiny — `AuthProvider`/Firebase must live inside a lazy `AuthenticatedApp` chunk, never in the synchronous entry.

**Why:** Eager Firebase import delayed first SplashScreen render by ~1.8 s (measured via `window.__nexus_t0` sentinel in `<head>`). Moving it to a lazy chunk dropped it to ~1.0 s (−43%, −762 ms).

**How to apply:** If any future code re-imports `authContext` or `firebase` from `App.tsx` directly, the critical-path delay will return. Keep the lazy boundary at `AuthenticatedApp`.

## Test suite expansion

- **Before:** 544 tests / 39 files
- **After:**  589 tests / 42 files (+3 files: BlurText, Antigravity, FanDashboard.handlers)

**IntersectionObserver mock gotcha:** `vi.fn()` is NOT reliably constructable in jsdom. When a component calls `new IntersectionObserver(...)` inside `useEffect`, use a real `class` mock (class body calls vi.fn() spies) rather than `vi.fn((cb) => {...})`. The `FakeIntersectionObserver` class pattern in `BlurText.test.tsx` is the canonical example.

## Coverage (after pass)

Statements 81.21% / Branches 77.9% / Functions 83.91% / Lines 83%
(up from Statements 71.88% / Branches 67.12% / Functions 75.07% / Lines 73.87%)

## ESLint decisions

- `react-refresh/only-export-components` on context files (`authContext.tsx`, `demoModeContext.tsx`): suppressed with `// eslint-disable-next-line`. Exporting both Provider + hook from one context file is the correct pattern — splitting into two files just to satisfy HMR fast-refresh is not worth it.
- `react-hooks/exhaustive-deps` on `VolunteerDashboard.tsx`: fixed by wrapping `currentVolunteer` in `useMemo`.
- Any unused `eslint-disable` directive is a warning — do not add disable comments speculatively in `useEffect` deps that are already `[]` with no captured values.

## Build chunk sizes (after)

- `index-*.js`: 181 kB (was 290 kB) — Firebase no longer on critical path
- `AuthenticatedApp-*.js`: 109 kB (lazy, loads in parallel with HTML spinner)
- `vendor-firebase-*.js`: 695 kB (lazy)
