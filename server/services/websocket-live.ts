import { WebSocketServer, WebSocket } from "ws";
import { Server, IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users, livestreamEvents, livestreamParticipants, liveComments, liveReactions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getWebSocketUpgradePath } from "./websocket-routing";

const _jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!_jwtSecret) {
  throw new Error("JWT_SECRET or SESSION_SECRET environment variable must be set");
}
const JWT_SECRET: string = _jwtSecret;

interface LiveWSClient extends WebSocket {
  userId?: string;
  eventId?: string;
  isAlive?: boolean;
}

interface LiveWSMessage {
  type: "JOIN" | "LEAVE" | "LIVE_COMMENT" | "LIVE_REACTION" | "START" | "END" | "HEARTBEAT";
  payload?: any;
}

function extractAndVerifyToken(req: IncomingMessage): string | null {
  try {
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

export function setupLiveWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  // Route only the live-stream path so this server does not reject Vite's HMR
  // WebSocket upgrade with a 400 response.
  server.on("upgrade", (req, socket, head) => {
    if (getWebSocketUpgradePath(req.url) !== "/ws/live") return;

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  const heartbeatInterval = parseInt(process.env.WEBSOCKET_HEARTBEAT_MS || "30000");
  const eventViewers = new Map<string, Set<string>>();

  wss.on("connection", async (ws: LiveWSClient, req: IncomingMessage) => {
    // Authenticate at handshake time — reject if no valid JWT
    const userId = extractAndVerifyToken(req);
    if (!userId) {
      ws.close(4401, "Unauthorized");
      return;
    }

    // Validate the token subject is an active, non-banned, non-deleted user
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

    const eventId = new URL(req.url!, `http://${req.headers.host}`).searchParams.get("eventId");
    
    if (!eventId) {
      ws.close(1008, "Event ID required");
      return;
    }

    ws.eventId = eventId;
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (data: Buffer) => {
      try {
        const message: LiveWSMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "JOIN":
            await handleJoin(wss, ws, eventViewers, message.payload);
            break;

          case "LEAVE":
            await handleLeave(wss, ws, eventViewers);
            break;

          case "LIVE_COMMENT":
            await handleLiveComment(wss, ws, message.payload);
            break;

          case "LIVE_REACTION":
            await handleLiveReaction(wss, ws, message.payload);
            break;

          case "START":
            await handleStreamStart(wss, ws);
            break;

          case "END":
            await handleStreamEnd(wss, ws);
            break;

          case "HEARTBEAT":
            ws.send(JSON.stringify({ type: "HEARTBEAT", payload: { timestamp: Date.now() } }));
            break;
        }
      } catch (error) {
        console.error("Live WebSocket error:", error);
      }
    });

    ws.on("close", async () => {
      if (ws.userId && ws.eventId) {
        await handleLeave(wss, ws, eventViewers);
      }
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws: LiveWSClient) => {
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

  return wss;
}

async function handleJoin(
  wss: WebSocketServer,
  ws: LiveWSClient,
  eventViewers: Map<string, Set<string>>,
  payload: any
) {
  // userId is pinned to the verified JWT — ignore any client-supplied userId in payload
  const eventId = ws.eventId;
  
  if (!eventId || !ws.userId) return;

  // Fetch the event first so we can derive isHost from authoritative data
  const [event] = await db
    .select()
    .from(livestreamEvents)
    .where(eq(livestreamEvents.id, eventId))
    .limit(1);

  if (!eventViewers.has(eventId)) {
    eventViewers.set(eventId, new Set());
  }
  eventViewers.get(eventId)!.add(ws.userId);

  // Derive isHost from the event record — never trust client-supplied payload
  const isHost = event ? event.hostId === ws.userId : false;

  await db.insert(livestreamParticipants).values({
    eventId: eventId,
    userId: ws.userId,
    joinedAt: new Date(),
    isHost
  } as any);

  const viewerCount = eventViewers.get(eventId)!.size;

  if (event) {
    const updates: any = { viewerTotal: event.viewerTotal + 1 };
    if (viewerCount > event.viewerPeak) {
      updates.viewerPeak = viewerCount;
    }

    await db
      .update(livestreamEvents)
      .set(updates)
      .where(eq(livestreamEvents.id, eventId));
  }

  broadcastToEvent(wss, eventId, {
    type: "VIEWER_UPDATE",
    payload: { viewerCount, userId: ws.userId, action: "joined" }
  });
}

async function handleLeave(
  wss: WebSocketServer,
  ws: LiveWSClient,
  eventViewers: Map<string, Set<string>>
) {
  const eventId = ws.eventId!;
  const userId = ws.userId;

  if (!userId) return;

  if (eventViewers.has(eventId)) {
    eventViewers.get(eventId)!.delete(userId);
  }

  await db
    .update(livestreamParticipants)
    .set({ leftAt: new Date() })
    .where(eq(livestreamParticipants.userId, userId));

  const viewerCount = eventViewers.get(eventId)?.size || 0;

  broadcastToEvent(wss, eventId, {
    type: "VIEWER_UPDATE",
    payload: { viewerCount, userId, action: "left" }
  });
}

async function handleLiveComment(wss: WebSocketServer, ws: LiveWSClient, payload: any) {
  const eventId = ws.eventId!;
  const userId = ws.userId!;

  const [comment] = await db
    .insert(liveComments)
    .values({
      eventId,
      userId,
      body: payload.body,
      postedAt: new Date()
    })
    .returning();

  broadcastToEvent(wss, eventId, {
    type: "LIVE_COMMENT",
    payload: { ...comment, username: payload.username, avatarUrl: payload.avatarUrl }
  });
}

async function handleLiveReaction(wss: WebSocketServer, ws: LiveWSClient, payload: any) {
  const eventId = ws.eventId!;
  const userId = ws.userId!;

  await db.insert(liveReactions).values({
    eventId,
    userId,
    emoji: payload.emoji,
    postedAt: new Date()
  });

  broadcastToEvent(wss, eventId, {
    type: "LIVE_REACTION",
    payload: { userId, emoji: payload.emoji }
  });
}

async function handleStreamStart(wss: WebSocketServer, ws: LiveWSClient) {
  const eventId = ws.eventId!;
  const userId = ws.userId!;

  const [event] = await db
    .select()
    .from(livestreamEvents)
    .where(eq(livestreamEvents.id, eventId))
    .limit(1);

  if (!event || event.hostId !== userId) {
    ws.send(JSON.stringify({ type: "ERROR", payload: { message: "Forbidden: only the host can start the stream" } }));
    return;
  }

  await db
    .update(livestreamEvents)
    .set({
      status: "LIVE",
      startedAt: new Date()
    })
    .where(eq(livestreamEvents.id, eventId));

  broadcastToEvent(wss, eventId, {
    type: "START",
    payload: { eventId, timestamp: new Date() }
  });
}

async function handleStreamEnd(wss: WebSocketServer, ws: LiveWSClient) {
  const eventId = ws.eventId!;
  const userId = ws.userId!;

  const [event] = await db
    .select()
    .from(livestreamEvents)
    .where(eq(livestreamEvents.id, eventId))
    .limit(1);

  if (!event || event.hostId !== userId) {
    ws.send(JSON.stringify({ type: "ERROR", payload: { message: "Forbidden: only the host can end the stream" } }));
    return;
  }

  await db
    .update(livestreamEvents)
    .set({
      status: "ENDED",
      endedAt: new Date()
    })
    .where(eq(livestreamEvents.id, eventId));

  broadcastToEvent(wss, eventId, {
    type: "END",
    payload: { eventId, timestamp: new Date() }
  });
}

function broadcastToEvent(wss: WebSocketServer, eventId: string, message: any) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client: LiveWSClient) => {
    if (client.eventId === eventId && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}
