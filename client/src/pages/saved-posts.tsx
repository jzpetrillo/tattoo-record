import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import PostCard from "@/components/posts/post-card";
import { Bookmark } from "lucide-react";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { FeedSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface SavedPostItem {
  post: {
    id: string;
    caption?: string;
    media?: { url: string; type: string }[];
    createdAt: string;
    likeCount: number;
    commentCount: number;
  };
  author: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  savedPost?: {
    collectionName?: string;
  };
}

export default function SavedPostsPage() {
  const { token } = useAuth();
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  const { data: savedPosts = [], isLoading } = useQuery<SavedPostItem[]>({
    queryKey: ["/api/saved-posts"],
    enabled: !!token,
  });

  const { data: collections = [] } = useQuery<string[]>({
    queryKey: ["/api/saved-posts/collections"],
    enabled: !!token,
  });

  const filteredPosts = selectedCollection
    ? savedPosts.filter((item) => item.savedPost?.collectionName === selectedCollection)
    : savedPosts;

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <main className="lg:ml-64 pb-20 lg:pb-8 pt-4 max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="press-nameplate text-2xl mb-1" data-testid="page-title">
            Saved Posts
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${filteredPosts.length} saved ${filteredPosts.length === 1 ? "post" : "posts"}`}
          </p>
        </div>

        {collections.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
            <button
              onClick={() => setSelectedCollection(null)}
              className={cn(
                "px-4 py-2 text-sm border border-border hover:bg-secondary transition-colors whitespace-nowrap",
                selectedCollection === null && "bg-foreground text-background"
              )}
              data-testid="filter-all"
            >
              All Posts
            </button>
            {collections.map((collection) => (
              <button
                key={collection}
                onClick={() => setSelectedCollection(collection === selectedCollection ? null : collection)}
                className={cn(
                  "px-4 py-2 text-sm border border-border hover:bg-secondary transition-colors whitespace-nowrap",
                  selectedCollection === collection && "bg-foreground text-background"
                )}
                data-testid={`filter-${collection}`}
              >
                {collection}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <FeedSkeleton count={3} />
        ) : filteredPosts.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title={selectedCollection ? `No posts in "${selectedCollection}"` : "No saved posts yet"}
            description={selectedCollection ? "Save posts to this collection to see them here." : "Posts you save will appear here"}
            action={
              selectedCollection ? (
                <button
                  onClick={() => setSelectedCollection(null)}
                  className="text-sm underline text-muted-foreground"
                  data-testid="button-show-all"
                >
                  Show all saved posts
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            {filteredPosts.map((item) => (
              <PostCard
                key={item.post.id}
                post={item.post}
                author={item.author}
                isLiked={false}
                isSaved={true}
              />
            ))}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
