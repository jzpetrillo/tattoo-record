import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import LiveStreamCard from "@/components/live/live-stream-card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Radio, Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function LiveEvents() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [showGoLiveDialog, setShowGoLiveDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: liveEvents, isLoading } = useQuery<any[]>({
    queryKey: ["/api/livestream-events?status=LIVE"],
  });

  const goLiveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/livestream-events", {
        title,
        description,
        status: "LIVE",
      }, token!);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/livestream-events"] });
      toast({ title: "You are now live!" });
      setShowGoLiveDialog(false);
      setTitle("");
      setDescription("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleGoLive = () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Please enter a title", variant: "destructive" });
      return;
    }
    goLiveMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <main className="lg:ml-64 pb-20 lg:pb-8 pt-4 max-w-6xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1" data-testid="page-title">Live Events</h1>
            <p className="text-sm text-muted-foreground">Watch artists create tattoos in real-time</p>
          </div>
          {user && (
            <Button
              onClick={() => setShowGoLiveDialog(true)}
              className="gap-2"
              data-testid="button-go-live"
            >
              <Radio className="w-4 h-4" />
              Go Live
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-border overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !liveEvents?.length ? (
          <EmptyState
            icon={Video}
            title="No live streams right now"
            description="Check back soon, or start your own stream."
            action={
              user ? (
                <Button onClick={() => setShowGoLiveDialog(true)} variant="outline" className="gap-2" data-testid="button-be-first-live">
                  <Radio className="w-4 h-4" />
                  Be the first to go live
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {liveEvents.map((item: any) => (
              <LiveStreamCard key={item.event.id} event={item.event} host={item.host} />
            ))}
          </div>
        )}
      </main>
      <MobileNav />

      <Dialog open={showGoLiveDialog} onOpenChange={setShowGoLiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Go Live</DialogTitle>
            <DialogDescription>
              Start a live stream to share your work with the community
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What are you working on?"
                data-testid="input-live-title"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell viewers what to expect..."
                rows={3}
                data-testid="input-live-description"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowGoLiveDialog(false)}
                data-testid="button-cancel-live"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGoLive}
                disabled={goLiveMutation.isPending}
                className="gap-2"
                data-testid="button-start-live"
              >
                <Radio className="w-4 h-4" />
                {goLiveMutation.isPending ? "Starting..." : "Start Live"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
