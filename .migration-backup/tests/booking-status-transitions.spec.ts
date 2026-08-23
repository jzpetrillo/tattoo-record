/**
 * Booking status transition guard tests.
 *
 * These tests exercise the role-based status-transition rules in
 * PUT /api/bookings/:id directly via the JSON API, without a browser UI.
 * They register fresh, isolated users on every run so they can run in
 * parallel without interference.
 */

import { test, expect, type APIRequestContext } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE = "http://127.0.0.1:5000";

async function register(
  request: APIRequestContext,
  suffix: string,
  role: "ARTIST" | "ENTHUSIAST"
) {
  const email = `testbooking-${role.toLowerCase()}-${suffix}@example.com`;
  const username = `tbooking${role.toLowerCase()}${suffix}`;
  const res = await request.post(`${BASE}/api/auth/register`, {
    data: {
      email,
      username,
      password: "TestPass123!",
      role,
      firstName: "Test",
      lastName: role === "ARTIST" ? "Artist" : "Client",
    },
  });
  expect(res.ok(), `register ${role} failed: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  return { token: body.token as string, userId: body.user.id as string };
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
      title: "Test tattoo session",
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

async function setStatus(
  request: APIRequestContext,
  bookingId: string,
  token: string,
  status: string
) {
  return request.put(`${BASE}/api/bookings/${bookingId}`, {
    data: { status },
    ...authed(token),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Booking status transition guards", () => {
  // Each test uses its own isolated artist + client pair and its own booking.

  test("client cannot set status=COMPLETED (403)", async ({ request }) => {
    const suffix = `${Date.now()}a`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");

    const bookingId = await createBooking(request, client.token, artist.userId);
    const res = await setStatus(request, bookingId, client.token, "COMPLETED");

    expect(res.status()).toBe(403);
  });

  test("client cannot set status=APPROVED (403)", async ({ request }) => {
    const suffix = `${Date.now()}b`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");

    const bookingId = await createBooking(request, client.token, artist.userId);
    const res = await setStatus(request, bookingId, client.token, "APPROVED");

    expect(res.status()).toBe(403);
  });

  test("artist can move APPROVED → COMPLETED (200)", async ({ request }) => {
    const suffix = `${Date.now()}c`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");

    const bookingId = await createBooking(request, client.token, artist.userId);

    // Artist approves first (PENDING → APPROVED)
    const approveRes = await setStatus(
      request,
      bookingId,
      artist.token,
      "APPROVED"
    );
    expect(
      approveRes.status(),
      `expected 200 when artist approves, got ${approveRes.status()}: ${await approveRes.text()}`
    ).toBe(200);

    // Artist marks complete (APPROVED → COMPLETED)
    const completeRes = await setStatus(
      request,
      bookingId,
      artist.token,
      "COMPLETED"
    );
    expect(
      completeRes.status(),
      `expected 200 when artist completes, got ${completeRes.status()}: ${await completeRes.text()}`
    ).toBe(200);
  });

  test("artist cannot move COMPLETED → PENDING (403)", async ({ request }) => {
    const suffix = `${Date.now()}d`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");

    const bookingId = await createBooking(request, client.token, artist.userId);

    // Drive to COMPLETED
    await setStatus(request, bookingId, artist.token, "APPROVED");
    await setStatus(request, bookingId, artist.token, "COMPLETED");

    // Try to rewind — artist
    const res = await setStatus(request, bookingId, artist.token, "PENDING");
    expect(res.status()).toBe(403);
  });

  test("client cannot move COMPLETED → PENDING (403)", async ({ request }) => {
    const suffix = `${Date.now()}e`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");

    const bookingId = await createBooking(request, client.token, artist.userId);

    // Drive to COMPLETED via artist
    await setStatus(request, bookingId, artist.token, "APPROVED");
    await setStatus(request, bookingId, artist.token, "COMPLETED");

    // Try to rewind — client
    const res = await setStatus(request, bookingId, client.token, "PENDING");
    expect(res.status()).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // Approved-booking cancellation block (Task 64)
  // ---------------------------------------------------------------------------

  test("client cannot cancel an APPROVED booking via PUT status=CANCELLED (403)", async ({
    request,
  }) => {
    const suffix = `${Date.now()}f`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");

    const bookingId = await createBooking(request, client.token, artist.userId);

    // Artist approves the booking
    const approveRes = await setStatus(request, bookingId, artist.token, "APPROVED");
    expect(
      approveRes.status(),
      `expected 200 when artist approves, got ${approveRes.status()}: ${await approveRes.text()}`
    ).toBe(200);

    // Client attempts to cancel — must be rejected
    const cancelRes = await setStatus(request, bookingId, client.token, "CANCELLED");
    expect(
      cancelRes.status(),
      `expected 403 when client tries to cancel APPROVED booking via PUT, got ${cancelRes.status()}: ${await cancelRes.text()}`
    ).toBe(403);
  });

  test("client cannot cancel an APPROVED booking via DELETE (403)", async ({
    request,
  }) => {
    const suffix = `${Date.now()}g`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");

    const bookingId = await createBooking(request, client.token, artist.userId);

    // Artist approves the booking
    const approveRes = await setStatus(request, bookingId, artist.token, "APPROVED");
    expect(
      approveRes.status(),
      `expected 200 when artist approves, got ${approveRes.status()}: ${await approveRes.text()}`
    ).toBe(200);

    // Client attempts to cancel via DELETE — must be rejected
    const deleteRes = await request.delete(`${BASE}/api/bookings/${bookingId}`, {
      ...authed(client.token),
    });
    expect(
      deleteRes.status(),
      `expected 403 when client tries to DELETE an APPROVED booking, got ${deleteRes.status()}: ${await deleteRes.text()}`
    ).toBe(403);
  });
});
