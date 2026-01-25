import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import PostCard from "@/components/posts/post-card";
import { Bookmark } from "lucide-react";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";

interface SavedPostItem {
  post: {
    id: string;
    content: string;
    mediaUrls?: string[];
    createdAt: string;
    likesCount: number;
    commentsCount: number;
  };
  author: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export default function SavedPostsPage() {
  const { token } = useAuth();

  const { data: savedPosts = [], isLoading } = useQuery<SavedPostItem[]>({
    queryKey: ["/api/saved-posts"],
    enabled: !!token,
  });

  const { data: collections = [] } = useQuery<string[]>({
    queryKey: ["/api/saved-posts/collections"],
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SidebarNav />
        <main className="lg:ml-64 pb-20 lg:pb-8 pt-4 max-w-2xl mx-auto px-4">
          <div className="mb-6">
            <div className="h-8 bg-secondary rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-secondary rounded w-32 animate-pulse"></div>
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border p-4 animate-pulse">
                <div className="flex gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-secondary" />
                  <div className="flex-1">
                    <div className="h-4 bg-secondary rounded w-24 mb-2" />
                    <div className="h-3 bg-secondary rounded w-16" />
                  </div>
                </div>
                <div className="h-48 bg-secondary rounded" />
              </div>
            ))}
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <main className="lg:ml-64 pb-20 lg:pb-8 pt-4 max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" data-testid="page-title">
            Saved Posts
          </h1>
          <p className="text-sm text-muted-foreground">
            {savedPosts.length} saved {savedPosts.length === 1 ? 'post' : 'posts'}
          </p>
        </div>

        {collections.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
            <button 
              className="px-4 py-2 text-sm border border-border hover:bg-secondary transition-colors whitespace-nowrap"
              data-testid="filter-all"
            >
              All Posts
            </button>
            {collections.map((collection) => (
              <button
                key={collection}
                className="px-4 py-2 text-sm border border-border hover:bg-secondary transition-colors whitespace-nowrap"
                data-testid={`filter-${collection}`}
              >
                {collection}
              </button>
            ))}
          </div>
        )}

        {savedPosts.length === 0 ? (
          <div className="text-center py-12 border border-border" data-testid="empty-state">
            <Bookmark className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No saved posts yet</h2>
            <p className="text-muted-foreground">
              Posts you save will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {savedPosts.map((item) => (
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
