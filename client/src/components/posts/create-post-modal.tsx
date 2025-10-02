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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Content</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="post" className="flex items-center gap-2" data-testid="tab-post">
              <ImageIcon className="w-4 h-4" />
              Post
            </TabsTrigger>
            <TabsTrigger value="story" className="flex items-center gap-2" data-testid="tab-story">
              <Clock className="w-4 h-4" />
              Story
            </TabsTrigger>
            <TabsTrigger value="reel" className="flex items-center gap-2" data-testid="tab-reel">
              <VideoIcon className="w-4 h-4" />
              Reel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="post" className="space-y-6 mt-6">
            <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer bg-secondary/20">
              <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-2">Drag photos and videos here</p>
              <p className="text-xs text-muted-foreground mb-4">or click to browse</p>
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
          </TabsContent>

          <TabsContent value="story" className="space-y-6 mt-6">
            <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer bg-secondary/20">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
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
                <Button type="button" asChild>
                  <span>Select from computer</span>
                </Button>
              </label>
            </div>

            {files.length > 0 && (
              <p className="text-sm text-muted-foreground">1 file selected</p>
            )}
          </TabsContent>

          <TabsContent value="reel" className="space-y-6 mt-6">
            <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer bg-secondary/20">
              <VideoIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
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
                <Button type="button" asChild>
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
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setVisibility("PUBLIC")}
                  className={`flex items-center gap-2 rounded-lg p-3 transition-colors ${
                    visibility === "PUBLIC"
                      ? "bg-primary/20 border border-primary text-primary"
                      : "bg-secondary border border-border text-muted-foreground"
                  }`}
                  data-testid="button-reel-visibility-public"
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
                  data-testid="button-reel-visibility-followers"
                >
                  <i className="fas fa-user-friends"></i>
                  <span className="text-sm font-medium">Followers</span>
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={files.length === 0 || isSubmitting}
            className="flex-1"
            data-testid="button-share-post"
          >
            {isSubmitting ? "Sharing..." : `Share ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
