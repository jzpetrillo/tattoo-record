import { Link, useLocation } from "wouter";

export default function MobileNav() {
  const [location] = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-40">
      <div className="flex items-center justify-around px-2 py-3">
        <Link href="/">
          <a
            className={`flex flex-col items-center gap-1 ${
              location === "/" ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid="mobile-nav-home"
          >
            <i className="fas fa-home text-xl"></i>
            <span className="text-xs font-medium">Home</span>
          </a>
        </Link>

        <Link href="/explore">
          <a
            className={`flex flex-col items-center gap-1 ${
              location === "/explore" ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid="mobile-nav-explore"
          >
            <i className="fas fa-compass text-xl"></i>
            <span className="text-xs font-medium">Explore</span>
          </a>
        </Link>

        <button className="flex flex-col items-center gap-1 -mt-4" data-testid="mobile-nav-create">
          <div className="w-14 h-14 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center shadow-lg">
            <i className="fas fa-plus text-2xl text-primary-foreground"></i>
          </div>
        </button>

        <Link href="/messages">
          <a
            className={`flex flex-col items-center gap-1 relative ${
              location === "/messages" ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid="mobile-nav-messages"
          >
            <i className="fas fa-comment-dots text-xl"></i>
            <span className="text-xs font-medium">Messages</span>
            <span className="absolute -top-1 right-2 bg-destructive text-destructive-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              3
            </span>
          </a>
        </Link>

        <Link href="/profile">
          <a
            className={`flex flex-col items-center gap-1 ${
              location === "/profile" ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid="mobile-nav-profile"
          >
            <i className="fas fa-user text-xl"></i>
            <span className="text-xs font-medium">Profile</span>
          </a>
        </Link>
      </div>
    </nav>
  );
}
