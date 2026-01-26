import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ConversationListProps {
  onSelectConversation: (id: string) => void;
  selectedConversation: string | null;
}

export default function ConversationList({ onSelectConversation, selectedConversation }: ConversationListProps) {
  const { token } = useAuth();

  const { data: conversations } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
    enabled: !!token,
  });

  return (
    <div className="w-full lg:w-96 h-full border-r border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-bold mb-3" data-testid="page-title">Messages</h2>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search conversations..."
            className="w-full bg-secondary border-border rounded-full pl-10 min-h-[44px]"
            data-testid="input-search-conversations"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {conversations?.map((conv: any) => {
          const otherParticipant = conv.participants?.[0];
          return (
            <button
              key={conv.conversation.id}
              onClick={() => onSelectConversation(conv.conversation.id)}
              className={`w-full p-4 border-b border-border hover:bg-secondary active:bg-secondary/80 cursor-pointer transition-colors text-left touch-manipulation min-h-[72px] ${
                selectedConversation === conv.conversation.id ? "bg-secondary/50" : ""
              }`}
              data-testid={`conversation-${conv.conversation.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <img
                    src={otherParticipant?.avatarUrl || `https://ui-avatars.com/api/?name=${otherParticipant?.username}`}
                    alt={otherParticipant?.username}
                    className="w-12 h-12 rounded-full"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm truncate">{conv.conversation.title || otherParticipant?.username}</h3>
                    <span className="text-xs text-muted-foreground flex-shrink-0">2h</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">Last message preview...</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
