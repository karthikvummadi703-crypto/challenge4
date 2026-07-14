/**
 * Nexus AI — core user journey E2E tests (Playwright / Chromium).
 *
 * All four journeys run against Demo Mode so no real Firebase auth or
 * Firestore writes are involved.  `reducedMotion: 'reduce'` (set in
 * playwright.config.ts) makes the SplashScreen call its `onComplete`
 * callback immediately, so every test starts from the landing page without
 * any artificial wait.
 *
 * Journey 1 — Fan:      land → Demo (Fan) → view seat → add food → place order → confirm
 * Journey 2 — Volunteer: Demo (Volunteer) → view tasks → complete → confirm cleared
 * Journey 3 — Admin:    Demo (Organizer) → dashboard analytics → volunteer panel
 * Journey 4 — Auth:     real Organizer login with invalid credentials → error shown
 */

import { test, expect, Page } from '@playwright/test';

// ─── Shared helpers ──────────────────────────────────────────────────────────

/**
 * Navigate to "/" and wait until the landing page is fully visible.
 *
 * Emulates `prefers-reduced-motion: reduce` so the SplashScreen detects it
 * via `window.matchMedia` and calls `onComplete` immediately (no 2-second
 * boot animation), then waits for the "Try Demo Mode" button as a reliable
 * signal that the landing page has fully mounted.
 */
async function goToLanding(page: Page): Promise<void> {
  // Must be called before navigation so the media feature is active when
  // the SplashScreen's useEffect reads it on first mount.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  // "Try Demo Mode" is only rendered after the splash completes and the
  // landing page mounts — a reliable signal that the app is ready.
  await expect(
    page.getByRole('button', { name: /try demo mode/i }),
  ).toBeVisible({ timeout: 15_000 });
}

/**
 * Open the Demo Mode picker, choose a role, and wait for the modal to close.
 * @param roleLabel — exact label of the role button inside the picker dialog
 *   ("Organizer Dashboard" | "Volunteer Dashboard" | "Fan Portal")
 */
async function enterDemoMode(page: Page, roleLabel: string): Promise<void> {
  await page.getByRole('button', { name: /try demo mode/i }).click();
  // The modal mounts with role="dialog" — wait for it before clicking inside.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await dialog.getByRole('button', { name: roleLabel }).click();
  // Modal closes after role selection — confirm it's gone.
  await expect(dialog).not.toBeVisible({ timeout: 5_000 });
}

// ─── Journey 1: Fan ──────────────────────────────────────────────────────────

test.describe('Fan journey', () => {
  test(
    'land on site → enter Demo as Fan → view assigned seat → place a food order → order confirmed in UI',
    async ({ page }) => {
      await goToLanding(page);
      await enterDemoMode(page, 'Fan Portal');

      // ── Step 1: Verify the assigned seat is displayed in the sidebar ─────
      // Demo fan profile has seatNumber "A-118".
      await expect(page.getByText('SEAT: A-118')).toBeVisible({ timeout: 10_000 });

      // ── Step 2: Open the Food Ordering tab ────────────────────────────────
      await page.getByRole('button', { name: /food ordering/i }).click();

      // Confirm the food menu rendered.
      await expect(page.getByText('In-Seat Catering')).toBeVisible({ timeout: 5_000 });

      // ── Step 3: Add one Veg Burger to the cart ────────────────────────────
      await page.getByRole('button', { name: /add one veg burger/i }).click();

      // Cart quantity label is aria-labelled — assert it reflects the change.
      await expect(page.getByLabel('1 Veg Burger in cart')).toBeVisible();

      // ── Step 4: Place the catering order ──────────────────────────────────
      await page.getByRole('button', { name: /place catering order/i }).click();

      // ── Step 5: Confirm success banner ────────────────────────────────────
      await expect(
        page.getByText('Order Placed! Delivery is en-route.'),
      ).toBeVisible({ timeout: 5_000 });
    },
  );
});

// ─── Journey 2: Volunteer ────────────────────────────────────────────────────

