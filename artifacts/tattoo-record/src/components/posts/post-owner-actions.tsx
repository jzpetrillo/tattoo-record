import { useEffect, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PostOwnerActionsProps {
  postId: string;
  caption?: string | null;
  hasMedia: boolean;
  onCaptionUpdated?: (caption: string) => void;
  onDeleted?: () => void;
}

export default function PostOwnerActions({
  postId,
  caption,
  hasMedia,
  onCaptionUpdated,
  onDeleted,
}: PostOwnerActionsProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draft, setDraft] = useState(caption ?? "");

  useEffect(() => {
    if (!editOpen) setDraft(caption ?? "");
  }, [caption, editOpen]);

  const refreshPostQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && (
          key === "/api/posts"
          || key.startsWith("/api/posts?")
          || key === `/api/posts/${postId}`
          || key === "/api/for-you"
          || key.startsWith("/api/users/") && key.endsWith("/stats")
        );
      },
    });
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/posts/${postId}`, { caption: draft }, token!);
      return response.json();
    },
    onSuccess: (updatedPost: { caption?: string | null }) => {
      const nextCaption = updatedPost.caption ?? "";
      onCaptionUpdated?.(nextCaption);
      refreshPostQueries();
      setEditOpen(false);
      toast({ title: "Caption updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Unable to update caption", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/posts/${postId}`, undefined, token!),
    onSuccess: () => {
      refreshPostQueries();
      setDeleteOpen(false);
      onDeleted?.();
      toast({ title: "Post deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Unable to delete post", description: error.message, variant: "destructive" });
    },
  });

  const trimmedDraft = draft.trim();
  const captionUnchanged = trimmedDraft === (caption ?? "").trim();
  const invalidEmptyPost = !hasMedia && !trimmedDraft;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="min-h-11 min-w-11 shrink-0 inline-flex items-center justify-center hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Post options"
            data-testid={`button-post-options-${postId}`}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-none border-ink">
          <DropdownMenuItem onSelect={() => setEditOpen(true)} data-testid={`button-edit-post-${postId}`}>
            <Pencil className="h-4 w-4" />
            Edit caption
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteOpen(true)} data-testid={`button-delete-post-${postId}`}>
            <Trash2 className="h-4 w-4" />
            Delete post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-none border-2 border-ink">
          <DialogHeader>
            <DialogTitle className="press-nameplate text-2xl">Edit caption</DialogTitle>
            <DialogDescription>Update the words attached to this record.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={6}
            maxLength={5000}
            className="rounded-none border-ink resize-y"
            placeholder={hasMedia ? "Write a caption…" : "This post needs a caption."}
            data-testid={`input-edit-caption-${postId}`}
          />
          <div className="meta text-[0.65rem] text-right">{draft.length} / 5000</div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-none border-ink" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-none"
              onClick={() => updateMutation.mutate()}
              disabled={captionUnchanged || invalidEmptyPost || updateMutation.isPending}
              data-testid={`button-save-caption-${postId}`}
            >
              {updateMutation.isPending ? "Saving…" : "Save caption"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-none border-2 border-ink">
          <AlertDialogHeader>
            <AlertDialogTitle className="press-nameplate text-2xl">Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the post from Tattoo Record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-ink">Keep post</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid={`button-confirm-delete-post-${postId}`}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete post"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}