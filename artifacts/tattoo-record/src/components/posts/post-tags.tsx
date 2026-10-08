import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import type { TaggableAccount } from "@/components/posts/tag-picker";

export default function PostTags({ postId }: { postId: string }) {
  const { token, user } = useAuth();
  const { data, isError, refetch } = useQuery<TaggableAccount[]>({
    queryKey: [`/api/posts/${postId}/tags`, user?.id ?? null],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/posts/${postId}/tags`, undefined, token!);
      return res.json();
    },
    staleTime: 15000,
  });
  if (isError) return <p className="text-sm text-muted-foreground">Unable to load tattoo credits. <button type="button" onClick={() => refetch()} className="underline">Retry</button></p>;
  if (!data || data.length === 0) return null;
  return (
    <p className="text-sm" data-testid={`tags-${postId}`}>
      <span className="text-muted-foreground mr-2">With</span>
      {data.map((a, i) => (
        <span key={a.id}>
          <Link href={`/u/${a.username}`} className="font-semibold hover:underline" data-testid={`link-tag-${postId}-${a.id}`}>
            @{a.username}
          </Link>
          {i < data.length - 1 && ", "}
        </span>
      ))}
    </p>
  );
}
