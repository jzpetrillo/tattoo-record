import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import LiveStreamCard from "@/components/live/live-stream-card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Radio, Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function LiveEvents() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [showGoLiveDialog, setShowGoLiveDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: liveEvents } = useQuery({
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
      toast({ title: "Success", description: "You are now live!" });
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
      <main className="lg:ml-64 pb-20 lg:pb-0">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">Live Events</h1>
              <p className="text-muted-foreground">Watch artists create amazing tattoos in real-time</p>
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

          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-full font-medium text-sm whitespace-nowrap" data-testid="filter-live-now">
              <i className="fas fa-circle text-[6px] mr-2 animate-pulse"></i>
              Live Now ({liveEvents?.length || 0})
            </button>
            <button className="px-4 py-2 bg-secondary text-muted-foreground hover:text-foreground rounded-full font-medium text-sm whitespace-nowrap transition-colors" data-testid="filter-upcoming">
              Upcoming
            </button>
            <button className="px-4 py-2 bg-secondary text-muted-foreground hover:text-foreground rounded-full font-medium text-sm whitespace-nowrap transition-colors" data-testid="filter-following">
              Following
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {liveEvents?.map((item: any) => (
              <LiveStreamCard key={item.event.id} event={item.event} host={item.host} />
            ))}
          </div>

          {liveEvents?.length === 0 && (
            <div className="text-center py-12">
              <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No live streams at the moment</p>
              {user && (
                <Button onClick={() => setShowGoLiveDialog(true)} variant="outline" className="gap-2">
                  <Radio className="w-4 h-4" />
                  Be the first to go live
                </Button>
              )}
            </div>
          )}
        </div>
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
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What are you working on?"
                data-testid="input-live-title"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell viewers what to expect..."
                rows={3}
                data-testid="input-live-description"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
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
