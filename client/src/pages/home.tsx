import { useState } from "react";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import StoriesBar from "@/components/stories/stories-bar";
import SuggestedUsers from "@/components/layout/suggested-users";
import PostFeed from "@/components/posts/post-feed";
import ForYouRail from "@/components/for-you/for-you-rail";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Demo accounts for quick login feature.
 * These accounts are pre-created in the database from seed data.
 * Password for all test accounts: Test1234!
 */
const DEMO_ACCOUNTS = {
  ARTIST: { email: "artist1@inktagram.com", password: "Test1234!" },
  STUDIO: { email: "studio1@inktagram.com", password: "Test1234!" },
  ENTHUSIAST: { email: "enthusiast1@inktagram.com", password: "Test1234!" },
  ADMIN: { email: "admin@inktagram.com", password: "Test1234!" },
} as const;

export default function Home() {
  const { user, setAuth } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [featuredScrollPosition, setFeaturedScrollPosition] = useState(0);

  const { data: featuredPosts = [], isLoading: featuredLoading } = useQuery<any[]>({
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

  const createQuickLoginMutation = () => useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Login failed" }));
        throw new Error(error.message || "Login failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      setLocation("/");
      toast({ title: `Welcome, ${data.user.username}!`, description: `Logged in as ${data.user.role}` });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast({ 
        title: "Quick login failed", 
        description: message === "Login failed" 
          ? "Demo account not available. Please use the Enter button to create your own account."
          : message,
        variant: "destructive" 
      });
    },
  });

  const artistMutation = createQuickLoginMutation();
  const studioMutation = createQuickLoginMutation();
  const enthusiastMutation = createQuickLoginMutation();
  const adminMutation = createQuickLoginMutation();

  const handleQuickLogin = (role: keyof typeof DEMO_ACCOUNTS, mutation: ReturnType<typeof createQuickLoginMutation>) => {
    const credentials = DEMO_ACCOUNTS[role];
    mutation.mutate(credentials);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-4xl">
          <h1 className="editorial-title mb-8">
            INKTAG
          </h1>
          <p className="text-lg uppercase tracking-wide mb-8 opacity-60">
            A Platform for Tattoo Artists & Enthusiasts
          </p>
          
          <div className="mb-12">
            <p className="text-xs uppercase tracking-wider opacity-40 mb-4">Quick Demo Login</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={() => handleQuickLogin("ARTIST", artistMutation)}
                disabled={artistMutation.isPending}
                className="px-6 py-2 border border-foreground/40 hover:border-foreground hover:bg-foreground hover:text-background transition-all uppercase text-xs tracking-wider disabled:opacity-50"
                data-testid="quick-login-artist"
              >
                {artistMutation.isPending ? "..." : "Demo Artist"}
              </button>
              <button
                onClick={() => handleQuickLogin("STUDIO", studioMutation)}
                disabled={studioMutation.isPending}
                className="px-6 py-2 border border-foreground/40 hover:border-foreground hover:bg-foreground hover:text-background transition-all uppercase text-xs tracking-wider disabled:opacity-50"
                data-testid="quick-login-studio"
              >
                {studioMutation.isPending ? "..." : "Demo Studio"}
              </button>
              <button
                onClick={() => handleQuickLogin("ENTHUSIAST", enthusiastMutation)}
                disabled={enthusiastMutation.isPending}
                className="px-6 py-2 border border-foreground/40 hover:border-foreground hover:bg-foreground hover:text-background transition-all uppercase text-xs tracking-wider disabled:opacity-50"
                data-testid="quick-login-enthusiast"
              >
                {enthusiastMutation.isPending ? "..." : "Demo Enthusiast"}
              </button>
              <button
                onClick={() => handleQuickLogin("ADMIN", adminMutation)}
                disabled={adminMutation.isPending}
                className="px-6 py-2 border border-foreground/40 hover:border-foreground hover:bg-foreground hover:text-background transition-all uppercase text-xs tracking-wider disabled:opacity-50"
                data-testid="quick-login-admin"
              >
                {adminMutation.isPending ? "..." : "Demo Admin"}
              </button>
            </div>
          </div>

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
          <h1 className="text-xl font-bold">Inktagram</h1>
        </div>

        <div className="max-w-[630px] mx-auto lg:pt-8 px-4 lg:px-0">
          {/* Stories Bar */}
          <div className="border border-border rounded-lg mb-4 bg-background mt-4 lg:mt-0">
            <StoriesBar />
          </div>

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
