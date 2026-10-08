import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Tag, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import PostCard from "@/components/posts/post-card";

const LIMIT = 20;

export default function TaggedPostsPanel({
  accountId,
  role,
  isOwnProfile,
}: {
  accountId: string;
  role: "ARTIST" | "STUDIO";
  isOwnProfile: boolean;
}) {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = [`/api/users/${accountId}/tagged-posts`, user?.id ?? null];

  const q = useInfiniteQuery<any[]>({
    queryKey: key,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const res = await apiRequest("GET", `/api/users/${accountId}/tagged-posts?limit=${LIMIT}&offset=${pageParam}`, undefined, token!);
      return res.json();
    },
    getNextPageParam: (last, all) => (last.length === LIMIT ? all.length * LIMIT : undefined),
    enabled: Boolean(token),
    staleTime: 15000,
  });

  const removeMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest("DELETE", `/api/posts/${postId}/tags/${accountId}`, undefined, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      toast({ description: "Removed from your profile" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const items = q.data?.pages.flat() ?? [];

  if (q.isLoading) {
    return (
      <div className="space-y-4 p-4" data-testid="tagged-loading">
        {[1, 2].map((i) => <Skeleton key={i} className="h-96 w-full" />)}
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="tagged-error">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>Failed to load tagged posts.</p>
        <Button variant="link" onClick={() => q.refetch()}>Try again</Button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Tag}
          title={role === "STUDIO" ? "No clients yet" : "No client work yet"}
          description={
            isOwnProfile
              ? "When clients tag you in their tattoo posts, their work shows up here."
              : "Clients can tag this account when they share their tattoos, and those posts will appear here."
          }
          data-testid="text-no-tagged"
        />
      </div>
    );
  }
  return (
    <div className="space-y-4 p-4">
      {items.map((item: any) => (
        <div key={item.post.id} data-testid={`tagged-item-${item.post.id}`}>
          {isOwnProfile && (
            <div className="flex justify-end mb-1">
              <Button
                size="sm"
                variant="outline"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate(item.post.id)}
                data-testid={`button-remove-tag-${item.post.id}`}
              >
                <X className="w-3 h-3 mr-1" />
                <span className="text-xs">Remove from my profile</span>
              </Button>
            </div>
          )}
          <PostCard post={item.post} author={item.author} isLiked={item.isLiked} isSaved={item.isSaved} />
        </div>
      ))}
      {q.hasNextPage && (
        <div className="text-center">
          <Button variant="outline" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage} data-testid="button-load-more-tagged">
            {q.isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
