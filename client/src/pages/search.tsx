import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { Search as SearchIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

      <main className="lg:ml-64 pb-20 lg:pb-8 pt-4">
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1" data-testid="page-title">Search</h1>
            <p className="text-sm text-muted-foreground">Find artists, studios, and enthusiasts</p>
          </div>

          <div className="relative mb-6">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users by name or username…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          {searchQuery.length > 0 && (
            <div className="space-y-2">
              {isLoading && (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-border">
                      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {!isLoading && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center border border-border">No users found for &ldquo;{searchQuery}&rdquo;</p>
              )}

              {!isLoading && searchResults.length > 0 && (
                <div className="space-y-1">
                  {searchResults.map((user: any) => (
                    <Link key={user.id} href={`/profile/${user.username}`}>
                      <div
                        className="flex items-center gap-3 p-3 border border-border hover:bg-secondary transition-colors cursor-pointer"
                        data-testid={`user-result-${user.username}`}
                      >
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
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
