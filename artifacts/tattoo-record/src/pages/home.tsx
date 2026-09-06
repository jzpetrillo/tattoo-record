import { useState } from "react";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import StoriesBar from "@/components/stories/stories-bar";
import SuggestedUsers from "@/components/layout/suggested-users";
import PostFeed from "@/components/posts/post-feed";
import GettingStarted from "@/components/onboarding/getting-started";
import ForYouRail from "@/components/for-you/for-you-rail";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Landing from "@/pages/landing";

export default function Home() {
  const { user } = useAuth();
  const [featuredScrollPosition, setFeaturedScrollPosition] = useState(0);

  const { data: featuredPosts = [], isLoading: featuredLoading, isError: featuredError, refetch: refetchFeatured } = useQuery<any[]>({
    queryKey: ["/api/posts?featured=true"],
    enabled: !!user,
  });

  const scrollFeatured = (direction: 'left' | 'right') => {
    const container = document.getElementById('featured-container');
    if (container) {
      const scrollAmount = 400;
      const newPosition = direction === 'left' 
        ? Math.max(0, featuredScrollPosition - scrollAmount)
        : featuredScrollPosition + scrollAmount;
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setFeaturedScrollPosition(newPosition);
    }
  };

  if (!user) {
    return <Landing />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Left Sidebar Navigation - Desktop only */}
      <SidebarNav />

      {/* Main Content Area */}
      <main className="lg:ml-64 pb-20 lg:pb-8">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 bg-background border-b border-border px-4 py-3">
          <h1 className="press-nameplate text-lg">Tattoo Record</h1>
        </div>

        <div className="max-w-[630px] mx-auto lg:pt-8 px-4 lg:px-0">
          {/* Stories Bar */}
          <StoriesBar />

          {/* Featured Error */}
          {featuredError && (
            <div className="mb-4 text-center py-6 border border-border">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-1">Failed to load featured posts</p>
              <button onClick={() => refetchFeatured()} className="text-sm text-primary underline">Try again</button>
            </div>
          )}

          {/* Featured Content Loading */}
          {featuredLoading && (
            <Card className="mb-4 p-4 border-border rounded-none">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex gap-3 overflow-hidden">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-shrink-0 w-48">
                    <Skeleton className="aspect-square rounded mb-2" />
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Featured Content */}
          {!featuredLoading && featuredPosts.length > 0 && (
            <Card className="mb-4 p-4 border-border rounded-none" data-testid="featured-section">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-foreground fill-current" />
                  <h2 className="font-semibold uppercase text-sm tracking-wide">Featured</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => scrollFeatured('left')}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center hover:bg-secondary transition-colors touch-manipulation"
                    data-testid="featured-scroll-left"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => scrollFeatured('right')}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center hover:bg-secondary transition-colors touch-manipulation"
                    data-testid="featured-scroll-right"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div
                id="featured-container"
                className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth"
                style={{ scrollbarWidth: 'none' }}
              >
                {featuredPosts.map((item: any) => (
                  <Link
                    key={item.post.id}
                    href={`/u/${item.author.username}`}
                    data-testid={`featured-post-${item.post.id}`}
                  >
                    <div className="flex-shrink-0 w-48 cursor-pointer group">
                      <div className="aspect-square bg-secondary rounded overflow-hidden mb-2 relative">
                        {item.post.media?.[0] ? (
                          <>
                            <img
                              src={item.post.media[0].url}
                              alt="Featured post"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute top-2 right-2 bg-black p-1">
                              <Star className="w-3 h-3 text-white fill-current" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Star className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{item.author.username}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.post.caption}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* For You Recommendations */}
          <ForYouRail />

          {/* Feed */}
          <GettingStarted />
          <PostFeed />
        </div>
      </main>

      {/* Right Sidebar - Suggestions (Desktop only) */}
      <aside className="hidden xl:block w-80 fixed right-0 top-0 h-screen px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-lg font-semibold">{user?.username?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{user?.username}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
          </div>
        </div>

        <SuggestedUsers />
      </aside>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
