import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const { toast } = useToast();

  const { data: pendingUsers, isLoading } = useQuery({
    queryKey: ["/api/admin/pending-users"],
    enabled: !!token && user?.role === "ADMIN",
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PUT", `/api/admin/users/${userId}/approve`, {}, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
      toast({
        title: "User approved",
        description: "The user has been verified and approved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to approve user",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PUT", `/api/admin/users/${userId}/reject`, {}, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
      toast({
        title: "User rejected",
        description: "The user verification has been rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reject user",
      });
    },
  });

  if (user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You do not have permission to access the admin dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      
      <div className="lg:ml-64 pb-16 lg:pb-0">
        <div className="container max-w-7xl mx-auto p-4 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Review and approve pending artist and studio accounts
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-20 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !pendingUsers || pendingUsers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No pending approvals</p>
                <p className="text-muted-foreground">
                  All user accounts have been reviewed
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingUsers.map((pendingUser: any) => (
                <Card key={pendingUser.id} data-testid={`card-pending-user-${pendingUser.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <img
                          src={pendingUser.avatarUrl || `https://ui-avatars.com/api/?name=${pendingUser.username}&background=000&color=fff`}
                          alt={pendingUser.username}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg" data-testid={`text-username-${pendingUser.id}`}>
                              {pendingUser.username}
                            </h3>
                            <Badge variant="outline" className="uppercase text-xs">
                              {pendingUser.role}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2" data-testid={`text-email-${pendingUser.id}`}>
                            {pendingUser.email}
                          </p>
                          {pendingUser.bio && (
                            <p className="text-sm mt-2">{pendingUser.bio}</p>
                          )}
                          {pendingUser.location?.city && (
                            <p className="text-sm text-muted-foreground mt-1">
                              📍 {pendingUser.location.city}
                              {pendingUser.location.country && `, ${pendingUser.location.country}`}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Registered: {new Date(pendingUser.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approveMutation.mutate(pendingUser.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          data-testid={`button-approve-${pendingUser.id}`}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectMutation.mutate(pendingUser.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          data-testid={`button-reject-${pendingUser.id}`}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
