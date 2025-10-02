import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PostCardProps {
  post: any;
  author: any;
}

export default function PostCard({ post, author }: PostCardProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/posts/${post.id}/like`, undefined, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <article className="bg-card border border-border rounded-lg overflow-hidden" data-testid={`post-${post.id}`}>
      {/* Post header with author info */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
          <span className="text-sm font-semibold">{author.username[0].toUpperCase()}</span>
        </div>
        <div>
          <h3 className="font-semibold text-sm" data-testid={`text-author-${post.id}`}>
            {author.username}
          </h3>
          <p className="text-xs text-muted-foreground">{author.role}</p>
        </div>
      </div>

      {/* Post image */}
      {post.media?.[0] && (
        <div className="relative w-full aspect-square bg-secondary">
          <img
            src={post.media[0].url}
            alt="Post"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Post actions and content */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => likeMutation.mutate()}
            className="hover:text-primary transition-colors"
            data-testid={`button-like-${post.id}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <button className="hover:text-primary transition-colors" data-testid={`button-comment-${post.id}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>

        <div>
          <p className="text-sm font-semibold" data-testid={`text-likes-${post.id}`}>
            {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}
          </p>
          {post.caption && (
            <p className="text-sm mt-1">
              <span className="font-semibold mr-2">{author.username}</span>
              {post.caption}
            </p>
          )}
          {post.commentCount > 0 && (
            <button className="text-sm text-muted-foreground mt-1">
              View all {post.commentCount} comments
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
