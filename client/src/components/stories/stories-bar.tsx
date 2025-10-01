import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import StoryViewer from "./story-viewer";

export default function StoriesBar() {
  const { token } = useAuth();
  const [viewingStory, setViewingStory] = useState<string | null>(null);

  const { data: stories } = useQuery({
    queryKey: ["/api/stories"],
    enabled: !!token,
  });

  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <button
                className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center hover:scale-105 transition-transform"
                data-testid="button-create-story"
              >
                <i className="fas fa-plus text-2xl text-white"></i>
              </button>
              <span className="text-xs text-muted-foreground font-medium">Your Story</span>
            </div>

            {stories?.slice(0, 10).map((item: any) => (
              <div
                key={item.story.id}
                className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
                onClick={() => setViewingStory(item.story.userId)}
                data-testid={`story-${item.user.username}`}
              >
                <div className="story-ring">
                  <div className="story-inner">
                    <img
                      src={item.user.avatarUrl || `https://ui-avatars.com/api/?name=${item.user.username}`}
                      alt={item.user.username}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  </div>
                </div>
                <span className="text-xs text-foreground font-medium max-w-[64px] truncate">
                  {item.user.username}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {viewingStory && (
        <StoryViewer userId={viewingStory} onClose={() => setViewingStory(null)} />
      )}
    </>
  );
}
