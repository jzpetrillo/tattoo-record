import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, clearAuth } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuth();
      setLocation("/");
    }
  };

  const navItems = [
    { path: "/", icon: "fa-home", label: "Home" },
    { path: "/explore", icon: "fa-compass", label: "Explore" },
    { path: "/messages", icon: "fa-comment-dots", label: "Messages", badge: 3 },
    { path: "/notifications", icon: "fa-bell", label: "Notifications", badge: 12 },
    { path: "/live-events", icon: "fa-video", label: "Live Events" },
    { path: "/jobs", icon: "fa-briefcase", label: "Job Board" },
    { path: "/ai-recommendations", icon: "fa-magic", label: "AI Designer" },
  ];

  const secondaryItems = [
    { path: "/profile", icon: "fa-user", label: "Profile" },
    { path: "/studio-approvals", icon: "fa-user-check", label: "Studio Approvals" },
  ];

  return (
    <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 xl:w-72 flex-col border-r border-border bg-card z-40">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold gradient-text">Inktagram</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">Tattoo Community</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative cursor-pointer ${
                  location === item.path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              >
                <i className={`fas ${item.icon} text-lg w-5`}></i>
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          ))}

          <div className="pt-4 border-t border-border mt-4">
            {secondaryItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                    location === item.path
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <i className={`fas ${item.icon} text-lg w-5`}></i>
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-plus"></i>
            <span>Create Post</span>
          </button>
        </div>

        {user && (
          <div className="p-4 border-t border-border space-y-2">
            <div className="flex items-center gap-3">
              <img
                src={user.avatarUrl || "https://ui-avatars.com/api/?name=" + user.username}
                alt="User Avatar"
                className="w-10 h-10 rounded-full ring-2 ring-primary"
                data-testid="img-profile-avatar"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground truncate">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
              data-testid="button-logout"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
