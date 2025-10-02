import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function Header() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: "/", label: "Home", icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { path: "/explore", label: "Explore", icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )},
    { path: "/jobs", label: "Jobs", icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )},
    { path: user ? "/profile" : "/auth", label: "Profile", icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )},
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/">
          <h1 className="text-xl font-bold cursor-pointer">Inktagram</h1>
        </Link>
        
        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <button
                className={`p-2 rounded-full transition-colors ${
                  location === item.path ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                title={item.label}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                {item.icon}
              </button>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
