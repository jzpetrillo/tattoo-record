import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import StoriesBar from "@/components/stories/stories-bar";
import PostFeed from "@/components/posts/post-feed";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-64 xl:ml-72 pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 lg:hidden bg-card border-b border-border backdrop-blur-md bg-opacity-95">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-xl font-bold gradient-text">Inktagram</h1>
            <div className="flex items-center gap-4">
              <button className="text-foreground hover:text-primary transition-colors" data-testid="button-search">
                <i className="fas fa-search text-lg"></i>
              </button>
              <button className="text-foreground hover:text-primary transition-colors relative" data-testid="button-notifications">
                <i className="fas fa-bell text-lg"></i>
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  3
                </span>
              </button>
            </div>
          </div>
        </header>

        <StoriesBar />
        <PostFeed />
      </main>
      <MobileNav />
    </div>
  );
}
