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
    <div className="max-w-7xl mx-auto px-6 pb-24">
      {isLoading ? (
        <div className="text-center py-24 text-sm uppercase tracking-wider opacity-60">
          Loading...
        </div>
      ) : posts?.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-sm uppercase tracking-wider opacity-60 mb-6">
            No posts yet
          </p>
          <p className="text-xs uppercase tracking-wider opacity-40">
            Start following artists to see their work
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-border">
          {posts?.map((item: any) => (
            <PostCard key={item.post.id} post={item.post} author={item.author} />
          ))}
        </div>
      )}
    </div>
  );
}
