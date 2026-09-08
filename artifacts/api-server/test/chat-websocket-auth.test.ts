import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, afterEach, before, describe, test } from "node:test";
import WebSocket, { type WebSocketServer } from "ws";

import app from "../src/app";
import { pool } from "../src/db";
import { registerRoutes } from "../src/routes/routes";
import { setupMessageWebSocket } from "../src/services/websocket";

type JsonRecord = Record<string, any>;
type TestUser = { id: string; token: string };

const createdUserIds: string[] = [];
const openSockets = new Set<WebSocket>();
let baseUrl = "";
let wsUrl = "";
let server: Awaited<ReturnType<typeof registerRoutes>>;
let webSocketServer: WebSocketServer;

async function jsonRequest(
  path: string,
  options: { method?: string; token?: string; body?: JsonRecord } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body = (await response.json()) as any;
  return { response, body };
}

async function registerUser(label: string): Promise<TestUser> {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const registered = await jsonRequest("/api/auth/register", {
    method: "POST",
    body: {
      email: `${label}-${suffix}@example.com`,
      username: `${label}${suffix}`,
      password: "chat-websocket-test-password",
    },
  });
  assert.equal(registered.response.status, 200, JSON.stringify(registered.body));
  createdUserIds.push(registered.body.user.id);
  return { id: registered.body.user.id, token: registered.body.token };
}

function connect(token?: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${wsUrl}/ws${token ? `?token=${encodeURIComponent(token)}` : ""}`);
    openSockets.add(socket);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
    socket.once("close", () => openSockets.delete(socket));
  });
}

function nextMessage(socket: WebSocket): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for WebSocket message")), 2_000);
    socket.once("message", (data) => {
      clearTimeout(timeout);
      resolve(JSON.parse(data.toString()));
    });
  });
}

before(async () => {
  server = await registerRoutes(app);
  webSocketServer = setupMessageWebSocket(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const port = (server.address() as AddressInfo).port;
  baseUrl = `http://127.0.0.1:${port}`;
  wsUrl = `ws://127.0.0.1:${port}`;
});

afterEach(async () => {
  for (const socket of openSockets) socket.terminate();
  openSockets.clear();
  if (createdUserIds.length > 0) {
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [createdUserIds]);
    createdUserIds.length = 0;
  }
});

after(async () => {
  await new Promise<void>((resolve) => webSocketServer.close(() => resolve()));
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
});

describe("authenticated chat WebSocket", () => {
  test("rejects a connection without a token with close code 4401", async () => {
    const socket = await connect();
    const close = await new Promise<{ code: number; reason: string }>((resolve) => {
      socket.once("close", (code, reason) => resolve({ code, reason: reason.toString() }));
    });
    assert.deepEqual(close, { code: 4401, reason: "Unauthorized" });
  });

  test("delivers a persisted message and pins its sender to the authenticated user", async () => {
    const sender = await registerUser("chat-sender");
    const recipient = await registerUser("chat-recipient");
    const conversation = await jsonRequest("/api/conversations", {
      method: "POST",
      token: sender.token,
      body: { participantIds: [recipient.id], isGroup: false },
    });
    assert.equal(conversation.response.status, 200, JSON.stringify(conversation.body));

    const recipientSocket = await connect(recipient.token);
    const receivedMessage = nextMessage(recipientSocket);
    const sent = await jsonRequest(`/api/conversations/${conversation.body.id}/messages`, {
      method: "POST",
      token: sender.token,
      body: {
        body: "authenticated websocket integration test",
        senderId: recipient.id,
      },
    });

    assert.equal(sent.response.status, 200, JSON.stringify(sent.body));
    assert.equal(sent.body.senderId, sender.id);

    const event = await receivedMessage;
    assert.equal(event.type, "NEW_MESSAGE");
    assert.equal(event.payload.id, sent.body.id);
    assert.equal(event.payload.senderId, sender.id);

    const history = await jsonRequest(`/api/conversations/${conversation.body.id}/messages`, {
      token: recipient.token,
    });
    assert.equal(history.response.status, 200, JSON.stringify(history.body));
    assert.equal(
      history.body.some((entry: any) => entry.message.id === sent.body.id),
      true,
    );
  });
});