/**
 * Cancellation notification message tests.
 *
 * Covers:
 *  - Artist receives CANCELLATION_REQUEST notification with the booking title
 *  - Client receives CANCELLATION_APPROVED notification after artist approves
 *  - Client receives CANCELLATION_REJECTED notification after artist rejects
 *  - Each notification's View Booking button navigates to /bookings
 *
 * Users are registered once per describe block (beforeAll) to stay well within
 * the auth rate limiter (20 req / 15 min). Each test creates its own fresh
 * booking so test state never leaks.
 */

import { test, expect, type APIRequestContext } from "@playwright/test";

const BASE = "http://127.0.0.1:5000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface UserHandle {
  token: string;
  userId: string;
  user: Record<string, unknown>;
}

async function register(
  request: APIRequestContext,
  suffix: string,
  role: "ARTIST" | "ENTHUSIAST"
): Promise<UserHandle> {
  const email = `cn-${role.toLowerCase()}-${suffix}@example.com`;
  const username = `cn${role.toLowerCase()}${suffix}`;
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
  return {
    token: body.token as string,
    userId: body.user.id as string,
    user: body.user as Record<string, unknown>,
  };
}

function authed(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function createBooking(
  request: APIRequestContext,
  clientToken: string,
  artistId: string,
  title = "Test tattoo session"
): Promise<string> {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const res = await request.post(`${BASE}/api/bookings`, {
    data: { title, artistId, scheduledAt: tomorrow, durationMinutes: 60 },
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
  expect(res.status(), `approveBooking failed: ${await res.text()}`).toBe(200);
}

async function requestCancellation(
  request: APIRequestContext,
  bookingId: string,
  clientToken: string
) {
  const res = await request.post(
    `${BASE}/api/bookings/${bookingId}/cancellation-request`,
    authed(clientToken)
  );
  expect(
    res.status(),
    `requestCancellation failed: ${await res.text()}`
  ).toBe(200);
}

async function respondToCancellation(
  request: APIRequestContext,
  bookingId: string,
  artistToken: string,
  approve: boolean
) {
  const res = await request.post(
    `${BASE}/api/bookings/${bookingId}/cancellation-response`,
    { data: { approve }, ...authed(artistToken) }
  );
  expect(
    res.status(),
    `respondToCancellation failed: ${await res.text()}`
  ).toBe(200);
}

async function getNotifications(
  request: APIRequestContext,
  token: string
): Promise<
  Array<{ notification: { type: string; payload: Record<string, unknown> } }>
> {
  const res = await request.get(`${BASE}/api/notifications`, authed(token));
  expect(res.ok(), `getNotifications failed: ${await res.text()}`).toBeTruthy();
  return res.json();
}

// ---------------------------------------------------------------------------
// API-level notification content tests
// ---------------------------------------------------------------------------

test.describe("Cancellation notification messages", () => {
  // One artist/client pair shared across all three API tests.
  let artist: UserHandle;
  let client: UserHandle;

  test.beforeAll(async ({ request }) => {
    const suffix = `api${Date.now()}`;
    artist = await register(request, suffix, "ARTIST");
    client = await register(request, suffix, "ENTHUSIAST");
  });

  test("artist receives CANCELLATION_REQUEST notification with booking title", async ({
    request,
  }) => {
    const bookingTitle = `Request notif ${Date.now()}`;
    const bookingId = await createBooking(
      request,
      client.token,
      artist.userId,
      bookingTitle
    );
    await approveBooking(request, bookingId, artist.token);
    await requestCancellation(request, bookingId, client.token);

    const notifications = await getNotifications(request, artist.token);
    const notif = notifications.find(
      (n) =>
        n.notification.type === "CANCELLATION_REQUEST" &&
        n.notification.payload.bookingId === bookingId
    );

    expect(
      notif,
      "Artist should have a CANCELLATION_REQUEST notification"
    ).toBeDefined();
    expect(notif!.notification.payload.bookingTitle).toBe(bookingTitle);
  });

  test("client receives CANCELLATION_APPROVED notification after artist approves", async ({
    request,
  }) => {
    const bookingTitle = `Approved notif ${Date.now()}`;
    const bookingId = await createBooking(
      request,
      client.token,
      artist.userId,
      bookingTitle
    );
    await approveBooking(request, bookingId, artist.token);
    await requestCancellation(request, bookingId, client.token);
    await respondToCancellation(request, bookingId, artist.token, true);

    const notifications = await getNotifications(request, client.token);
    const notif = notifications.find(
      (n) =>
        n.notification.type === "CANCELLATION_APPROVED" &&
        n.notification.payload.bookingId === bookingId
    );

    expect(
      notif,
      "Client should have a CANCELLATION_APPROVED notification"
    ).toBeDefined();
  });

  test("client receives CANCELLATION_REJECTED notification after artist rejects", async ({
    request,
  }) => {
    const bookingTitle = `Rejected notif ${Date.now()}`;
    const bookingId = await createBooking(
      request,
      client.token,
      artist.userId,
      bookingTitle
    );
    await approveBooking(request, bookingId, artist.token);
    await requestCancellation(request, bookingId, client.token);
    await respondToCancellation(request, bookingId, artist.token, false);

    const notifications = await getNotifications(request, client.token);
    const notif = notifications.find(
      (n) =>
        n.notification.type === "CANCELLATION_REJECTED" &&
        n.notification.payload.bookingId === bookingId
    );

    expect(
      notif,
      "Client should have a CANCELLATION_REJECTED notification"
    ).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// UI tests — notification messages and View Booking button
// ---------------------------------------------------------------------------

test.describe("Cancellation notification UI", () => {
  // One artist/client pair shared across all three UI tests.
  let artist: UserHandle;
  let client: UserHandle;

  test.beforeAll(async ({ request }) => {
    const suffix = `ui${Date.now()}`;
    artist = await register(request, suffix, "ARTIST");
    client = await register(request, suffix, "ENTHUSIAST");
  });

  test("artist sees 'Client requested to cancel booking [title]' with View Booking button", async ({
    request,
    page,
  }) => {
    const bookingTitle = `UI request notif ${Date.now()}`;
    const bookingId = await createBooking(
      request,
      client.token,
      artist.userId,
      bookingTitle
    );
    await approveBooking(request, bookingId, artist.token);
    await requestCancellation(request, bookingId, client.token);

    // Log in as artist and navigate to notifications
    await page.goto(`${BASE}/`);
    await page.evaluate(
      ({ user, token }) => {
        localStorage.setItem(
          "auth-storage",
          JSON.stringify({ state: { user, token }, version: 0 })
        );
      },
      { user: artist.user, token: artist.token }
    );
    await page.goto(`${BASE}/notifications`);
    await page.waitForLoadState("networkidle");

    // Assert message text
    await expect(
      page.getByText(`Client requested to cancel booking ${bookingTitle}`)
    ).toBeVisible({ timeout: 10_000 });

    // Assert View Booking button navigates to /bookings
    const notifItems = page.locator('[data-testid^="notification-"]');
    const cancellationNotif = notifItems.filter({
      hasText: "Client requested to cancel booking",
    });
    const viewBookingBtn = cancellationNotif
      .locator('[data-testid^="button-view-booking-"]')
      .first();
    await expect(viewBookingBtn).toBeVisible();
    await viewBookingBtn.click();
    await expect(page).toHaveURL(/\/bookings/);
  });

  test("client sees 'Artist approved your cancellation request' with View Booking button", async ({
    request,
    page,
  }) => {
    const bookingTitle = `UI approved notif ${Date.now()}`;
    const bookingId = await createBooking(
      request,
      client.token,
      artist.userId,
      bookingTitle
    );
    await approveBooking(request, bookingId, artist.token);
    await requestCancellation(request, bookingId, client.token);
    await respondToCancellation(request, bookingId, artist.token, true);

    // Log in as client and navigate to notifications
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
    await page.goto(`${BASE}/notifications`);
    await page.waitForLoadState("networkidle");

    // Assert message text
    await expect(
      page.getByText("Artist approved your cancellation request")
    ).toBeVisible({ timeout: 10_000 });

    // Assert View Booking button navigates to /bookings
    const notifItems = page.locator('[data-testid^="notification-"]');
    const cancellationNotif = notifItems.filter({
      hasText: "Artist approved your cancellation request",
    });
    const viewBookingBtn = cancellationNotif
      .locator('[data-testid^="button-view-booking-"]')
      .first();
    await expect(viewBookingBtn).toBeVisible();
    await viewBookingBtn.click();
    await expect(page).toHaveURL(/\/bookings/);
  });

  test("client sees 'Artist declined your cancellation request — your booking is still on' with View Booking button", async ({
    request,
    page,
  }) => {
    const bookingTitle = `UI rejected notif ${Date.now()}`;
    const bookingId = await createBooking(
      request,
      client.token,
      artist.userId,
      bookingTitle
    );
    await approveBooking(request, bookingId, artist.token);
    await requestCancellation(request, bookingId, client.token);
    await respondToCancellation(request, bookingId, artist.token, false);

    // Log in as client and navigate to notifications
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
    await page.goto(`${BASE}/notifications`);
    await page.waitForLoadState("networkidle");

    // Assert message text
    await expect(
      page.getByText(
        "Artist declined your cancellation request — your booking is still on"
      )
    ).toBeVisible({ timeout: 10_000 });

    // Assert View Booking button navigates to /bookings
    const notifItems = page.locator('[data-testid^="notification-"]');
    const cancellationNotif = notifItems.filter({
      hasText: "Artist declined your cancellation request",
    });
    const viewBookingBtn = cancellationNotif
      .locator('[data-testid^="button-view-booking-"]')
      .first();
    await expect(viewBookingBtn).toBeVisible();
    await viewBookingBtn.click();
    await expect(page).toHaveURL(/\/bookings/);
  });
});
