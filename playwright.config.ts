import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';

/**
 * Playwright configuration for Nexus AI E2E tests.
 *
 * Tests run against Demo Mode only — no real Firebase writes, no auth
 * required.  `page.emulateMedia({ reducedMotion: 'reduce' })` (called in
 * each test's `goToLanding` helper) makes the SplashScreen call `onComplete`
 * immediately so every test starts on the landing page without waiting for
 * the 2-second boot animation.
 *
 * Browser resolution
 * ──────────────────
 * In the Replit NixOS sandbox, Playwright's downloaded headless-shell binary
 * cannot load its shared libs (libglib-2.0.so.0 etc.).  We detect the system
 * Chromium in PATH at config load time and pass it via `launchOptions`.  In a
 * standard CI runner (Ubuntu via GitHub Actions) `which chromium` returns
 * nothing, so Playwright uses its own downloaded binary — the CI workflow's
 * `npx playwright install chromium --with-deps` step provides that.
 */
function detectSystemChromium(): string | undefined {
  const fromEnv = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
  if (fromEnv) return fromEnv;
  try {
    const path = execSync('which chromium', { encoding: 'utf8' }).trim();
    return path || undefined;
  } catch {
    return undefined;
  }
}

const systemChromium = detectSystemChromium();

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: process.env['CI'] ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // executablePath must live inside launchOptions to be honoured by
        // Playwright's browser-type launcher.  `undefined` means "use the
        // downloaded binary" (the correct behaviour in CI / Ubuntu).
        launchOptions: {
          executablePath: systemChromium,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 5000,
    // Reuse the already-running Replit dev server outside CI;
    // always spawn a fresh one in CI to guarantee a clean state.
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
    env: {
      DISABLE_HMR: 'true',
    },
  },
});
