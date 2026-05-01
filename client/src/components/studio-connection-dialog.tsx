import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Search } from "lucide-react";

export function StudioConnectionDialog() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudio, setSelectedStudio] = useState<any>(null);
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const { token } = useAuth();

  const { data: searchResults } = useQuery<{ users: any[]; posts: any[]; hashtags: any[] }>({
    queryKey: ["/api/search", searchQuery],
    enabled: searchQuery.length > 2,
  });

  const studios = (searchResults?.users ?? []).filter((u: any) => u.role === "STUDIO");

  const requestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/studio-approvals", data, token!);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio-approvals"] });
      toast({ description: "Connection request sent!" });
      setOpen(false);
      setSelectedStudio(null);
      setNote("");
      setSearchQuery("");
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive",
        description: error.message || "Failed to send request" 
      });
    },
  });

  const handleSendRequest = () => {
    if (!selectedStudio) return;
    requestMutation.mutate({
      studioId: selectedStudio.id,
      note: note || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-request-studio-connection">
          <Building2 className="w-4 h-4 mr-2" />
          Connect to Studio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Studio Connection</DialogTitle>
        </DialogHeader>
        
        {!selectedStudio ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search for studios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-studios"
              />
            </div>

            {studios.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {studios.map((studio: any) => (
                  <button
                    key={studio.id}
                    onClick={() => setSelectedStudio(studio)}
                    className="w-full p-3 text-left hover:bg-secondary rounded-md transition-colors"
                    data-testid={`studio-option-${studio.id}`}
                  >
                    <div className="font-medium">{studio.username}</div>
                    <div className="text-sm text-muted-foreground">{studio.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-secondary rounded-md">
              <div className="font-medium">{selectedStudio.username}</div>
              <div className="text-sm text-muted-foreground">{selectedStudio.email}</div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Message (optional)</label>
              <Textarea
                placeholder="Introduce yourself and explain why you'd like to connect..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                data-testid="textarea-connection-note"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedStudio(null);
                  setNote("");
                }}
                className="flex-1"
                data-testid="button-back"
              >
                Back
              </Button>
              <Button
                onClick={handleSendRequest}
                disabled={requestMutation.isPending}
                className="flex-1"
                data-testid="button-send-request"
              >
                {requestMutation.isPending ? "Sending..." : "Send Request"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
