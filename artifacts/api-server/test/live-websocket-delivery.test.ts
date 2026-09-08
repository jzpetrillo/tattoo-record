import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, afterEach, before, describe, test } from "node:test";
import WebSocket, { type WebSocketServer } from "ws";

import app from "../src/app";
import { pool } from "../src/db";
import { registerRoutes } from "../src/routes/routes";
import { setupLiveWebSocket } from "../src/services/websocket-live";

type JsonRecord = Record<string, any>;
type TestUser = { id: string; token: string };

const createdUserIds: string[] = [];
const createdEventIds: string[] = [];
const openSockets = new Set<WebSocket>();
let baseUrl = "";
let wsUrl = "";
let server: Awaited<ReturnType<typeof registerRoutes>>;
let webSocketServer: WebSocketServer;

async function jsonRequest(
  path: string,
  options: { method?: string; body?: JsonRecord } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : {},
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
      password: "live-websocket-test-password",
    },
  });
  assert.equal(registered.response.status, 200, JSON.stringify(registered.body));
  createdUserIds.push(registered.body.user.id);
  return { id: registered.body.user.id, token: registered.body.token };
}

async function createEvent(hostId: string, label: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    "INSERT INTO livestream_events (host_id, title) VALUES ($1, $2) RETURNING id",
    [hostId, label],
  );
  const eventId = result.rows[0].id;
  createdEventIds.push(eventId);
  return eventId;
}

function connect(eventId?: string, token?: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams();
    if (eventId) params.set("eventId", eventId);
    if (token) params.set("token", token);
    const socket = new WebSocket(`${wsUrl}/ws/live?${params.toString()}`);
    openSockets.add(socket);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
    socket.once("close", () => openSockets.delete(socket));
  });
}

function collectMessages(socket: WebSocket): any[] {
  const messages: any[] = [];
  socket.on("message", (data) => messages.push(JSON.parse(data.toString())));
  return messages;
}

async function waitFor(
  predicate: () => boolean,
  message: string,
  timeoutMs = 2_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(message);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

before(async () => {
  server = await registerRoutes(app);
  webSocketServer = setupLiveWebSocket(server);
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
  if (createdEventIds.length > 0) {
    await pool.query("DELETE FROM livestream_events WHERE id = ANY($1::uuid[])", [createdEventIds]);
    createdEventIds.length = 0;
  }
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

describe("live-stream WebSocket delivery", () => {
  test("rejects unauthenticated connections with close code 4401", async () => {
    const socket = await connect(randomUUID());
    const close = await new Promise<{ code: number; reason: string }>((resolve) => {
      socket.once("close", (code, reason) => resolve({ code, reason: reason.toString() }));
    });
    assert.deepEqual(close, { code: 4401, reason: "Unauthorized" });
  });

  test("delivers comments and reactions only to viewers joined to the same event", async () => {
    const sender = await registerUser("live-sender");
    const sameEventViewer = await registerUser("live-same-event");
    const otherEventViewer = await registerUser("live-other-event");
    const nonViewer = await registerUser("live-not-joined");
    const eventId = await createEvent(sender.id, "Scoped live event");
    const otherEventId = await createEvent(otherEventViewer.id, "Other live event");

    const senderSocket = await connect(eventId, sender.token);
    const sameEventSocket = await connect(eventId, sameEventViewer.token);
    const otherEventSocket = await connect(otherEventId, otherEventViewer.token);
    const nonViewerSocket = await connect(eventId, nonViewer.token);
    const sameEventMessages = collectMessages(sameEventSocket);
    const otherEventMessages = collectMessages(otherEventSocket);
    const nonViewerMessages = collectMessages(nonViewerSocket);

    // The connection callback validates the user in the database before it
    // attaches the message handler, which can finish just after the open event.
    await new Promise((resolve) => setTimeout(resolve, 100));
    senderSocket.send(JSON.stringify({ type: "JOIN" }));
    sameEventSocket.send(JSON.stringify({ type: "JOIN" }));
    otherEventSocket.send(JSON.stringify({ type: "JOIN" }));
    await waitFor(
      () => sameEventMessages.some((message) => message.type === "VIEWER_UPDATE"),
      "Same-event viewer did not finish joining",
    );
    sameEventMessages.length = 0;
    otherEventMessages.length = 0;
    nonViewerMessages.length = 0;

    senderSocket.send(JSON.stringify({
      type: "LIVE_COMMENT",
      payload: { body: "event-scoped comment", username: "sender" },
    }));
    senderSocket.send(JSON.stringify({
      type: "LIVE_REACTION",
      payload: { emoji: "🔥" },
    }));

    await waitFor(
      () => sameEventMessages.some((message) => message.type === "LIVE_COMMENT")
        && sameEventMessages.some((message) => message.type === "LIVE_REACTION"),
      "Same-event viewer did not receive both live events",
    );
    await new Promise((resolve) => setTimeout(resolve, 100));

    const comment = sameEventMessages.find((message) => message.type === "LIVE_COMMENT");
    const reaction = sameEventMessages.find((message) => message.type === "LIVE_REACTION");
    assert.equal(comment.payload.body, "event-scoped comment");
    assert.equal(comment.payload.eventId, eventId);
    assert.equal(reaction.payload.userId, sender.id);
    assert.equal(reaction.payload.emoji, "🔥");
    assert.equal(otherEventMessages.some((message) => message.type.startsWith("LIVE_")), false);
    assert.equal(nonViewerMessages.some((message) => message.type.startsWith("LIVE_")), false);
  });
});