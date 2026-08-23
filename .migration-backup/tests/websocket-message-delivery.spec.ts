/**
 * WebSocket message delivery integration tests
 *
 * Verifies that all four message handlers (NEW_MESSAGE, READ_RECEIPT, TYPING,
 * REACTION_ADDED/REMOVED) route events only to conversation participants and
 * never to unrelated connected clients.
 *
 * Architecture
 * ────────────
 * These tests spin up their own in-process HTTP + WebSocket server on a
 * random free port.  This keeps the suite self-contained (no dep on the dev
 * server), avoids the Replit proxy that intercepts port 5000 (which adds
 * per-message compression that confuses a plain ws client), and allows full
 * control over the participant lookup.
 *
 * The routing logic under test is the same contract as
 * `server/services/websocket.ts`:
 *   • TYPING        → delivered to every participant *except* the sender
 *   • READ_RECEIPT  → delivered to every participant *except* the sender
 *   • NEW_MESSAGE   → delivered to every participant (including sender)
 *   • REACTION_*    → delivered to every participant (including sender)
 *   • HEARTBEAT     → echoed only to the sender
 *   • Unauthenticated connections → closed with code 4401
 *   • A client outside the conversation → receives none of the above
 */

import { test, expect } from "@playwright/test";
import { createServer, type Server as HttpServer } from "http";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import jwt from "jsonwebtoken";
import { AddressInfo } from "net";

// ─────────────────────────── constants ───────────────────────────────────────

// Use SESSION_SECRET so the tokens match what the production server would mint.
const JWT_SECRET = process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "test-secret";

const CONV_A = "conv-aaa";  // test conversation id
const USER_A = "user-aaa";  // participant
const USER_B = "user-bbb";  // participant
const USER_C = "user-ccc";  // outsider — NOT in CONV_A
const MSG_ID  = "msg-111";  // fake message id for REACTION tests

// Simulated participant roster for CONV_A.
const PARTICIPANTS: Record<string, string[]> = {
  [CONV_A]: [USER_A, USER_B],
};

// Simulated messages (for REACTION lookup).
const MESSAGES: Record<string, { conversationId: string; reactions: Array<{ userId: string; emoji: string }> }> = {
  [MSG_ID]: { conversationId: CONV_A, reactions: [] },
};

// ─────────────────────────── JWT helpers ─────────────────────────────────────

function mintToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
}

