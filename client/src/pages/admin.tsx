import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, ShieldCheck, Users, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { useState } from "react";

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/admin/users", activeTab.toUpperCase()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?status=${activeTab.toUpperCase()}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return await res.json();
    },
    enabled: !!token && user?.role === "ADMIN",
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("PUT", `/api/admin/users/${userId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
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
      return apiRequest("PUT", `/api/admin/users/${userId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
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
              Manage user accounts and review verification requests
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="pending" className="flex items-center gap-1.5" data-testid="tab-pending">
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pending</span>
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-1.5" data-testid="tab-approved">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Approved</span>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-1.5" data-testid="tab-rejected">
                <XCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rejected</span>
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-1.5" data-testid="tab-all">
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">All</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
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
              ) : !users || users.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">
                      No {activeTab} users found
                    </p>
                    <p className="text-muted-foreground">
                      {activeTab === "pending" 
                        ? "All user accounts have been reviewed" 
                        : `There are no ${activeTab} user accounts`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {users.map((userItem: any) => (
                    <Card key={userItem.id} data-testid={`card-user-${userItem.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <img
                              src={userItem.avatarUrl || `https://ui-avatars.com/api/?name=${userItem.username}&background=000&color=fff`}
                              alt={userItem.username}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg" data-testid={`text-username-${userItem.id}`}>
                                  {userItem.username}
                                </h3>
                                <Badge variant="outline" className="uppercase text-xs">
                                  {userItem.role}
                                </Badge>
                                {userItem.verificationStatus && (
                                  <Badge 
                                    variant={userItem.verificationStatus === "APPROVED" ? "default" : userItem.verificationStatus === "REJECTED" ? "destructive" : "secondary"}
                                  >
                                    {userItem.verificationStatus}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2" data-testid={`text-email-${userItem.id}`}>
                                {userItem.email}
                              </p>
                              {userItem.bio && (
                                <p className="text-sm mt-2">{userItem.bio}</p>
                              )}
                              {userItem.location?.city && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  📍 {userItem.location.city}
                                  {userItem.location.country && `, ${userItem.location.country}`}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                Registered: {new Date(userItem.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {userItem.verificationStatus !== "APPROVED" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => approveMutation.mutate(userItem.id)}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                                data-testid={`button-approve-${userItem.id}`}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              {userItem.verificationStatus !== "REJECTED" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectMutation.mutate(userItem.id)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                  data-testid={`button-reject-${userItem.id}`}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
