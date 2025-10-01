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
    <article className="border-r border-b border-border group cursor-pointer" data-testid={`post-${post.id}`}>
      {post.media?.[0] && (
        <div className="relative aspect-square bg-secondary overflow-hidden">
          <img
            src={post.media[0].url}
            alt="Post"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}

      <div className="p-6 space-y-4">
        <div>
          <h3 className="uppercase text-xs tracking-wider opacity-60 mb-2" data-testid={`text-author-${post.id}`}>
            {author.username} / {author.role}
          </h3>
          {post.caption && (
            <p className="text-sm leading-relaxed line-clamp-3">{post.caption}</p>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs uppercase tracking-wider opacity-40">
          <button
            onClick={() => likeMutation.mutate()}
            className="hover:opacity-100 transition-opacity"
            data-testid={`button-like-${post.id}`}
          >
            <span data-testid={`text-likes-${post.id}`}>{post.likeCount} Likes</span>
          </button>
          <button className="hover:opacity-100 transition-opacity" data-testid={`button-comment-${post.id}`}>
            <span>{post.commentCount} Comments</span>
          </button>
        </div>
      </div>
    </article>
  );
}
