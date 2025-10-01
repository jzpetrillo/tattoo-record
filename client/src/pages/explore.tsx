import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";

export default function Explore() {
  const { token } = useAuth();

  const { data: trendingHashtags } = useQuery({
    queryKey: ["/api/hashtags/trending?limit=8"],
    enabled: !!token,
  });

  const { data: trendingPosts } = useQuery({
    queryKey: ["/api/discovery/trending?limit=20"],
    enabled: !!token,
  });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-64 xl:ml-72 pb-20 lg:pb-0">
        <div className="sticky top-0 z-30 bg-card border-b border-border backdrop-blur-md bg-opacity-95 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search artists, studios, hashtags, styles..."
                className="w-full bg-secondary border-border rounded-full pl-12 pr-4 py-3"
                data-testid="input-search"
              />
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"></i>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <i className="fas fa-fire text-destructive"></i>
                Trending Hashtags
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {trendingHashtags?.map((tag: any) => (
                <Card key={tag.id} className="p-4 hover:bg-secondary transition-colors cursor-pointer" data-testid={`hashtag-${tag.tag}`}>
                  <p className="font-bold text-sm">#{tag.tag}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tag.uses.toLocaleString()} posts</p>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Trending Posts</h2>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {trendingPosts?.map((item: any) => (
                <div
                  key={item.post.id}
                  className="relative aspect-square bg-secondary overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  data-testid={`trending-post-${item.post.id}`}
                >
                  {item.post.media?.[0]?.url && (
                    <img
                      src={item.post.media[0].url}
                      alt="Trending Post"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-3">
                    <div className="flex items-center gap-3 text-white text-sm">
                      <span>
                        <i className="fas fa-heart"></i> {item.post.likeCount}
                      </span>
                      <span>
                        <i className="fas fa-comment"></i> {item.post.commentCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
