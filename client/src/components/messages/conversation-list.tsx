import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { MessageSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageCircle } from "lucide-react";

export interface OtherUser {
  username: string;
  avatarUrl?: string | null;
}

interface ConversationListProps {
  onSelectConversation: (id: string, otherUser: OtherUser) => void;
  selectedConversation: string | null;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ConversationList({ onSelectConversation, selectedConversation }: ConversationListProps) {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversations, isLoading } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
    enabled: !!token,
  });

  const filtered = (conversations ?? []).filter((conv: any) => {
    if (!searchQuery.trim()) return true;
    const other = conv.participants?.[0];
    const name = (other?.username || conv.conversation?.title || "").toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-full lg:w-80 h-full border-r border-border bg-card flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-bold mb-3" data-testid="page-title">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 min-h-[44px]"
            data-testid="input-search-conversations"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div>
            {[1, 2, 3, 4].map((i) => <MessageSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={searchQuery ? "No conversations match" : "No conversations yet"}
            description={searchQuery ? "Try a different search." : "Start a conversation from someone's profile."}
            className="border-0"
          />
        ) : (
          filtered.map((conv: any) => {
            const other = conv.participants?.[0];
            const title = conv.conversation?.title || other?.username || "Unknown";
            const updatedAt = conv.conversation?.updatedAt || conv.conversation?.createdAt;
            const unread = conv.unreadCount ?? 0;

            return (
              <button
                key={conv.conversation.id}
                onClick={() =>
                  onSelectConversation(conv.conversation.id, {
                    username: other?.username ?? title,
                    avatarUrl: other?.avatarUrl ?? null,
                  })
                }
                className={`w-full p-4 border-b border-border hover:bg-secondary transition-colors text-left touch-manipulation min-h-[72px] ${
                  selectedConversation === conv.conversation.id ? "bg-secondary/60" : ""
                }`}
                data-testid={`conversation-${conv.conversation.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    {other?.avatarUrl ? (
                      <img
                        src={other.avatarUrl}
                        alt={title}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-semibold">
                        {title[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-foreground border-2 border-card rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`text-sm truncate ${unread > 0 ? "font-bold" : "font-semibold"}`}>
                        {title}
                      </h3>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {formatTime(updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.lastMessage?.body ?? "Start the conversation"}
                      </p>
                      {unread > 0 && (
                        <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center font-semibold">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
