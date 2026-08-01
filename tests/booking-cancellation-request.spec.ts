/**
 * Cancellation-request flow edge-case tests.
 *
 * Covers:
 *  - Client gets 409 when a cancellation request is already pending
 *  - Client gets 400 when the booking is not APPROVED (PENDING, COMPLETED, CANCELLED)
 *  - Artist gets 403 when trying to POST /cancellation-request
 *  - After artist REJECTS, the flag is cleared and the client CAN re-request (200)
 *  - Client cannot re-request after artist APPROVES the cancellation (status=CANCELLED)
 *
 * Each test registers its own isolated users to allow parallel runs without
 * interference.
 */

import { test, expect, type APIRequestContext } from "@playwright/test";

const BASE = "http://127.0.0.1:5000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function register(
  request: APIRequestContext,
  suffix: string,
  role: "ARTIST" | "ENTHUSIAST"
) {
  const email = `cancelreq-${role.toLowerCase()}-${suffix}@example.com`;
  const username = `cancelreq${role.toLowerCase()}${suffix}`;
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

async function approveBooking(
  request: APIRequestContext,
  bookingId: string,
  artistToken: string
) {
  const res = await request.put(`${BASE}/api/bookings/${bookingId}`, {
    data: { status: "APPROVED" },
    ...authed(artistToken),
  });
  expect(
    res.status(),
    `approveBooking failed (${res.status()}): ${await res.text()}`
  ).toBe(200);
}

async function requestCancellation(
  request: APIRequestContext,
  bookingId: string,
  token: string
) {
  return request.post(
    `${BASE}/api/bookings/${bookingId}/cancellation-request`,
    authed(token)
  );
}

async function respondToCancellation(
  request: APIRequestContext,
  bookingId: string,
  artistToken: string,
  approve: boolean
) {
  return request.post(
    `${BASE}/api/bookings/${bookingId}/cancellation-response`,
    {
      data: { approve },
      ...authed(artistToken),
    }
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Cancellation request edge cases", () => {
  test("client can request cancellation on an APPROVED booking (200)", async ({
    request,
  }) => {
    const suffix = `${Date.now()}a`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");
    const bookingId = await createBooking(request, client.token, artist.userId);
    await approveBooking(request, bookingId, artist.token);

    const res = await requestCancellation(request, bookingId, client.token);
    expect(
      res.status(),
      `expected 200 on first cancellation request, got ${res.status()}: ${await res.text()}`
    ).toBe(200);
  });

  test("client gets 409 when a cancellation request is already pending", async ({
    request,
  }) => {
    const suffix = `${Date.now()}b`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");
    const bookingId = await createBooking(request, client.token, artist.userId);
    await approveBooking(request, bookingId, artist.token);

    // First request — must succeed
    const first = await requestCancellation(request, bookingId, client.token);
    expect(
      first.status(),
      `expected 200 on first cancellation request, got ${first.status()}: ${await first.text()}`
    ).toBe(200);

    // Duplicate request — must be rejected
    const second = await requestCancellation(request, bookingId, client.token);
    expect(
      second.status(),
      `expected 409 on duplicate cancellation request, got ${second.status()}: ${await second.text()}`
    ).toBe(409);
  });

  test("client gets 400 when booking is not APPROVED (PENDING)", async ({
    request,
  }) => {
    const suffix = `${Date.now()}c`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");
    // Booking stays in PENDING status — no approval
    const bookingId = await createBooking(request, client.token, artist.userId);

    const res = await requestCancellation(request, bookingId, client.token);
    expect(
      res.status(),
      `expected 400 when booking is PENDING, got ${res.status()}: ${await res.text()}`
    ).toBe(400);
  });

  test("client gets 400 when booking is COMPLETED", async ({ request }) => {
    const suffix = `${Date.now()}d`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");
    const bookingId = await createBooking(request, client.token, artist.userId);
    await approveBooking(request, bookingId, artist.token);

    // Artist marks complete
    const completeRes = await request.put(
      `${BASE}/api/bookings/${bookingId}`,
      { data: { status: "COMPLETED" }, ...authed(artist.token) }
    );
    expect(completeRes.status()).toBe(200);

    const res = await requestCancellation(request, bookingId, client.token);
    expect(
      res.status(),
      `expected 400 when booking is COMPLETED, got ${res.status()}: ${await res.text()}`
    ).toBe(400);
  });

  test("artist gets 403 when attempting to POST /cancellation-request", async ({
    request,
  }) => {
    const suffix = `${Date.now()}e`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");
    const bookingId = await createBooking(request, client.token, artist.userId);
    await approveBooking(request, bookingId, artist.token);

    // Artist tries to send the request — should be 403 (only client can)
    const res = await requestCancellation(request, bookingId, artist.token);
    expect(
      res.status(),
      `expected 403 when artist posts cancellation-request, got ${res.status()}: ${await res.text()}`
    ).toBe(403);
  });

  test("after artist REJECTS, cancellationRequested is cleared and client can re-request (200)", async ({
    request,
  }) => {
    const suffix = `${Date.now()}f`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");
    const bookingId = await createBooking(request, client.token, artist.userId);
    await approveBooking(request, bookingId, artist.token);

    // Client sends first request
    const firstReq = await requestCancellation(
      request,
      bookingId,
      client.token
    );
    expect(firstReq.status()).toBe(200);

    // Artist rejects (approve: false)
    const rejectRes = await respondToCancellation(
      request,
      bookingId,
      artist.token,
      false
    );
    expect(
      rejectRes.status(),
      `expected 200 when artist rejects, got ${rejectRes.status()}: ${await rejectRes.text()}`
    ).toBe(200);

    // Client can request again — flag was cleared on rejection
    const secondReq = await requestCancellation(
      request,
      bookingId,
      client.token
    );
    expect(
      secondReq.status(),
      `expected 200 after artist rejection (flag cleared), got ${secondReq.status()}: ${await secondReq.text()}`
    ).toBe(200);
  });

  test("after artist APPROVES cancellation, booking is CANCELLED and client cannot re-request (400)", async ({
    request,
  }) => {
    const suffix = `${Date.now()}g`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");
    const bookingId = await createBooking(request, client.token, artist.userId);
    await approveBooking(request, bookingId, artist.token);

    // Client sends cancellation request
    const firstReq = await requestCancellation(
      request,
      bookingId,
      client.token
    );
    expect(firstReq.status()).toBe(200);

    // Artist approves (booking → CANCELLED)
    const approveRes = await respondToCancellation(
      request,
      bookingId,
      artist.token,
      true
    );
    expect(
      approveRes.status(),
      `expected 200 when artist approves cancellation, got ${approveRes.status()}: ${await approveRes.text()}`
    ).toBe(200);

    // Client tries to request again — booking is now CANCELLED → should be 400
    const secondReq = await requestCancellation(
      request,
      bookingId,
      client.token
    );
    expect(
      secondReq.status(),
      `expected 400 after booking is already CANCELLED, got ${secondReq.status()}: ${await secondReq.text()}`
    ).toBe(400);
  });

  test("client gets 400 when trying to POST /cancellation-response (only artists can respond)", async ({
    request,
  }) => {
    const suffix = `${Date.now()}h`;
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");
    const bookingId = await createBooking(request, client.token, artist.userId);
    await approveBooking(request, bookingId, artist.token);

    // Client sends the request first
    const reqRes = await requestCancellation(request, bookingId, client.token);
    expect(reqRes.status()).toBe(200);

    // Client tries to respond — must be 403
    const res = await respondToCancellation(
      request,
      bookingId,
      client.token,
      true
    );
    expect(
      res.status(),
      `expected 403 when client posts cancellation-response, got ${res.status()}: ${await res.text()}`
    ).toBe(403);
  });
});
