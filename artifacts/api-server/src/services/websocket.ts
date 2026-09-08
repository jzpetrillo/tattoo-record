import { WebSocketServer, WebSocket } from "ws";
import { Server, IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users, messages, conversationParticipants } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getWebSocketUpgradePath } from "./websocket-routing";

const _jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!_jwtSecret) {
  throw new Error("JWT_SECRET or SESSION_SECRET environment variable must be set");
}
const JWT_SECRET: string = _jwtSecret;

interface WSClient extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

interface WSMessage {
  type: "USER_ONLINE" | "USER_OFFLINE" | "NEW_MESSAGE" | "READ_RECEIPT" | "TYPING" | "REACTION_ADDED" | "REACTION_REMOVED" | "HEARTBEAT";
  payload?: any;
}

let _wss: WebSocketServer | null = null;

function extractAndVerifyToken(req: IncomingMessage): string | null {
  try {
    // Try query param first: ws://host/ws?token=...
    const url = new URL(req.url!, "http://localhost");
    const queryToken = url.searchParams.get("token");
    const rawToken = queryToken
      ?? req.headers["authorization"]?.replace(/^Bearer\s+/i, "");

    if (!rawToken) return null;

    const decoded = jwt.verify(rawToken, JWT_SECRET) as { userId: string };
    return decoded.userId ?? null;
  } catch {
    return null;
  }
}

export async function broadcastNewMessage(conversationId: string, message: any) {
  if (!_wss) return;
  const participants = await db
    .select()
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId));
  participants.forEach((p) => {
    sendToUser(_wss!, p.userId, { type: "NEW_MESSAGE", payload: message });
  });
}

export function setupMessageWebSocket(server: Server) {
  const wss = new WebSocketServer({
    noServer: true,
    // Disable per-message deflate so the RSV1 bit stays clear for all clients
    // (including the ws test client which does not negotiate compression).
    perMessageDeflate: false,
  });

  // Keep the application WebSocket from intercepting Vite's HMR upgrade.
  // WebSocketServer({ server, path }) responds with 400 for every other path,
  // which prevents Vite's later upgrade listener from handling /.
  server.on("upgrade", (req, socket, head) => {
    if (getWebSocketUpgradePath(req.url) !== "/ws") return;

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  const heartbeatInterval = parseInt(process.env.WEBSOCKET_HEARTBEAT_MS || "30000");

  wss.on("connection", async (ws: WSClient, req: IncomingMessage) => {
    // Authenticate at handshake time — reject if no valid JWT
    const userId = extractAndVerifyToken(req);
    if (!userId) {
      ws.close(4401, "Unauthorized");
      return;
    }

    // A JWT stays valid for 7 days, so verifying the signature alone would let a
    // banned or deleted user keep full socket access until it expires. requireAuth
    // re-checks this on every HTTP request; /ws/live does the same. Mirror it here.
    const [activeUser] = await db
      .select({ id: users.id, isBanned: users.isBanned, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!activeUser || activeUser.deletedAt || activeUser.isBanned) {
      ws.close(4401, "Unauthorized");
      return;
    }

    ws.userId = userId;
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "USER_ONLINE":
            // userId is already set from the verified JWT — ignore any client-supplied value
            broadcast(wss, {
              type: "USER_ONLINE",
              payload: { userId: ws.userId }
            });
            break;

          // NEW_MESSAGE is deliberately not accepted from clients. The payload
          // would be attacker-controlled (any conversationId, any senderId, any
          // body) and was fanned out to every participant unchecked. Messages
          // are written through the participation-checked HTTP route, which then
          // broadcasts authoritatively via broadcastNewMessage(); this socket is
          // receive-only for that type.

          case "READ_RECEIPT":
            await handleReadReceipt(wss, ws.userId!, message.payload);
            break;

          case "TYPING":
            await handleTyping(wss, ws.userId!, message.payload);
            break;

          case "REACTION_ADDED":
          case "REACTION_REMOVED":
            await handleReaction(wss, ws.userId!, message);
            break;

          case "HEARTBEAT":
            ws.send(JSON.stringify({ type: "HEARTBEAT", payload: { timestamp: Date.now() } }));
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      if (ws.userId) {
        broadcast(wss, {
          type: "USER_OFFLINE",
          payload: { userId: ws.userId }
        });
      }
    });
  });

  // Heartbeat check
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WSClient) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, heartbeatInterval);

  wss.on("close", () => {
    clearInterval(interval);
  });

  _wss = wss;
  return wss;
}

// Every socket action below targets a conversation the client names, so the
// caller's membership has to be proven before it is honoured. Without this a
// user could react to, mark read, or signal typing in any conversation whose id
// they can guess.
async function isConversationParticipant(
  conversationId: string,
  userId: string
): Promise<boolean> {
  if (!conversationId) return false;

  const [participant] = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      )
    )
    .limit(1);

  return Boolean(participant);
}

async function handleReadReceipt(wss: WebSocketServer, userId: string, payload: any) {
  if (!(await isConversationParticipant(payload?.conversationId, userId))) return;

  await db
    .update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationParticipants.conversationId, payload.conversationId),
        eq(conversationParticipants.userId, userId)
      )
    );

  const participants = await db
    .select()
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, payload.conversationId));

  participants.forEach((participant) => {
    if (participant.userId !== userId) {
      sendToUser(wss, participant.userId, {
        type: "READ_RECEIPT",
        payload: {
          conversationId: payload.conversationId,
          userId,
          timestamp: new Date()
        }
      });
    }
  });
}

async function handleReaction(wss: WebSocketServer, userId: string, message: WSMessage) {
  const { messageId, emoji } = message.payload;

  const [msg] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!msg) return;

  // The reaction is written to a message the client named, then broadcast into
  // that conversation — so membership must be checked, not assumed.
  if (!(await isConversationParticipant(msg.conversationId, userId))) return;

  let reactions = msg.reactions || [];

  if (message.type === "REACTION_ADDED") {
    reactions.push({ userId, emoji });
  } else {
    reactions = reactions.filter(
      (r: any) => !(r.userId === userId && r.emoji === emoji)
    );
  }

  await db
    .update(messages)
    .set({ reactions })
    .where(eq(messages.id, messageId));

  const participants = await db
    .select()
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, msg.conversationId));

  participants.forEach((participant) => {
    sendToUser(wss, participant.userId, {
      type: message.type,
      payload: { messageId, emoji, userId, reactions }
    });
  });
}

async function handleTyping(wss: WebSocketServer, senderId: string, payload: any) {
  if (!(await isConversationParticipant(payload?.conversationId, senderId))) return;

  const participants = await db
    .select()
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, payload.conversationId));

  participants.forEach((participant) => {
    if (participant.userId !== senderId) {
      sendToUser(wss, participant.userId, {
        type: "TYPING",
        payload: {
          conversationId: payload.conversationId,
          userId: senderId,
          isTyping: payload.isTyping
        }
      });
    }
  });
}

function broadcast(wss: WebSocketServer, message: WSMessage) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client: WSClient) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function sendToUser(wss: WebSocketServer, userId: string, message: WSMessage) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client: WSClient) => {
    if (client.userId === userId && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

