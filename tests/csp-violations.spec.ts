import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

const TEST_EMAIL = "artist1@tattoorecord.com";
const TEST_PASSWORD = "Test1234!";
const TEST_USERNAME = "artist1";

const STUDIO_EMAIL = "studio1@tattoorecord.com";
const STUDIO_USERNAME = "studio1";

const ENTHUSIAST_EMAIL = "enthusiast1@tattoorecord.com";
const ENTHUSIAST_USERNAME = "enthusiast1";

async function loginAs(page: Page, email: string, password = "Test1234!"): Promise<void> {
  await page.goto("/auth");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth"), {
    timeout: 15_000,
  });
}

async function login(page: Page): Promise<void> {
  return loginAs(page, TEST_EMAIL);
}

/**
 * Matches the two forms browsers use when reporting CSP violations:
 *   "Content Security Policy"  (Firefox, Chrome for report-uri)
 *   "Content-Security-Policy" (hyphenated, seen in some error texts)
 * Also catches the common "Refused to load" prefix that Chrome emits
 * for blocked resources (img, script, media, connect, …).
 */
const CSP_PATTERN =
  /content.security.policy|refused to load the (image|script|media|font|connect|frame|worker)/i;

function collectCspViolations(page: Page): string[] {
  const violations: string[] = [];

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error" && CSP_PATTERN.test(msg.text())) {
      violations.push(msg.text());
    }
  });

  page.on("pageerror", (err: Error) => {
    if (CSP_PATTERN.test(err.message)) {
      violations.push(err.message);
    }
  });

  return violations;
}

