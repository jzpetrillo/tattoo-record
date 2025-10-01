import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, uploadFile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreatePostModal({ open, onClose }: CreatePostModalProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [visibility, setVisibility] = useState<"PUBLIC" | "FOLLOWERS">("PUBLIC");

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const mediaPromises = files.map((file) => uploadFile(file, "posts", token!));
      const media = await Promise.all(mediaPromises);

      await apiRequest(
        "POST",
        "/api/posts",
        {
          caption,
          media,
          visibility,
        },
        token!
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Success", description: "Post created successfully!" });
      onClose();
      setCaption("");
      setFiles([]);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer bg-secondary/20">
            <i className="fas fa-cloud-upload-alt text-5xl text-muted-foreground mb-4"></i>
            <p className="text-sm font-medium mb-2">Drag photos and videos here</p>
            <p className="text-xs text-muted-foreground mb-4">or click to browse</p>
            <Input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="hidden"
              id="file-upload"
              data-testid="input-file-upload"
            />
            <label htmlFor="file-upload">
              <Button type="button" asChild>
                <span>Select from computer</span>
              </Button>
            </label>
          </div>

          {files.length > 0 && (
            <p className="text-sm text-muted-foreground">{files.length} file(s) selected</p>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Caption</label>
            <Textarea
              placeholder="Write a caption... Use #hashtags to increase visibility"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[120px]"
              data-testid="textarea-caption"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Visibility</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setVisibility("PUBLIC")}
                className={`flex items-center gap-2 rounded-lg p-3 transition-colors ${
                  visibility === "PUBLIC"
                    ? "bg-primary/20 border border-primary text-primary"
                    : "bg-secondary border border-border text-muted-foreground"
                }`}
                data-testid="button-visibility-public"
              >
                <i className="fas fa-globe"></i>
                <span className="text-sm font-medium">Public</span>
              </button>
              <button
                onClick={() => setVisibility("FOLLOWERS")}
                className={`flex items-center gap-2 rounded-lg p-3 transition-colors ${
                  visibility === "FOLLOWERS"
                    ? "bg-primary/20 border border-primary text-primary"
                    : "bg-secondary border border-border text-muted-foreground"
                }`}
                data-testid="button-visibility-followers"
              >
                <i className="fas fa-user-friends"></i>
                <span className="text-sm font-medium">Followers</span>
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => createPostMutation.mutate()}
              disabled={files.length === 0 || createPostMutation.isPending}
              className="flex-1"
              data-testid="button-share-post"
            >
              {createPostMutation.isPending ? "Sharing..." : "Share Post"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
