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
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-background flex flex-col px-4 py-6 hidden lg:flex">
      {/* Logo */}
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold uppercase tracking-wide">Inktagram</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex items-center gap-3 px-2 py-2.5 cursor-pointer transition-all ${
                  isActive 
                    ? "font-semibold" 
                    : "hover:bg-secondary/50"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "fill-current stroke-current" : ""}`} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-sm">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* More button at bottom */}
      <button className="flex items-center gap-3 px-2 py-2.5 hover:bg-secondary/50 transition-all w-full text-sm" data-testid="nav-more">
        <Menu className="w-5 h-5" strokeWidth={1.5} />
        <span>More</span>
      </button>
    </aside>
  );
}