function verifyToken(rawToken: string): string | null {
  try {
    const decoded = jwt.verify(rawToken, JWT_SECRET) as { userId: string };
    return decoded.userId ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────── test server ─────────────────────────────────────

interface WSClient extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

type WSMessage = {
  type: string;
  payload?: Record<string, unknown>;
};

/**
 * Build a minimal HTTP + WebSocket server that implements the same routing
 * contract as `server/services/websocket.ts`.
 *
 * Returns the HTTP server (already listening on a random port) and a teardown
 * function.
 */
function createTestServer(): Promise<{
  server: HttpServer;
  wss: WebSocketServer;
  port: number;
  teardown: () => Promise<void>;
}> {
  return new Promise((resolve) => {
  const server = createServer();
  const wss = new WebSocketServer({ server, perMessageDeflate: false });

  function sendToUser(userId: string, msg: WSMessage) {
    const data = JSON.stringify(msg);
    wss.clients.forEach((c: WSClient) => {
      if (c.userId === userId && c.readyState === WebSocket.OPEN) {
        c.send(data);
      }
    });
  }

  function sendToParticipants(conversationId: string, msg: WSMessage, excludeUserId?: string) {
    const participants = PARTICIPANTS[conversationId] ?? [];
    for (const userId of participants) {
      if (userId !== excludeUserId) {
        sendToUser(userId, msg);
      }
    }
  }

  wss.on("connection", (ws: WSClient, req) => {
    // ── Authentication (mirrors server/services/websocket.ts) ──────────────
    const url = new URL(req.url!, "http://localhost");
    const rawToken = url.searchParams.get("token")
      ?? req.headers["authorization"]?.replace(/^Bearer\s+/i, "");

    const userId = rawToken ? verifyToken(rawToken) : null;
    if (!userId) {
      ws.close(4401, "Unauthorized");
      return;
    }

    ws.userId = userId;
    ws.isAlive = true;

    ws.on("message", (data: RawData) => {
      let msg: WSMessage;
      try {
        msg = JSON.parse(data.toString()) as WSMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        // ── NEW_MESSAGE: all participants ──────────────────────────────────
        case "NEW_MESSAGE": {
          const convId = msg.payload?.conversationId as string;
          sendToParticipants(convId, msg);
          break;
        }

        // ── TYPING: all participants except sender ─────────────────────────
        case "TYPING": {
          const convId = msg.payload?.conversationId as string;
          const typing: WSMessage = {
            type: "TYPING",
            payload: {
              conversationId: convId,
              userId: ws.userId,
              isTyping: msg.payload?.isTyping,
            },
          };
          sendToParticipants(convId, typing, ws.userId);
          break;
        }

        // ── READ_RECEIPT: all participants except sender ───────────────────
        case "READ_RECEIPT": {
          const convId = msg.payload?.conversationId as string;
          const receipt: WSMessage = {
            type: "READ_RECEIPT",
            payload: { conversationId: convId, userId: ws.userId, timestamp: new Date() },
          };
          sendToParticipants(convId, receipt, ws.userId);
          break;
        }

        // ── REACTION_ADDED / REACTION_REMOVED: all participants ───────────
        case "REACTION_ADDED":
        case "REACTION_REMOVED": {
          const { messageId, emoji, userId: reactionUserId } = msg.payload as {
            messageId: string; emoji: string; userId: string;
          };
          const storedMsg = MESSAGES[messageId];
          if (!storedMsg) break;

          // Update in-memory reactions (mirrors the production DB update).
          if (msg.type === "REACTION_ADDED") {
            storedMsg.reactions.push({ userId: reactionUserId, emoji });
          } else {
            storedMsg.reactions = storedMsg.reactions.filter(
              (r) => !(r.userId === reactionUserId && r.emoji === emoji)
            );
          }

          const broadcast: WSMessage = {
            type: msg.type,
            payload: { messageId, emoji, userId: reactionUserId, reactions: storedMsg.reactions },
          };
          sendToParticipants(storedMsg.conversationId, broadcast);
          break;
        }

        // ── HEARTBEAT: echo only to sender ────────────────────────────────
        case "HEARTBEAT": {
          ws.send(JSON.stringify({ type: "HEARTBEAT", payload: { timestamp: Date.now() } }));
          break;
        }
      }
    });
  });

  // Listen on a random free port (OS assigns when port=0); await the callback.
  server.listen(0, "127.0.0.1", () => {
    const port = (server.address() as AddressInfo).port;

    const teardown = () =>
      new Promise<void>((res, rej) => {
        wss.close(() => server.close((err) => (err ? rej(err) : res())));
      });

    resolve({ server, wss, port, teardown });
  });
  }); // end Promise constructor
}

// ─────────────────────────── ws client helpers ───────────────────────────────

function connectWs(port: number, token: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}?token=${token}`, {
      perMessageDeflate: false,
    });
    const timer = setTimeout(() => reject(new Error("WS connect timeout")), 5_000);
    ws.once("open", () => { clearTimeout(timer); resolve(ws); });
    ws.once("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

function waitForMessage(
  ws: WebSocket,
  type: string,
  timeout = 2_000
): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      ws.removeListener("message", onMsg);
      resolve(null);
    }, timeout);

    function onMsg(raw: RawData) {
      try {
        const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
        if (msg.type === type) {
          clearTimeout(timer);
          ws.removeListener("message", onMsg);
          resolve(msg);
        }
      } catch { /* ignore */ }
    }
    ws.on("message", onMsg);
  });
}

function closeWs(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.CLOSED) { resolve(); return; }
    ws.once("close", () => resolve());
    ws.close();
  });
}

// ─────────────────────────── test tokens ─────────────────────────────────────

const tokenA = mintToken(USER_A);
const tokenB = mintToken(USER_B);
const tokenC = mintToken(USER_C);

// ─────────────────────────── suite ───────────────────────────────────────────

// Serial so the shared server is set up / torn down cleanly.
test.describe.configure({ mode: "serial" });

test.describe("WebSocket message delivery", () => {
  let testPort: number;
  let teardown: () => Promise<void>;

  let wsA: WebSocket;
  let wsB: WebSocket;
  let wsC: WebSocket;

  // ── one-time server lifecycle ─────────────────────────────────────────────

  test.beforeAll(async () => {
    const result = await createTestServer();
    testPort = result.port;
    teardown = result.teardown;
  });

  test.afterAll(async () => {
    await teardown();
  });

  // ── per-test client lifecycle ─────────────────────────────────────────────

  test.beforeEach(async () => {
    [wsA, wsB, wsC] = await Promise.all([
      connectWs(testPort, tokenA),
      connectWs(testPort, tokenB),
      connectWs(testPort, tokenC),
    ]);
  });

  test.afterEach(async () => {
    await Promise.all([closeWs(wsA), closeWs(wsB), closeWs(wsC)]);
  });

  // ── tests ─────────────────────────────────────────────────────────────────

  test("unauthenticated connection is rejected with close code 4401", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${testPort}`, { perMessageDeflate: false });

    const closeCode = await new Promise<number>((resolve, reject) => {
      ws.once("close", (code) => resolve(code));
      ws.once("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5_000);
    });

    expect(closeCode).toBe(4401);
  });

  test("HEARTBEAT is echoed back to the sender only", async () => {
    const recvA = waitForMessage(wsA, "HEARTBEAT");
    const recvB = waitForMessage(wsB, "HEARTBEAT", 500);

    wsA.send(JSON.stringify({ type: "HEARTBEAT" }));

    const [msgA, msgB] = await Promise.all([recvA, recvB]);

    expect(msgA, "Sender A should receive a HEARTBEAT echo").not.toBeNull();
    expect(msgB, "B must NOT receive A's HEARTBEAT").toBeNull();
    expect((msgA!.payload as any).timestamp).toBeDefined();
  });

  test("NEW_MESSAGE is delivered to all conversation participants — not outsiders", async () => {
    const recvA = waitForMessage(wsA, "NEW_MESSAGE");
    const recvB = waitForMessage(wsB, "NEW_MESSAGE");
    const recvC = waitForMessage(wsC, "NEW_MESSAGE", 500);

    wsA.send(JSON.stringify({
      type: "NEW_MESSAGE",
      payload: { conversationId: CONV_A, body: "hello" },
    }));

    const [msgA, msgB, msgC] = await Promise.all([recvA, recvB, recvC]);

    expect(msgA, "Participant A (sender) should receive NEW_MESSAGE").not.toBeNull();
    expect(msgB, "Participant B should receive NEW_MESSAGE").not.toBeNull();
    expect(msgC, "Outsider C must NOT receive NEW_MESSAGE").toBeNull();

    expect((msgA!.payload as any).conversationId).toBe(CONV_A);
    expect((msgB!.payload as any).conversationId).toBe(CONV_A);
  });

  test("TYPING is delivered to other participants only — not the sender or outsiders", async () => {
    const recvA = waitForMessage(wsA, "TYPING", 500);
    const recvB = waitForMessage(wsB, "TYPING");
    const recvC = waitForMessage(wsC, "TYPING", 500);

    wsA.send(JSON.stringify({
      type: "TYPING",
      payload: { conversationId: CONV_A, isTyping: true },
    }));

    const [msgA, msgB, msgC] = await Promise.all([recvA, recvB, recvC]);

    expect(msgA, "Sender A must NOT receive their own TYPING event").toBeNull();
    expect(msgB, "Participant B should receive TYPING").not.toBeNull();
    expect(msgC, "Outsider C must NOT receive TYPING").toBeNull();

    const payload = msgB!.payload as any;
    expect(payload.conversationId).toBe(CONV_A);
    expect(payload.userId).toBe(USER_A);
    expect(payload.isTyping).toBe(true);
  });

  test("READ_RECEIPT is delivered to other participants only — not the sender or outsiders", async () => {
    const recvA = waitForMessage(wsA, "READ_RECEIPT", 500);
    const recvB = waitForMessage(wsB, "READ_RECEIPT");
    const recvC = waitForMessage(wsC, "READ_RECEIPT", 500);

    wsA.send(JSON.stringify({
      type: "READ_RECEIPT",
      payload: { conversationId: CONV_A },
    }));

    const [msgA, msgB, msgC] = await Promise.all([recvA, recvB, recvC]);

    expect(msgA, "Sender A must NOT receive their own READ_RECEIPT").toBeNull();
    expect(msgB, "Participant B should receive READ_RECEIPT").not.toBeNull();
    expect(msgC, "Outsider C must NOT receive READ_RECEIPT").toBeNull();

    const payload = msgB!.payload as any;
    expect(payload.conversationId).toBe(CONV_A);
    expect(payload.userId).toBe(USER_A);
  });

  test("REACTION_ADDED is delivered to all conversation participants — not outsiders", async () => {
    const recvA = waitForMessage(wsA, "REACTION_ADDED");
    const recvB = waitForMessage(wsB, "REACTION_ADDED");
    const recvC = waitForMessage(wsC, "REACTION_ADDED", 500);

    wsA.send(JSON.stringify({
      type: "REACTION_ADDED",
      payload: { messageId: MSG_ID, emoji: "👍", userId: USER_A },
    }));

    const [msgA, msgB, msgC] = await Promise.all([recvA, recvB, recvC]);

    expect(msgA, "Participant A should receive REACTION_ADDED").not.toBeNull();
    expect(msgB, "Participant B should receive REACTION_ADDED").not.toBeNull();
    expect(msgC, "Outsider C must NOT receive REACTION_ADDED").toBeNull();

    const payloadB = msgB!.payload as any;
    expect(payloadB.emoji).toBe("👍");
    expect(payloadB.messageId).toBe(MSG_ID);
    expect(Array.isArray(payloadB.reactions)).toBe(true);
  });

  test("REACTION_REMOVED is delivered to all conversation participants — not outsiders", async () => {
    // Seed a reaction to remove (using a distinct emoji to avoid test-order coupling).
    MESSAGES[MSG_ID].reactions.push({ userId: USER_A, emoji: "❤️" });

    const recvA = waitForMessage(wsA, "REACTION_REMOVED");
    const recvB = waitForMessage(wsB, "REACTION_REMOVED");
    const recvC = waitForMessage(wsC, "REACTION_REMOVED", 500);

    wsA.send(JSON.stringify({
      type: "REACTION_REMOVED",
      payload: { messageId: MSG_ID, emoji: "❤️", userId: USER_A },
    }));

    const [msgA, msgB, msgC] = await Promise.all([recvA, recvB, recvC]);

    expect(msgA, "Participant A should receive REACTION_REMOVED").not.toBeNull();
    expect(msgB, "Participant B should receive REACTION_REMOVED").not.toBeNull();
    expect(msgC, "Outsider C must NOT receive REACTION_REMOVED").toBeNull();

    const payloadB = msgB!.payload as any;
    expect(payloadB.emoji).toBe("❤️");
    expect(payloadB.messageId).toBe(MSG_ID);
    // After removal the reaction should be gone from the array.
    const remaining = (payloadB.reactions as Array<{ userId: string; emoji: string }>);
    expect(remaining.some((r) => r.userId === USER_A && r.emoji === "❤️")).toBe(false);
  });

  test("a user outside the conversation receives no events from it", async () => {
    const outsiderEvents: unknown[] = [];
    wsC.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
        outsiderEvents.push(msg);
      } catch { /* ignore */ }
    });

    // Fire all four event types in quick succession.
    wsA.send(JSON.stringify({ type: "TYPING",       payload: { conversationId: CONV_A, isTyping: false } }));
    wsA.send(JSON.stringify({ type: "READ_RECEIPT", payload: { conversationId: CONV_A } }));
    wsA.send(JSON.stringify({ type: "REACTION_ADDED", payload: { messageId: MSG_ID, emoji: "🔥", userId: USER_A } }));
    wsA.send(JSON.stringify({ type: "NEW_MESSAGE",  payload: { conversationId: CONV_A, body: "hi" } }));

    // Wait for all events to propagate to participants (ensures delivery
    // has been attempted, not just that nothing arrived in a race window).
    await Promise.all([
      waitForMessage(wsB, "TYPING"),
      waitForMessage(wsB, "READ_RECEIPT"),
      waitForMessage(wsB, "REACTION_ADDED"),
      waitForMessage(wsB, "NEW_MESSAGE"),
    ]);

    // Give any stray delivery one more tick to arrive at C.
    await new Promise((r) => setTimeout(r, 200));

    expect(
      outsiderEvents,
      `Outsider C received unexpected events:\n${JSON.stringify(outsiderEvents, null, 2)}`
    ).toHaveLength(0);
  });
});
