import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import PostCard from "./post-card";
import { FeedSkeleton } from "@/components/ui/skeletons";
import { ImageIcon, AlertCircle } from "lucide-react";

export default function PostFeed() {
  const { token } = useAuth();

  const { data: posts, isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ["/api/posts"],
    enabled: !!token,
  });

  return (
    <div className="w-full">
      {isLoading ? (
        <FeedSkeleton count={3} />
      ) : isError ? (
        <div className="text-center py-12">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">Failed to load posts</p>
          <button onClick={() => refetch()} className="text-sm text-primary underline">Try again</button>
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
            <PostCard 
              key={item.post.id} 
              post={item.post} 
              author={item.author} 
              isLiked={item.isLiked}
            />
          ))}
        </div>
      )}
    </div>
  );
}
