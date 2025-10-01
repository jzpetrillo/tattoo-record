import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import PostCard from "./post-card";
import { useState } from "react";

export default function PostFeed() {
  const { token } = useAuth();
  const [filter, setFilter] = useState("following");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["/api/posts"],
    enabled: !!token,
  });

  const filters = [
    { id: "following", label: "Following", icon: null },
    { id: "trending", label: "Trending", icon: null },
    { id: "artists", label: "Artists", icon: null },
    { id: "studios", label: "Studios", icon: null },
    { id: "live", label: "Live Now", icon: "fa-fire" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`filter-${f.id}`}
          >
            {f.icon && <i className={`fas ${f.icon} mr-1 text-accent`}></i>}
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading posts...</div>
        ) : posts?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No posts yet. Follow some artists to see their work!
          </div>
        ) : (
          posts?.map((item: any) => (
            <PostCard key={item.post.id} post={item.post} author={item.author} />
          ))
        )}
      </div>
    </div>
  );
}
