import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import PostCard from "@/components/posts/post-card";
import { Bookmark } from "lucide-react";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";

export default function SavedPostsPage() {
  const { user, token } = useAuth();

  const { data: savedPosts, isLoading } = useQuery({
    queryKey: ["/api/saved-posts"],
    enabled: !!token,
  });

  const { data: collections } = useQuery({
    queryKey: ["/api/saved-posts/collections"],
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <SidebarNav />
        <main className="flex-1 md:ml-64 mb-16 md:mb-0">
          <div className="max-w-2xl mx-auto p-4">
            <div className="text-center py-8">
              <div className="animate-pulse">
                <div className="h-8 bg-secondary rounded w-48 mx-auto mb-4"></div>
                <div className="h-4 bg-secondary rounded w-32 mx-auto"></div>
              </div>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <SidebarNav />
      <main className="flex-1 md:ml-64 mb-16 md:mb-0">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          {/* Header */}
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <Bookmark className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-tight" data-testid="text-page-title">
                  Saved Posts
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {savedPosts?.length || 0} saved {savedPosts?.length === 1 ? 'post' : 'posts'}
                </p>
              </div>
            </div>
          </div>

          {/* Collections filter (if any exist) */}
          {collections && collections.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button 
                className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors whitespace-nowrap"
                data-testid="filter-all"
              >
                All Posts
              </button>
              {collections.map((collection: string) => (
                <button
                  key={collection}
                  className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors whitespace-nowrap"
                  data-testid={`filter-${collection}`}
                >
                  {collection}
                </button>
              ))}
            </div>
          )}

          {/* Saved posts grid */}
          {savedPosts?.length === 0 ? (
            <div className="text-center py-12 border border-border rounded-lg" data-testid="empty-state">
              <Bookmark className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No saved posts yet</h2>
              <p className="text-muted-foreground">
                Posts you save will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {savedPosts?.map((item: any) => (
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
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
