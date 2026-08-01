/**
 * UI test: Cancel Booking button must be absent for APPROVED bookings
 * when the page is viewed by the client who made the booking.
 *
 * Strategy:
 *  1. Register a fresh artist + client pair via the JSON API.
 *  2. Create a booking as the client via the JSON API.
 *  3. Approve the booking as the artist via the JSON API.
 *  4. Inject the client's auth token into localStorage so the React app
 *     treats the browser session as that client.
 *  5. Navigate to /bookings and assert no "Cancel Booking" button exists
 *     for the approved booking card.
 */

import { test, expect, type APIRequestContext } from "@playwright/test";

const BASE = "http://127.0.0.1:5000";

// ---------------------------------------------------------------------------
// API helpers (mirror the pattern from booking-status-transitions.spec.ts)
// ---------------------------------------------------------------------------

async function register(
  request: APIRequestContext,
  suffix: string,
  role: "ARTIST" | "ENTHUSIAST"
) {
  const email = `cbtest-${role.toLowerCase()}-${suffix}@example.com`;
  const username = `cbtest${role.toLowerCase()}${suffix}`;
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
  return { token: body.token as string, user: body.user as Record<string, unknown> };
}

async function createBooking(
  request: APIRequestContext,
  clientToken: string,
  artistId: string
): Promise<string> {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const res = await request.post(`${BASE}/api/bookings`, {
    data: {
      title: "Cancel-button UI test",
      artistId,
      scheduledAt: tomorrow,
      durationMinutes: 60,
    },
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  expect(res.ok(), `createBooking failed: ${await res.text()}`).toBeTruthy();
  return ((await res.json()) as { id: string }).id;
}

async function approveBooking(
  request: APIRequestContext,
  bookingId: string,
  artistToken: string
) {
  const res = await request.put(`${BASE}/api/bookings/${bookingId}`, {
    data: { status: "APPROVED" },
    headers: { Authorization: `Bearer ${artistToken}` },
  });
  expect(
    res.status(),
    `approveBooking failed: ${await res.text()}`
  ).toBe(200);
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test.describe("Cancel Booking button visibility", () => {
  test("Cancel Booking button is absent for an APPROVED booking when viewed as the client", async ({
    page,
    request,
  }) => {
    const suffix = String(Date.now());

    // 1. Register fresh users
    const artist = await register(request, suffix, "ARTIST");
    const client = await register(request, suffix, "ENTHUSIAST");

    // 2. Create booking as client
    const bookingId = await createBooking(
      request,
      client.token,
      artist.user.id as string
    );

    // 3. Approve as artist
    await approveBooking(request, bookingId, artist.token);

    // 4. Inject client auth into localStorage before the React app boots.
    //    Navigate to the root first (which has no auth redirect), inject,
    //    then navigate to the protected page so the app starts authenticated.
    await page.goto(`${BASE}/`);
    await page.evaluate(
      ({ user, token }) => {
        localStorage.setItem(
          "auth-storage",
          JSON.stringify({ state: { user, token }, version: 0 })
        );
      },
      { user: client.user, token: client.token }
    );

    // Now navigate to the bookings page — the app reads localStorage on mount
    await page.goto(`${BASE}/bookings`);

    // 5. Wait for the booking card to appear
    const bookingCard = page.getByTestId(`card-booking-${bookingId}`);
    await expect(bookingCard).toBeVisible({ timeout: 10_000 });

    // 6. The Cancel Booking button must NOT be present for this approved booking
    const cancelButton = page.getByTestId(`button-cancel-${bookingId}`);
    await expect(cancelButton).toHaveCount(0);
  });
});
