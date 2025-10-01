import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Marquee from "@/components/layout/marquee";
import { useAuth } from "@/hooks/use-auth";

export default function Profile() {
  const { user, token } = useAuth();

  const { data: userPosts } = useQuery({
    queryKey: [`/api/posts?authorId=${user?.id}`],
    enabled: !!token && !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        <Marquee text={`${user?.username?.toUpperCase()} / ${user?.role}`} />
        
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-16">
            <h1 className="text-6xl uppercase font-bold mb-4 tracking-tight" data-testid="text-username">
              {user?.username}
            </h1>
            <p className="text-sm uppercase tracking-wider opacity-60 mb-8">
              {user?.role} / {user?.email}
            </p>
            <div className="flex gap-8 text-sm uppercase tracking-wider">
              <div>
                <span className="font-bold">{userPosts?.length || 0}</span> Works
              </div>
              <div>
                <span className="font-bold">0</span> Followers
              </div>
              <div>
                <span className="font-bold">0</span> Following
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl uppercase font-bold mb-8 tracking-tight">Work</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-border">
              {userPosts?.map((item: any) => (
                <div key={item.post.id} className="border-r border-b border-border group cursor-pointer" data-testid={`post-${item.post.id}`}>
                  {item.post.media?.[0]?.url && (
                    <div className="relative aspect-square bg-secondary overflow-hidden">
                      <img
                        src={item.post.media[0].url}
                        alt="Post"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
