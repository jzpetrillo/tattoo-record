import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import StoryViewer from "./story-viewer";
import { StorySkeleton } from "@/components/ui/skeletons";
import UserAvatar from "@/components/user-avatar";

export default function StoriesBar() {
  const { token } = useAuth();
  const [viewingStory, setViewingStory] = useState<string | null>(null);

  const { data: stories, isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ["/api/stories"],
    enabled: !!token,
  });

  const storyUsers = stories?.reduce((acc: any[], item: any) => {
    if (!acc.find((u: any) => u.id === item.user.id)) {
      acc.push(item.user);
    }
    return acc;
  }, []) || [];

  return (
    <>
      <div className="border-b border-border py-4 mb-4">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide px-1">
          {/* Loading skeletons */}
          {isLoading && (
            <>
              {[1, 2, 3, 4].map((i) => (
                <StorySkeleton key={i} />
              ))}
            </>
          )}

          {/* Error state */}
          {isError && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
              <AlertCircle className="w-4 h-4" />
              <span>Failed to load stories.</span>
              <button onClick={() => refetch()} className="text-primary underline text-xs">Retry</button>
            </div>
          )}

          {/* Other users' stories */}
          {!isLoading && !isError && storyUsers.slice(0, 10).map((author: any) => (
            <div 
              key={author.id} 
              className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0" 
              onClick={() => setViewingStory(author.id)}
              data-testid={`story-${author.username}`}
            >
              <div className="w-16 h-16 rounded-full bg-cobalt p-0.5">
                <div className="w-full h-full rounded-full bg-background p-0.5">
                  <UserAvatar {...author} className="w-full h-full" />
                </div>
              </div>
              <span className="text-xs max-w-[64px] truncate">{author.username}</span>
            </div>
          ))}
        </div>
      </div>

      {viewingStory && (
        <StoryViewer userId={viewingStory} onClose={() => setViewingStory(null)} />
      )}
    </>
  );
}
