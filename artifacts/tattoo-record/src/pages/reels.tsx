import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { Heart, MessageCircle, Film, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import UserAvatar from "@/components/user-avatar";

export default function Reels() {
  const { token } = useAuth();

  const { data: reels = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ["/api/posts?type=REEL"],
    enabled: !!token,
  });

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />

      <main className="lg:ml-64 pb-20 lg:pb-8 pt-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6">
            <h1 className="press-nameplate text-2xl mb-1" data-testid="page-title">Reels</h1>
            <p className="text-sm text-muted-foreground">Short-form video content from artists</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-3 gap-px bg-foreground">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="aspect-square w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">Failed to load reels</p>
              <button onClick={() => refetch()} className="text-sm text-primary underline">Try again</button>
            </div>
          ) : reels.length === 0 ? (
            <EmptyState
              icon={Film}
              title="No reels yet"
              description="Short-form videos will appear here once artists start posting reels."
            />
          ) : (
            <div className="grid grid-cols-3 gap-px bg-foreground" data-testid="reels-grid">
              {reels.map((item: any, idx: number) => {
                const post = item.post || item;
                const author = item.author || {};

                return (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="relative aspect-square bg-secondary overflow-hidden group cursor-pointer"
                    data-testid={`reel-card-${post.id}`}
                    aria-label={`Open reel by ${author.username || "Tattoo Record member"}`}
                  >
                    {post.media && post.media.length > 0 ? (
                      <div className="w-full h-full">
                        {String(post.media[0].type).toLowerCase() === "video" ? (
                          <video
                            src={post.media[0].url}
                            className="w-full h-full object-cover"
                             autoPlay
                            muted
                            loop
                            playsInline
                             preload="metadata"
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
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <p className="text-muted-foreground text-center px-4 text-sm">
                          {post.caption || "No preview"}
                        </p>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white">
                      {author.username ? (
                        <div className="flex items-center gap-2 mb-2" data-testid={`reel-author-${post.id}`}>
                          <UserAvatar {...author} className="w-6 h-6 border-paper" />
                          <span className="text-xs font-medium truncate">
                            {author.username}
                          </span>
                        </div>
                      ) : null}

                      {post.caption && (
                        <p className="text-xs line-clamp-2 mb-2">{post.caption}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1" data-testid={`reel-likes-${post.id}`}>
                          <Heart className="w-3 h-3 fill-white" />
                          <span>{post.likeCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1" data-testid={`reel-comments-${post.id}`}>
                          <MessageCircle className="w-3 h-3" />
                          <span>{post.commentCount || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-2 right-2" data-testid={`reel-play-icon-${post.id}`}>
                      <div className="bg-black/50 p-1.5">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </Link>
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
