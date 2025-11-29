import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Plus } from "lucide-react";
import StoryViewer from "./story-viewer";
import { StorySkeleton } from "@/components/ui/skeletons";

export default function StoriesBar() {
  const { token, user } = useAuth();
  const [viewingStory, setViewingStory] = useState<string | null>(null);

  const { data: stories, isLoading } = useQuery<any[]>({
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
          {/* Add your story */}
          <div className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0" data-testid="button-create-story">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border-2 border-border">
                <span className="text-lg font-semibold">{user?.username?.[0]?.toUpperCase()}</span>
              </div>
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                <Plus className="w-3 h-3 text-white" />
              </div>
            </div>
            <span className="text-xs">Your story</span>
          </div>

          {/* Loading skeletons */}
          {isLoading && (
            <>
              {[1, 2, 3, 4].map((i) => (
                <StorySkeleton key={i} />
              ))}
            </>
          )}

          {/* Other users' stories */}
          {!isLoading && storyUsers.slice(0, 10).map((author: any) => (
            <div 
              key={author.id} 
              className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0" 
              onClick={() => setViewingStory(author.id)}
              data-testid={`story-${author.username}`}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-0.5">
                <div className="w-full h-full rounded-full bg-background p-0.5">
                  <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                    {author.avatarUrl ? (
                      <img src={author.avatarUrl} alt={author.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold">{author.username[0].toUpperCase()}</span>
                    )}
                  </div>
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
