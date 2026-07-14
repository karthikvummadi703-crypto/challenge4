/**
 * Nexus AI — core user journey E2E tests (Playwright / Chromium).
 *
 * Journey 1 — Fan:       land → Demo (Fan) → view seat → add food → place order → confirm
 * Journey 2 — Volunteer: Demo (Volunteer) → view tasks → complete → confirm cleared
 * Journey 3 — Admin:     Demo (Organizer) → dashboard analytics → volunteer panel
 * Journey 4 — Auth:      real Organizer login with invalid credentials → error shown
 *
 * Journeys 1–3 use Demo Mode exclusively — no real Firebase Auth or Firestore
 * calls are made.  They pass in CI with placeholder Firebase credentials.
 *
 * Journey 4 makes a real Firebase Auth call and therefore requires real
 * Firebase credentials.  When only placeholder values are detected the test is
 * skipped with a visible reason rather than failing confusingly.
 *
 * ── What enables Journey 4 in GitHub Actions CI ─────────────────────────────
 * Add the following as GitHub repo secrets
 * (Settings → Secrets and variables → Actions → New repository secret):
 *
 *   VITE_FIREBASE_API_KEY          — Firebase Web API key
 *   VITE_FIREBASE_AUTH_DOMAIN      — e.g. your-project.firebaseapp.com
 *   VITE_FIREBASE_PROJECT_ID       — Firebase project ID
 *   VITE_FIREBASE_STORAGE_BUCKET   — e.g. your-project.firebasestorage.app
 *   VITE_FIREBASE_MESSAGING_SENDER_ID — numeric sender ID
 *   VITE_FIREBASE_APP_ID           — Firebase app ID
 *   VITE_FIREBASE_MEASUREMENT_ID   — GA measurement ID (optional but set if available)
 *
 * When these secrets are set the ci.yml env block picks them up via
 * `${{ secrets.VITE_FIREBASE_API_KEY }}` and Journey 4 will run automatically.
 * See also: replit.md § "CI / GitHub Secrets" and .github/workflows/ci.yml.
 */

import { test, expect, Page } from '@playwright/test';

// ─── Firebase credential detection ──────────────────────────────────────────
//
// The CI workflow sets VITE_FIREBASE_API_KEY to 'ci-placeholder-api-key' when
// the real GitHub secret is absent.  We detect this so Journey 4 can self-skip
// gracefully rather than producing a cryptic Firebase network error.

/** Returns true only when the environment contains a real (non-placeholder) Firebase API key. */
function hasRealFirebaseCredentials(): boolean {
  const key = process.env['VITE_FIREBASE_API_KEY'] ?? '';
  return (
    key.length > 0 &&
    !key.startsWith('ci-placeholder') &&
    !key.startsWith('fake-') &&
    key !== 'fake-api-key'
  );
}

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

// ─── Journey 5: Fan — empty cart prevents submission ─────────────────────────
//
// The "Place Catering Order" button carries `disabled={cartSubtotal === 0}`.
// Journey 1 always adds an item before touching the button, so the zero-cart
// disabled state has never been exercised end-to-end.

test.describe('Fan journey — empty cart', () => {
  test(
    'food order button is disabled when the cart is empty (0 items)',
    async ({ page }) => {
      await goToLanding(page);
      await enterDemoMode(page, 'Fan Portal');

      // ── Step 1: Navigate to the Food Ordering tab ──────────────────────────
      await page.getByRole('button', { name: /food ordering/i }).click();
      await expect(page.getByText('In-Seat Catering')).toBeVisible({ timeout: 5_000 });

      // ── Step 2: No items added — cart total is $0.00 ──────────────────────
      // Confirm the empty-cart message is visible.
      await expect(
        page.getByText('Your catering tray is empty. Add food items to begin.'),
      ).toBeVisible();

      // ── Step 3: Submit button must be disabled — no order should be placeable
      const orderBtn = page.getByRole('button', { name: /place catering order/i });
      await expect(orderBtn).toBeDisabled();
    },
  );
});

// ─── Journey 6: Fan — emergency alert active status ───────────────────────────
//
// Journey 1 only exercises the Food Ordering tab.  The Medical tab's
// role="alert" confirmation banner has not been covered end-to-end.

