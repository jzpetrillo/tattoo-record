import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Marquee from "@/components/layout/marquee";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

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
      <Header />
      <div className="pt-16">
        <Marquee text="EXPLORE THE LATEST WORK FROM TATTOO ARTISTS WORLDWIDE" />
        
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
          <section>
            <h2 className="text-3xl uppercase font-bold mb-8 tracking-tight">
              Trending Work
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-border">
              {trendingPosts?.map((item: any) => (
                <div
                  key={item.post.id}
                  className="border-r border-b border-border group cursor-pointer"
                  data-testid={`trending-post-${item.post.id}`}
                >
                  {item.post.media?.[0]?.url && (
                    <div className="relative aspect-square bg-secondary overflow-hidden">
                      <img
                        src={item.post.media[0].url}
                        alt="Trending Post"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <p className="text-xs uppercase tracking-wider opacity-60">
                      {item.author?.username}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
