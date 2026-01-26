import { Link, useLocation } from "wouter";
import { Home, Search, PlusSquare, MessageCircle, User, Menu, X, Compass, Heart, Briefcase, Calendar, Bookmark, Sparkles, LogOut, Radio, Video, Zap, Shield } from "lucide-react";
import { useState } from "react";
import CreatePostModal from "@/components/posts/create-post-modal";
import { useAuth } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function MobileNav() {
  const [location, setLocation] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, clearAuth } = useAuth();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/search", icon: Search, label: "Search" },
    { icon: PlusSquare, label: "Create", action: () => setShowCreateModal(true) },
    { path: "/messages", icon: MessageCircle, label: "Messages" },
    { icon: Menu, label: "Menu", action: () => setMenuOpen(true) },
  ];

  const menuItems = [
    { path: "/profile", icon: User, label: "Profile" },
    { path: "/explore", icon: Compass, label: "Explore" },
    { path: "/notifications", icon: Heart, label: "Notifications" },
    { path: "/reels", icon: Video, label: "Reels" },
    { path: "/live", icon: Radio, label: "Live" },
    { path: "/jobs", icon: Briefcase, label: "Jobs" },
    { path: "/bookings", icon: Calendar, label: "Bookings" },
    { path: "/flash-sales", icon: Zap, label: "Flash Sales" },
    { path: "/saved", icon: Bookmark, label: "Saved" },
    { path: "/ai-recommendations", icon: Sparkles, label: "AI Recommendations" },
    ...(user?.role === "ADMIN" ? [{ path: "/admin", icon: Shield, label: "Admin" }] : []),
  ];

  const handleMenuNavigation = (path: string) => {
    setMenuOpen(false);
    setLocation(path);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuth();
      setLocation("/auth");
    }
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.path && location === item.path;
            
            if (item.action) {
              return (
                <button
                  key={index}
                  onClick={item.action}
                  className="flex flex-col items-center gap-0.5 p-2 min-w-[48px] min-h-[48px] justify-center transition-colors touch-manipulation"
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-6 h-6" strokeWidth={1.5} />
                </button>
              );
            }
            
            return (
              <Link key={item.path} href={item.path!}>
                <button
                  className="flex flex-col items-center gap-0.5 p-2 min-w-[48px] min-h-[48px] justify-center transition-colors touch-manipulation"
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                >
                  <Icon
                    className={`w-6 h-6 ${isActive ? "fill-current" : ""}`}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                </button>
              </Link>
            );
          })}
        </div>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-left">Menu</SheetTitle>
          </SheetHeader>
          
          {user && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold">{user.username?.[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{user.username}</p>
                  <p className="text-xs text-muted-foreground truncate capitalize">{user.role?.toLowerCase()}</p>
                </div>
              </div>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto py-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => handleMenuNavigation(item.path)}
                  className={`flex items-center gap-3 w-full px-4 py-3 min-h-[48px] text-left transition-colors touch-manipulation ${
                    isActive ? "bg-secondary font-semibold" : "hover:bg-secondary/50 active:bg-secondary"
                  }`}
                  data-testid={`mobile-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "fill-current" : ""}`} strokeWidth={isActive ? 2 : 1.5} />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-border p-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 min-h-[48px] text-left text-destructive hover:bg-destructive/10 active:bg-destructive/20 transition-colors touch-manipulation"
              data-testid="mobile-menu-logout"
            >
              <LogOut className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-sm">Log Out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <CreatePostModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </>
  );
}
