import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

const TEST_EMAIL = "artist1@inktagram.com";
const TEST_PASSWORD = "Test1234!";
const TEST_USERNAME = "artist1";

const STUDIO_EMAIL = "studio1@inktagram.com";
const STUDIO_USERNAME = "studio1";

const ENTHUSIAST_EMAIL = "enthusiast1@inktagram.com";
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
});
