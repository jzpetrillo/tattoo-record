import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { Search as SearchIcon, Hash, FileImage } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Search() {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchData, isLoading } = useQuery<{ users: any[]; posts: any[]; hashtags: any[] }>({
    queryKey: [`/api/search?q=${searchQuery}`],
    enabled: !!token && searchQuery.length > 0,
  });

  const users = searchData?.users || [];
  const posts = searchData?.posts || [];
  const hashtags = searchData?.hashtags || [];
  const hasResults = users.length > 0 || posts.length > 0 || hashtags.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />

      <main className="lg:ml-64 pb-20 lg:pb-8 pt-4">
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1" data-testid="page-title">Search</h1>
            <p className="text-sm text-muted-foreground">Find artists, studios, enthusiasts, and posts</p>
          </div>

          <div className="relative mb-6">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users, posts, or hashtags…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          {searchQuery.length > 0 && (
            <div className="space-y-6">
              {isLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-border">
                      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && !hasResults && (
                <p className="text-sm text-muted-foreground py-4 text-center border border-border">
                  No results for &ldquo;{searchQuery}&rdquo;
                </p>
              )}

              {/* Users */}
              {!isLoading && users.length > 0 && (
                <section data-testid="section-users">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    People
                  </h2>
                  <div className="space-y-1">
                    {users.map((user: any) => (
                      <Link key={user.id} href={`/profile/${user.username}`}>
                        <div
                          className="flex items-center gap-3 p-3 border border-border hover:bg-secondary transition-colors cursor-pointer"
                          data-testid={`user-result-${user.username}`}
                        >
                          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
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
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.email}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {user.role?.toLowerCase()}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Hashtags */}
              {!isLoading && hashtags.length > 0 && (
                <section data-testid="section-hashtags">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Hashtags
                  </h2>
                  <div className="space-y-1">
                    {hashtags.map((tag: any) => (
                      <Link key={tag.id ?? tag.tag} href={`/search?q=${encodeURIComponent('#' + tag.tag)}`}>
                        <div
                          className="flex items-center gap-3 p-3 border border-border hover:bg-secondary transition-colors cursor-pointer"
                          data-testid={`hashtag-result-${tag.tag}`}
                        >
                          <div className="w-12 h-12 bg-secondary flex items-center justify-center flex-shrink-0">
                            <Hash className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold">#{tag.tag}</p>
                            {tag.count != null && (
                              <p className="text-sm text-muted-foreground">
                                {tag.count.toLocaleString()} {tag.count === 1 ? "post" : "posts"}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Posts */}
              {!isLoading && posts.length > 0 && (
                <section data-testid="section-posts">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Posts
                  </h2>
                  <div className="space-y-1">
                    {posts.map((post: any) => (
                      <Link key={post.id} href={`/profile/${post.author?.username}`}>
                        <div
                          className="flex items-center gap-3 p-3 border border-border hover:bg-secondary transition-colors cursor-pointer"
                          data-testid={`post-result-${post.id}`}
                        >
                          <div className="w-12 h-12 bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {post.mediaUrls?.[0] ? (
                              <img
                                src={post.mediaUrls[0]}
                                alt="Post"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileImage className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-1">{post.content}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              by {post.author?.username}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
