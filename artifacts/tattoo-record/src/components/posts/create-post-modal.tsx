import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, VideoIcon, Clock, X } from "lucide-react";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "post" | "story" | "reel";
}

function MediaPreviews({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) {
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => {
    return () => {
      previews.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  if (previews.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Selected media previews">
      {previews.map(({ file, url }, index) => (
        <div key={url} className="relative overflow-hidden border border-border bg-secondary/20">
          {file.type.startsWith("video/") ? (
            <video
              src={url}
              controls
              muted
              playsInline
              preload="metadata"
              className="aspect-square w-full bg-black object-contain"
              aria-label={`Video preview: ${file.name}`}
            />
          ) : (
            <img
              src={url}
              alt={`Preview of ${file.name}`}
              className="aspect-square w-full object-cover"
            />
          )}
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/75 text-white shadow-sm"
            aria-label={`Remove ${file.name}`}
          >
            <X className="h-4 w-4" />
          </button>
          <p className="truncate px-2 py-2 text-xs text-muted-foreground">{file.name}</p>
        </div>
      ))}
    </div>
  );
}

export default function CreatePostModal({ open, onClose, defaultTab = "post" }: CreatePostModalProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [visibility, setVisibility] = useState<"PUBLIC" | "FOLLOWERS">("PUBLIC");
  const [activeTab, setActiveTab] = useState<"post" | "story" | "reel">(defaultTab);
  const uploadStatusQuery = useQuery<{ available: boolean }>({
    queryKey: ["/api/upload/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/upload/status", undefined, token!);
      return res.json();
    },
    enabled: Boolean(token),
  });
  const uploadsAvailable = uploadStatusQuery.data?.available === true;

  const createPostMutation = useMutation({
    mutationFn: async () => {
      // Upload files only if provided
      const media = files.length > 0
        ? await Promise.all(files.map((file) => uploadFile(file, "posts", token!)))
        : [];

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
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createStoryMutation = useMutation({
    mutationFn: async () => {
      if (files.length === 0) throw new Error("Please select a file");
      const file = files[0];
      const media = await uploadFile(file, "stories", token!);

      // The stories API takes a single media object, not an array — sending an
      // array here made every story creation fail validation with a 400.
      await apiRequest(
        "POST",
        "/api/stories",
        {
          media,
        },
        token!
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      toast({ title: "Success", description: "Story created successfully!" });
      onClose();
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createReelMutation = useMutation({
    mutationFn: async () => {
      if (files.length === 0) throw new Error("Please select a video");
      const file = files[0];
      const media = await uploadFile(file, "posts", token!);

      await apiRequest(
        "POST",
        "/api/posts",
        {
          caption,
          media: [media],
          visibility,
          type: "REEL",
        },
        token!
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Success", description: "Reel created successfully!" });
      onClose();
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setCaption("");
    setFiles([]);
    setVisibility("PUBLIC");
    setActiveTab("post");
  };

  const handleSubmit = () => {
    if (activeTab === "post") {
      createPostMutation.mutate();
    } else if (activeTab === "story") {
      createStoryMutation.mutate();
    } else if (activeTab === "reel") {
      createReelMutation.mutate();
    }
  };

  const isSubmitting = createPostMutation.isPending || createStoryMutation.isPending || createReelMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[calc(100%-2rem)] sm:w-full max-h-[90vh] overflow-y-auto sm:rounded-none">
        <DialogHeader>
          <DialogTitle>Create New Content</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 min-h-[44px]">
            <TabsTrigger value="post" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]" data-testid="tab-post">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Post</span>
            </TabsTrigger>
            <TabsTrigger value="story" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]" data-testid="tab-story">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Story</span>
            </TabsTrigger>
            <TabsTrigger value="reel" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]" data-testid="tab-reel">
              <VideoIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Reel</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="post" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            <Input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="sr-only"
              id="post-file-upload"
              disabled={!uploadsAvailable || isSubmitting}
              data-testid="input-file-upload"
            />
            <label
              htmlFor="post-file-upload"
              className="block border-2 border-dashed border-border p-6 sm:p-12 text-center hover:border-primary active:border-primary transition-colors cursor-pointer bg-secondary/20 touch-manipulation"
            >
              <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <span className="block text-sm font-medium mb-2">Tap to add photos or videos</span>
              <span className="block text-xs text-muted-foreground mb-4">or drag and drop</span>
              <span className="inline-flex min-h-[44px] items-center justify-center bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Select files
              </span>
            </label>
            {uploadStatusQuery.data && !uploadsAvailable && (
              <p className="text-sm text-muted-foreground">Image uploads are temporarily unavailable.</p>
            )}

            <MediaPreviews
              files={files}
              onRemove={(index) => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
            />

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
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  onClick={() => setVisibility("PUBLIC")}
                  className={`flex items-center justify-center gap-2 p-3 min-h-[48px] transition-colors touch-manipulation ${
                    visibility === "PUBLIC"
                      ? "bg-primary/20 border border-primary text-primary"
                      : "bg-secondary border border-border text-muted-foreground"
                  }`}
                  data-testid="button-visibility-public"
                >
                  <span className="text-sm font-medium">Public</span>
                </button>
                <button
                  onClick={() => setVisibility("FOLLOWERS")}
                  className={`flex items-center justify-center gap-2 p-3 min-h-[48px] transition-colors touch-manipulation ${
                    visibility === "FOLLOWERS"
                      ? "bg-primary/20 border border-primary text-primary"
                      : "bg-secondary border border-border text-muted-foreground"
                  }`}
                  data-testid="button-visibility-followers"
                >
                  <span className="text-sm font-medium">Followers</span>
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="story" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            <Input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 1))}
              className="sr-only"
              id="story-file-upload"
              disabled={!uploadsAvailable || isSubmitting}
              data-testid="input-story-upload"
            />
            <label
              htmlFor="story-file-upload"
              className="block border-2 border-dashed border-border p-6 sm:p-12 text-center hover:border-primary active:border-primary transition-colors cursor-pointer bg-secondary/20 touch-manipulation"
            >
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <span className="block text-sm font-medium mb-2">Add to your story</span>
              <span className="block text-xs text-muted-foreground mb-4">Stories disappear after 24 hours</span>
              <span className="inline-flex min-h-[44px] items-center justify-center bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Select file
              </span>
            </label>
            {uploadStatusQuery.data && !uploadsAvailable && (
              <p className="text-sm text-muted-foreground">Image uploads are temporarily unavailable.</p>
            )}

            <MediaPreviews
              files={files}
              onRemove={(index) => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
            />
          </TabsContent>

          <TabsContent value="reel" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            <Input
              type="file"
              accept="video/*"
              onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 1))}
              className="sr-only"
              id="reel-file-upload"
              disabled={!uploadsAvailable || isSubmitting}
              data-testid="input-reel-upload"
            />
            <label
              htmlFor="reel-file-upload"
              className="block border-2 border-dashed border-border p-6 sm:p-12 text-center hover:border-primary active:border-primary transition-colors cursor-pointer bg-secondary/20 touch-manipulation"
            >
              <VideoIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <span className="block text-sm font-medium mb-2">Upload your reel</span>
              <span className="block text-xs text-muted-foreground mb-4">Short vertical video</span>
              <span className="inline-flex min-h-[44px] items-center justify-center bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Select video
              </span>
            </label>
            {uploadStatusQuery.data && !uploadsAvailable && (
              <p className="text-sm text-muted-foreground">Image uploads are temporarily unavailable.</p>
            )}

            <MediaPreviews
              files={files}
              onRemove={(index) => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
            />

            <div>
              <label className="block text-sm font-medium mb-2">Caption</label>
              <Textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[120px]"
                data-testid="textarea-reel-caption"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Visibility</label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  onClick={() => setVisibility("PUBLIC")}
                  className={`flex items-center justify-center gap-2 p-3 min-h-[48px] transition-colors touch-manipulation ${
                    visibility === "PUBLIC"
                      ? "bg-primary/20 border border-primary text-primary"
                      : "bg-secondary border border-border text-muted-foreground"
                  }`}
                  data-testid="button-reel-visibility-public"
                >
                  <span className="text-sm font-medium">Public</span>
                </button>
                <button
                  onClick={() => setVisibility("FOLLOWERS")}
                  className={`flex items-center justify-center gap-2 p-3 min-h-[48px] transition-colors touch-manipulation ${
                    visibility === "FOLLOWERS"
                      ? "bg-primary/20 border border-primary text-primary"
                      : "bg-secondary border border-border text-muted-foreground"
                  }`}
                  data-testid="button-reel-visibility-followers"
                >
                  <span className="text-sm font-medium">Followers</span>
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1 min-h-[44px]" data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={(activeTab !== "post" && files.length === 0) || (activeTab === "post" && !caption && files.length === 0) || isSubmitting}
            className="flex-1 min-h-[44px]"
            data-testid="button-share-post"
          >
            {isSubmitting ? "Sharing..." : `Share ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
