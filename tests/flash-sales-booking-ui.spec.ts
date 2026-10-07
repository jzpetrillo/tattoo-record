import { expect, test, type Page } from "@playwright/test";

// Every API request is intercepted: these tests never start the API or use the database.
const artist = { id: "11111111-1111-4111-8111-111111111111", username: "flash_artist", role: "ARTIST" };
const client = { id: "22222222-2222-4222-8222-222222222222", username: "flash_client", email: "client@example.com", role: "ENTHUSIAST" };
const saleId = "33333333-3333-4333-8333-333333333333";
const soldOutId = "44444444-4444-4444-8444-444444444444";
const testImage = (color: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${color}"/></svg>`)}`;

function makeSale() {
  return {
    id: saleId, artistId: artist.id, artist, title: "Rose flash",
    description: "A fine-line rose design.", originalPriceCents: 20000,
    flashPriceCents: 12000, availableSlots: 4, bookedSlots: 1, isActive: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    media: [{ url: testImage("#333"), type: "image" }, { url: testImage("#999"), type: "image" }],
  };
}

async function mockApp(page: Page, options: {
  sale?: ReturnType<typeof makeSale>;
  status?: number;
  delay?: number;
  failBooking?: boolean;
} = {}) {
  const state = {
    sale: options.sale ?? makeSale(),
    status: options.status ?? 200,
    delay: options.delay ?? 0,
    bookingPayload: undefined as Record<string, unknown> | undefined,
    bookings: [] as Record<string, unknown>[],
  };
  await page.addInitScript((user) => {
    localStorage.setItem("auth-storage", JSON.stringify({ state: { user, token: "ui-test-token" }, version: 0 }));
  }, client);
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let body: unknown = [];
    let status = 200;
    if (url.pathname === "/api/users/me") body = client;
    else if (url.pathname === "/api/users") body = [artist];
    else if (url.pathname === "/api/flash-sales") {
      body = [state.sale, { ...state.sale, id: soldOutId, title: "Sold out rose", bookedSlots: 4 }];
    } else if (url.pathname.startsWith("/api/flash-sales/")) {
      if (state.delay) await new Promise((resolve) => setTimeout(resolve, state.delay));
      status = state.status;
      body = status === 200 ? state.sale : { message: status === 404 ? "Flash sale not found" : "Failed to load sale" };
    } else if (url.pathname === "/api/bookings") {
      if (request.method() === "POST") {
        state.bookingPayload = request.postDataJSON();
        status = options.failBooking ? 400 : 200;
        body = options.failBooking ? { message: "Could not create booking." } : {
          ...state.bookingPayload, id: "55555555-5555-4555-8555-555555555555",
          clientId: client.id, artist, client, status: "PENDING", paymentStatus: "UNPAID",
        };
        if (!options.failBooking) state.bookings.push(body as Record<string, unknown>);
      } else body = state.bookings;
    }
    await route.fulfill({ status, json: body });
  });
  return state;
}

