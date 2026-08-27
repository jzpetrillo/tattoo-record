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
import UserAvatar from "@/components/user-avatar";
import { Building2, Search, UserPlus } from "lucide-react";

export function StudioConnectionDialog() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const { token, user } = useAuth();
  const isStudio = user?.role === "STUDIO";
  const counterpartRole = isStudio ? "ARTIST" : "STUDIO";

  const { data: searchResults } = useQuery<{ users: any[] }>({
    queryKey: ["/api/search", searchQuery, counterpartRole],
    enabled: Boolean(token && searchQuery.length > 2),
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/search?q=${encodeURIComponent(searchQuery)}`, undefined, token!);
      return res.json();
    },
  });
  const candidates = (searchResults?.users ?? []).filter((candidate: any) => candidate.role === counterpartRole);

  const requestMutation = useMutation({
    mutationFn: async () => {
      const body = isStudio
        ? { artistId: selectedUser.id, note: note || null }
        : { studioId: selectedUser.id, note: note || null };
      const res = await apiRequest("POST", "/api/studio-approvals", body, token!);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio-approvals"] });
      toast({ description: isStudio ? "Artist invite sent!" : "Connection request sent!" });
      setOpen(false);
      setSelectedUser(null);
      setNote("");
      setSearchQuery("");
    },
    onError: (error: Error) => toast({ variant: "destructive", description: error.message || "Failed to send request" }),
  });

  if (user?.role !== "ARTIST" && user?.role !== "STUDIO") return null;
  const label = isStudio ? "Invite Artist" : "Connect to Studio";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-request-studio-connection">
          {isStudio ? <UserPlus className="w-4 h-4 mr-2" /> : <Building2 className="w-4 h-4 mr-2" />}
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{isStudio ? "Invite an Artist" : "Request Studio Connection"}</DialogTitle></DialogHeader>
        {!selectedUser ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder={`Search for ${counterpartRole.toLowerCase()}s...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {candidates.map((candidate: any) => (
                <button key={candidate.id} onClick={() => setSelectedUser(candidate)} className="w-full p-3 text-left hover:bg-secondary rounded-md transition-colors flex gap-3 items-center" data-testid={`connection-option-${candidate.id}`}>
                  <UserAvatar avatarUrl={candidate.avatarUrl} firstName={candidate.firstName} lastName={candidate.lastName} username={candidate.username} className="w-9 h-9" />
                  <div><div className="font-medium">{candidate.username}</div><div className="text-sm text-muted-foreground">{candidate.role.toLowerCase()}</div></div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-secondary rounded-md flex gap-3 items-center">
              <UserAvatar avatarUrl={selectedUser.avatarUrl} firstName={selectedUser.firstName} lastName={selectedUser.lastName} username={selectedUser.username} className="w-10 h-10" />
              <div className="font-medium">{selectedUser.username}</div>
            </div>
            <div><label className="text-sm font-medium mb-2 block">Message (optional)</label><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} data-testid="textarea-connection-note" /></div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setSelectedUser(null); setNote(""); }} className="flex-1">Back</Button>
              <Button onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending} className="flex-1">{requestMutation.isPending ? "Sending..." : "Send"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}