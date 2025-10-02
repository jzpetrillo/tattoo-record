import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import PostCard from "./post-card";

export default function PostFeed() {
  const { token } = useAuth();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["/api/posts"],
    enabled: !!token,
  });

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading...
        </div>
      ) : posts?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">
            No posts yet
          </p>
          <p className="text-sm text-muted-foreground">
            Start following artists to see their work
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts?.map((item: any) => (
            <PostCard key={item.post.id} post={item.post} author={item.author} />
          ))}
        </div>
      )}
    </div>
  );
}
