import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { Search as SearchIcon } from "lucide-react";

export default function Search() {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchData, isLoading } = useQuery<{ users: any[]; posts: any[]; hashtags: any[] }>({
    queryKey: [`/api/search?q=${searchQuery}`],
    enabled: !!token && searchQuery.length > 0,
  });

  const searchResults = searchData?.users || [];

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />

      <main className="lg:ml-64 pb-20 lg:pb-8">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 bg-background border-b border-border px-4 py-3">
          <h1 className="text-xl font-bold">Search</h1>
        </div>

        <div className="max-w-2xl mx-auto lg:pt-8 px-4">
          <div className="mb-6 mt-4 lg:mt-0">
            <h1 className="hidden lg:block text-2xl font-bold mb-4">Search</h1>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>

          {searchQuery.length > 0 && (
            <div className="space-y-2">
              {isLoading && (
                <p className="text-sm text-muted-foreground">Searching...</p>
              )}

              {!isLoading && searchResults && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground">No users found</p>
              )}

              {!isLoading && searchResults && searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((user: any) => (
                    <Link key={user.id} href={`/profile/${user.username}`}>
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                        data-testid={`user-result-${user.username}`}
                      >
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          {user.profile?.avatar ? (
                            <img
                              src={user.profile.avatar}
                              alt={user.username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-semibold">
                              {user.username?.[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{user.username}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.profile?.fullName || user.email}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.role}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