test.describe('Fan journey — emergency alert', () => {
  test(
    'submitting the emergency beacon shows the paramedic-dispatch confirmation',
    async ({ page }) => {
      await goToLanding(page);
      await enterDemoMode(page, 'Fan Portal');

      // ── Step 1: Navigate to the Medical Help tab ───────────────────────────
      await page.getByRole('button', { name: /medical help/i }).click();
      await expect(page.getByText('In-Stadium Emergency')).toBeVisible({ timeout: 5_000 });

      // ── Step 2: The seat input is pre-filled (default 'A12-24') ───────────
      await expect(page.locator('#emergency-seat')).toHaveValue('A12-24');

      // ── Step 3: Submit the emergency form ─────────────────────────────────
      await page.getByRole('button', { name: /trigger emergency aid/i }).click();

      // ── Step 4: The role="alert" confirmation banner must appear ──────────
      // Rendered only when emergencySuccess is true; aria-live="assertive"
      // ensures screen-readers announce it immediately.
      await expect(page.locator('[role="alert"]')).toContainText(
        'EMERGENCY RESOLUTION ACTIVE',
        { timeout: 5_000 },
      );
      await expect(page.locator('[role="alert"]')).toContainText(
        'Paramedic team is dispatching',
      );
    },
  );
});

// ─── Journey 7: Volunteer — empty task list ───────────────────────────────────
//
// Journey 2 starts with tasks already seeded.  This journey verifies the
// dashboard renders both empty-state messages when there are genuinely no
// tasks at all — not a blank or broken screen.
//
// Implementation note: `initDemoStore()` (called inside `enterDemoMode`) reads
// from sessionStorage on first hydration.  By setting the store key before
// clicking the role button we can inject a task-free snapshot without touching
// any source code.

test.describe('Volunteer journey — empty task list', () => {
  test(
    'volunteer dashboard renders empty-state UI when no tasks are assigned or pending',
    async ({ page }) => {
      await goToLanding(page);

      // ── Pre-seed sessionStorage with a task-free snapshot ─────────────────
      // initDemoStore (called by enterDemoMode) calls hydrateFromStorage first,
      // so this data will be active when the volunteer dashboard subscribes.
      await page.evaluate(() => {
        const emptySnapshot = {
          volunteers: [
            {
              id: 'demo-vol-1',
              uid: 'demo-vol-1',
              fullName: 'Marco Silva',
              email: 'marco.silva@demo.nexusai.com',
              role: 'volunteer',
              assignedGate: 'Gate A',
              active: true,
            },
          ],
          fans: [
            {
              id: 'demo-fan-1',
              uid: 'demo-fan-1',
              fullName: 'Jordan Alvarez',
              email: 'jordan.alvarez@demo.nexusai.com',
              role: 'fan',
              seatNumber: 'A-118',
              assignedGate: 'Gate A',
            },
          ],
          tasks: [],             // ← intentionally empty
          foodOrders: [],
          emergencyRequests: [],
          issueReports: [],
          matches: [
            {
              id: 'demo-match-1',
              stadiumName: 'Estádio do Nexus',
              matchName: 'Portugal vs Argentina',
              matchDate: '18/07/2026',
              matchTime: '19:30',
              ticketPrice: 120,
              published: true,
            },
          ],
          systemConfig: [{ id: 'demo-config-1', isPublished: true }],
        };
        window.sessionStorage.setItem(
          'nexus-demo-store-v1',
          JSON.stringify(emptySnapshot),
        );
      });

      await enterDemoMode(page, 'Volunteer Dashboard');

      // ── "My Active Task" empty state ──────────────────────────────────────
      await expect(
        page.getByText('You do not have any active assignments.'),
      ).toBeVisible({ timeout: 10_000 });

      // ── "Live Task Stack" empty state ──────────────────────────────────────
      await expect(
        page.getByText('Stadium operations are fully optimized.'),
      ).toBeVisible({ timeout: 5_000 });
    },
  );
});

// ─── Journey 8: Admin — invalid email format blocked by HTML5 validation ─────
//
// VolunteersPanel uses `type="email"` on the email input.  The browser's native
// form validation fires synchronously on submit and prevents the `onAddVolunteer`
// handler from running when the value is not a valid e-mail address.
// This scenario is fully uncovered by Journey 3 (which only reads the panel,
// never submits the form).

