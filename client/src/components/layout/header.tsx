import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function Header() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: "/", label: "MAGAZINE" },
    { path: "/explore", label: "WORK" },
    { path: "/jobs", label: "SUBMIT" },
    { path: user ? "/profile" : "/auth", label: user ? "PROFILE" : "LOGIN" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/">
          <div className="text-lg font-bold tracking-tight cursor-pointer uppercase">
            INKTAG
          </div>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div
                className={`text-sm uppercase tracking-wide cursor-pointer transition-opacity ${
                  location === item.path ? "opacity-100" : "opacity-60 hover:opacity-100"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        <button className="md:hidden" data-testid="button-menu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}
