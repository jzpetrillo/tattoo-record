import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Check, X, ShieldCheck, Users, Clock, CheckCircle2, XCircle, 
  LayoutDashboard, FileText, Briefcase, Zap, Calendar, Search,
  Trash2, Star, StarOff, Ban, UserPlus, Image, DollarSign,
  UserCog, UserCheck, Power, Plus, Edit2
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { AdminCardSkeleton, AdminStatSkeleton, BookingCardSkeleton, JobCardSkeleton, FlashSaleCardSkeleton } from "@/components/ui/skeletons";
import { useToast } from "@/hooks/use-toast";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { useState } from "react";

type AdminSection = "overview" | "users" | "posts" | "jobs" | "flash-sales" | "bookings" | "verification";

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [verificationTab, setVerificationTab] = useState("pending");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userSearch, setUserSearch] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [roleChangeUserId, setRoleChangeUserId] = useState<string | null>(null);
  const [roleChangeValue, setRoleChangeValue] = useState<string>("");
  const [createSaleOpen, setCreateSaleOpen] = useState(false);
  const [editSaleId, setEditSaleId] = useState<string | null>(null);
  const [newSale, setNewSale] = useState({ artistId: "", title: "", description: "", originalPrice: "", flashPrice: "", availableSlots: "1", expiresAt: "" });
  const [postsFeatureFilter, setPostsFeatureFilter] = useState<string>("all");
  const [postsAuthorSearch, setPostsAuthorSearch] = useState<string>("");

  // Stats query
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!token && user?.role === "ADMIN",
  });

  // Users for verification
  const { data: verificationUsers, isLoading: verificationLoading } = useQuery({
    queryKey: ["/api/admin/users", verificationTab.toUpperCase()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?status=${verificationTab.toUpperCase()}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: !!token && user?.role === "ADMIN" && activeSection === "verification",
  });

  // All users query
  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/all-users", userRoleFilter, userSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userRoleFilter !== "all") params.append("role", userRoleFilter);
      if (userSearch) params.append("search", userSearch);
      const res = await fetch(`/api/admin/all-users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: !!token && user?.role === "ADMIN" && activeSection === "users",
  });

  // Posts query
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["/api/admin/posts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/posts?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
    enabled: !!token && user?.role === "ADMIN" && activeSection === "posts",
  });

  // Jobs query
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/admin/jobs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/jobs", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
    enabled: !!token && user?.role === "ADMIN" && activeSection === "jobs",
  });

  // Flash sales query
  const { data: flashSales, isLoading: flashSalesLoading } = useQuery({
    queryKey: ["/api/admin/flash-sales"],
    queryFn: async () => {
      const res = await fetch("/api/admin/flash-sales", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch flash sales");
      return res.json();
    },
    enabled: !!token && user?.role === "ADMIN" && activeSection === "flash-sales",
  });

  // Bookings query
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/admin/bookings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/bookings", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
    enabled: !!token && user?.role === "ADMIN" && activeSection === "bookings",
  });

  // Artists list for flash sale create dialog
  const { data: artistsList } = useQuery({
    queryKey: ["/api/admin/all-users", "ARTIST", ""],
    queryFn: async () => {
      const res = await fetch(`/api/admin/all-users?role=ARTIST&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch artists");
      return res.json();
    },
    enabled: !!token && user?.role === "ADMIN" && createSaleOpen,
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => apiRequest("PUT", `/api/admin/users/${userId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User approved", description: "The user has been verified successfully." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => apiRequest("PUT", `/api/admin/users/${userId}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User rejected", description: "The user verification has been rejected." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const banMutation = useMutation({
    mutationFn: async (userId: string) => apiRequest("PUT", `/api/admin/users/${userId}/ban`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-users"] });
      toast({ title: "User banned", description: "The user has been banned." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => apiRequest("PUT", `/api/admin/users/${userId}/unban`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-users"] });
      toast({ title: "User unbanned", description: "The user has been unbanned." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => apiRequest("DELETE", `/api/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDeleteConfirmId(null);
      toast({ title: "User deleted", description: "The user has been deleted." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const featurePostMutation = useMutation({
    mutationFn: async (postId: string) => apiRequest("PUT", `/api/admin/posts/${postId}/feature`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      toast({ title: "Post featured", description: "The post is now featured." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const unfeaturePostMutation = useMutation({
    mutationFn: async (postId: string) => apiRequest("PUT", `/api/admin/posts/${postId}/unfeature`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      toast({ title: "Post unfeatured", description: "The post is no longer featured." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => apiRequest("DELETE", `/api/admin/posts/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Post deleted", description: "The post has been deleted." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const activateJobMutation = useMutation({
    mutationFn: async (jobId: string) => apiRequest("PUT", `/api/admin/jobs/${jobId}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      toast({ title: "Job activated", description: "The job posting is now active." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deactivateJobMutation = useMutation({
    mutationFn: async (jobId: string) => apiRequest("PUT", `/api/admin/jobs/${jobId}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      toast({ title: "Job deactivated", description: "The job posting is now inactive." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => apiRequest("DELETE", `/api/admin/jobs/${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Job deleted", description: "The job posting has been deleted." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteFlashSaleMutation = useMutation({
    mutationFn: async (saleId: string) => apiRequest("DELETE", `/api/admin/flash-sales/${saleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flash-sales"] });
      toast({ title: "Flash sale deleted", description: "The flash sale has been deleted." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const toggleFlashSaleMutation = useMutation({
    mutationFn: async (saleId: string) => apiRequest("PUT", `/api/admin/flash-sales/${saleId}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flash-sales"] });
      toast({ title: "Flash sale updated", description: "The flash sale status has been toggled." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const createFlashSaleMutation = useMutation({
    mutationFn: async (data: typeof newSale) => apiRequest("POST", "/api/admin/flash-sales", {
      artistId: data.artistId,
      title: data.title,
      description: data.description || undefined,
      originalPriceCents: Math.round(parseFloat(data.originalPrice) * 100),
      flashPriceCents: Math.round(parseFloat(data.flashPrice) * 100),
      availableSlots: parseInt(data.availableSlots),
      expiresAt: data.expiresAt,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flash-sales"] });
      setCreateSaleOpen(false);
      setNewSale({ artistId: "", title: "", description: "", originalPrice: "", flashPrice: "", availableSlots: "1", expiresAt: "" });
      toast({ title: "Flash sale created", description: "The flash sale has been created." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) =>
      apiRequest("PUT", `/api/admin/users/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setRoleChangeUserId(null);
      toast({ title: "Role updated", description: "The user's role has been changed." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => apiRequest("PUT", `/api/admin/bookings/${bookingId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({ title: "Booking cancelled", description: "The booking has been cancelled." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
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

  const adminNavItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "verification", label: "Verification", icon: ShieldCheck },
    { id: "users", label: "Users", icon: Users },
    { id: "posts", label: "Posts", icon: FileText },
    { id: "jobs", label: "Jobs", icon: Briefcase },
    { id: "flash-sales", label: "Flash Sales", icon: Zap },
    { id: "bookings", label: "Bookings", icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      
      <div className="lg:ml-64 pb-20 lg:pb-8 pt-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1" data-testid="admin-title">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage and monitor your platform
            </p>
          </div>

          {/* Admin Navigation */}
          <div className="flex flex-wrap gap-2 mb-8 border-b pb-4">
            {adminNavItems.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveSection(item.id as AdminSection)}
                className="flex items-center gap-2"
                data-testid={`nav-${item.id}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            ))}
          </div>

          {/* Overview Section */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">Platform Overview</h2>
              
              {statsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => <AdminStatSkeleton key={i} />)}
                </div>
              ) : stats ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Card data-testid="stat-total-users">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">Total Users</span>
                      </div>
                      <p className="text-3xl font-bold">{stats.totalUsers}</p>
                    </CardContent>
                  </Card>
                  
                  <Card data-testid="stat-posts">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Image className="w-4 h-4" />
                        <span className="text-sm">Total Posts</span>
                      </div>
                      <p className="text-3xl font-bold">{stats.totalPosts}</p>
                    </CardContent>
                  </Card>
                  
                  <Card data-testid="stat-bookings">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">Bookings</span>
                      </div>
                      <p className="text-3xl font-bold">{stats.totalBookings}</p>
                    </CardContent>
                  </Card>
                  
                  <Card data-testid="stat-jobs">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Briefcase className="w-4 h-4" />
                        <span className="text-sm">Job Postings</span>
                      </div>
                      <p className="text-3xl font-bold">{stats.totalJobs}</p>
                    </CardContent>
                  </Card>
                  
                  <Card data-testid="stat-pending">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Pending</span>
                      </div>
                      <p className="text-3xl font-bold">{stats.pendingVerifications}</p>
                    </CardContent>
                  </Card>
                  
                  <Card data-testid="stat-artists">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <UserPlus className="w-4 h-4" />
                        <span className="text-sm">Artists</span>
                      </div>
                      <p className="text-3xl font-bold">{stats.usersByRole?.ARTIST || 0}</p>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {/* Role breakdown */}
              {stats && (
                <Card>
                  <CardHeader>
                    <CardTitle>Users by Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(stats.usersByRole || {}).map(([role, count]) => (
                        <div key={role} className="flex items-center justify-between p-4 border border-border">
                          <span className="text-sm font-medium uppercase tracking-wide">{role}</span>
                          <Badge variant="secondary">{count as number}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Verification Section */}
          {activeSection === "verification" && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">User Verification</h2>
              
              <Tabs value={verificationTab} onValueChange={setVerificationTab} className="w-full">
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

                <TabsContent value={verificationTab} className="mt-6">
                  {verificationLoading ? (
                    <div className="grid gap-4">
                      {[1, 2, 3].map((i) => <AdminCardSkeleton key={i} />)}
                    </div>
                  ) : !verificationUsers || verificationUsers.length === 0 ? (
                    <EmptyState
                      icon={ShieldCheck}
                      title={`No ${verificationTab} users`}
                      description="No users match this verification status."
                    />
                  ) : (
                    <div className="grid gap-4">
                      {verificationUsers.map((userItem: any) => (
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
                                    <h3 className="font-semibold text-lg">{userItem.username}</h3>
                                    <Badge variant="outline" className="uppercase text-xs">{userItem.role}</Badge>
                                    {userItem.verificationStatus && (
                                      <StatusBadge status={userItem.verificationStatus} type="verification" />
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{userItem.email}</p>
                                  {userItem.bio && <p className="text-sm mt-2">{userItem.bio}</p>}
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
          )}

          {/* Users Management Section */}
          {activeSection === "users" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">User Management</h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9 w-64"
                      data-testid="input-search-users"
                    />
                  </div>
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger className="w-40" data-testid="select-role-filter">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="ARTIST">Artists</SelectItem>
                      <SelectItem value="STUDIO">Studios</SelectItem>
                      <SelectItem value="ENTHUSIAST">Enthusiasts</SelectItem>
                      <SelectItem value="ADMIN">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {usersLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3, 4, 5].map((i) => <AdminCardSkeleton key={i} />)}
                </div>
              ) : !allUsers || allUsers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No users found"
                  description="Try adjusting your search or filter."
                />
              ) : (
                <div className="space-y-2">
                  {allUsers.map((userItem: any) => (
                    <Card key={userItem.id} data-testid={`card-user-${userItem.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <img
                              src={userItem.avatarUrl || `https://ui-avatars.com/api/?name=${userItem.username}&background=000&color=fff`}
                              alt={userItem.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{userItem.username}</span>
                                <Badge variant="outline" className="uppercase text-xs">{userItem.role}</Badge>
                                {userItem.isBanned && (
                                  <Badge variant="destructive" className="text-xs">Banned</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{userItem.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap justify-end">
                            {userItem.isBanned ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unbanMutation.mutate(userItem.id)}
                                disabled={unbanMutation.isPending}
                                data-testid={`button-unban-${userItem.id}`}
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Unban
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => banMutation.mutate(userItem.id)}
                                disabled={banMutation.isPending || userItem.role === "ADMIN"}
                                data-testid={`button-ban-${userItem.id}`}
                              >
                                <Ban className="w-4 h-4 mr-1" />
                                Ban
                              </Button>
                            )}
                            <Dialog open={roleChangeUserId === userItem.id} onOpenChange={(open) => !open && setRoleChangeUserId(null)}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setRoleChangeUserId(userItem.id); setRoleChangeValue(userItem.role); }}
                                  data-testid={`button-role-${userItem.id}`}
                                >
                                  <UserCog className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Change Role — {userItem.username}</DialogTitle>
                                  <DialogDescription>
                                    Select a new role for this user. This affects what features they can access.
                                  </DialogDescription>
                                </DialogHeader>
                                <Select value={roleChangeValue} onValueChange={setRoleChangeValue}>
                                  <SelectTrigger data-testid="select-new-role">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ENTHUSIAST">Enthusiast</SelectItem>
                                    <SelectItem value="ARTIST">Artist</SelectItem>
                                    <SelectItem value="STUDIO">Studio</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setRoleChangeUserId(null)}>Cancel</Button>
                                  <Button
                                    onClick={() => changeRoleMutation.mutate({ userId: userItem.id, role: roleChangeValue })}
                                    disabled={changeRoleMutation.isPending || roleChangeValue === userItem.role}
                                    data-testid="button-confirm-role"
                                  >
                                    Save
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Dialog open={deleteConfirmId === userItem.id} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setDeleteConfirmId(userItem.id)}
                                  disabled={userItem.role === "ADMIN"}
                                  data-testid={`button-delete-${userItem.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete User</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to delete {userItem.username}? This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                                  <Button 
                                    variant="destructive" 
                                    onClick={() => deleteUserMutation.mutate(userItem.id)}
                                    disabled={deleteUserMutation.isPending}
                                  >
                                    Delete
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Posts Management Section */}
          {activeSection === "posts" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">Posts Management</h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by author..."
                      value={postsAuthorSearch}
                      onChange={(e) => setPostsAuthorSearch(e.target.value)}
                      className="pl-9 w-52"
                      data-testid="input-search-posts"
                    />
                  </div>
                  <Select value={postsFeatureFilter} onValueChange={setPostsFeatureFilter}>
                    <SelectTrigger className="w-36" data-testid="select-posts-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Posts</SelectItem>
                      <SelectItem value="featured">Featured Only</SelectItem>
                      <SelectItem value="unfeatured">Not Featured</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {postsLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3, 4].map((i) => <AdminCardSkeleton key={i} />)}
                </div>
              ) : !posts || posts.length === 0 ? (
                <EmptyState icon={FileText} title="No posts" description="No posts have been created yet." />
              ) : (
                <div className="space-y-2">
                  {posts.filter((post: any) => {
                    const authorMatch = !postsAuthorSearch || (post.author?.username || "").toLowerCase().includes(postsAuthorSearch.toLowerCase());
                    const featureMatch = postsFeatureFilter === "all" || (postsFeatureFilter === "featured" ? post.isFeatured : !post.isFeatured);
                    return authorMatch && featureMatch;
                  }).map((post: any) => (
                    <Card key={post.id} data-testid={`card-post-${post.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            {post.media?.[0] && (
                              <img
                                src={post.media[0].url}
                                alt="Post"
                                className="w-16 h-16 rounded object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{post.author?.username || "Unknown"}</span>
                                {post.isFeatured && (
                                  <Badge variant="default" className="text-xs">
                                    <Star className="w-3 h-3 mr-1" />
                                    Featured
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {post.caption || "No caption"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(post.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {post.isFeatured ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unfeaturePostMutation.mutate(post.id)}
                                disabled={unfeaturePostMutation.isPending}
                                data-testid={`button-unfeature-${post.id}`}
                              >
                                <StarOff className="w-4 h-4 mr-1" />
                                Unfeature
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => featurePostMutation.mutate(post.id)}
                                disabled={featurePostMutation.isPending}
                                data-testid={`button-feature-${post.id}`}
                              >
                                <Star className="w-4 h-4 mr-1" />
                                Feature
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deletePostMutation.mutate(post.id)}
                              disabled={deletePostMutation.isPending}
                              data-testid={`button-delete-post-${post.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Jobs Management Section */}
          {activeSection === "jobs" && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">Jobs Management</h2>

              {jobsLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((i) => <JobCardSkeleton key={i} />)}
                </div>
              ) : !jobs || jobs.length === 0 ? (
                <EmptyState icon={Briefcase} title="No job postings" description="No jobs have been posted yet." />
              ) : (
                <div className="space-y-2">
                  {jobs.map((job: any) => (
                    <Card key={job.id} data-testid={`card-job-${job.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{job.title}</span>
                              <Badge variant={job.isActive ? "default" : "secondary"}>
                                {job.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <StatusBadge status={job.type} type="job-type" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {job.studio?.username || "Unknown Studio"} - {job.location || "Remote"}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {job.description}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {job.isActive ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deactivateJobMutation.mutate(job.id)}
                                disabled={deactivateJobMutation.isPending}
                                data-testid={`button-deactivate-${job.id}`}
                              >
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => activateJobMutation.mutate(job.id)}
                                disabled={activateJobMutation.isPending}
                                data-testid={`button-activate-${job.id}`}
                              >
                                Activate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteJobMutation.mutate(job.id)}
                              disabled={deleteJobMutation.isPending}
                              data-testid={`button-delete-job-${job.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Flash Sales Management Section */}
          {activeSection === "flash-sales" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">Flash Sales Management</h2>
                <Dialog open={createSaleOpen} onOpenChange={setCreateSaleOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex items-center gap-2" data-testid="button-create-sale">
                      <Plus className="w-4 h-4" />
                      Create Sale
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Flash Sale</DialogTitle>
                      <DialogDescription>Create a flash sale on behalf of an artist.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div>
                        <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Artist</label>
                        <Select value={newSale.artistId} onValueChange={(v) => setNewSale(s => ({ ...s, artistId: v }))}>
                          <SelectTrigger data-testid="select-sale-artist">
                            <SelectValue placeholder="Select artist..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(artistsList || []).map((a: any) => (
                              <SelectItem key={a.id} value={a.id}>{a.username}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Title</label>
                        <Input value={newSale.title} onChange={(e) => setNewSale(s => ({ ...s, title: e.target.value }))} placeholder="Flash sale title" data-testid="input-sale-title" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Description (optional)</label>
                        <Input value={newSale.description} onChange={(e) => setNewSale(s => ({ ...s, description: e.target.value }))} placeholder="Brief description" data-testid="input-sale-description" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Original Price ($)</label>
                          <Input type="number" min="0" step="0.01" value={newSale.originalPrice} onChange={(e) => setNewSale(s => ({ ...s, originalPrice: e.target.value }))} placeholder="0.00" data-testid="input-sale-original-price" />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Flash Price ($)</label>
                          <Input type="number" min="0" step="0.01" value={newSale.flashPrice} onChange={(e) => setNewSale(s => ({ ...s, flashPrice: e.target.value }))} placeholder="0.00" data-testid="input-sale-flash-price" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Available Slots</label>
                          <Input type="number" min="1" value={newSale.availableSlots} onChange={(e) => setNewSale(s => ({ ...s, availableSlots: e.target.value }))} data-testid="input-sale-slots" />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Expires At</label>
                          <Input type="datetime-local" value={newSale.expiresAt} onChange={(e) => setNewSale(s => ({ ...s, expiresAt: e.target.value }))} data-testid="input-sale-expires" />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateSaleOpen(false)}>Cancel</Button>
                      <Button
                        onClick={() => createFlashSaleMutation.mutate(newSale)}
                        disabled={createFlashSaleMutation.isPending || !newSale.artistId || !newSale.title || !newSale.originalPrice || !newSale.flashPrice || !newSale.expiresAt}
                        data-testid="button-confirm-create-sale"
                      >
                        {createFlashSaleMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {flashSalesLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3].map((i) => <FlashSaleCardSkeleton key={i} />)}
                </div>
              ) : !flashSales || flashSales.length === 0 ? (
                <EmptyState icon={Zap} title="No flash sales" description="No flash sales have been created yet." />
              ) : (
                <div className="space-y-2">
                  {flashSales.map((sale: any) => (
                    <Card key={sale.id} data-testid={`card-sale-${sale.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            {sale.imageUrl && (
                              <img
                                src={sale.imageUrl}
                                alt={sale.title}
                                className="w-16 h-16 rounded object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{sale.title}</span>
                                <Badge variant={sale.isActive ? "default" : "secondary"}>
                                  {sale.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                By {sale.artist?.username || "Unknown"} - ${((sale.flashPriceCents ?? sale.originalPriceCents ?? 0) / 100).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {sale.availableSlots} slots available
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleFlashSaleMutation.mutate(sale.id)}
                              disabled={toggleFlashSaleMutation.isPending}
                              data-testid={`button-toggle-sale-${sale.id}`}
                            >
                              <Power className="w-4 h-4 mr-1" />
                              {sale.isActive ? "Pause" : "Resume"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteFlashSaleMutation.mutate(sale.id)}
                              disabled={deleteFlashSaleMutation.isPending}
                              data-testid={`button-delete-sale-${sale.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bookings Overview Section */}
          {activeSection === "bookings" && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">Bookings Overview</h2>

              {bookingsLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3, 4].map((i) => <BookingCardSkeleton key={i} />)}
                </div>
              ) : !bookings || bookings.length === 0 ? (
                <EmptyState icon={Calendar} title="No bookings" description="No bookings have been made yet." />
              ) : (
                <div className="space-y-2">
                  {bookings.map((booking: any) => (
                    <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {booking.client?.username || "Unknown"} → {booking.artist?.username || "Unknown"}
                              </span>
                              <StatusBadge status={booking.status} type="booking" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleString() : "Not scheduled"}
                            </p>
                            {booking.notes && (
                              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                {booking.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-sm text-muted-foreground">
                              <p>Payment: {booking.paymentStatus || "N/A"}</p>
                            </div>
                            {booking.status !== "REJECTED" && booking.status !== "CANCELLED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelBookingMutation.mutate(booking.id)}
                                disabled={cancelBookingMutation.isPending}
                                data-testid={`button-cancel-booking-${booking.id}`}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
