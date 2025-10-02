import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Home, 
  Search, 
  Compass, 
  Video, 
  MessageCircle, 
  Heart, 
  PlusSquare, 
  User,
  Menu,
  Briefcase,
  Radio
} from "lucide-react";

export default function SidebarNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/search", label: "Search", icon: Search },
    { path: "/explore", label: "Explore", icon: Compass },
    { path: "/reels", label: "Reels", icon: Video },
    { path: "/messages", label: "Messages", icon: MessageCircle },
    { path: "/notifications", label: "Notifications", icon: Heart },
    { path: "/live", label: "Live", icon: Radio },
    { path: "/jobs", label: "Jobs", icon: Briefcase },
    { path: "/create", label: "Create", icon: PlusSquare },
    { path: "/profile", label: "Profile", icon: User },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-background flex flex-col px-3 py-8 hidden lg:flex">
      {/* Logo */}
      <div className="mb-10 px-3">
        <h1 className="text-2xl font-bold">Inktagram</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex items-center gap-4 px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                  isActive 
                    ? "font-bold" 
                    : "hover:bg-secondary"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className={`w-6 h-6 ${isActive ? "fill-current stroke-current" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-base">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* More button at bottom */}
      <button className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-secondary transition-colors w-full" data-testid="nav-more">
        <Menu className="w-6 h-6" />
        <span className="text-base">More</span>
      </button>
    </aside>
  );
}
