import { useState } from "react";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import StoriesBar from "@/components/stories/stories-bar";
import SuggestedUsers from "@/components/layout/suggested-users";
import PostFeed from "@/components/posts/post-feed";
import ForYouRail from "@/components/for-you/for-you-rail";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dev-only quick-login: emails only — passwords are randomised at seed time and
 * printed to the console. Clicking a button redirects to /auth with the email
 * pre-filled; enter the seed-output password manually.
 */
const DEMO_ACCOUNT_EMAILS = {
  ARTIST:     "artist1@tattoorecord.com",
  STUDIO:     "studio1@tattoorecord.com",
  ENTHUSIAST: "enthusiast1@tattoorecord.com",
  ADMIN:      "admin@tattoorecord.com",
} as const;

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
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

  // Redirects to /auth with the email pre-filled via query param.
  // The developer must enter the password from `npm run seed` console output.
  const handleQuickLogin = (role: keyof typeof DEMO_ACCOUNT_EMAILS) => {
    const email = encodeURIComponent(DEMO_ACCOUNT_EMAILS[role]);
    setLocation(`/auth?email=${email}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-4xl">
          <h1 className="editorial-title mb-8">
            TATTOO RECORD
          </h1>
          <p className="text-lg uppercase tracking-wide mb-8 opacity-60">
            A Platform for Tattoo Artists & Enthusiasts
          </p>
          
          {import.meta.env.MODE !== 'production' && (
          <div className="mb-12">
            <p className="text-xs uppercase tracking-wider opacity-40 mb-4">Quick Demo Login</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={() => handleQuickLogin("ARTIST")}
                className="px-6 py-2 border border-foreground/40 hover:border-foreground hover:bg-foreground hover:text-background transition-all uppercase text-xs tracking-wider"
                data-testid="quick-login-artist"
              >
                Demo Artist
              </button>
              <button
                onClick={() => handleQuickLogin("STUDIO")}
                className="px-6 py-2 border border-foreground/40 hover:border-foreground hover:bg-foreground hover:text-background transition-all uppercase text-xs tracking-wider"
                data-testid="quick-login-studio"
              >
                Demo Studio
              </button>
              <button
                onClick={() => handleQuickLogin("ENTHUSIAST")}
                className="px-6 py-2 border border-foreground/40 hover:border-foreground hover:bg-foreground hover:text-background transition-all uppercase text-xs tracking-wider"
                data-testid="quick-login-enthusiast"
              >
                Demo Enthusiast
              </button>
              <button
                onClick={() => handleQuickLogin("ADMIN")}
                className="px-6 py-2 border border-foreground/40 hover:border-foreground hover:bg-foreground hover:text-background transition-all uppercase text-xs tracking-wider"
                data-testid="quick-login-admin"
              >
                Demo Admin
              </button>
            </div>
          </div>
          )}

          <Link href="/auth">
            <button className="px-8 py-3 border border-foreground hover:bg-foreground hover:text-background transition-all uppercase text-sm tracking-wider" data-testid="button-enter">
              Enter
            </button>
          </Link>
        </div>
      </div>
    );
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
          <div className="border border-border rounded-lg mb-4 bg-background mt-4 lg:mt-0">
            <StoriesBar />
          </div>

          {/* Featured Error */}
          {featuredError && (
            <div className="mb-4 text-center py-6 border border-border rounded-lg">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-1">Failed to load featured posts</p>
              <button onClick={() => refetchFeatured()} className="text-sm text-primary underline">Try again</button>
            </div>
          )}

          {/* Featured Content Loading */}
          {featuredLoading && (
            <Card className="mb-4 p-4 border-border">
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
            <Card className="mb-4 p-4 border-border" data-testid="featured-section">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-foreground fill-current" />
                  <h2 className="font-semibold uppercase text-sm tracking-wide">Featured</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => scrollFeatured('left')}
                    className="p-1 hover:bg-secondary rounded transition-colors"
                    data-testid="featured-scroll-left"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => scrollFeatured('right')}
                    className="p-1 hover:bg-secondary rounded transition-colors"
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
