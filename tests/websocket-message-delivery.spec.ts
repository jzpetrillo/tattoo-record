import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  createTestUser,
  loginTestUser,
  type TestUser,
} from "./helpers/test-user";

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
  const sender = await createTestUser(request, "chatSender");
  const recipient = await createTestUser(request, "chatRecipient");

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
    await loginTestUser(senderPage, sender);
    await loginTestUser(recipientPage, recipient);

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