test("preserves artist href and sold-out markup; detail button starts the existing booking flow", async ({ page }) => {
  const state = await mockApp(page);
  await page.goto("/flash-sales");
  const soldOut = page.getByTestId(`flash-sale-${soldOutId}`);
  await expect(soldOut.locator("a")).toHaveCount(0);
  await expect(soldOut).not.toHaveAttribute("href");
  await expect(page.getByTestId(`button-view-flash-sale-${soldOutId}`)).toHaveCount(0);
  await expect(page.getByTestId(`flash-sale-${saleId}`)).toHaveAttribute("href", `/u/${artist.username}`);
  await page.getByTestId(`button-view-flash-sale-${saleId}`).click();
  await expect(page).toHaveURL(new RegExp(`/flash-sales/${saleId}$`));
  await expect(page.getByTestId("text-flash-price")).toHaveText("$120.00");
  await expect(page.getByTestId("text-original-price")).toHaveText("$200.00");
  await expect(page.getByTestId("text-savings")).toContainText("Save $80.00 (40% off)");
  await expect(page.getByTestId("text-slots")).toContainText("3 of 4 slots left");
  await expect(page.getByTestId("text-expiry")).toBeVisible();
  await expect(page.locator(`article a[href="/u/${artist.username}"]`)).toBeVisible();
  await page.getByTestId("button-thumb-1").click();
  await expect(page.locator("article > div").first().locator("img")).toHaveAttribute("src", state.sale.media[1].url);
  await page.getByTestId("button-book-flash-sale").click();
  await expect(page).toHaveURL(new RegExp(`/bookings\\?flashSale=${saleId}$`));
  await expect(page.getByTestId("input-booking-title")).toHaveValue("Flash sale: Rose flash");
  await expect(page.getByTestId("input-total-price")).toHaveValue("120.00");
  await expect(page.getByTestId("input-total-price")).toHaveAttribute("readonly", "");
  await expect(page.getByTestId("select-artist")).toContainText(artist.username);
  await page.reload();
  await expect(page.getByTestId("input-booking-title")).toHaveValue("Flash sale: Rose flash");
  await page.getByTestId("input-scheduled-at").fill("2099-10-07T14:00");
  await page.getByTestId("button-submit-booking").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.bookingPayload).toMatchObject({
    flashSaleId: saleId, artistId: artist.id, totalPriceCents: 12000,
    title: "Flash sale: Rose flash", durationMinutes: 120,
  });
  await expect(page.getByTestId("card-booking-55555555-5555-4555-8555-555555555555")).toBeVisible();
  await page.getByTestId("button-create-booking").click();
  await expect(page.getByTestId("input-booking-title")).toHaveValue("");
  await expect(page.getByTestId("input-total-price")).not.toHaveAttribute("readonly", "");
});

test("detail loading, retryable error, and not-found states", async ({ page }) => {
  const state = await mockApp(page, { status: 500, delay: 600 });
  await page.goto(`/flash-sales/${saleId}`);
  await expect(page.getByTestId("skeleton-flash-sale")).toBeVisible();
  await expect(page.getByTestId("state-error")).toBeVisible();
  state.status = 200;
  state.delay = 0;
  await page.getByTestId("button-retry").click();
  await expect(page.getByTestId(`flash-sale-detail-${saleId}`)).toBeVisible();
  state.status = 404;
  await page.reload();
  await expect(page.getByTestId("state-not-found")).toBeVisible();
});

for (const unavailable of ["sold out", "expired", "inactive"] as const) {
  test(`${unavailable} sales cannot be booked, including direct booking URLs`, async ({ page }) => {
    const sale = makeSale();
    if (unavailable === "sold out") sale.bookedSlots = 4;
    if (unavailable === "expired") sale.expiresAt = new Date(Date.now() - 60000).toISOString();
    if (unavailable === "inactive") sale.isActive = false;
    const state = await mockApp(page, { sale });
    await page.goto(`/flash-sales/${saleId}`);
    await expect(page.getByTestId("button-book-flash-sale")).toBeDisabled();
    await page.goto(`/bookings?flashSale=${saleId}`);
    await expect(page.getByTestId("booking-flash-sale-status")).toContainText("no longer available");
    await expect(page.getByTestId("button-submit-booking")).toBeDisabled();
    expect(state.bookingPayload).toBeUndefined();
  });
}

test("rechecks availability before sending; rejected bookings keep the form", async ({ page }) => {
  const state = await mockApp(page, { failBooking: true });
  await page.goto(`/bookings?flashSale=${saleId}`);
  await expect(page.getByTestId("input-total-price")).toHaveValue("120.00");
  await page.getByTestId("input-scheduled-at").fill("2099-10-07T14:00");
  state.sale.bookedSlots = 4;
  await page.getByTestId("button-submit-booking").click();
  await expect(page.getByText("This flash sale is sold out, expired, or no longer available.", { exact: true }).first()).toBeVisible();
  expect(state.bookingPayload).toBeUndefined();
  state.sale.bookedSlots = 1;
  await page.reload();
  await expect(page.getByTestId("input-total-price")).toHaveValue("120.00");
  await page.getByTestId("input-scheduled-at").fill("2099-10-07T14:00");
  await page.getByTestId("button-submit-booking").click();
  await expect(page.getByText(/Could not create booking/).first()).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("input-booking-title")).toHaveValue("Flash sale: Rose flash");
});
