import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createWebSocket, sendWebSocketMessage } from "@/lib/websocket";
import { ArrowLeft, Send, Image, Plus, Smile, Phone, Video, MoreVertical } from "lucide-react";

interface ChatWindowProps {
  conversationId: string | null;
  onBack?: () => void;
}

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const { data: messages } = useQuery<any[]>({
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
      console.log("[ChatWindow] Sending message:", {
        conversationId,
        message,
        messageLength: message.length,
        messageTrimmed: message.trim(),
      });
      
      await apiRequest(
        "POST",
        `/api/conversations/${conversationId}/messages`,
        { body: message },
        token!
      );
    },
    onSuccess: () => {
      console.log("[ChatWindow] Message sent successfully");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
    },
    onError: (error) => {
      console.error("[ChatWindow] Failed to send message:", error);
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
    <div className="flex flex-col flex-1">
      <div className="p-3 sm:p-4 border-b border-border bg-card flex items-center justify-between">
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
          <img
            src="https://ui-avatars.com/api/?name=User"
            alt="User"
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h3 className="font-semibold text-sm sm:text-base">Chat User</h3>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="hidden sm:flex min-h-[44px] min-w-[44px]">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex min-h-[44px] min-w-[44px]">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
            <MoreVertical className="w-5 h-5" />
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

      <div className="p-3 sm:p-4 border-t border-border bg-card safe-area-bottom">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden sm:flex min-h-[44px] min-w-[44px]">
            <Plus className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
            <Image className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessageMutation.mutate()}
              placeholder="Type a message..."
              className="bg-secondary border-border rounded-2xl pr-12 min-h-[44px]"
              data-testid="input-message"
            />
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
              <Smile className="w-5 h-5" />
            </Button>
          </div>
          <Button
            onClick={() => sendMessageMutation.mutate()}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            data-testid="button-send-message"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
