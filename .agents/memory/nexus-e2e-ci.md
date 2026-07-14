---
name: Nexus E2E and CI setup
description: Playwright E2E tests and GitHub Actions CI pipeline for Nexus AI.
---

# Nexus E2E and CI setup

## Rules
- E2E tests live in `tests/e2e/journeys.spec.ts` (.spec.ts extension — vitest ignores them; include pattern only matches .test.ts).
- playwright.config.ts uses detectSystemChromium() (which chromium) to find NixOS system Chromium; Playwright's downloaded headless-shell can't load libglib on NixOS.
- Journey 4 (admin login rejection) calls real Firebase Auth; self-skips via test.skip(!hasRealFirebaseCredentials(), reason) when VITE_FIREBASE_API_KEY starts with "ci-placeholder" or "fake-".
- Playwright's reducedMotion option is NOT valid at the config use level — set per-test via page.emulateMedia({ reducedMotion: 'reduce' }) before page.goto('/').
- executablePath must go inside launchOptions (not bare in project use object) to be honoured by Playwright's browser launcher.
- System Chromium installed via installSystemDependencies({ packages: ["chromium"] }); CI uses playwright install chromium --with-deps.

**Why:** NixOS sandbox can't run Playwright's downloaded headless-shell; system Chromium has proper Nix wrapping.
