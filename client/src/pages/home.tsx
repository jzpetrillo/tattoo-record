import { useState } from "react";
import Header from "@/components/layout/header";
import Marquee from "@/components/layout/marquee";
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
      <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-background flex flex-col px-3 py-8 hidden lg:flex">
        <div className="mb-10 px-3">
          <h1 className="text-2xl font-bold">Inktagram</h1>
        </div>

        <nav className="flex-1 space-y-1">
          <Link href="/">
            <div className="flex items-center gap-4 px-3 py-3 rounded-lg cursor-pointer font-bold" data-testid="nav-home">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M9.005 16.545a2.997 2.997 0 012.997-2.997h0A2.997 2.997 0 0115 16.545V22h7V11.543L12 2 2 11.543V22h7.005z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></path></svg>
              <span className="text-base">Home</span>
            </div>
          </Link>
          <Link href="/search">
            <div className="flex items-center gap-4 px-3 py-3 rounded-lg cursor-pointer hover:bg-secondary" data-testid="nav-search">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
              <span className="text-base">Search</span>
            </div>
          </Link>
          <Link href="/explore">
            <div className="flex items-center gap-4 px-3 py-3 rounded-lg cursor-pointer hover:bg-secondary" data-testid="nav-explore">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <span className="text-base">Explore</span>
            </div>
          </Link>
          <Link href="/messages">
            <div className="flex items-center gap-4 px-3 py-3 rounded-lg cursor-pointer hover:bg-secondary" data-testid="nav-messages">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span className="text-base">Messages</span>
            </div>
          </Link>
          <Link href="/profile">
            <div className="flex items-center gap-4 px-3 py-3 rounded-lg cursor-pointer hover:bg-secondary" data-testid="nav-profile">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span className="text-base">Profile</span>
            </div>
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64">
        <div className="max-w-[630px] mx-auto pt-8 pb-20">
          {/* Stories Bar */}
          <div className="border border-border rounded-lg mb-6 bg-background">
            <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 py-4">
              <div className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0" data-testid="button-create-story">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border border-border">
                    <span className="text-lg font-semibold">{user?.username?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </div>
                </div>
                <span className="text-xs">Your story</span>
              </div>
            </div>
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

        <div className="py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Suggested for you</h3>
            <button className="text-xs font-semibold hover:text-muted-foreground">See All</button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold">A</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">demo_artist</p>
                  <p className="text-xs text-muted-foreground truncate">ARTIST</p>
                </div>
              </div>
              <button className="text-xs font-semibold text-primary hover:text-primary/80">Follow</button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