test.describe('Volunteer journey', () => {
  test(
    'enter Demo as Volunteer → view assigned task → mark complete → task cleared from active stack',
    async ({ page }) => {
      await goToLanding(page);
      await enterDemoMode(page, 'Volunteer Dashboard');

      // ── Step 1: Confirm assigned task is visible ───────────────────────────
      // Demo store seeds demo-task-1: type "Deliver Food", assigned to VOL-DEMO1
      // (the demo volunteer profile's volunteerId).
      // Two elements show "Deliver Food" in the task card (header + live-stack
      // row), so use .first() to avoid a strict-mode violation.
      await expect(page.getByText('Deliver Food').first()).toBeVisible({ timeout: 10_000 });
      // The same task details appear in both the "My Active Task" card and
      // the live stack row — use .first() to avoid strict-mode violation.
      await expect(
        page.getByText('Deliver 2x Chicken Burger, 1x Coke').first(),
      ).toBeVisible();

      // ── Step 2: Mark the task complete ────────────────────────────────────
      await page.getByRole('button', { name: /complete assignment/i }).click();

      // ── Step 3: Active task section should now show the empty state ────────
      // After status → "completed", the task is filtered out of myAssignedTasks
      // and the placeholder text renders in its place.
      await expect(
        page.getByText('You do not have any active assignments.'),
      ).toBeVisible({ timeout: 5_000 });
    },
  );
});

// ─── Journey 3: Admin (Organizer) ────────────────────────────────────────────

test.describe('Admin (Organizer) journey', () => {
  test(
    'enter Demo as Organizer → view dashboard analytics → open volunteer management panel',
    async ({ page }) => {
      await goToLanding(page);
      await enterDemoMode(page, 'Organizer Dashboard');

      // ── Step 1: Confirm the admin panel loaded ─────────────────────────────
      // The sidebar always shows "ADMIN PANEL" regardless of which tab is open.
      await expect(page.getByText('ADMIN PANEL')).toBeVisible({ timeout: 10_000 });

      // ── Step 2: Dashboard overview is the default active tab; confirm stats
      // card labels are visible.
      // "Food Orders" also appears inside an AI quick-chip button so we scope
      // to the first match (the stat card span); "Medical Cases" is unique.
      await expect(page.getByText('Food Orders').first()).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText('Medical Cases')).toBeVisible();

      // ── Step 3: Navigate to the Volunteer Management panel ────────────────
      // The sidebar nav has a "Volunteers" button (aria-current set when active).
      await page.getByRole('navigation', { name: /admin navigation/i })
        .getByRole('button', { name: /volunteers/i })
        .click();

      // Confirm the panel heading rendered.
      await expect(page.getByText('Volunteer Coordination')).toBeVisible({ timeout: 5_000 });
    },
  );
});

// ─── Journey 4: Admin login rejection ────────────────────────────────────────

test.describe('Admin login rejection', () => {
  test(
    'attempting real Organizer login with invalid credentials shows an error — access denied',
    async ({ page }) => {
      await goToLanding(page);

      // ── Step 1: Click the real "Organizer Login" gateway (not Demo Mode) ──
      // This calls onSelectRole('organizer') and renders the OrganizerLogin form.
      await page.getByRole('button', { name: /organizer login/i }).click();

      // Wait for the login form to appear.
      await expect(page.locator('#org-email')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('#org-password')).toBeVisible();

      // ── Step 2: Enter obviously invalid credentials ────────────────────────
      await page.locator('#org-email').fill('notanadmin@invalid-domain.example');
      await page.locator('#org-password').fill('definitelyWrongPassword99!');

      // ── Step 3: Submit ────────────────────────────────────────────────────
      await page.getByRole('button', { name: /login to command center/i }).click();

      // ── Step 4: An error must appear — the role="alert" paragraph is only
      // rendered when loginError is non-empty.  We do not assert the exact
      // message text because the wording depends on the Firebase error code
      // returned (or a network-level rejection in CI with placeholder keys).
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 15_000 });
    },
  );
});
