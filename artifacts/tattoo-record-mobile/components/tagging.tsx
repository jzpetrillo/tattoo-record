import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { api, resolveMediaUrls } from "@/lib/api";
import type { User } from "@/context/AuthContext";

export const MAX_TAGS = 10;
const LIMIT = 20;

export function TagPicker({ token, selected, onChange }: { token: string; selected: User[]; onChange: (next: User[]) => void }) {
  const colors = useColors();
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 250);
    return () => clearTimeout(t);
  }, [input]);
  const query = useQuery({
    queryKey: ["taggable-accounts", q, token],
    queryFn: async () => resolveMediaUrls(await api<User[]>(`/api/taggable-accounts?q=${encodeURIComponent(q)}`, {}, token)),
    enabled: q.length >= 1,
  });
  const atCap = selected.length >= MAX_TAGS;
  const results = (query.data ?? []).filter((a) => !selected.some((s) => s.id === a.id));
  return <View style={{ gap: 8 }}>
    <Text style={[s.label, { color: colors.mutedForeground }]}>TAG ARTIST OR STUDIO ({selected.length}/{MAX_TAGS})</Text>
    {selected.length > 0 && <View style={s.chips}>{selected.map((a) => <View key={a.id} style={[s.chip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Text style={{ color: colors.foreground, fontSize: 13 }}>@{a.username}</Text>
      <Pressable accessibilityLabel={`Remove tag ${a.username}`} hitSlop={10} onPress={() => onChange(selected.filter((x) => x.id !== a.id))}><Feather name="x" size={16} color={colors.foreground} /></Pressable>
    </View>)}</View>}
    <TextInput value={input} onChangeText={setInput} editable={!atCap} autoCapitalize="none" autoCorrect={false}
      placeholder={atCap ? "Tag limit reached" : "Search artists and studios"} placeholderTextColor={colors.mutedForeground}
      style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
    {q.length >= 1 && !atCap && <View style={[s.results, { borderColor: colors.border, backgroundColor: colors.card }]}>
      {query.isFetching ? <ActivityIndicator style={{ margin: 12 }} color={colors.primary} />
        : query.isError ? <Pressable onPress={() => query.refetch()} style={s.row}><Text style={{ color: colors.destructive }}>Search failed. Tap to retry.</Text></Pressable>
        : results.length === 0 ? <View style={s.row}><Text style={{ color: colors.mutedForeground }}>No artists or studios found</Text></View>
        : results.map((a) => <Pressable key={a.id} style={s.row} onPress={() => { onChange([...selected, a]); setInput(""); }}>
          <Text style={{ color: colors.foreground, fontWeight: "600" }}>{a.username}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{a.role}</Text>
        </Pressable>)}
    </View>}
  </View>;
}

export function PostTags({ postId, token, onOpenProfile }: { postId: string; token: string; onOpenProfile: (user: User) => void }) {
  const colors = useColors();
  const { data } = useQuery({
    queryKey: ["post-tags", postId, token],
    queryFn: async () => resolveMediaUrls(await api<User[]>(`/api/posts/${postId}/tags`, {}, token)),
  });
  if (!data || data.length === 0) return null;
  return <View style={s.chips}>
    <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>With</Text>
    {data.map((a) => <Pressable key={a.id} accessibilityLabel={`Open ${a.username}`} onPress={() => onOpenProfile(a)}>
      <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>@{a.username}</Text>
    </Pressable>)}
  </View>;
}

export function TaggedPostsPanel<T extends { post: { id: string } }>({ accountId, role, isOwn, token, renderItem }: {
  accountId: string; role: string; isOwn: boolean; token: string; renderItem: (item: T) => React.ReactNode;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [removeError, setRemoveError] = useState("");
  const key = ["tagged-posts", accountId, token];
  const q = useInfiniteQuery({
    queryKey: key,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => resolveMediaUrls(await api<T[]>(`/api/users/${accountId}/tagged-posts?limit=${LIMIT}&offset=${pageParam}`, {}, token)),
    getNextPageParam: (last, all) => (last.length === LIMIT ? all.length * LIMIT : undefined),
  });
  const remove = useMutation({
    mutationFn: (postId: string) => api(`/api/posts/${postId}/tags/${accountId}`, { method: "DELETE" }, token),
    onSuccess: () => { setRemoveError(""); queryClient.invalidateQueries({ queryKey: ["tagged-posts", accountId] }); },
    onError: (e: Error) => setRemoveError(e.message || "Could not remove this tag."),
  });
  const items = q.data?.pages.flat() ?? [];
  if (q.isLoading) return <ActivityIndicator style={{ margin: 30 }} color={colors.primary} />;
  if (q.isError) return <Pressable onPress={() => q.refetch()} style={{ padding: 24, alignItems: "center" }}>
    <Text style={{ color: colors.destructive }}>Could not load tagged work.</Text><Text style={{ color: colors.primary, marginTop: 6 }}>TRY AGAIN</Text></Pressable>;
  if (items.length === 0) return <View style={[s.empty, { borderColor: colors.border }]}>
    <Feather name="tag" size={24} color={colors.mutedForeground} />
    <Text style={{ color: colors.foreground, fontWeight: "700", marginTop: 8 }}>{role === "STUDIO" ? "No clients yet" : "No client work yet"}</Text>
    <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 4 }}>{isOwn ? "When clients tag you in their tattoo posts, their work shows up here." : "Clients can tag this account when they share their tattoos, and those posts will appear here."}</Text>
  </View>;
  return <View>
    {removeError ? <Text style={{ color: colors.destructive, marginBottom: 8 }}>{removeError}</Text> : null}
    {items.map((item) => <View key={item.post.id}>
      {isOwn && <Pressable accessibilityLabel="Remove from my profile" disabled={remove.isPending} onPress={() => remove.mutate(item.post.id)} style={[s.removeBtn, { borderColor: colors.border }]}>
        <Feather name="x" size={14} color={colors.foreground} /><Text style={{ color: colors.foreground, fontSize: 12 }}>Remove from my profile</Text></Pressable>}
      {renderItem(item)}
    </View>)}
    {q.hasNextPage && <Pressable onPress={() => q.fetchNextPage()} disabled={q.isFetchingNextPage} style={[s.removeBtn, { borderColor: colors.border, alignSelf: "center", paddingHorizontal: 24 }]}>
      <Text style={{ color: colors.foreground }}>{q.isFetchingNextPage ? "Loading..." : "Load more"}</Text></Pressable>}
  </View>;
}

const s = StyleSheet.create({
  label: { fontSize: 11, letterSpacing: 1.2, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  input: { borderWidth: 1, minHeight: 46, paddingHorizontal: 12 },
  results: { borderWidth: 1 },
  row: { minHeight: 46, paddingHorizontal: 12, justifyContent: "center" },
  empty: { borderWidth: 1, padding: 28, alignItems: "center", marginTop: 8 },
  removeBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, minHeight: 40, paddingHorizontal: 12, alignSelf: "flex-end", justifyContent: "center", marginBottom: 6 },
});
