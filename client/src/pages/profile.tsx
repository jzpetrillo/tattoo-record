import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { user, token } = useAuth();

  const { data: userPosts } = useQuery({
    queryKey: [`/api/posts?authorId=${user?.id}`],
    enabled: !!token && !!user,
  });

  const { data: portfolio } = useQuery({
    queryKey: [`/api/portfolio/${user?.id}`],
    enabled: !!token && !!user && user.role === "ARTIST",
  });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-64 xl:ml-72 pb-20 lg:pb-0">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-start gap-6 mb-8">
            <img
              src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}`}
              alt={user?.username}
              className="w-24 h-24 rounded-full ring-4 ring-primary"
              data-testid="img-profile-avatar"
            />
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-2xl font-bold" data-testid="text-username">{user?.username}</h1>
                <Button variant="outline" size="sm" data-testid="button-edit-profile">
                  <i className="fas fa-edit mr-2"></i>
                  Edit Profile
                </Button>
              </div>
              <p className="text-muted-foreground mb-4">Bio content here</p>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-bold">0</span> posts
                </div>
                <div>
                  <span className="font-bold">0</span> followers
                </div>
                <div>
                  <span className="font-bold">0</span> following
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-6">
              <TabsTrigger value="posts" data-testid="tab-posts">
                <i className="fas fa-th mr-2"></i>
                Posts
              </TabsTrigger>
              <TabsTrigger value="portfolio" data-testid="tab-portfolio">
                <i className="fas fa-briefcase mr-2"></i>
                Portfolio
              </TabsTrigger>
              <TabsTrigger value="saved" data-testid="tab-saved">
                <i className="fas fa-bookmark mr-2"></i>
                Saved
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts">
              <div className="grid grid-cols-3 gap-1">
                {userPosts?.map((item: any) => (
                  <div key={item.post.id} className="relative aspect-square bg-secondary" data-testid={`post-${item.post.id}`}>
                    {item.post.media?.[0]?.url && (
                      <img
                        src={item.post.media[0].url}
                        alt="Post"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="portfolio">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {portfolio?.map((item: any) => (
                  <div key={item.id} className="bg-card rounded-lg overflow-hidden" data-testid={`portfolio-${item.id}`}>
                    {item.media?.[0]?.url && (
                      <img
                        src={item.media[0].url}
                        alt={item.title}
                        className="w-full aspect-square object-cover"
                      />
                    )}
                    <div className="p-3">
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="saved">
              <div className="text-center py-12 text-muted-foreground">
                No saved posts yet
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
