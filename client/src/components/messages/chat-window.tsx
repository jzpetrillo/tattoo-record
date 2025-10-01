import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createWebSocket, sendWebSocketMessage } from "@/lib/websocket";

interface ChatWindowProps {
  conversationId: string | null;
}

export default function ChatWindow({ conversationId }: ChatWindowProps) {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const { data: messages } = useQuery({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    enabled: !!token && !!conversationId,
  });

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

  if (!conversationId) {
    return (
      <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground">
        Select a conversation to start messaging
      </div>
    );
  }

  return (
    <div className="hidden lg:flex flex-col flex-1">
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="https://ui-avatars.com/api/?name=User"
            alt="User"
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h3 className="font-semibold">Chat User</h3>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <i className="fas fa-circle text-[6px]"></i>
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <i className="fas fa-phone"></i>
          </Button>
          <Button variant="ghost" size="icon">
            <i className="fas fa-video"></i>
          </Button>
          <Button variant="ghost" size="icon">
            <i className="fas fa-ellipsis-v"></i>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
        {messages?.map((item: any) => {
          const isOwn = item.message.senderId === user?.id;
          return (
            <div key={item.message.id} className={`flex items-start gap-3 ${isOwn ? "justify-end" : ""}`} data-testid={`message-${item.message.id}`}>
              {!isOwn && (
                <img
                  src={item.sender.avatarUrl || `https://ui-avatars.com/api/?name=${item.sender.username}`}
                  alt={item.sender.username}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
              )}
              <div className={`flex-1 max-w-md ${isOwn ? "flex flex-col items-end" : ""}`}>
                <div className={`rounded-2xl p-3 ${isOwn ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border rounded-tl-none"}`}>
                  <p className="text-sm">{item.message.body}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 mx-3">
                  {new Date(item.message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-end gap-3">
          <Button variant="ghost" size="icon">
            <i className="fas fa-plus text-xl"></i>
          </Button>
          <Button variant="ghost" size="icon">
            <i className="fas fa-image text-xl"></i>
          </Button>
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessageMutation.mutate()}
              placeholder="Type a message..."
              className="bg-secondary border-border rounded-2xl pr-12"
              data-testid="input-message"
            />
            <Button variant="ghost" size="icon" className="absolute right-1 bottom-1">
              <i className="far fa-smile text-xl"></i>
            </Button>
          </div>
          <Button
            onClick={() => sendMessageMutation.mutate()}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="icon"
            data-testid="button-send-message"
          >
            <i className="fas fa-paper-plane"></i>
          </Button>
        </div>
      </div>
    </div>
  );
}
