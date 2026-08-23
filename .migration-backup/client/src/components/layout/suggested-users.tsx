import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function SuggestedUsers() {
  const { user, token } = useAuth();
  const { toast } = useToast();

  const { data: suggestions } = useQuery<any[]>({
    queryKey: ["/api/users/suggestions"],
    enabled: !!token,
  });

  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/users/${userId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/suggestions"] });
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
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                {suggestedUser.avatarUrl ? (
                  <img src={suggestedUser.avatarUrl} alt={suggestedUser.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold">{suggestedUser.username[0].toUpperCase()}</span>
                )}
              </div>
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
