import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

export type TestUser = {
  id: string;
  email: string;
  username: string;
  token: string;
  password: string;
};

export async function createTestUser(
  request: APIRequestContext,
  label: string,
  role: "ARTIST" | "ENTHUSIAST" = "ENTHUSIAST",
): Promise<TestUser> {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `${label}-${suffix}@example.com`;
  const username = `${label}${suffix}`;
  const password = `${label}-${suffix}-e2e-password`;
  const response = await request.post("/api/auth/register", {
    data: { email, username, password, role },
  });

  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();

  return {
    id: body.user.id,
    email,
    username,
    token: body.token,
    password,
  };
}

export async function loginTestUser(page: Page, user: TestUser) {
  await page.goto("/auth");
  await page.getByTestId("input-login-email").fill(user.email);
  await page.getByTestId("input-login-password").fill(user.password);
  await page.getByTestId("button-login").click();
  await expect(page).toHaveURL(/\/$/);
}