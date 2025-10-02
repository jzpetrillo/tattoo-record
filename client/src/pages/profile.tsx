import { useQuery } from "@tanstack/react-query";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { Building2, MapPin, Globe } from "lucide-react";

export default function Profile() {
  const { user, token } = useAuth();

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

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <main className="lg:ml-64 pb-20 lg:pb-8 pt-4 max-w-5xl mx-auto px-4">
        {/* Profile Header */}
        <div className="mb-8 pb-8 border-b border-border">
          <div className="flex items-start gap-8">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <span className="text-4xl font-bold">{user?.username?.[0]?.toUpperCase()}</span>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="mb-4">
                <h1 className="text-2xl font-semibold mb-1" data-testid="text-username">
                  {user?.username}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {user?.role} • {user?.email}
                </p>
                
                {user?.role === "ARTIST" && studioConnection?.studio && (
                  <div className="mt-2 flex items-center gap-2 text-sm" data-testid="studio-connection">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium">{studioConnection.studio.username}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-8 mb-4">
                <div className="text-center">
                  <div className="font-semibold">{userPosts?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">posts</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">0</div>
                  <div className="text-sm text-muted-foreground">followers</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">0</div>
                  <div className="text-sm text-muted-foreground">following</div>
                </div>
              </div>

              {user?.bio && (
                <p className="text-sm">{user.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Connected Artists Section (for Studios) */}
        {user?.role === "STUDIO" && connectedArtists && connectedArtists.length > 0 && (
          <div className="mb-8 pb-8 border-b border-border">
            <h2 className="text-lg font-semibold mb-4">Connected Artists</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {connectedArtists.map((item: any) => (
                <div key={item.artist.id} className="text-center" data-testid={`connected-artist-${item.artist.id}`}>
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl font-bold">{item.artist.username[0].toUpperCase()}</span>
                  </div>
                  <p className="text-sm font-medium truncate">{item.artist.username}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-1">
          {userPosts?.map((item: any) => (
            <div key={item.post.id} className="aspect-square bg-secondary group cursor-pointer" data-testid={`post-${item.post.id}`}>
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
      </main>
      <MobileNav />
    </div>
  );
}
