import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const password = "flash-sale-e2e-password";

type TestUser = {
  id: string;
  email: string;
  token: string;
};

type FlashSale = {
  id: string;
};

async function createUser(
  request: APIRequestContext,
  label: string,
  role: "ARTIST" | "ENTHUSIAST",
): Promise<TestUser> {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `${label}-${suffix}@example.com`;
  const response = await request.post("/api/auth/register", {
    data: {
      email,
      username: `${label}${suffix}`,
      password,
      role,
    },
  });

  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  return { id: body.user.id, email, token: body.token };
}

async function login(page: Page, user: TestUser) {
  await page.goto("/auth");
  await page.getByTestId("input-login-email").fill(user.email);
  await page.getByTestId("input-login-password").fill(password);
  await page.getByTestId("button-login").click();
  await expect(page).toHaveURL(/\/$/);
}

async function createFlashSale(
  request: APIRequestContext,
  artist: TestUser,
  title: string,
  availableSlots: number,
): Promise<FlashSale> {
  const response = await request.post("/api/flash-sales", {
    headers: { Authorization: `Bearer ${artist.token}` },
    data: {
      title,
      description: "Flash sale card end-to-end fixture",
      originalPriceCents: 20000,
      flashPriceCents: 12000,
      availableSlots,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      media: [
        {
          publicId: `flash-sale-${randomUUID()}`,
          url: "/favicon.png",
          type: "image",
        },
      ],
    },
  });

  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}

test("flash sale cards show sold-out and remaining-slot states from real API data", async ({
  page,
  request,
}) => {
  const artist = await createUser(request, "flashArtist", "ARTIST");
  const client = await createUser(request, "flashClient", "ENTHUSIAST");
  const soldOutTitle = `Sold out flash ${randomUUID()}`;
  const availableTitle = `Available flash ${randomUUID()}`;

  const soldOutSale = await createFlashSale(request, artist, soldOutTitle, 1);
  const availableSale = await createFlashSale(request, artist, availableTitle, 4);

  const bookingResponse = await request.post("/api/bookings", {
    headers: { Authorization: `Bearer ${client.token}` },
    data: {
      title: `Booking ${soldOutTitle}`,
      artistId: artist.id,
      scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 120,
      totalPriceCents: 12000,
      flashSaleId: soldOutSale.id,
    },
  });
  expect(bookingResponse.ok(), await bookingResponse.text()).toBe(true);

  await login(page, client);
  await page.goto("/flash-sales");

  const soldOutCard = page.getByTestId(`flash-sale-${soldOutSale.id}`);
  await expect(soldOutCard.getByText("Sold Out", { exact: true }).first()).toBeVisible();
  await expect(soldOutCard.getByRole("img", { name: soldOutTitle })).toHaveClass(/grayscale/);
  await expect(page.getByTestId(`sold-out-badge-${soldOutSale.id}`)).toBeVisible();
  await expect(soldOutCard).not.toHaveAttribute("href");
  await expect(soldOutCard.locator("a")).toHaveCount(0);

  const availableCard = page.getByTestId(`flash-sale-${availableSale.id}`);
  await expect(availableCard.getByText("4 spots left", { exact: true })).toBeVisible();
  await expect(availableCard).toHaveAttribute("href", expect.stringContaining("/u/"));
});