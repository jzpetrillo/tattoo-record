/**
 * Ban enforcement tests.
 *
 * Verifies that:
 *  1. A banned user's existing valid JWT is rejected (401) on protected endpoints.
 *  2. A banned user cannot log in with correct credentials (403).
 *  3. After unbanning, the user can log in and access protected endpoints again.
 *
 * IMPORTANT — test ordering:
 *   `test.describe.serial` is required because the three tests share a single
 *   banned/unbanned user and depend on strict ordering:
 *     test 1 bans the victim, test 2 asserts the ban, test 3 unbans and confirms
 *   recovery.  Without serial, Playwright's fullyParallel mode would dispatch
 *   them to separate workers, each running its own beforeAll with independent
 *   victims, breaking the ban-state assumptions.
 *
 * DB access:
 *   Promoting a freshly-registered user to ADMIN requires a direct DB write.
 *   The test uses the @neondatabase/serverless Pool with the DATABASE_URL
 *   environment variable (the same connection string the application server
 *   uses).  DATABASE_URL must be set in the environment (it is whenever the
 *   application server is running).
 */

import { test, expect, type APIRequestContext } from "@playwright/test";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// @neondatabase/serverless needs a WebSocket constructor in Node.js
neonConfig.webSocketConstructor = ws;

const BASE = "http://127.0.0.1:5000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a collision-resistant suffix that works even when multiple
 * Playwright workers start within the same millisecond.
 */
function uniqueSuffix(): string {
  return `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

async function register(
  request: APIRequestContext,
  suffix: string,
  role: "ARTIST" | "ENTHUSIAST"
) {
  const email = `bantest-${role.toLowerCase()}-${suffix}@example.com`;
  const username = `bantest${role.toLowerCase()}${suffix}`;
  const res = await request.post(`${BASE}/api/auth/register`, {
    data: {
      email,
      username,
      password: "TestPass123!",
      role,
      firstName: "Ban",
      lastName: "Test",
    },
  });
  expect(res.ok(), `register ${role} failed: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  return {
    token: body.token as string,
    userId: body.user.id as string,
    email,
    password: "TestPass123!",
  };
}

function authed(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/**
 * Promote a user to ADMIN directly in the database.
 *
 * Uses DATABASE_URL (the same connection string as the application server)
 * with the @neondatabase/serverless driver over WebSocket.  This mirrors
 * the server's own connection setup in server/db.ts.
 */
async function promoteToAdmin(userId: string): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: dbUrl });
  try {
    const result = await pool.query(
      "UPDATE users SET role = 'ADMIN' WHERE id = $1",
      [userId]
    );
    if ((result.rowCount ?? 0) === 0) {
      throw new Error(`No user found with id ${userId} to promote`);
    }
  } finally {
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// Tests — serial so ban state is set by test 1, read by test 2, cleared by test 3
// ---------------------------------------------------------------------------

test.describe.serial("Ban enforcement", () => {
  let adminToken: string;
  let victimToken: string;
  let victimId: string;
  let victimEmail: string;
  let victimPassword: string;

  test.beforeAll(async ({ request }) => {
    const suffix = uniqueSuffix();

    // Register the admin-to-be as a regular user, then promote via DB.
    const adminUser = await register(request, `adm${suffix}`, "ENTHUSIAST");
    await promoteToAdmin(adminUser.userId);

    // Log in as the newly promoted admin to get a fresh token that the
    // server will resolve against the updated DB role.
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { email: adminUser.email, password: adminUser.password },
    });
    expect(
      loginRes.ok(),
      `admin login failed: ${await loginRes.text()}`
    ).toBeTruthy();
    const loginBody = await loginRes.json();
    adminToken = loginBody.token as string;

    // Register the victim user.
    const victim = await register(request, `vic${suffix}`, "ENTHUSIAST");
    victimToken = victim.token;
    victimId = victim.userId;
    victimEmail = victim.email;
    victimPassword = victim.password;
  });

  // -------------------------------------------------------------------------
  // Test 1: existing valid JWT is rejected after a ban
  // -------------------------------------------------------------------------

  test("banned user's existing token is rejected (401) on a protected endpoint", async ({
    request,
  }) => {
    // Pre-condition: the victim's token should work before the ban.
    const preBanRes = await request.get(`${BASE}/api/users/me`, {
      ...authed(victimToken),
    });
    expect(
      preBanRes.ok(),
      `pre-ban GET /api/users/me should succeed: ${await preBanRes.text()}`
    ).toBeTruthy();

    // Admin bans the victim.
    const banRes = await request.put(
      `${BASE}/api/admin/users/${victimId}/ban`,
      { ...authed(adminToken) }
    );
    expect(
      banRes.ok(),
      `ban request failed: ${await banRes.text()}`
    ).toBeTruthy();

    // The existing token must now be rejected.
    const postBanRes = await request.get(`${BASE}/api/users/me`, {
      ...authed(victimToken),
    });
    expect(
      postBanRes.status(),
      `expected 401 for banned user's token on GET /api/users/me`
    ).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Test 2: banned user cannot log in (ban applied in test 1)
  // -------------------------------------------------------------------------

  test("banned user cannot log in with correct credentials (403)", async ({
    request,
  }) => {
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { email: victimEmail, password: victimPassword },
    });
    expect(
      loginRes.status(),
      `expected 403 for banned user login attempt`
    ).toBe(403);

    const body = await loginRes.json();
    expect(body).toHaveProperty("message");
  });

  // -------------------------------------------------------------------------
  // Test 3: after unbanning, login and API access are restored
  // -------------------------------------------------------------------------

  test("after unbanning, the user can log in and access the API again", async ({
    request,
  }) => {
    // Admin unbans the victim.
    const unbanRes = await request.put(
      `${BASE}/api/admin/users/${victimId}/unban`,
      { ...authed(adminToken) }
    );
    expect(
      unbanRes.ok(),
      `unban request failed: ${await unbanRes.text()}`
    ).toBeTruthy();

    // The user should now be able to log in.
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { email: victimEmail, password: victimPassword },
    });
    expect(
      loginRes.ok(),
      `expected successful login after unban: ${await loginRes.text()}`
    ).toBeTruthy();

    const { token: freshToken } = await loginRes.json();
    expect(typeof freshToken).toBe("string");

    // The fresh token must grant access to protected endpoints.
    const meRes = await request.get(`${BASE}/api/users/me`, {
      ...authed(freshToken),
    });
    expect(
      meRes.ok(),
      `expected 200 on GET /api/users/me after unban: ${await meRes.text()}`
    ).toBeTruthy();
  });
});
