import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Heart, MessageCircle, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";

interface PostCardProps {
  post: any;
  author: any;
  isLiked?: boolean;
}

export default function PostCard({ post, author, isLiked = false }: PostCardProps) {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const method = isLiked ? "DELETE" : "POST";
      await apiRequest(method, `/api/posts/${post.id}/like`, undefined, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const { data: comments } = useQuery({
    queryKey: [`/api/posts/${post.id}/comments`],
    enabled: showComments && !!token,
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/posts/${post.id}/comments`, { body: content }, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setCommentText("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const { data: conversations } = useQuery({
    queryKey: ["/api/conversations"],
    enabled: showShareDialog && !!token,
  });

  const shareMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const shareUrl = `${window.location.origin}/posts/${post.id}`;
      const message = `Check out this post: ${shareUrl}`;
      await apiRequest("POST", `/api/messages`, { conversationId, content: message }, token!);
    },
    onSuccess: () => {
      toast({ title: "Post shared successfully!" });
      setShowShareDialog(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <article className="bg-card border border-border rounded-lg overflow-hidden" data-testid={`post-${post.id}`}>
      {/* Post header with author info */}
      <div className="p-4 flex items-center gap-3">
        <Link href={`/u/${author.username}`} data-testid={`link-author-${post.id}`}>
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80">
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
        </Link>
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
            disabled={likeMutation.isPending}
            className={`hover:text-primary transition-colors ${isLiked ? 'text-red-500' : ''}`}
            data-testid={`button-like-${post.id}`}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button 
            onClick={() => setShowComments(true)}
            className="hover:text-primary transition-colors" 
            data-testid={`button-comment-${post.id}`}
          >
            <MessageCircle className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setShowShareDialog(true)}
            className="hover:text-primary transition-colors" 
            data-testid={`button-share-${post.id}`}
          >
            <Send className="w-6 h-6" />
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
            <button 
              onClick={() => setShowComments(true)}
              className="text-sm text-muted-foreground mt-1 hover:text-foreground"
            >
              View all {post.commentCount} comments
            </button>
          )}
        </div>
      </div>

      {/* Comments Dialog */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {comments?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No comments yet</p>
            ) : (
              <div className="space-y-4">
                {comments?.map((item: any) => (
                  <div key={item.comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold">{item.user.username[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold mr-2">{item.user.username}</span>
                        {item.comment.body}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(item.comment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="flex gap-2 pt-4 border-t">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1"
              rows={2}
              data-testid="input-comment"
            />
            <Button
              onClick={() => commentMutation.mutate(commentText)}
              disabled={!commentText.trim() || commentMutation.isPending}
              data-testid="button-submit-comment"
            >
              {commentMutation.isPending ? "..." : "Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Post</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            {conversations?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No conversations yet</p>
            ) : (
              <div className="space-y-2">
                {conversations?.map((conv: any) => {
                  const otherParticipant = conv.participants?.find((p: any) => p.id !== user?.id);
                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedUser(conv.id);
                        shareMutation.mutate(conv.id);
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-lg transition-colors"
                      disabled={shareMutation.isPending}
                      data-testid={`share-conversation-${conv.id}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <span className="text-sm font-semibold">
                          {otherParticipant?.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm">{otherParticipant?.username || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{otherParticipant?.role || ''}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </article>
  );
}
