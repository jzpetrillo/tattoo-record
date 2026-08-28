import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/user-avatar";

export default function SuggestedUsers() {
  const { user, token } = useAuth();
  const { toast } = useToast();

  const { data: recommendations } = useQuery<{ suggestedUsers?: any[] }>({
    queryKey: ["/api/for-you"],
    enabled: !!token,
  });
  const suggestions = recommendations?.suggestedUsers ?? [];

  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/users/${userId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/for-you"] });
      toast({ title: "Success", description: "User followed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Suggested for you</h3>
        <button className="text-xs font-semibold hover:text-muted-foreground">See All</button>
      </div>

      <div className="space-y-3">
        {suggestions.slice(0, 5).map((suggestedUser: any) => (
          <div key={suggestedUser.id} className="flex items-center justify-between" data-testid={`suggested-user-${suggestedUser.id}`}>
            <div className="flex items-center gap-3">
              <UserAvatar {...suggestedUser} className="w-8 h-8 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{suggestedUser.username}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {suggestedUser.bio || `${suggestedUser.role}`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-semibold text-primary hover:text-primary/80"
              onClick={() => followMutation.mutate(suggestedUser.id)}
              disabled={followMutation.isPending}
              data-testid={`button-follow-${suggestedUser.id}`}
            >
              {followMutation.isPending ? "..." : "Follow"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
