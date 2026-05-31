import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createWebSocket, sendWebSocketMessage } from "@/lib/websocket";
import { ArrowLeft, Send, MoreVertical } from "lucide-react";

interface OtherUser {
  username: string;
  avatarUrl?: string | null;
}

interface ChatWindowProps {
  conversationId: string | null;
  otherUser?: OtherUser | null;
  onBack?: () => void;
}

export default function ChatWindow({ conversationId, otherUser, onBack }: ChatWindowProps) {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery<any[]>({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    enabled: !!token && !!conversationId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversationId || !user) return;

    const ws = createWebSocket("/ws", (data) => {
      if (data.type === "NEW_MESSAGE" && data.payload.conversationId === conversationId) {
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
      }
    });

    setSocket(ws);
    sendWebSocketMessage(ws, "USER_ONLINE", { userId: user.id });

    return () => {
      ws.close();
    };
  }, [conversationId, user, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(
        "POST",
        `/api/conversations/${conversationId}/messages`,
        { body: message },
        token!
      );
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
    },
  });

  const handleSend = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate();
  };

  const displayName = otherUser?.username || "Select a conversation";
  const avatarSrc = otherUser?.avatarUrl
    || (otherUser?.username ? `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.username)}&background=000&color=fff` : null);

  if (!conversationId) {
    return (
      <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground border-l border-border">
        <p className="text-sm">Select a conversation to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-3 sm:p-4 border-b border-border bg-card flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="lg:hidden min-h-[44px] min-w-[44px]"
              data-testid="button-back-to-conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-sm font-semibold">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-sm sm:text-base" data-testid="text-chat-username">{displayName}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-foreground rounded-full inline-block"></span>
              Online
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background min-h-0">
        {messages?.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Say hello!
          </p>
        )}
        {messages?.map((item: any) => {
          const isOwn = item.message.senderId === user?.id;
          return (
            <div
              key={item.message.id}
              className={`flex items-end gap-2 ${isOwn ? "justify-end" : ""}`}
              data-testid={`message-${item.message.id}`}
            >
              {!isOwn && (
                <img
                  src={item.sender.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.sender.username)}&background=000&color=fff`}
                  alt={item.sender.username}
                  className="w-7 h-7 rounded-full flex-shrink-0 object-cover"
                />
              )}
              <div className={`max-w-[70%] ${isOwn ? "flex flex-col items-end" : ""}`}>
                <div
                  className={`px-3 py-2 text-sm ${
                    isOwn
                      ? "bg-foreground text-background rounded-2xl rounded-br-sm"
                      : "bg-secondary border border-border rounded-2xl rounded-bl-sm"
                  }`}
                >
                  {item.message.body}
                </div>
                <p className="text-xs text-muted-foreground mt-1 px-1">
                  {new Date(item.message.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 sm:p-4 border-t border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message…"
            className="flex-1 min-h-[44px]"
            data-testid="input-message"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="icon"
            className="min-h-[44px] min-w-[44px] flex-shrink-0"
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
