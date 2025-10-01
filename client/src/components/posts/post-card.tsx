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
    <article className="bg-card rounded-xl border border-border overflow-hidden hover-lift" data-testid={`post-${post.id}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <img
            src={author.avatarUrl || `https://ui-avatars.com/api/?name=${author.username}`}
            alt={author.username}
            className="w-10 h-10 rounded-full ring-2 ring-primary/50"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm" data-testid={`text-author-${post.id}`}>{author.username}</h3>
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                {author.role}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {post.location?.city && `${post.location.city}, ${post.location.country} • `}
              2h ago
            </p>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <i className="fas fa-ellipsis-h"></i>
        </button>
      </div>

      {post.media?.[0] && (
        <div className="relative aspect-square bg-secondary">
          <img
            src={post.media[0].url}
            alt="Post"
            className="w-full h-full object-cover"
          />
          {post.media.length > 1 && (
            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white font-medium">
              <i className="fas fa-images mr-1"></i>
              1/{post.media.length}
            </div>
          )}
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => likeMutation.mutate()}
              className="flex items-center gap-2 text-foreground hover:text-destructive transition-colors"
              data-testid={`button-like-${post.id}`}
            >
              <i className="far fa-heart text-xl"></i>
              <span className="text-sm font-medium" data-testid={`text-likes-${post.id}`}>{post.likeCount}</span>
            </button>
            <button className="flex items-center gap-2 text-foreground hover:text-accent transition-colors" data-testid={`button-comment-${post.id}`}>
              <i className="far fa-comment text-xl"></i>
              <span className="text-sm font-medium">{post.commentCount}</span>
            </button>
            <button className="flex items-center gap-2 text-foreground hover:text-primary transition-colors" data-testid={`button-share-${post.id}`}>
              <i className="far fa-paper-plane text-xl"></i>
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>
          <button className="text-foreground hover:text-primary transition-colors" data-testid={`button-save-${post.id}`}>
            <i className="far fa-bookmark text-xl"></i>
          </button>
        </div>

        {post.caption && (
          <div>
            <p className="text-sm">
              <span className="font-semibold">{author.username}</span>
              <span className="ml-2">{post.caption}</span>
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