test.describe('Admin (Organizer) journey — volunteer form validation', () => {
  test(
    'add-volunteer form blocks submission and reports invalid state for a malformed email',
    async ({ page }) => {
      await goToLanding(page);
      await enterDemoMode(page, 'Organizer Dashboard');

      // ── Step 1: Navigate to the Volunteers panel ──────────────────────────
      await page
        .getByRole('navigation', { name: /admin navigation/i })
        .getByRole('button', { name: /volunteers/i })
        .click();
      await expect(page.getByText('Volunteer Coordination')).toBeVisible({ timeout: 5_000 });

      // ── Step 2: Record how many volunteers are in the table right now ──────
      // Demo seed contains 3 volunteers.
      const initialCount = await page.locator('table tbody tr').count();
      expect(initialCount).toBeGreaterThan(0); // sanity-check the table rendered

      // ── Step 3: Fill in a name and a clearly invalid email ─────────────────
      await page.locator('#vol-new-name').fill('Test Volunteer');
      await page.locator('#vol-new-email').fill('not-a-valid-email'); // no @-domain

      // ── Step 4: Tick the password-acknowledgement checkbox (required to
      //    un-disable the submit button) ──────────────────────────────────────
      await page.locator('#vol-password-ack').check();

      // ── Step 5: Attempt to submit ─────────────────────────────────────────
      await page.getByRole('button', { name: /register volunteer/i }).click();

      // ── Step 6: Native HTML5 validation must report the email as invalid ───
      // checkValidity() returns false when the input fails its type constraint.
      const emailValid = await page
        .locator('#vol-new-email')
        .evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(emailValid).toBe(false);

      // ── Step 7: No volunteer was added — table count is unchanged ──────────
      await expect(page.locator('table tbody tr')).toHaveCount(initialCount);
    },
  );
});

// ─── Journey 9: Keyboard-only navigation ─────────────────────────────────────
//
// Proves that the keyboard-accessibility work is end-to-end functional: a user
// can complete the Fan food-ordering flow without touching the mouse.
// Each interactive element is reached via .focus() (equivalent to Tab-navigation
// to that element) and activated with Enter or Space only.

test.describe('Keyboard-only navigation', () => {
  test(
    'fan can enter Demo Mode and place a food order using only keyboard (focus + Enter/Space)',
    async ({ page }) => {
      await goToLanding(page);

      // ── Step 1: Focus "Try Demo Mode" and activate with Enter ─────────────
      await page.getByRole('button', { name: /try demo mode/i }).focus();
      await page.keyboard.press('Enter');

      // ── Step 2: Focus "Fan Portal" inside the dialog, activate with Enter ─
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      await dialog.getByRole('button', { name: 'Fan Portal' }).focus();
      await page.keyboard.press('Enter');
      await expect(dialog).not.toBeVisible({ timeout: 5_000 });

      // Fan dashboard is ready
      await expect(page.getByText('SEAT: A-118')).toBeVisible({ timeout: 10_000 });

      // ── Step 3: Focus "Food Ordering" sidebar tab and activate with Enter ──
      await page.getByRole('button', { name: /food ordering/i }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByText('In-Seat Catering')).toBeVisible({ timeout: 5_000 });

      // ── Step 4: Focus "Add one Veg Burger" and activate with Space ─────────
      await page.getByRole('button', { name: /add one veg burger/i }).focus();
      await page.keyboard.press('Space');
      await expect(page.getByLabel('1 Veg Burger in cart')).toBeVisible();

      // ── Step 5: Focus "Place Catering Order" and activate with Enter ───────
      // Button is now enabled (cart is non-empty).
      const orderBtn = page.getByRole('button', { name: /place catering order/i });
      await expect(orderBtn).not.toBeDisabled();
      await orderBtn.focus();
      await page.keyboard.press('Enter');

      // ── Step 6: Confirm the success banner ────────────────────────────────
      await expect(
        page.getByText('Order Placed! Delivery is en-route.'),
      ).toBeVisible({ timeout: 5_000 });
    },
  );
});

// ─── Journey 4: Admin login rejection ────────────────────────────────────────
//
// This test makes a real Firebase Auth network call.  When only placeholder
// credentials are present (CI without repo secrets) the call would time out or
// return an undifferentiated network error, producing a false failure.
// We detect the placeholder case and skip with a clear, visible reason instead.

test.describe('Admin login rejection', () => {
  test(
    'attempting real Organizer login with invalid credentials shows an error — access denied',
    async ({ page }) => {
      // ── Guard: skip when real Firebase credentials are not available ────────
      // To run this test in GitHub Actions CI add the VITE_FIREBASE_* variables
      // listed at the top of this file as GitHub repo secrets.
      test.skip(
        !hasRealFirebaseCredentials(),
        'Journey 4 skipped: VITE_FIREBASE_API_KEY is a CI placeholder. ' +
        'Add the real VITE_FIREBASE_* values as GitHub repo secrets ' +
        '(see replit.md § "CI / GitHub Secrets") to enable this test in CI.',
      );

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
      // message text because the wording depends on the Firebase error code.
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 15_000 });
    },
  );
});
