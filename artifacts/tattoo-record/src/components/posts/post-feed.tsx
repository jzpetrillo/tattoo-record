import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import PostCard from "./post-card";
import { FeedSkeleton } from "@/components/ui/skeletons";
import { AlertCircle, Compass, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/user-avatar";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface SuggestedUser {
  id: string;
  username?: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  role?: string;
}

export default function PostFeed() {
  const { token, user } = useAuth();
  const { toast } = useToast();

  const { data: posts, isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ["/api/posts"],
    enabled: !!token,
  });
  const { data: forYou } = useQuery<{ suggestedUsers?: SuggestedUser[] }>({
    queryKey: ["/api/for-you"],
    enabled: !!token && posts?.length === 0,
  });
  const [followedIds, setFollowedIds] = useState<Set<string>>(() => new Set());
  const [isFollowingAll, setIsFollowingAll] = useState(false);
  const followMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("POST", `/api/users/${userId}/follow`, {}, token!),
    onSuccess: (_response, userId) => {
      setFollowedIds((current) => new Set(current).add(userId));
      queryClient.invalidateQueries({ queryKey: ["/api/for-you"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error: Error) => {
      toast({ title: "Unable to follow artist", description: error.message, variant: "destructive" });
    },
  });
  const suggestedUsers = forYou?.suggestedUsers?.slice(0, 6) ?? [];
  const followAllPending = isFollowingAll || followMutation.isPending;
  const handleFollowAll = async () => {
    if (followAllPending || suggestedUsers.length === 0) return;

    setIsFollowingAll(true);
    try {
      await Promise.all(suggestedUsers.map((suggested) => followMutation.mutateAsync(suggested.id)));
    } catch {
      toast({
        title: "Some suggestions could not be followed",
        description: "You can try the remaining artists individually.",
        variant: "destructive",
      });
    } finally {
      queryClient.invalidateQueries({ queryKey: ["/api/for-you"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setIsFollowingAll(false);
    }
  };
  const firstPostLabel = user?.role === "STUDIO"
    ? "Share your studio's first post"
    : user?.role === "ARTIST"
      ? "Share your first piece"
      : "Share your first post";

  return (
    <div className="w-full">
      {isLoading ? (
        <FeedSkeleton count={3} />
      ) : isError ? (
        <div className="text-center py-12">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">Failed to load posts</p>
          <button onClick={() => refetch()} className="text-sm text-primary underline">Try again</button>
        </div>
      ) : posts?.length === 0 ? (
        <div className="border border-ink bg-paper px-4 py-10 sm:p-12 text-center">
          <p className="press-nameplate text-2xl sm:text-3xl text-ink">
            Welcome, {user?.firstName?.trim() || (user?.username ? `@${user.username}` : "there")}
          </p>
          <p className="mt-3 text-sm text-ink/70 max-w-md mx-auto">
            Follow artists and studios to make this a personal stream of new
            work. Explore the community or publish something of your own to
            get the conversation started.
          </p>
          {suggestedUsers.length > 0 && (
            <div className="mt-7 text-left max-w-lg mx-auto">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="meta text-xs uppercase tracking-widest text-ink/60">Suggested for you</p>
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  className="h-auto px-0 text-xs font-mono uppercase tracking-wider"
                  onClick={handleFollowAll}
                  disabled={followAllPending}
                  data-testid="button-empty-feed-follow-all"
                >
                  {isFollowingAll ? "Following…" : "Follow all"}
                </Button>
              </div>
              <div className="space-y-3">
                {suggestedUsers.map((suggested) => (
                  <div key={suggested.id} className="flex items-center gap-3 border-t border-ink/15 pt-3">
                    <UserAvatar {...suggested} className="w-10 h-10" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{suggested.displayName || suggested.username || "User"}</p>
                      <p className="text-xs text-ink/60 truncate">@{suggested.username || "user"}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => followMutation.mutate(suggested.id)} disabled={followAllPending || followedIds.has(suggested.id)} data-testid={`button-empty-feed-follow-${suggested.id}`}>
                      {followedIds.has(suggested.id) ? "Following" : <><UserPlus className="w-3.5 h-3.5 mr-1" /> Follow</>}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/explore">
              <Button variant="outline" data-testid="link-empty-feed-explore"><Compass className="w-4 h-4 mr-2" />Explore artists</Button>
            </Link>
            <Link href="/create">
              <Button data-testid="link-empty-feed-create">{firstPostLabel}</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {posts?.map((item: any) => (
            <PostCard 
              key={item.post.id} 
              post={item.post} 
              author={item.author} 
              isLiked={item.isLiked}
            />
          ))}
        </div>
      )}
    </div>
  );
}
