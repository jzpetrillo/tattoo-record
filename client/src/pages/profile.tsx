import { useQuery, useMutation } from "@tanstack/react-query";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Check, X, MapPin, Globe, Grid3x3, Bookmark, Star } from "lucide-react";
import { StudioConnectionDialog } from "@/components/studio-connection-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function Profile() {
  const { user, token } = useAuth();
  const { toast } = useToast();

  const { data: userPosts } = useQuery({
    queryKey: [`/api/posts?authorId=${user?.id}`],
    enabled: !!token && !!user,
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
    enabled: !!token && !!user && user?.role === "STUDIO",
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest(`/api/studio-approvals/${requestId}/approve`, {
        method: "PUT",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio-approvals"] });
      queryClient.invalidateQueries({ queryKey: [`/api/studios/${user?.id}/artists`] });
      toast({ description: "Request approved!" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest(`/api/studio-approvals/${requestId}/reject`, {
        method: "PUT",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio-approvals"] });
      toast({ description: "Request rejected" });
    },
  });

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
                <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-2xl md:text-5xl font-bold">{user?.username?.[0]?.toUpperCase()}</span>
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
              {user?.role === "ARTIST" && !studioConnection?.studio && (
                <StudioConnectionDialog />
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-8 mb-5">
              <div className="flex gap-1">
                <span className="font-semibold">{userPosts?.length || 0}</span>
                <span className="text-muted-foreground">posts</span>
              </div>
              <button className="flex gap-1 hover:opacity-70 transition-opacity" data-testid="button-followers">
                <span className="font-semibold">0</span>
                <span className="text-muted-foreground">followers</span>
              </button>
              <button className="flex gap-1 hover:opacity-70 transition-opacity" data-testid="button-following">
                <span className="font-semibold">0</span>
                <span className="text-muted-foreground">following</span>
              </button>
            </div>

            {/* Bio and Details */}
            <div className="space-y-1">
              <div className="font-semibold text-sm">{user?.email}</div>
              
              {user?.bio && (
                <p className="text-sm whitespace-pre-wrap">{user.bio}</p>
              )}

              {/* Studio Connection (for Artists) */}
              {user?.role === "ARTIST" && studioConnection?.studio && (
                <div className="flex items-center gap-1.5 text-sm" data-testid="studio-connection">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">{studioConnection.studio.username}</span>
                </div>
              )}

              {/* Studio Address */}
              {user?.role === "STUDIO" && user?.location && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{user.location.city}{user.location.country && `, ${user.location.country}`}</span>
                </div>
              )}

              {/* Studio Website */}
              {user?.role === "STUDIO" && user?.links?.website && (
                <a 
                  href={user.links.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  data-testid="link-studio-website"
                >
                  <Globe className="w-4 h-4" />
                  <span>{user.links.website}</span>
                </a>
              )}

              {/* Artist Website & Social Links */}
              {user?.role === "ARTIST" && (user?.website || user?.instagram || user?.tiktok || user?.twitter) && (
                <div className="flex flex-wrap items-center gap-3 text-sm mt-2">
                  {user.website && (
                    <a 
                      href={user.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                      data-testid="link-artist-website"
                    >
                      {user.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {user.instagram && (
                    <a 
                      href={`https://instagram.com/${user.instagram.replace('@', '')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      data-testid="link-instagram"
                    >
                      Instagram
                    </a>
                  )}
                  {user.tiktok && (
                    <a 
                      href={`https://tiktok.com/@${user.tiktok.replace('@', '')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      data-testid="link-tiktok"
                    >
                      TikTok
                    </a>
                  )}
                  {user.twitter && (
                    <a 
                      href={`https://twitter.com/${user.twitter.replace('@', '')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      data-testid="link-twitter"
                    >
                      Twitter
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Pending Connection Requests (for Studios) */}
        {user?.role === "STUDIO" && pendingRequests && pendingRequests.length > 0 && (
          <div className="mb-8 pb-8 border-b border-border">
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Pending Requests</h2>
            <div className="space-y-3">
              {pendingRequests.map((item: any) => (
                <div key={item.request.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg" data-testid={`pending-request-${item.request.id}`}>
                  <div className="flex-1">
                    <div className="font-medium">{item.artist.username}</div>
                    {item.request.note && (
                      <p className="text-sm text-muted-foreground mt-1">{item.request.note}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
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

        {/* Tabs */}
        <div className="border-t border-border">
          <div className="flex items-center justify-center gap-12">
            <button className="flex items-center gap-2 py-3 border-t-2 border-foreground -mt-px" data-testid="tab-posts">
              <Grid3x3 className="w-3 h-3" />
              <span className="text-xs font-semibold uppercase tracking-widest">Posts</span>
            </button>
            <button className="flex items-center gap-2 py-3 text-muted-foreground" data-testid="tab-saved">
              <Bookmark className="w-3 h-3" />
              <span className="text-xs font-semibold uppercase tracking-widest">Saved</span>
            </button>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-1 mt-1">
          {userPosts?.map((item: any) => (
            <div key={item.post.id} className="aspect-square bg-secondary group cursor-pointer relative" data-testid={`post-${item.post.id}`}>
              {item.post.media?.[0]?.url && (
                <img
                  src={item.post.media[0].url}
                  alt="Post"
                  className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                />
              )}
            </div>
          ))}
        </div>

        {userPosts?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-2xl font-light">No posts yet</p>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
