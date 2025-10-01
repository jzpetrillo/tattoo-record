import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { db } from "../db";
import { livestreamEvents, livestreamParticipants, liveComments, liveReactions } from "@shared/schema";
import { eq } from "drizzle-orm";

interface LiveWSClient extends WebSocket {
  userId?: string;
  eventId?: string;
  isAlive?: boolean;
}

interface LiveWSMessage {
  type: "JOIN" | "LEAVE" | "LIVE_COMMENT" | "LIVE_REACTION" | "START" | "END" | "HEARTBEAT";
  payload?: any;
}

export function setupLiveWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server, 
    path: "/ws/live" 
  });

  const heartbeatInterval = parseInt(process.env.WEBSOCKET_HEARTBEAT_MS || "30000");
  const eventViewers = new Map<string, Set<string>>();

  wss.on("connection", (ws: LiveWSClient, req) => {
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
            await handleStreamStart(wss, ws.eventId!);
            break;

          case "END":
            await handleStreamEnd(wss, ws.eventId!);
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
  ws.userId = payload.userId;
  const eventId = ws.eventId;
  
  if (!eventId || !ws.userId) return;

  if (!eventViewers.has(eventId)) {
    eventViewers.set(eventId, new Set());
  }
  eventViewers.get(eventId)!.add(ws.userId);

  await db.insert(livestreamParticipants).values({
    eventId: eventId,
    userId: ws.userId,
    joinedAt: new Date(),
    isHost: payload.isHost || false
  } as any);

  const viewerCount = eventViewers.get(eventId)!.size;

  const [event] = await db
    .select()
    .from(livestreamEvents)
    .where(eq(livestreamEvents.id, eventId))
    .limit(1);

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

async function handleStreamStart(wss: WebSocketServer, eventId: string) {
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

async function handleStreamEnd(wss: WebSocketServer, eventId: string) {
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
