import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Heart, Bookmark, UserPlus, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface RecommendedPost {
  post: {
    id: string;
    caption: string | null;
    media: { url: string; type: string }[] | null;
    likeCount: number;
    commentCount: number;
  };
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
    isVerified: boolean;
  };
  isLiked: boolean;
  isSaved: boolean;
  engagementScore: number;
}

interface SuggestedUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  isVerified: boolean;
  followersCount: number;
  mutualFollows: number;
  reason: string;
}

interface ForYouData {
  suggestedUsers: SuggestedUser[];
  recommendedPosts: RecommendedPost[];
}

export default function ForYouRail() {
  const { user, token } = useAuth();

  const { data, isLoading } = useQuery<ForYouData>({
    queryKey: ["/api/for-you"],
    enabled: !!user,
  });

  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/users/${userId}/follow`, {}, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/for-you"] });
    },
  });

  if (isLoading) {
    return (
      <div className="mb-6 border border-border bg-background" data-testid="for-you-loading">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border">
          <Skeleton className="aspect-[4/5]" />
          <div className="grid grid-rows-2 gap-px bg-border">
            <Skeleton className="aspect-[4/3]" />
            <Skeleton className="aspect-[4/3]" />
          </div>
        </div>
      </div>
    );
  }

  const { suggestedUsers = [], recommendedPosts = [] } = data || {};

  if (recommendedPosts.length === 0 && suggestedUsers.length === 0) {
    return null;
  }

  const heroPosts = recommendedPosts.slice(0, 3);
  const heroPost = heroPosts[0];
  const sidePosts = heroPosts.slice(1, 3);
  const artistsToShow = suggestedUsers.slice(0, 3);

  return (
    <div className="mb-6 border border-border bg-background" data-testid="for-you-section">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em]">For You</h2>
          </div>
          <Link href="/explore">
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer" data-testid="link-explore-more">
              Explore more <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
      </div>

      {recommendedPosts.length > 0 && (
        <div className="grid grid-cols-2 gap-px bg-border">
          {heroPost && (
            <Link href={`/u/${heroPost.author.username}`}>
              <div className="relative aspect-[4/5] bg-muted group cursor-pointer overflow-hidden" data-testid={`for-you-hero-${heroPost.post.id}`}>
                {heroPost.post.media?.[0] ? (
                  <img
                    src={heroPost.post.media[0].url}
                    alt={heroPost.post.caption || "Recommended post"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Sparkles className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2 mb-2">
                    {heroPost.author.avatarUrl ? (
                      <img
                        src={heroPost.author.avatarUrl}
                        alt={heroPost.author.username}
                        className="w-8 h-8 rounded-full object-cover border border-white/30"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">
                        {heroPost.author.username[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-sm">{heroPost.author.displayName || heroPost.author.username}</p>
                      <p className="text-xs text-white/70">@{heroPost.author.username}</p>
                    </div>
                    {heroPost.author.isVerified && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-white/20">Verified</Badge>
                    )}
                  </div>
                  {heroPost.post.caption && (
                    <p className="text-xs line-clamp-2 text-white/80">{heroPost.post.caption}</p>
                  )}
                </div>
              </div>
            </Link>
          )}

          <div className="grid grid-rows-2 gap-px bg-border">
            {sidePosts.map((item) => (
              <Link key={item.post.id} href={`/u/${item.author.username}`}>
                <div className="relative aspect-[4/3] bg-muted group cursor-pointer overflow-hidden" data-testid={`for-you-post-${item.post.id}`}>
                  {item.post.media?.[0] ? (
                    <img
                      src={item.post.media[0].url}
                      alt={item.post.caption || "Recommended post"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Heart className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="font-medium text-xs truncate">@{item.author.username}</p>
                    <div className="flex items-center gap-2 text-[10px] text-white/70">
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-2.5 h-2.5" /> {item.post.likeCount}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {sidePosts.length === 1 && (
              <div className="aspect-[4/3] bg-muted flex items-center justify-center text-muted-foreground">
                <Sparkles className="w-8 h-8 opacity-20" />
              </div>
            )}
          </div>
        </div>
      )}

      {artistsToShow.length > 0 && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Artists you should know
            </p>
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {artistsToShow.map((artist) => (
              <div key={artist.id} className="flex-shrink-0 flex items-center gap-3" data-testid={`suggested-artist-${artist.id}`}>
                <Link href={`/u/${artist.username}`}>
                  <div className="cursor-pointer">
                    {artist.avatarUrl ? (
                      <img
                        src={artist.avatarUrl}
                        alt={artist.username}
                        className="w-10 h-10 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold border border-border">
                        {artist.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="min-w-0">
                  <Link href={`/u/${artist.username}`}>
                    <p className="font-medium text-sm truncate cursor-pointer hover:underline">
                      {artist.displayName || artist.username}
                    </p>
                  </Link>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {artist.followersCount} followers
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => followMutation.mutate(artist.id)}
                  disabled={followMutation.isPending}
                  className="flex-shrink-0 text-xs h-7 px-2"
                  data-testid={`button-follow-${artist.id}`}
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Follow
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
