import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { Heart, MessageCircle } from "lucide-react";

export default function Reels() {
  const { token } = useAuth();

  const { data: reels = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/posts?type=REEL"],
    enabled: !!token,
  });

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />

      <main className="lg:ml-64 pb-20 lg:pb-8">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 bg-background border-b border-border px-4 py-3">
          <h1 className="text-xl font-bold">Reels</h1>
        </div>

        <div className="max-w-7xl mx-auto lg:pt-8 px-4">
          <h1 className="hidden lg:block text-3xl font-bold mb-6">Reels</h1>

          {/* Reels Grid */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading reels...</div>
          ) : reels.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No reels yet</p>
              <p className="text-sm text-muted-foreground">
                Reels are short-form video content. Create your first reel to get started!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1" data-testid="reels-grid">
              {reels.map((item: any) => {
                const post = item.post || item;
                const author = item.author || {};

                return (
                  <div
                    key={post.id}
                    className="relative aspect-[9/16] bg-secondary rounded-sm overflow-hidden group cursor-pointer"
                    data-testid={`reel-card-${post.id}`}
                  >
                    {/* Reel Preview/Thumbnail */}
                    {post.media && post.media.length > 0 ? (
                      <div className="w-full h-full">
                        {post.media[0].type === "video" ? (
                          <video
                            src={post.media[0].url}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                          />
                        ) : (
                          <img
                            src={post.media[0].url}
                            alt="Reel"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                        <p className="text-white text-center px-4 font-medium">
                          {post.caption || "No preview"}
                        </p>
                      </div>
                    )}

                    {/* Hover Overlay with Stats */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white">
                      {/* Author Info */}
                      {author.username ? (
                        <Link href={`/u/${author.username}`}>
                          <div className="flex items-center gap-2 mb-2" data-testid={`reel-author-${post.id}`}>
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                              {author.avatarUrl ? (
                                <img
                                  src={author.avatarUrl}
                                  alt={author.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-bold">
                                  {author.username[0]?.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-medium truncate">
                              {author.username}
                            </span>
                          </div>
                        </Link>
                      ) : null}

                      {/* Caption */}
                      {post.caption && (
                        <p className="text-xs line-clamp-2 mb-2">{post.caption}</p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1" data-testid={`reel-likes-${post.id}`}>
                          <Heart className="w-3 h-3 fill-white" />
                          <span>{post.likesCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1" data-testid={`reel-comments-${post.id}`}>
                          <MessageCircle className="w-3 h-3" />
                          <span>{post.commentsCount || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Play Icon Indicator */}
                    <div className="absolute top-2 right-2" data-testid={`reel-play-icon-${post.id}`}>
                      <div className="bg-black/50 rounded-full p-1.5">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
