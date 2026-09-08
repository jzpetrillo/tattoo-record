import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const password = "chat-e2e-test-password";

type TestUser = {
  id: string;
  email: string;
  username: string;
  token: string;
};

async function createUser(request: APIRequestContext, label: string): Promise<TestUser> {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `${label}-${suffix}@example.com`;
  const username = `${label}${suffix}`;
  const response = await request.post("/api/auth/register", {
    data: { email, username, password, role: "ENTHUSIAST" },
  });

  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  return { id: body.user.id, email, username, token: body.token };
}

async function login(page: Page, user: TestUser) {
  await page.goto("/auth");
  await page.getByTestId("input-login-email").fill(user.email);
  await page.getByTestId("input-login-password").fill(password);
  await page.getByTestId("button-login").click();
  await expect(page).toHaveURL(/\/$/);
}

async function openConversation(page: Page, otherUser: TestUser) {
  let firstFrameSent: Promise<void> | undefined;
  const socketOpened = page.waitForEvent("websocket", (socket) => {
    if (new URL(socket.url()).pathname !== "/ws") return false;

    firstFrameSent = new Promise<void>((resolve) => {
      socket.once("framesent", () => resolve());
    });
    return true;
  });

  await page.goto(`/messages?withUserId=${encodeURIComponent(otherUser.id)}`);
  await socketOpened;
  await firstFrameSent;
  await expect(page.getByTestId("text-chat-username")).toHaveText(otherUser.username);
}

test("a recipient sees a new chat message over the authenticated WebSocket", async ({
  browser,
  request,
}) => {
  const sender = await createUser(request, "chatSender");
  const recipient = await createUser(request, "chatRecipient");

  const conversation = await request.post("/api/conversations", {
    headers: { Authorization: `Bearer ${sender.token}` },
    data: { participantIds: [recipient.id], isGroup: false },
  });
  expect(conversation.ok(), await conversation.text()).toBe(true);

  const senderContext = await browser.newContext();
  const recipientContext = await browser.newContext();
  const senderPage = await senderContext.newPage();
  const recipientPage = await recipientContext.newPage();

  try {
    await login(senderPage, sender);
    await login(recipientPage, recipient);

    await openConversation(recipientPage, sender);
    await openConversation(senderPage, recipient);

    const uniqueMessage = `WebSocket delivery ${randomUUID()}`;
    await senderPage.getByTestId("input-message").fill(uniqueMessage);
    await senderPage.getByTestId("button-send-message").click();

    await expect(senderPage.getByText(uniqueMessage, { exact: true })).toBeVisible();
    await expect(recipientPage.getByText(uniqueMessage, { exact: true })).toBeVisible();
  } finally {
    await senderContext.close();
    await recipientContext.close();
  }
});