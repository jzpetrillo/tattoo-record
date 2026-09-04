import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Heart, Bookmark, AlertCircle, Loader2 } from "lucide-react";
import UserAvatar from "@/components/user-avatar";
import PostOwnerActions from "@/components/posts/post-owner-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function PostDetail() {
  const params = useParams();
  const id = params?.id;
  const [, setLocation] = useLocation();
  const { token, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [currentCaption, setCurrentCaption] = useState<string | null>(null);

  const { data, error, isLoading } = useQuery<any>({
    queryKey: [`/api/posts/${id}`],
    enabled: !!id,
    retry: false,
  });

  const { data: comments, isLoading: isLoadingComments } = useQuery<any[]>({
    queryKey: [`/api/posts/${id}/comments`],
    enabled: !!id && !!data,
  });

  const postData = data?.post;
  const author = data?.author;
  const isLiked = data?.isLiked;
  const isSaved = data?.isSaved;
  const displayedCaption = currentCaption ?? postData?.caption ?? "";

  const likeMutation = useMutation({
    mutationFn: async (shouldLike: boolean) => {
      const method = shouldLike ? "POST" : "DELETE";
      await apiRequest(method, `/api/posts/${id}/like`, undefined, token!);
    },
    onMutate: async (shouldLike: boolean) => {
      await queryClient.cancelQueries({ queryKey: [`/api/posts/${id}`] });
      const previousData = queryClient.getQueryData<any>([`/api/posts/${id}`]);
      
      queryClient.setQueryData([`/api/posts/${id}`], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          isLiked: shouldLike,
          post: {
            ...old.post,
            likeCount: shouldLike ? old.post.likeCount + 1 : old.post.likeCount - 1
          }
        };
      });
      return { previousData };
    },
    onError: (err: Error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([`/api/posts/${id}`], context.previousData);
      }
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${id}`] });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (shouldSave: boolean) => {
      if (shouldSave) {
        await apiRequest("POST", `/api/saved-posts`, { postId: id }, token!);
      } else {
        await apiRequest("DELETE", `/api/saved-posts/${id}`, undefined, token!);
      }
    },
    onMutate: async (shouldSave: boolean) => {
      await queryClient.cancelQueries({ queryKey: [`/api/posts/${id}`] });
      const previousData = queryClient.getQueryData<any>([`/api/posts/${id}`]);
      
      queryClient.setQueryData([`/api/posts/${id}`], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          isSaved: shouldSave
        };
      });
      return { previousData };
    },
    onError: (err: Error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([`/api/posts/${id}`], context.previousData);
      }
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-posts"] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/posts/${id}/comments`, { body: content }, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${id}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${id}`] });
      setCommentText("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
      </div>
    );
  }

  if (error || !data || !postData || !author) {
    const errorMsg = (error as Error)?.message?.toLowerCase() || "";
    const is404 = errorMsg.includes("404") || errorMsg.includes("not found");
    const is401 = errorMsg.includes("401")
      || errorMsg.includes("unauthorized")
      || errorMsg.includes("log in")
      || errorMsg.includes("session expired");
    const is403 = errorMsg.includes("403") || errorMsg.includes("forbidden") || errorMsg.includes("follower");

    let title = "Error Loading Post";
    let message = (error as Error)?.message || "Something went wrong.";

    if (is401) {
      title = "Authentication Required";
      message = "You need to be logged in to view this record.";
    } else if (is403) {
      title = "Private Record";
      message = "This record is only visible to approved followers.";
    } else if (is404 || (!error && !postData)) {
      title = "Not Found";
      message = "This record has been archived or doesn't exist.";
    }

    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-card border-2 border-ink flex items-center justify-center mb-6 halftone">
          <AlertCircle className="w-8 h-8 text-ink" />
        </div>
        <h1 className="text-3xl font-bold font-sans mb-3 uppercase tracking-tight">{title}</h1>
        <p className="text-muted-foreground font-mono text-sm max-w-sm mb-8">{message}</p>
        <Button onClick={() => setLocation("/")} variant="outline" className="border-ink rounded-none font-mono uppercase tracking-wider text-xs">
          Return Home
        </Button>
      </div>
    );
  }

  const media = postData.media?.[0];
  const isVideo = String(media?.type || "").toLowerCase() === "video"
    || Boolean(media?.url?.match(/\.(mp4|webm|mov)(?:[?#].*)?$/i));

  const dateFormatted = postData.createdAt ? new Date(postData.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }) : "Recent";

  return (
    <div className="min-h-[100dvh] bg-background pb-32 safe-area-bottom">
      <header className="sticky top-0 z-50 bg-background border-b-2 border-ink px-4 h-14 flex items-center justify-between safe-area-top shadow-sm">
        <button 
          onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/")} 
          className="w-10 h-10 -ml-2 flex items-center justify-center touch-manipulation hover:bg-muted transition-colors rounded-none"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-ink" />
        </button>
        <span className="max-w-[70vw] truncate font-mono text-xs uppercase tracking-[0.2em] font-bold text-ink">
          Record No. {postData.id}
        </span>
        <div className="w-10" /> 
      </header>

      <article className="max-w-2xl mx-auto md:border-x-2 border-ink min-h-screen bg-card shadow-sm pb-10">
        <div className="p-4 border-b-2 border-ink bg-card flex items-center justify-between gap-3">
          <Link href={`/u/${author.username}`} className="flex items-center gap-4 cursor-pointer group min-w-0 flex-1">
            <UserAvatar {...author} className="w-12 h-12 border-2 border-ink shadow-[2px_2px_0px_0px_#111] group-hover:shadow-[4px_4px_0px_0px_#111] transition-all" />
            <div>
              <h3 className="font-sans font-bold text-base uppercase group-hover:text-cobalt transition-colors tracking-tight">
                {author.username}
              </h3>
              <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5">
                {author.role || "Artist"}
              </p>
            </div>
          </Link>
          {user?.id === postData.authorId && (
            <PostOwnerActions
              postId={postData.id}
              caption={displayedCaption}
              hasMedia={Boolean(postData.media?.length)}
              onCaptionUpdated={setCurrentCaption}
              onDeleted={() => setLocation("/")}
            />
          )}
        </div>

        {postData.media?.[0] && (
          <div className="w-full bg-ink border-b-2 border-ink relative overflow-hidden">
            {isVideo ? (
              <video
                src={postData.media[0].url}
                className="w-full h-auto max-h-[85vh] object-contain"
                autoPlay
                loop
                playsInline
                controls
              />
            ) : (
              <img
                src={postData.media[0].url}
                alt={displayedCaption || "Post visual"}
                className="w-full h-auto object-contain max-h-[85vh]"
                loading="eager"
              />
            )}
          </div>
        )}

        <div className="p-5 border-b-2 border-ink bg-card">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => {
                if (!token) {
                  toast({ title: "Action Required", description: "Log in to like records." });
                  return;
                }
                likeMutation.mutate(!isLiked);
              }}
              disabled={likeMutation.isPending}
              className={`flex items-center gap-3 group touch-manipulation min-h-[44px] ${isLiked ? 'text-flash' : 'text-ink hover:text-flash'} transition-colors`}
              aria-label={isLiked ? "Unlike post" : "Like post"}
            >
              <Heart className={`w-7 h-7 ${isLiked ? 'fill-current' : 'stroke-[1.5]'}`} />
              <span className="font-mono text-sm font-bold">{postData.likeCount}</span>
            </button>
            <button
              onClick={() => {
                if (!token) {
                  toast({ title: "Action Required", description: "Log in to save records." });
                  return;
                }
                saveMutation.mutate(!isSaved);
              }}
              disabled={saveMutation.isPending}
              className={`flex items-center justify-center touch-manipulation min-h-[44px] min-w-[44px] ${isSaved ? 'text-cobalt' : 'text-ink hover:text-cobalt'} transition-colors`}
              aria-label={isSaved ? "Unsave post" : "Save post"}
            >
              <Bookmark className={`w-7 h-7 ${isSaved ? 'fill-current' : 'stroke-[1.5]'}`} />
            </button>
          </div>
          
          {displayedCaption && (
            <div className="mb-6 border-l-2 border-ink pl-4 py-1">
              <p className="font-sans text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
                <span className="font-bold mr-3 uppercase text-sm tracking-tight">{author.username}</span>
                {displayedCaption}
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-6">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em] border border-ink/20 px-2 py-1 inline-block">
              {dateFormatted}
            </div>
            {postData.commentCount > 0 && (
              <div className="font-mono text-[10px] text-ink uppercase tracking-widest font-bold">
                {postData.commentCount} {postData.commentCount === 1 ? 'Comment' : 'Comments'}
              </div>
            )}
          </div>
        </div>

        <div className="bg-background">
          <div className="p-4 border-b-2 border-ink bg-muted/30 halftone">
            <h4 className="font-sans font-bold uppercase tracking-widest text-xs text-ink">Discussion</h4>
          </div>
          
          <div className="divide-y-2 divide-ink/10">
            {isLoadingComments ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
              </div>
            ) : comments?.length === 0 ? (
              <div className="p-12 text-center border-b-2 border-ink">
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">No comments yet</p>
              </div>
            ) : (
              comments?.map((item: any, index: number) => (
                <div key={item.comment.id} className={`p-5 flex gap-4 ${index % 2 === 0 ? 'bg-background' : 'bg-card/30'}`}>
                  <Link href={`/u/${item.user.username}`} className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                    <UserAvatar {...item.user} className="w-10 h-10 border border-ink rounded-none shadow-[2px_2px_0px_0px_#111]" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <Link href={`/u/${item.user.username}`} className="font-sans font-bold text-sm uppercase hover:text-cobalt transition-colors truncate pr-2 tracking-tight">
                        {item.user.username}
                      </Link>
                      <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest flex-shrink-0">
                        {new Date(item.comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm font-sans leading-relaxed text-ink break-words">
                      {item.comment.body}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </article>

      {token ? (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t-2 border-ink p-3 safe-area-bottom z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="max-w-2xl mx-auto flex gap-2">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 min-h-[48px] max-h-32 resize-none rounded-none border-2 border-ink font-sans focus-visible:ring-0 focus-visible:border-cobalt text-sm p-3 shadow-[2px_2px_0px_0px_#111] bg-card"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (commentText.trim() && !commentMutation.isPending) {
                    commentMutation.mutate(commentText);
                  }
                }
              }}
            />
            <Button
              onClick={() => commentMutation.mutate(commentText)}
              disabled={!commentText.trim() || commentMutation.isPending}
              className="rounded-none border-2 border-ink bg-ink text-background font-mono font-bold uppercase hover:bg-cobalt hover:border-cobalt transition-colors px-6 h-auto shadow-[2px_2px_0px_0px_#111]"
            >
              {commentMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Post"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t-2 border-ink p-4 safe-area-bottom z-40">
          <div className="max-w-2xl mx-auto text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <Link href="/auth" className="text-ink font-bold hover:text-cobalt border-b border-ink/30 hover:border-cobalt pb-0.5 transition-colors">Log in</Link> to join the conversation
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
