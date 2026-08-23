/**
 * IDOR access-control tests for the booking API.
 *
 * Verifies that a third party (neither the artist nor the client on a booking)
 * cannot read or enumerate bookings they have no stake in:
 *
 *  1. GET /api/bookings/:id  → 403 for a stranger, 200 for admin
 *  2. GET /api/bookings      → empty list for a stranger (A/B's booking is hidden)
 *
 * DB access:
 *   Promoting a freshly-registered user to ADMIN requires a direct DB write.
 *   The test uses @neondatabase/serverless Pool with the DATABASE_URL env var
 *   (the same connection string the application server uses).
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

function uniqueSuffix(): string {
  return `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

async function register(
  request: APIRequestContext,
  suffix: string,
  role: "ARTIST" | "ENTHUSIAST"
) {
  const email = `idor-${role.toLowerCase()}-${suffix}@example.com`;
  const username = `idor${role.toLowerCase()}${suffix}`;
  const res = await request.post(`${BASE}/api/auth/register`, {
    data: {
      email,
      username,
      password: "TestPass123!",
      role,
      firstName: "IDOR",
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

async function createBooking(
  request: APIRequestContext,
  clientToken: string,
  artistId: string
): Promise<string> {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const res = await request.post(`${BASE}/api/bookings`, {
    data: {
      title: "IDOR test session",
      artistId,
      scheduledAt: tomorrow,
      durationMinutes: 60,
    },
    ...authed(clientToken),
  });
  expect(res.ok(), `createBooking failed: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  return body.id as string;
}

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
// Tests
// ---------------------------------------------------------------------------

test.describe("Booking IDOR access-control", () => {
  let artistToken: string;
  let clientToken: string;
  let strangerToken: string;
  let adminToken: string;
  let bookingId: string;

  test.beforeAll(async ({ request }) => {
    const suffix = uniqueSuffix();

    // User A — the artist on the booking
    const artist = await register(request, `art${suffix}`, "ARTIST");
    artistToken = artist.token;

    // User B — the client who creates the booking
    const client = await register(request, `cli${suffix}`, "ENTHUSIAST");
    clientToken = client.token;

    // User C — a completely unrelated user (stranger)
    const stranger = await register(request, `str${suffix}`, "ENTHUSIAST");
    strangerToken = stranger.token;

    // Admin — promoted via direct DB write, then re-logged-in for a fresh token
    const adminUser = await register(request, `adm${suffix}`, "ENTHUSIAST");
    await promoteToAdmin(adminUser.userId);
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { email: adminUser.email, password: adminUser.password },
    });
    expect(loginRes.ok(), `admin login failed: ${await loginRes.text()}`).toBeTruthy();
    adminToken = (await loginRes.json()).token as string;

    // Create the booking between artist and client
    bookingId = await createBooking(request, clientToken, artist.userId);
  });

  // -------------------------------------------------------------------------
  // GET /api/bookings/:id
  // -------------------------------------------------------------------------

  test("stranger gets 403 on GET /api/bookings/:id", async ({ request }) => {
    const res = await request.get(`${BASE}/api/bookings/${bookingId}`, {
      ...authed(strangerToken),
    });
    expect(
      res.status(),
      `expected 403 for stranger, got ${res.status()}: ${await res.text()}`
    ).toBe(403);
  });

  test("admin can GET /api/bookings/:id for any booking (200)", async ({ request }) => {
    const res = await request.get(`${BASE}/api/bookings/${bookingId}`, {
      ...authed(adminToken),
    });
    expect(
      res.status(),
      `expected 200 for admin, got ${res.status()}: ${await res.text()}`
    ).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(bookingId);
  });

  test("artist can GET /api/bookings/:id for their own booking (200)", async ({ request }) => {
    const res = await request.get(`${BASE}/api/bookings/${bookingId}`, {
      ...authed(artistToken),
    });
    expect(
      res.status(),
      `expected 200 for artist, got ${res.status()}: ${await res.text()}`
    ).toBe(200);
  });

  test("client can GET /api/bookings/:id for their own booking (200)", async ({ request }) => {
    const res = await request.get(`${BASE}/api/bookings/${bookingId}`, {
      ...authed(clientToken),
    });
    expect(
      res.status(),
      `expected 200 for client, got ${res.status()}: ${await res.text()}`
    ).toBe(200);
  });

  // -------------------------------------------------------------------------
  // GET /api/bookings (list)
  // -------------------------------------------------------------------------

  test("stranger's GET /api/bookings returns an empty list (A/B booking hidden)", async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/api/bookings`, {
      ...authed(strangerToken),
    });
    expect(
      res.ok(),
      `expected 200 for GET /api/bookings as stranger, got ${res.status()}: ${await res.text()}`
    ).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    const ids = body.map((b: any) => b.id);
    expect(
      ids,
      "stranger should not see A/B's booking in the list"
    ).not.toContain(bookingId);
  });

  test("client's GET /api/bookings includes their own booking", async ({ request }) => {
    const res = await request.get(`${BASE}/api/bookings`, {
      ...authed(clientToken),
    });
    expect(res.ok(), `expected 200 for client list, got ${res.status()}`).toBeTruthy();
    const body = await res.json();
    const ids = body.map((b: any) => b.id);
    expect(ids).toContain(bookingId);
  });

  test("artist's GET /api/bookings includes their own booking", async ({ request }) => {
    const res = await request.get(`${BASE}/api/bookings`, {
      ...authed(artistToken),
    });
    expect(res.ok(), `expected 200 for artist list, got ${res.status()}`).toBeTruthy();
    const body = await res.json();
    const ids = body.map((b: any) => b.id);
    expect(ids).toContain(bookingId);
  });

  // -------------------------------------------------------------------------
  // PUT /api/bookings/:id  — stranger write access
  // -------------------------------------------------------------------------

  test("stranger gets 403 on PUT /api/bookings/:id (status update)", async ({ request }) => {
    const res = await request.put(`${BASE}/api/bookings/${bookingId}`, {
      data: { status: "CANCELLED" },
      ...authed(strangerToken),
    });
    expect(
      res.status(),
      `expected 403 for stranger PUT, got ${res.status()}: ${await res.text()}`
    ).toBe(403);
  });

  // -------------------------------------------------------------------------
  // DELETE /api/bookings/:id  — stranger delete access
  // -------------------------------------------------------------------------

  test("stranger gets 403 on DELETE /api/bookings/:id", async ({ request }) => {
    const res = await request.delete(`${BASE}/api/bookings/${bookingId}`, {
      ...authed(strangerToken),
    });
    expect(
      res.status(),
      `expected 403 for stranger DELETE, got ${res.status()}: ${await res.text()}`
    ).toBe(403);
  });

  test("booking is unchanged after stranger write attempts", async ({ request }) => {
    // The booking must still exist and be in its original PENDING state
    const res = await request.get(`${BASE}/api/bookings/${bookingId}`, {
      ...authed(clientToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.id).toBe(bookingId);
    expect(body.status).toBe("PENDING");
  });
});
