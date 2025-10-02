import { useState } from "react";
import SidebarNav from "@/components/layout/sidebar-nav";
import StoriesBar from "@/components/stories/stories-bar";
import SuggestedUsers from "@/components/layout/suggested-users";
import PostFeed from "@/components/posts/post-feed";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

/**
 * Demo accounts for quick login feature.
 * These accounts are pre-created in the database for demonstration purposes.
 * In production, these should be managed through environment variables or removed entirely.
 * 
 * To create demo accounts, run:
 * - Artist: POST /api/auth/register with {username: "demo_artist", email: "demoartist@inktag.com", password: "Demo1234!", role: "ARTIST"}
 * - Studio: POST /api/auth/register with {username: "demo_studio", email: "demostudio@inktag.com", password: "Demo1234!", role: "STUDIO"}
 * - Enthusiast: POST /api/auth/register with {username: "demo_enthusiast", email: "demoenthusiast@inktag.com", password: "Demo1234!", role: "ENTHUSIAST"}
 */
const DEMO_ACCOUNTS = {
  ARTIST: { email: "demoartist@inktag.com", password: "Demo1234!" },
  STUDIO: { email: "demostudio@inktag.com", password: "Demo1234!" },
  ENTHUSIAST: { email: "demoenthusiast@inktag.com", password: "Demo1234!" },
} as const;

export default function Home() {
  const { user, setAuth } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
            <p className="text-xs uppercase tracking-wider opacity-40 mb-4">Quick Login</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={() => handleQuickLogin("ARTIST", artistMutation)}
                disabled={artistMutation.isPending}
                className="px-6 py-2 border border-foreground/40 hover:border-foreground hover:bg-foreground hover:text-background transition-all uppercase text-xs tracking-wider disabled:opacity-50"
                data-testid="quick-login-artist"
              >
                {artistMutation.isPending ? "..." : "Artist"}
              </button>
              <button
                onClick={() => handleQuickLogin("STUDIO", studioMutation)}
                disabled={studioMutation.isPending}
                className="px-6 py-2 border border-foreground/40 hover:border-foreground hover:bg-foreground hover:text-background transition-all uppercase text-xs tracking-wider disabled:opacity-50"
                data-testid="quick-login-studio"
              >
                {studioMutation.isPending ? "..." : "Studio"}
              </button>
              <button
                onClick={() => handleQuickLogin("ENTHUSIAST", enthusiastMutation)}
                disabled={enthusiastMutation.isPending}
                className="px-6 py-2 border border-foreground/40 hover:border-foreground hover:bg-foreground hover:text-background transition-all uppercase text-xs tracking-wider disabled:opacity-50"
                data-testid="quick-login-enthusiast"
              >
                {enthusiastMutation.isPending ? "..." : "Enthusiast"}
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
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar Navigation */}
      <SidebarNav />

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64">
        <div className="max-w-[630px] mx-auto pt-8 pb-20">
          {/* Stories Bar */}
          <div className="border border-border rounded-lg mb-6 bg-background">
            <StoriesBar />
          </div>

          {/* Feed */}
          <PostFeed />
        </div>
      </main>

      {/* Right Sidebar - Suggestions */}
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
    </div>
  );
}
