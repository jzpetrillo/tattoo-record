import { Link, useLocation } from "wouter";
import { Home, Search, PlusSquare, MessageCircle, User } from "lucide-react";
import { useState } from "react";
import CreatePostModal from "@/components/posts/create-post-modal";

export default function MobileNav() {
  const [location] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/search", icon: Search, label: "Search" },
    { icon: PlusSquare, label: "Create", action: () => setShowCreateModal(true) },
    { path: "/messages", icon: MessageCircle, label: "Messages" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.path && location === item.path;
            
            if (item.action) {
              return (
                <button
                  key={index}
                  onClick={item.action}
                  className="flex flex-col items-center gap-1 p-2 transition-colors"
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-6 h-6" strokeWidth={2} />
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            }
            
            return (
              <Link key={item.path} href={item.path!}>
                <button
                  className="flex flex-col items-center gap-1 p-2 transition-colors"
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                >
                  <Icon
                    className={`w-6 h-6 ${isActive ? "fill-current" : ""}`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={`text-xs ${isActive ? "font-semibold" : ""}`}>
                    {item.label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>

      <CreatePostModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </>
  );
}
