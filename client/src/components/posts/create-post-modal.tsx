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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, VideoIcon, Clock } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"post" | "story" | "reel">("post");

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

      await apiRequest(
        "POST",
        "/api/stories",
        {
          media: [media],
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
      <DialogContent className="max-w-2xl w-[calc(100%-2rem)] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Content</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 min-h-[44px]">
            <TabsTrigger value="post" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[40px]" data-testid="tab-post">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden xs:inline">Post</span>
            </TabsTrigger>
            <TabsTrigger value="story" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[40px]" data-testid="tab-story">
              <Clock className="w-4 h-4" />
              <span className="hidden xs:inline">Story</span>
            </TabsTrigger>
            <TabsTrigger value="reel" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[40px]" data-testid="tab-reel">
              <VideoIcon className="w-4 h-4" />
              <span className="hidden xs:inline">Reel</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="post" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            <div className="border-2 border-dashed border-border rounded-xl p-6 sm:p-12 text-center hover:border-primary active:border-primary transition-colors cursor-pointer bg-secondary/20 touch-manipulation">
              <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-sm font-medium mb-2">Tap to add photos or videos</p>
              <p className="text-xs text-muted-foreground mb-4">or drag and drop</p>
              <Input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="hidden"
                id="post-file-upload"
                data-testid="input-file-upload"
              />
              <label htmlFor="post-file-upload">
                <Button type="button" asChild className="min-h-[44px]">
                  <span>Select files</span>
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
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  onClick={() => setVisibility("PUBLIC")}
                  className={`flex items-center justify-center gap-2 rounded-lg p-3 min-h-[48px] transition-colors touch-manipulation ${
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
                  className={`flex items-center justify-center gap-2 rounded-lg p-3 min-h-[48px] transition-colors touch-manipulation ${
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
            <div className="border-2 border-dashed border-border rounded-xl p-6 sm:p-12 text-center hover:border-primary active:border-primary transition-colors cursor-pointer bg-secondary/20 touch-manipulation">
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-sm font-medium mb-2">Add to your story</p>
              <p className="text-xs text-muted-foreground mb-4">Stories disappear after 24 hours</p>
              <Input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 1))}
                className="hidden"
                id="story-file-upload"
                data-testid="input-story-upload"
              />
              <label htmlFor="story-file-upload">
                <Button type="button" asChild className="min-h-[44px]">
                  <span>Select file</span>
                </Button>
              </label>
            </div>

            {files.length > 0 && (
              <p className="text-sm text-muted-foreground">1 file selected</p>
            )}
          </TabsContent>

          <TabsContent value="reel" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            <div className="border-2 border-dashed border-border rounded-xl p-6 sm:p-12 text-center hover:border-primary active:border-primary transition-colors cursor-pointer bg-secondary/20 touch-manipulation">
              <VideoIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-sm font-medium mb-2">Upload your reel</p>
              <p className="text-xs text-muted-foreground mb-4">Short vertical video</p>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 1))}
                className="hidden"
                id="reel-file-upload"
                data-testid="input-reel-upload"
              />
              <label htmlFor="reel-file-upload">
                <Button type="button" asChild className="min-h-[44px]">
                  <span>Select video</span>
                </Button>
              </label>
            </div>

            {files.length > 0 && (
              <p className="text-sm text-muted-foreground">1 video selected</p>
            )}

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
                  className={`flex items-center justify-center gap-2 rounded-lg p-3 min-h-[48px] transition-colors touch-manipulation ${
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
                  className={`flex items-center justify-center gap-2 rounded-lg p-3 min-h-[48px] transition-colors touch-manipulation ${
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
