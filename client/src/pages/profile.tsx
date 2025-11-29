import { useQuery, useMutation } from "@tanstack/react-query";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Check, X, MapPin, Globe, Star, Film, Image as ImageIcon, MessageCircle, Heart, Briefcase, Palette, UserPlus, UserMinus, Calendar, Loader2 } from "lucide-react";
import { StudioConnectionDialog } from "@/components/studio-connection-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type TabType = "POSTS" | "VIDEOS" | "PORTFOLIO";

export default function Profile() {
  const { user: currentUser, token } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const username = params.username;
  const [activeTab, setActiveTab] = useState<TabType>("POSTS");
  const [, navigate] = useLocation();

  // Fetch profile user data if viewing another user's profile
  const { data: profileUserData, isLoading: isLoadingProfile } = useQuery({
    queryKey: [`/api/users/${username}`],
    enabled: !!username && !!token,
  });

  // Use profile user if viewing another user, otherwise use logged-in user
  const user = username && profileUserData ? profileUserData : currentUser;
  const isOwnProfile = !username || username === currentUser?.username;

  const { data: userStats } = useQuery({
    queryKey: [`/api/users/${user?.id}/stats`],
    enabled: !!token && !!user,
  });

  // Fetch posts/videos based on active tab
  const postType = activeTab === "POSTS" ? "POST" : "REEL";
  const { data: userPosts } = useQuery({
    queryKey: [`/api/posts?authorId=${user?.id}&type=${postType}`],
    enabled: !!token && !!user && activeTab !== "PORTFOLIO",
  });

  // Fetch portfolio items
  const { data: portfolioItems } = useQuery({
    queryKey: [`/api/portfolio/${user?.id}`],
    enabled: !!token && !!user && activeTab === "PORTFOLIO",
  });

  const { data: studioConnection } = useQuery({
    queryKey: [`/api/artists/${user?.id}/studio`],
    enabled: !!token && !!user && user?.role === "ARTIST",
  });

  const { data: connectedArtists } = useQuery({
    queryKey: [`/api/studios/${user?.id}/artists`],
    enabled: !!token && !!user && user?.role === "STUDIO",
  });

  const { data: pendingRequests } = useQuery({
    queryKey: ["/api/studio-approvals", { studioId: user?.id, status: "PENDING" }],
    enabled: !!token && !!user && user?.role === "STUDIO" && isOwnProfile,
  });

  // Check if current user follows this profile
  const { data: followStatus } = useQuery<{ isFollowing: boolean }>({
    queryKey: [`/api/users/${user?.id}/is-following`],
    enabled: !!token && !!user && !isOwnProfile,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/users/${user?.id}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/is-following`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/stats`] });
      toast({ description: `You are now following ${user?.username}` });
    },
    onError: () => {
      toast({ description: "Failed to follow user", variant: "destructive" });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/users/${user?.id}/unfollow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/is-following`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/stats`] });
      toast({ description: `Unfollowed ${user?.username}` });
    },
    onError: () => {
      toast({ description: "Failed to unfollow user", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("PUT", `/api/studio-approvals/${requestId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio-approvals"] });
      queryClient.invalidateQueries({ queryKey: [`/api/studios/${user?.id}/artists`] });
      toast({ description: "Request approved!" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("PUT", `/api/studio-approvals/${requestId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio-approvals"] });
      toast({ description: "Request rejected" });
    },
  });

  // Get tab label based on user role
  const getPortfolioTabLabel = () => {
    if (user?.role === "ENTHUSIAST") return "Tattoos";
    return "Portfolio";
  };

  // Profile skeleton component
  const ProfileSkeleton = () => (
    <div className="max-w-4xl mx-auto px-4 pt-8">
      <div className="flex gap-8 md:gap-16 mb-11">
        <Skeleton className="w-20 h-20 md:w-36 md:h-36 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="flex gap-8">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-12 w-full mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="aspect-[4/5]" />
        ))}
      </div>
    </div>
  );

  if (isLoadingProfile && username) {
    return (
      <div className="min-h-screen bg-background">
        <SidebarNav />
        <main className="lg:ml-64 pb-20 lg:pb-8">
          <ProfileSkeleton />
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <main className="lg:ml-64 pb-20 lg:pb-8">
        {/* Banner Image with Grid Overlay */}
        {user?.bannerImageUrl && (
          <div className="relative w-full h-48 md:h-64 lg:h-80 overflow-hidden bg-secondary">
            <img
              src={user.bannerImageUrl}
              alt="Profile banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-grid opacity-30" />
          </div>
        )}
        
        <div className="max-w-4xl mx-auto px-4">
          {/* Profile Header */}
          <div className={`flex gap-8 md:gap-16 mb-11 ${user?.bannerImageUrl ? '-mt-12 md:-mt-16' : 'pt-8'}`}>
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 md:w-36 md:h-36 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-0.5">
              <div className="w-full h-full rounded-full bg-background p-1">
                <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl md:text-5xl font-bold">{user?.username?.[0]?.toUpperCase()}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            {/* Username and Actions */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-normal" data-testid="text-username">
                  {user?.username}
                </h1>
                {user?.isVerified && (
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" data-testid="icon-verified" />
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {isOwnProfile ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate("/settings")}
                  data-testid="button-edit-profile"
                >
                  Edit Profile
                </Button>
              ) : (
                <>
                  {/* Follow/Unfollow Button */}
                  {followStatus?.isFollowing ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => unfollowMutation.mutate()}
                      disabled={unfollowMutation.isPending}
                      data-testid="button-unfollow"
                      className="min-w-[100px]"
                    >
                      {unfollowMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserMinus className="w-4 h-4 mr-1" />
                          Following
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => followMutation.mutate()}
                      disabled={followMutation.isPending}
                      data-testid="button-follow"
                      className="min-w-[100px] bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    >
                      {followMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Follow
                        </>
                      )}
                    </Button>
                  )}

                  {/* Message Button */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/messages?user=${user?.id}`)}
                    data-testid="button-message"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Message
                  </Button>

                  {/* Role-specific CTAs */}
                  {user?.role === "ARTIST" && (
                    <Button 
                      size="sm"
                      onClick={() => navigate(`/bookings?artist=${user?.id}`)}
                      data-testid="button-book-artist"
                      className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Book Now
                    </Button>
                  )}

                  {user?.role === "STUDIO" && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/jobs?studio=${user?.id}`)}
                      data-testid="button-view-jobs"
                    >
                      <Briefcase className="w-4 h-4 mr-1" />
                      View Jobs
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-8 mb-5">
              <div className="text-center" data-testid="stat-posts">
                <span className="font-semibold">{userStats?.postsCount || 0}</span>
                <span className="text-muted-foreground ml-1">posts</span>
              </div>
              <div className="text-center" data-testid="stat-followers">
                <span className="font-semibold">{userStats?.followersCount || 0}</span>
                <span className="text-muted-foreground ml-1">followers</span>
              </div>
              <div className="text-center" data-testid="stat-following">
                <span className="font-semibold">{userStats?.followingCount || 0}</span>
                <span className="text-muted-foreground ml-1">following</span>
              </div>
            </div>

            {/* Bio & Details */}
            <div className="space-y-2">
              {(user?.firstName || user?.lastName) && (
                <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
              )}
              {user?.bio && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{user?.bio}</p>
              )}
              
              {/* Role Badge */}
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  user?.role === "STUDIO" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                  user?.role === "ARTIST" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" :
                  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                }`}>
                  {user?.role}
                </span>
              </div>

              {/* Location */}
              {user?.location?.city && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{user.location.city}, {user.location.country}</span>
                </div>
              )}

              {/* Website */}
              {user?.website && (
                <div className="flex items-center gap-1 text-sm">
                  <Globe className="w-3 h-3" />
                  <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {user.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Artist's Studio Connection */}
        {user?.role === "ARTIST" && studioConnection && (
          <div className="mb-6 p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Connected to</p>
                <p className="text-lg font-semibold">{studioConnection.studio?.username}</p>
              </div>
            </div>
          </div>
        )}

        {/* Studio Connection Dialog for Artists viewing their own profile */}
        {isOwnProfile && user?.role === "ARTIST" && !studioConnection && (
          <div className="mb-6">
            <StudioConnectionDialog />
          </div>
        )}

        {/* Pending Requests (for Studios) */}
        {user?.role === "STUDIO" && isOwnProfile && pendingRequests && pendingRequests.length > 0 && (
          <div className="mb-6 p-4 border border-border rounded-lg bg-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Pending Artist Requests ({pendingRequests.length})
            </h3>
            <div className="space-y-3">
              {pendingRequests.map((item: any) => (
                <div key={item.request.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg" data-testid={`pending-request-${item.request.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                      <span className="font-semibold">{item.artist.username[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium">{item.artist.username}</p>
                      <p className="text-xs text-muted-foreground">{item.artist.firstName} {item.artist.lastName}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(item.request.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      data-testid={`button-approve-${item.request.id}`}
                      className="h-8 w-8 p-0"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMutation.mutate(item.request.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      data-testid={`button-reject-${item.request.id}`}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connected Artists Highlights (for Studios) */}
        {user?.role === "STUDIO" && connectedArtists && connectedArtists.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-4 overflow-x-auto pb-2 px-1 scrollbar-hide">
              {connectedArtists.slice(0, 10).map((item: any) => (
                <div key={item.artist.id} className="flex flex-col items-center flex-shrink-0" data-testid={`connected-artist-${item.artist.id}`}>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-0.5 mb-1">
                    <div className="w-full h-full rounded-full bg-background p-0.5">
                      <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center">
                        <span className="text-sm font-bold">{item.artist.username[0].toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs truncate max-w-[70px]">{item.artist.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs - Posts, Videos, Portfolio */}
        <div className="border-t border-border">
          <div className="flex items-center justify-center gap-8 md:gap-12">
            <button 
              onClick={() => setActiveTab("POSTS")}
              className={`flex items-center gap-2 py-3 border-t-2 -mt-px transition-colors ${
                activeTab === "POSTS" ? "border-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-posts"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest">Posts</span>
            </button>
            <button 
              onClick={() => setActiveTab("VIDEOS")}
              className={`flex items-center gap-2 py-3 border-t-2 -mt-px transition-colors ${
                activeTab === "VIDEOS" ? "border-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-videos"
            >
              <Film className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest">Videos</span>
            </button>
            <button 
              onClick={() => setActiveTab("PORTFOLIO")}
              className={`flex items-center gap-2 py-3 border-t-2 -mt-px transition-colors ${
                activeTab === "PORTFOLIO" ? "border-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-portfolio"
            >
              {user?.role === "ENTHUSIAST" ? (
                <Palette className="w-4 h-4" />
              ) : (
                <Briefcase className="w-4 h-4" />
              )}
              <span className="text-xs uppercase tracking-widest">{getPortfolioTabLabel()}</span>
            </button>
          </div>
        </div>

        {/* Posts/Videos Grid */}
        {activeTab !== "PORTFOLIO" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5 mt-1">
              {userPosts?.map((item: any) => (
                <div key={item.post.id} className="aspect-[4/5] bg-black group cursor-pointer relative overflow-hidden" data-testid={`post-${item.post.id}`}>
                  {item.post.media?.[0]?.url ? (
                    <img
                      src={item.post.media[0].url}
                      alt={activeTab}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  {activeTab === "VIDEOS" && (
                    <div className="absolute top-3 right-3">
                      <Film className="w-6 h-6 text-white drop-shadow-lg" />
                    </div>
                  )}
                  {/* Hover overlay with like/comment counts */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                    <div className="flex items-center gap-1 text-white">
                      <Heart className="w-5 h-5 fill-white" />
                      <span className="font-semibold">{item.post.likeCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white">
                      <MessageCircle className="w-5 h-5 fill-white" />
                      <span className="font-semibold">{item.post.commentCount || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {userPosts?.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <div className="mb-4">
                  {activeTab === "POSTS" ? (
                    <ImageIcon className="w-16 h-16 mx-auto opacity-50" />
                  ) : (
                    <Film className="w-16 h-16 mx-auto opacity-50" />
                  )}
                </div>
                <p className="text-xl font-light">No {activeTab.toLowerCase()} yet</p>
                <p className="text-sm mt-2">
                  {isOwnProfile ? "Share your first content to get started" : "No content to display"}
                </p>
              </div>
            )}
          </>
        )}

        {/* Portfolio/Tattoos Grid */}
        {activeTab === "PORTFOLIO" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 px-2">
              {portfolioItems?.map((item: any) => (
                <div 
                  key={item.id} 
                  className="bg-card border border-border rounded-lg overflow-hidden group cursor-pointer hover:shadow-xl transition-all"
                  data-testid={`portfolio-${item.id}`}
                >
                  {/* Large Featured Image */}
                  <div className="aspect-[4/3] bg-black relative overflow-hidden">
                    {item.media?.[0]?.url ? (
                      <img
                        src={item.media[0].url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <Palette className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Multiple images indicator */}
                    {item.media?.length > 1 && (
                      <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
                        +{item.media.length - 1} more
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1 line-clamp-1">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
                    )}
                    
                    {/* Categories/Tags */}
                    {item.categories?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.categories.slice(0, 3).map((cat: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 bg-secondary text-xs rounded-full">
                            {cat}
                          </span>
                        ))}
                        {item.categories.length > 3 && (
                          <span className="px-2 py-0.5 text-xs text-muted-foreground">
                            +{item.categories.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {(!portfolioItems || portfolioItems.length === 0) && (
              <div className="text-center py-16 text-muted-foreground">
                <div className="mb-4">
                  {user?.role === "ENTHUSIAST" ? (
                    <Palette className="w-16 h-16 mx-auto opacity-50" />
                  ) : (
                    <Briefcase className="w-16 h-16 mx-auto opacity-50" />
                  )}
                </div>
                <p className="text-xl font-light">
                  No {user?.role === "ENTHUSIAST" ? "tattoos" : "portfolio items"} yet
                </p>
                <p className="text-sm mt-2">
                  {isOwnProfile 
                    ? `Add your ${user?.role === "ENTHUSIAST" ? "tattoo collection" : "best work"} to showcase`
                    : "No work to display"}
                </p>
              </div>
            )}
          </>
        )}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
