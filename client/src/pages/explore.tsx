import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Heart, MessageCircle, X } from "lucide-react";

export default function Explore() {
  const { token } = useAuth();
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const { data: trendingPosts = [] } = useQuery<any[]>({
    queryKey: ["/api/discovery/trending?limit=20"],
    enabled: !!token,
  });

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />

      <main className="lg:ml-64 pb-20 lg:pb-8">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 bg-background border-b border-border px-4 py-3">
          <h1 className="text-xl font-bold">Explore</h1>
        </div>

        <div className="max-w-6xl mx-auto lg:pt-8 px-1 lg:px-4">
          <h1 className="hidden lg:block text-2xl font-bold mb-6 px-3">Explore</h1>

          <div className="grid grid-cols-3 gap-1">
            {trendingPosts.map((item: any) => (
              <div
                key={item.post.id}
                className="relative aspect-square bg-secondary overflow-hidden group cursor-pointer"
                onClick={() => setSelectedPost(item)}
                data-testid={`post-${item.post.id}`}
              >
                {item.post.media?.[0]?.url && (
                  <img
                    src={item.post.media[0].url}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex items-center gap-6 text-white">
                    <div className="flex items-center gap-2">
                      <Heart className="w-6 h-6 fill-white" />
                      <span className="font-semibold">{item.post.likesCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-6 h-6 fill-white" />
                      <span className="font-semibold">{item.post.commentsCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <MobileNav />

      {/* Post Detail Modal */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-5xl p-0 gap-0">
          {selectedPost && (
            <div className="flex flex-col md:flex-row h-[90vh]">
              {/* Image Section */}
              <div className="flex-1 bg-black flex items-center justify-center">
                {selectedPost.post.media?.[0]?.url && (
                  <img
                    src={selectedPost.post.media[0].url}
                    alt="Post"
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>

              {/* Details Section */}
              <div className="w-full md:w-96 flex flex-col bg-background">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <Link href={`/profile/${selectedPost.author?.username}`}>
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80" data-testid="link-post-author">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        {selectedPost.author?.profile?.avatar ? (
                          <img
                            src={selectedPost.author.profile.avatar}
                            alt={selectedPost.author.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold">
                            {selectedPost.author?.username?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold">{selectedPost.author?.username}</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="p-1 hover:bg-secondary rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Caption */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="flex gap-3">
                    <Link href={`/profile/${selectedPost.author?.username}`}>
                      <span className="font-semibold cursor-pointer hover:opacity-80">
                        {selectedPost.author?.username}
                      </span>
                    </Link>
                    <p className="flex-1">{selectedPost.post.caption}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-border p-4">
                  <div className="flex items-center gap-4 mb-2">
                    <Heart className="w-6 h-6 cursor-pointer hover:opacity-70" />
                    <MessageCircle className="w-6 h-6 cursor-pointer hover:opacity-70" />
                  </div>
                  <p className="text-sm font-semibold">{selectedPost.post.likesCount || 0} likes</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
