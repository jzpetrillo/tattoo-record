import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import UserAvatar from "@/components/user-avatar";

export interface TaggableAccount {
  id: string;
  username: string;
  role: "ARTIST" | "STUDIO";
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
}

export const MAX_TAGS = 10;

export default function TagPicker({
  selected,
  onChange,
}: {
  selected: TaggableAccount[];
  onChange: (next: TaggableAccount[]) => void;
}) {
  const { token } = useAuth();
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 250);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isFetching, isError, refetch } = useQuery<TaggableAccount[]>({
    queryKey: ["/api/taggable-accounts", q],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/taggable-accounts?q=${encodeURIComponent(q)}`, undefined, token!);
      return res.json();
    },
    enabled: Boolean(token) && q.length >= 1,
  });

  const atCap = selected.length >= MAX_TAGS;
  const results = (data ?? []).filter((a) => !selected.some((s) => s.id === a.id));

  return (
    <div data-testid="tag-picker">
      <label className="block text-sm font-medium mb-2" htmlFor="tag-search">
        Tag the artist or studio ({selected.length}/{MAX_TAGS})
      </label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-2 border border-border bg-secondary pl-2 pr-1 py-1 text-sm" data-testid={`chip-tag-${a.id}`}>
              @{a.username}
              <button
                type="button"
                onClick={() => onChange(selected.filter((s) => s.id !== a.id))}
                className="inline-flex h-7 w-7 items-center justify-center hover:text-primary"
                aria-label={`Remove tag ${a.username}`}
                data-testid={`button-remove-chip-${a.id}`}
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        id="tag-search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={atCap ? "Tag limit reached" : "Search artists and studios"}
        disabled={atCap}
        data-testid="input-tag-search"
      />
      {q.length >= 1 && !atCap && (
        <div className="mt-1 border border-border bg-card max-h-48 overflow-y-auto" data-testid="tag-results">
          {isFetching ? (
            <p className="p-3 text-sm text-muted-foreground">Searching...</p>
          ) : isError ? (
            <p className="p-3 text-sm text-muted-foreground">
              Search failed.{" "}
              <button type="button" className="underline text-primary" onClick={() => refetch()}>Try again</button>
            </p>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No artists or studios found</p>
          ) : (
            results.map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => {
                  onChange([...selected, a]);
                  setInput("");
                }}
                className="flex w-full items-center gap-3 p-2 text-left hover:bg-secondary min-h-[44px]"
                data-testid={`option-tag-${a.id}`}
              >
                <UserAvatar {...a} className="w-8 h-8" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold truncate">{a.username}</span>
                  <span className="block text-xs text-muted-foreground">{a.role}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