test.describe("CSP violations", () => {
  test("feed page loads without CSP violations", async ({ page }) => {
    const violations = collectCspViolations(page);
    await login(page);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait a tick so any deferred resource loads have time to trigger violations.
    await page.waitForTimeout(2_000);

    expect(violations, `CSP violations on feed: ${violations.join("\n")}`).toHaveLength(0);
  });

  test("explore page loads without CSP violations", async ({ page }) => {
    const violations = collectCspViolations(page);
    await login(page);

    await page.goto("/explore");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    expect(violations, `CSP violations on explore: ${violations.join("\n")}`).toHaveLength(0);
  });

  test("profile page loads without CSP violations", async ({ page }) => {
    const violations = collectCspViolations(page);
    await login(page);

    await page.goto(`/profile/${TEST_USERNAME}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    expect(violations, `CSP violations on profile: ${violations.join("\n")}`).toHaveLength(0);
  });

  test("reels page loads without CSP violations", async ({ page }) => {
    const violations = collectCspViolations(page);
    await login(page);

    await page.goto("/reels");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    expect(violations, `CSP violations on reels: ${violations.join("\n")}`).toHaveLength(0);
  });
});

test.describe("CSP violations – studio role", () => {
  test("feed page loads without CSP violations", async ({ page }) => {
    const violations = collectCspViolations(page);
    await loginAs(page, STUDIO_EMAIL);

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    expect(violations, `CSP violations on feed (studio): ${violations.join("\n")}`).toHaveLength(0);
  });

  test("explore page loads without CSP violations", async ({ page }) => {
    const violations = collectCspViolations(page);
    await loginAs(page, STUDIO_EMAIL);

    await page.goto("/explore");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    expect(violations, `CSP violations on explore (studio): ${violations.join("\n")}`).toHaveLength(0);
  });

  test("studio profile page loads without CSP violations", async ({ page }) => {
    const violations = collectCspViolations(page);
    await loginAs(page, STUDIO_EMAIL);

    await page.goto(`/profile/${STUDIO_USERNAME}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    expect(violations, `CSP violations on studio profile: ${violations.join("\n")}`).toHaveLength(0);
  });

  test("reels page loads without CSP violations", async ({ page }) => {
    const violations = collectCspViolations(page);
    await loginAs(page, STUDIO_EMAIL);

    await page.goto("/reels");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    expect(violations, `CSP violations on reels (studio): ${violations.join("\n")}`).toHaveLength(0);
  });
});

test.describe("CSP violations – enthusiast role", () => {
  test("feed page loads without CSP violations", async ({ page }) => {
    const violations = collectCspViolations(page);
    await loginAs(page, ENTHUSIAST_EMAIL);

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    expect(violations, `CSP violations on feed (enthusiast): ${violations.join("\n")}`).toHaveLength(0);
  });

  test("explore page loads without CSP violations", async ({ page }) => {
    const violations = collectCspViolations(page);
    await loginAs(page, ENTHUSIAST_EMAIL);

    await page.goto("/explore");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    expect(violations, `CSP violations on explore (enthusiast): ${violations.join("\n")}`).toHaveLength(0);
  });

  test("enthusiast profile page loads without CSP violations", async ({ page }) => {
    const violations = collectCspViolations(page);
    await loginAs(page, ENTHUSIAST_EMAIL);

    await page.goto(`/profile/${ENTHUSIAST_USERNAME}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    expect(violations, `CSP violations on enthusiast profile: ${violations.join("\n")}`).toHaveLength(0);
  });

  test("reels page loads without CSP violations", async ({ page }) => {
    const violations = collectCspViolations(page);
    await loginAs(page, ENTHUSIAST_EMAIL);

    await page.goto("/reels");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    expect(violations, `CSP violations on reels (enthusiast): ${violations.join("\n")}`).toHaveLength(0);
  });
});

/**
 * Collects all uncaught JS errors that are NOT CSP violations.
 * Used alongside collectCspViolations to give full error coverage.
 */
function collectJsErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err: Error) => {
    if (!CSP_PATTERN.test(err.message)) {
      errors.push(err.message);
    }
  });
  return errors;
}

test.describe("Reels empty state (no video posts)", () => {
  /**
   * The /reels page fetches all public reels from /api/posts?type=REEL —
   * it is not scoped to the logged-in user. To reliably test the empty state
   * path (which only renders when that API returns []) we intercept and stub
   * the response. This exercises the same React branch a fresh database would
   * trigger, without depending on database state.
   */
  test("reels page renders empty state without CSP violations or JS errors when no reels exist", async ({ page }) => {
    const cspViolations = collectCspViolations(page);
    const jsErrors = collectJsErrors(page);

    await login(page);

    // Stub the reels API to return an empty array before navigating.
    await page.route("**/api/posts?type=REEL", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/reels");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    // Empty state must be visible.
    const emptyStateVisible = await page
      .getByText(/no reels yet/i)
      .isVisible()
      .catch(() => false);
    expect(
      emptyStateVisible,
      "Expected the 'No reels yet' empty state to be visible, but it was not."
    ).toBe(true);

    // No reels grid should be rendered.
    const gridVisible = await page
      .locator('[data-testid="reels-grid"]')
      .isVisible()
      .catch(() => false);
    expect(
      gridVisible,
      "The reels grid should not be rendered when there are no reels."
    ).toBe(false);

    // No CSP violations.
    expect(
      cspViolations,
      `CSP violations on reels empty state:\n${cspViolations.join("\n")}`
    ).toHaveLength(0);

    // No uncaught JS errors.
    expect(
      jsErrors,
      `Uncaught JS errors on reels empty state:\n${jsErrors.join("\n")}`
    ).toHaveLength(0);
  });
});

/**
 * DYNAMIC-URL BLIND SPOT — why static analysis and the tests above are not enough
 * ─────────────────────────────────────────────────────────────────────────────────
 * The CSP domain check script (`scripts/check-csp-domains.ts`) scans source files
 * and the seed script for hardcoded URLs. The tests above load seeded data and
 * verify no violations appear for those known domains.
 *
 * Neither check can see URLs that arrive at runtime from the database. An admin
 * can paste a Cloudflare Images URL (imagedelivery.net), an imgix URL
 * (*.imgix.net), a Bunny CDN URL (*.b-cdn.net), or any other CDN into a portfolio
 * item, post, or avatar field. If that domain is not in the `imgSrc` directive in
 * `server/index.ts`, the browser silently refuses the image — no JS error is
 * thrown, the `<img>` just stays blank.
 *
 * HOW TO HANDLE NEW DOMAINS
 * ─────────────────────────
 * 1. When an admin reports a broken image, check the browser DevTools console for
 *    a "Refused to load the image" CSP error and note the blocked origin.
 * 2. Add that origin to the `imgSrc` (and `mediaSrc` if it serves video) array in
 *    `server/index.ts`.
 * 3. Add a representative URL from that domain to `scripts/seed.ts` and to
 *    `scripts/check-csp-domains.ts`'s expected-domains list so future static
 *    analysis covers it.
 * 4. Redeploy. The browser will then load resources from the new domain without
 *    violation.
 *
 * The test below proves that our violation-detection mechanism itself works for
 * dynamically-injected foreign-domain URLs. It does so by injecting an <img>
 * pointing to `imagedelivery.net` (Cloudflare Images — intentionally absent from
 * the CSP allowlist) after the page has loaded, simulating what happens when the
 * browser renders a database-stored URL from an unlisted CDN, and then asserting
 * that at least one CSP violation is captured.
 */
test.describe("CSP dynamic-URL detection (blind-spot canary)", () => {
  test("detects CSP violation from a foreign-domain image injected at runtime", async ({ page }) => {
    const violations = collectCspViolations(page);

    await login(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Simulate an admin-pasted Cloudflare Images URL being rendered on the page.
    // `imagedelivery.net` is deliberately absent from the server/index.ts imgSrc
    // allowlist, so the browser must block and report it.
    await page.evaluate(() => {
      const img = document.createElement("img");
      img.src = "https://imagedelivery.net/test-dynamic-domain-canary/sample/public";
      img.alt  = "csp-canary";
      document.body.appendChild(img);
    });

    // Give the browser time to attempt the load and fire the CSP error.
    await page.waitForTimeout(3_000);

    expect(
      violations.length,
      "Expected at least one CSP violation for the foreign-domain image, but none were detected. " +
      "This canary test proves that database-sourced URLs from unlisted CDN domains ARE caught " +
      "by the browser and surfaced to our violation collector."
    ).toBeGreaterThan(0);

    const hasImageViolation = violations.some((v) =>
      /imagedelivery\.net|refused to load the image/i.test(v)
    );
    expect(
      hasImageViolation,
      `Violations found but none mentioned 'imagedelivery.net'. Got:\n${violations.join("\n")}`
    ).toBe(true);
  });
});
