import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { db } from "../db";
import { messages, conversationParticipants } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface WSClient extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

interface WSMessage {
  type: "USER_ONLINE" | "USER_OFFLINE" | "NEW_MESSAGE" | "READ_RECEIPT" | "TYPING" | "REACTION_ADDED" | "REACTION_REMOVED" | "HEARTBEAT";
  payload?: any;
}

let _wss: WebSocketServer | null = null;

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
    server, 
    path: "/ws" 
  });

  const heartbeatInterval = parseInt(process.env.WEBSOCKET_HEARTBEAT_MS || "30000");

  wss.on("connection", (ws: WSClient) => {
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "USER_ONLINE":
            ws.userId = message.payload?.userId;
            broadcast(wss, {
              type: "USER_ONLINE",
              payload: { userId: ws.userId }
            });
            break;

          case "NEW_MESSAGE":
            await handleNewMessage(wss, message.payload);
            break;

          case "READ_RECEIPT":
            await handleReadReceipt(wss, ws.userId!, message.payload);
            break;

          case "TYPING":
            await handleTyping(wss, ws.userId!, message.payload);
            break;

          case "REACTION_ADDED":
          case "REACTION_REMOVED":
            await handleReaction(wss, message);
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

async function handleNewMessage(wss: WebSocketServer, payload: any) {
  const participants = await db
    .select()
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, payload.conversationId));

  participants.forEach((participant) => {
    sendToUser(wss, participant.userId, {
      type: "NEW_MESSAGE",
      payload
    });
  });
}

async function handleReadReceipt(wss: WebSocketServer, userId: string, payload: any) {
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

async function handleReaction(wss: WebSocketServer, message: WSMessage) {
  const { messageId, emoji, userId } = message.payload;

  const [msg] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!msg) return;

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

