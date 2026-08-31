import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Image, Keyboard, Linking, Modal, Platform, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput, View as NativeView,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { ApiError, api, jsonBody, resolveMediaUrl, resolveMediaUrls, uploadMedia } from "@/lib/api";
import { User, useAuth } from "@/context/AuthContext";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

type Post = {
  post: { id: string; caption?: string; media?: Array<{ url: string; type?: string }>; createdAt?: string; likeCount?: number };
  author: User;
  isLiked?: boolean;
  isSaved?: boolean;
};
type SearchResult = { users?: User[]; posts?: Post[]; hashtags?: Array<{ tag: string; count: number }> };
type Conversation = { id: string; title?: string; isGroup?: boolean; lastMessageAt?: string; lastMessage?: { body?: string }; unreadCount?: number; participants?: Array<{ user: User; username?: string }> };
type ConversationResponse = { conversation: Conversation; participants: User[] };
type Message = { id: string; body: string; senderId: string; sentAt?: string };
type MessageResponse = { message: Message; sender: User };
type Booking = { id: string; status?: string; date?: string; notes?: string; artist?: User; client?: User };
type Job = { job: { id: string; title: string; description?: string; location?: string; createdAt?: string; isActive?: boolean }; studio?: User };
type Notification = { id: string; type: string; isRead?: boolean; createdAt?: string; payload?: { actorId?: string; postId?: string } };
type NotificationResponse = { notification: Notification; actor?: User | null };

const View = NativeView;
type View = "home" | "discover" | "create" | "inbox" | "profile" | "jobs" | "bookings" | "notifications" | "saved" | "settings";
type AppView = View;

function useApiQuery<T>(key: string, path: string, token: string | null, enabled = true) {
  return useQuery({
    queryKey: [key, path, token],
    queryFn: async () => {
      const response = resolveMediaUrls(await api<T>(path, {}, token));
      if (path === "/api/conversations") {
        return (response as unknown as ConversationResponse[]).map(({ conversation, participants }) => ({
          ...conversation,
          participants: participants.map((user) => ({ user, username: user.username })),
        })) as T;
      }
      if (/^\/api\/conversations\/[^/]+\/messages/.test(path)) {
        return (response as unknown as MessageResponse[]).map(({ message }) => message) as T;
      }
      if (path.startsWith("/api/notifications")) {
        return (response as unknown as NotificationResponse[]).map(({ notification }) => notification) as T;
      }
      return response;
    },
    enabled: enabled && !!token,
    staleTime: 30_000,
  });
}

function initials(user?: User | null) {
  return (user?.username || user?.email || "TR").slice(0, 2).toUpperCase();
}

function Avatar({ user, size = 42 }: { user?: User | null; size?: number }) {
  const colors = useColors();
  return user?.avatarUrl ? (
    <Image source={{ uri: resolveMediaUrl(user.avatarUrl) }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.foreground }]}>
      <Text style={[styles.avatarText, { fontSize: Math.max(12, size / 3.3), color: colors.background }]}>{initials(user)}</Text>
    </View>
  );
}

function IconButton({ name, onPress, color, label }: { name: keyof typeof Feather.glyphMap; onPress: () => void; color: string; label: string }) {
  return <Pressable accessibilityLabel={label} testID={`icon-${label}`} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
    <Feather name={name} size={21} color={color} />
  </Pressable>;
}

function Logo({ small = false }: { small?: boolean }) {
  const colors = useColors();
  return <Text style={[styles.wordmark, { color: colors.foreground, fontSize: small ? 17 : 23 }]}>TATTOO RECORD</Text>;
}

function Header({ title, onMenu, onBack }: { title?: string; onMenu?: () => void; onBack?: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
    {onBack ? <IconButton name="arrow-left" onPress={onBack} color={colors.foreground} label="back" /> : <Logo small />}
    {title && <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>}
    <View style={styles.headerRight}>{onMenu && <IconButton name="menu" onPress={onMenu} color={colors.foreground} label="menu" />}</View>
  </View>;
}

function LoadingState() {
  const colors = useColors();
  return <View style={styles.centerState}><ActivityIndicator color={colors.primary} /><Text style={[styles.muted, { color: colors.mutedForeground }]}>Loading the record…</Text></View>;
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  const colors = useColors();
  return <View style={styles.centerState}><Feather name="alert-circle" size={28} color={colors.destructive} /><Text style={[styles.stateTitle, { color: colors.foreground }]}>Couldn’t load this page</Text><Text style={[styles.muted, { color: colors.mutedForeground }]}>{message}</Text><Pressable onPress={retry} style={[styles.outlineButton, { borderColor: colors.foreground }]}><Text style={[styles.buttonText, { color: colors.foreground }]}>Try again</Text></Pressable></View>;
}

function EmptyState({ icon, title, detail }: { icon: keyof typeof Feather.glyphMap; title: string; detail: string }) {
  const colors = useColors();
  return <View style={styles.centerState}><Feather name={icon} size={32} color={colors.mutedForeground} /><Text style={[styles.stateTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.muted, { color: colors.mutedForeground, textAlign: "center" }]}>{detail}</Text></View>;
}

function SectionLabel({ children, action, onAction }: { children: React.ReactNode; action?: string; onAction?: () => void }) {
  const colors = useColors();
  return <View style={styles.sectionRow}><Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{children}</Text>{action && <Pressable onPress={onAction}><Text style={[styles.link, { color: colors.primary }]}>{action}</Text></Pressable>}</View>;
}

function PostCard({ item, token, onOpenProfile }: { item: Post; token: string; onOpenProfile: (user: User) => void }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(!!item.isLiked);
  const [saved, setSaved] = useState(!!item.isSaved);
  const media = item.post.media?.[0]?.url;
  const likeMutation = useMutation({
    mutationFn: () => api(`/api/posts/${item.post.id}/like`, { method: liked ? "DELETE" : "POST" }, token),
    onSuccess: () => { setLiked(!liked); queryClient.invalidateQueries({ queryKey: ["feed"] }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); },
  });
  const saveMutation = useMutation({
    mutationFn: () => api(saved ? `/api/saved-posts/${item.post.id}` : "/api/saved-posts", { method: saved ? "DELETE" : "POST", body: saved ? undefined : jsonBody({ postId: item.post.id }) }, token),
    onSuccess: () => setSaved(!saved),
  });
  return <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Pressable style={styles.postHeader} onPress={() => onOpenProfile(item.author)}>
      <Avatar user={item.author} size={38} /><View style={styles.flex}><Text style={[styles.username, { color: colors.foreground }]}>{item.author.username}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.author.role || "MEMBER"} {item.author.isVerified ? "· VERIFIED" : ""}</Text></View><Feather name="more-horizontal" size={20} color={colors.mutedForeground} />
    </Pressable>
    {media ? <Image source={{ uri: resolveMediaUrl(media) }} style={styles.postImage} resizeMode="cover" /> : <View style={[styles.noMedia, { backgroundColor: colors.secondary }]}><Feather name="image" size={30} color={colors.mutedForeground} /></View>}
    <View style={styles.postActions}><IconButton name={liked ? "heart" : "heart"} onPress={() => likeMutation.mutate()} color={liked ? colors.destructive : colors.foreground} label="like post" /><IconButton name="message-circle" onPress={() => undefined} color={colors.foreground} label="comment on post" /><View style={styles.flex} /><IconButton name={saved ? "bookmark" : "bookmark"} onPress={() => saveMutation.mutate()} color={saved ? colors.primary : colors.foreground} label="save post" /></View>
    <View style={styles.postCopy}><Text style={[styles.likeCount, { color: colors.foreground }]}>{(item.post.likeCount || 0) + (liked && !item.isLiked ? 1 : 0)} likes</Text>{item.post.caption ? <Text style={[styles.caption, { color: colors.foreground }]}><Text style={styles.username}>{item.author.username} </Text>{item.post.caption}</Text> : null}</View>
  </View>;
}

function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ARTIST" | "STUDIO" | "ENTHUSIAST">("ENTHUSIAST");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!email.trim() || !password.trim() || (register && !username.trim())) { setError("Complete every required field."); return; }
    setBusy(true); setError("");
    try {
      const data = await api<{ user: User; token: string }>(register ? "/api/auth/register" : "/api/auth/login", { method: "POST", body: jsonBody(register ? { email, username, password, role } : { email, password }) });
      await signIn(data.user, data.token);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to sign in."); }
    finally { setBusy(false); }
  };
  const demo = async (demoRole: string) => {
    setBusy(true); setError("");
    try { const data = await api<{ user: User; token: string }>("/api/auth/demo-login", { method: "POST", body: jsonBody({ role: demoRole }) }); await signIn(data.user, data.token); }
    catch (e) { setError(e instanceof Error ? e.message : "Demo login is unavailable."); } finally { setBusy(false); }
  };
  return <KeyboardAwareScrollViewCompat style={[styles.authRoot, { backgroundColor: colors.background }]} bottomOffset={20} contentContainerStyle={[styles.authContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={[styles.authMark, { backgroundColor: colors.foreground }]}><Text style={[styles.authMarkText, { color: colors.background }]}>TR</Text></View>
      <Text style={[styles.authKicker, { color: colors.primary }]}>Nº 01 — THE TATTOO COMMUNITY</Text>
      <Text style={[styles.authTitle, { color: colors.foreground }]}>{register ? "Put your work\non the record." : "Welcome back\nto the record."}</Text>
      <Text style={[styles.authDetail, { color: colors.mutedForeground }]}>{register ? "Join artists, studios, and collectors keeping the culture visible." : "Find the work, the people, and the next appointment that matters."}</Text>
      <View style={styles.authForm}>
        {register && <Field label="USERNAME" value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="yourname" />}
        <Field label="EMAIL" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
        <Field label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
        {register && <View><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>I AM A...</Text><View style={styles.roleRow}>{(["ENTHUSIAST", "ARTIST", "STUDIO"] as const).map((item) => <Pressable key={item} onPress={() => setRole(item)} style={[styles.roleChip, { borderColor: item === role ? colors.primary : colors.border, backgroundColor: item === role ? colors.primary : "transparent" }]}><Text style={[styles.roleText, { color: item === role ? colors.primaryForeground : colors.foreground }]}>{item}</Text></Pressable>)}</View></View>}
        {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
        <Pressable testID="auth-submit" onPress={submit} disabled={busy} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{busy ? "PLEASE WAIT…" : register ? "CREATE ACCOUNT" : "SIGN IN"}</Text></Pressable>
      </View>
      {!register && process.env.EXPO_PUBLIC_DEMO_MODE === "true" && <View style={styles.demoBlock}><SectionLabel>QUICK DEMO LOGIN</SectionLabel><View style={styles.roleRow}>{(["ARTIST", "STUDIO", "ENTHUSIAST"] as const).map((item) => <Pressable key={item} onPress={() => demo(item)} style={[styles.outlineButton, { borderColor: colors.border }]}><Text style={[styles.buttonText, { color: colors.foreground }]}>{item}</Text></Pressable>)}</View></View>}
      <Pressable onPress={() => { setRegister(!register); setError(""); }} style={styles.authToggle}><Text style={[styles.link, { color: colors.primary }]}>{register ? "Already have an account? Sign in" : "Don’t have an account? Sign up"}</Text></Pressable>
    </KeyboardAwareScrollViewCompat>;
}

function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize = "sentences" }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; secureTextEntry?: boolean; keyboardType?: "email-address" | "default"; autoCapitalize?: "none" | "sentences" }) {
  const colors = useColors();
  return <View><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} /></View>;
}

function HomeView({ token, user, openProfile }: { token: string; user: User; openProfile: (user: User) => void }) {
  const colors = useColors();
  const feed = useApiQuery<Post[]>("feed", "/api/posts?limit=15", token);
  const stories = useApiQuery<Array<{ id: string; user?: User; userId?: string }>>("stories", "/api/stories", token);
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.screenContent} refreshControl={<RefreshControl refreshing={feed.isFetching} onRefresh={() => { feed.refetch(); stories.refetch(); }} tintColor={colors.primary} />}>
    <View style={styles.heroRow}><View><Text style={[styles.kicker, { color: colors.primary }]}>THE DAILY INDEX</Text><Text style={[styles.screenTitle, { color: colors.foreground }]}>Your record.</Text></View><Avatar user={user} size={44} /></View>
    {stories.data && stories.data.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>{stories.data.map((story) => <Pressable key={story.id} style={styles.story} onPress={() => undefined}><View style={[styles.storyRing, { borderColor: colors.primary }]}><Avatar user={story.user} size={54} /></View><Text style={[styles.storyText, { color: colors.foreground }]}>{story.user?.username || "STORY"}</Text></Pressable>)}</ScrollView>}
    <SectionLabel action="DISCOVER" onAction={() => undefined}>LATEST FROM THE COMMUNITY</SectionLabel>
    {feed.isLoading ? <LoadingState /> : feed.isError ? <ErrorState message={(feed.error as Error).message} retry={() => feed.refetch()} /> : feed.data?.length ? feed.data.map((item) => <PostCard key={item.post.id} item={item} token={token} onOpenProfile={openProfile} />) : <EmptyState icon="image" title="The record is quiet." detail="Follow artists and studios to bring new work into your feed." />}
  </ScrollView>;
}

function DiscoverView({ token, openProfile }: { token: string; openProfile: (user: User) => void }) {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const trending = useApiQuery<Post[]>("trending", "/api/discovery/trending?limit=12", token);
  const artists = useApiQuery<User[]>("artists", "/api/users?type=ARTIST&take=12", token);
  const search = useApiQuery<SearchResult>("search", `/api/search?q=${encodeURIComponent(submitted)}`, token, !!submitted);
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.screenContent}>
    <Text style={[styles.kicker, { color: colors.primary }]}>DISCOVERY / 02</Text><Text style={[styles.screenTitle, { color: colors.foreground }]}>Find your next line.</Text>
    <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="search" size={18} color={colors.mutedForeground} /><TextInput testID="discovery-search" value={query} onChangeText={setQuery} onSubmitEditing={() => setSubmitted(query.trim())} placeholder="Search artists, work, hashtags" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} returnKeyType="search" /></View>
    {submitted && search.isLoading ? <LoadingState /> : submitted && search.data ? <View><SectionLabel>SEARCH RESULTS</SectionLabel>{search.data.users?.map((artist) => <Pressable key={artist.id} onPress={() => openProfile(artist)} style={[styles.artistRow, { borderBottomColor: colors.border }]}><Avatar user={artist} /><View style={styles.flex}><Text style={[styles.username, { color: colors.foreground }]}>{artist.username}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{artist.role} {artist.isVerified ? "· VERIFIED" : ""}</Text></View><Feather name="chevron-right" size={18} color={colors.mutedForeground} /></Pressable>)}{search.data.posts?.map((post) => <PostCard key={post.post.id} item={post} token={token} onOpenProfile={openProfile} />)}</View> : <><SectionLabel>ARTISTS TO KNOW</SectionLabel><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistRail}>{artists.data?.map((artist) => <Pressable key={artist.id} onPress={() => openProfile(artist)} style={[styles.artistCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Avatar user={artist} size={58} /><Text numberOfLines={1} style={[styles.artistName, { color: colors.foreground }]}>{artist.username}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{artist.isVerified ? "VERIFIED" : artist.role}</Text></Pressable>)}</ScrollView><SectionLabel action="VIEW ALL">TRENDING WORK</SectionLabel>{trending.isLoading ? <LoadingState /> : trending.data?.length ? <View style={styles.discoveryGrid}>{trending.data.map((post) => <View key={post.post.id} style={[styles.gridTile, { backgroundColor: colors.secondary }]}>{post.post.media?.[0]?.url ? <Image source={{ uri: post.post.media[0].url }} style={styles.gridImage} /> : <Feather name="image" size={24} color={colors.mutedForeground} />}</View>)}</View> : <EmptyState icon="compass" title="No trending work yet." detail="Check back when the community posts something new." />}</>}
  </ScrollView>;
}

function CreateView({ token, user }: { token: string; user: User }) {
  const colors = useColors();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [canOpenSettings, setCanOpenSettings] = useState(false);
  const pick = async (camera = false) => {
    try {
      setError("");
      setCanOpenSettings(false);
      if (Platform.OS !== "web") {
        const permission = camera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError(camera ? "Camera access is needed to capture tattoo work." : "Photo library access is needed to select tattoo work.");
          setCanOpenSettings(!permission.canAskAgain);
          return;
        }
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 0.9 });
      if (!result.canceled) setAsset(result.assets[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open the media picker.");
    }
  };
  const publish = async () => {
    if (!asset) { setError("Choose an image or video first."); return; }
    setBusy(true); setError("");
    try {
      const uploaded = await uploadMedia(asset.uri, asset.fileName || `tattoo-${Date.now()}.jpg`, asset.mimeType || "image/jpeg", "posts", token);
      await api("/api/posts", { method: "POST", body: jsonBody({ caption, media: [{ publicId: uploaded.publicId, url: uploaded.url, type: asset.type === "video" ? "video" : "image", width: asset.width, height: asset.height, duration: asset.duration }] }) }, token);
      setAsset(null); setCaption(""); Alert.alert("Published", "Your work is now on the record.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to publish."); } finally { setBusy(false); }
  };
  return <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.screenContent}><Text style={[styles.kicker, { color: colors.primary }]}>NEW ENTRY / 03</Text><Text style={[styles.screenTitle, { color: colors.foreground }]}>Make the work visible.</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>Share a fresh piece, studio moment, or flash design with the community.</Text>{asset ? <View style={[styles.uploadPreview, { borderColor: colors.border }]}>{asset.type === "video" ? <View style={[styles.videoPreview, { backgroundColor: colors.secondary }]}><Feather name="video" size={34} color={colors.primary} /><Text style={[styles.captureTitle, { color: colors.foreground }]}>VIDEO READY</Text><Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>{asset.fileName || "Selected video"}</Text></View> : <Image source={{ uri: asset.uri }} style={styles.uploadImage} resizeMode="cover" />}<Pressable accessibilityLabel="Remove selected media" onPress={() => setAsset(null)} style={[styles.removeAsset, { backgroundColor: colors.foreground }]}><Feather name="x" size={18} color={colors.background} /></Pressable></View> : <View style={styles.captureRow}><Pressable accessibilityLabel="Choose media from library" onPress={() => pick(false)} style={[styles.captureCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="image" size={26} color={colors.primary} /><Text style={[styles.captureTitle, { color: colors.foreground }]}>LIBRARY</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>Choose media</Text></Pressable><Pressable accessibilityLabel="Capture photo with camera" onPress={() => pick(true)} style={[styles.captureCard, { backgroundColor: colors.foreground, borderColor: colors.foreground }]}><Feather name="camera" size={26} color={colors.background} /><Text style={[styles.captureTitle, { color: colors.background }]}>CAMERA</Text><Text style={[styles.meta, { color: colors.background, opacity: 0.7 }]}>Capture now</Text></Pressable></View>}<Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>CAPTION</Text><TextInput multiline value={caption} onChangeText={setCaption} placeholder="Tell the story behind the work…" placeholderTextColor={colors.mutedForeground} style={[styles.captionInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />{error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}{canOpenSettings ? <Pressable onPress={() => { void Linking.openSettings(); }} style={[styles.outlineButton, { borderColor: colors.foreground }]}><Text style={[styles.buttonText, { color: colors.foreground }]}>OPEN SETTINGS</Text></Pressable> : null}<Pressable onPress={publish} disabled={busy} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{busy ? "UPLOADING…" : "PUBLISH TO THE RECORD"}</Text></Pressable><Text style={[styles.meta, { color: colors.mutedForeground }]}>Media is sent to the existing Tattoo Record upload service. Supported images and video are limited by the server’s 50 MB upload rule.</Text></ScrollView></KeyboardAvoidingView>;
}

function InboxView({ token, user, onChatOpenChange }: { token: string; user: User; onChatOpenChange: (isOpen: boolean) => void }) {
  const colors = useColors();
  const conversations = useApiQuery<Conversation[]>("conversations", "/api/conversations", token);
  const [selected, setSelected] = useState<Conversation | null>(null);
  if (selected) return <ChatView conversation={selected} token={token} user={user} onBack={() => { setSelected(null); onChatOpenChange(false); }} />;
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.screenContent}><Text style={[styles.kicker, { color: colors.primary }]}>DIRECT / 04</Text><Text style={[styles.screenTitle, { color: colors.foreground }]}>Keep it close.</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>Messages stay next to the work, the booking, and the people behind it.</Text>{conversations.isLoading ? <LoadingState /> : conversations.isError ? <ErrorState message={(conversations.error as Error).message} retry={() => conversations.refetch()} /> : conversations.data?.length ? conversations.data.map((conversation) => <Pressable key={conversation.id} onPress={() => { setSelected(conversation); onChatOpenChange(true); }} style={[styles.conversationRow, { borderBottomColor: colors.border }]}><Avatar user={conversation.participants?.[0]?.user} /><View style={styles.flex}><Text style={[styles.username, { color: colors.foreground }]}>{conversation.title || conversation.participants?.map((p) => p.user?.username || p.username).filter(Boolean).join(", ") || "Conversation"}</Text><Text numberOfLines={1} style={[styles.body, { color: colors.mutedForeground }]}>{conversation.lastMessage?.body || "Start a conversation"}</Text></View>{!!conversation.unreadCount && <View style={[styles.unread, { backgroundColor: colors.primary }]}><Text style={[styles.unreadText, { color: colors.primaryForeground }]}>{conversation.unreadCount}</Text></View>}</Pressable>) : <EmptyState icon="message-circle" title="No conversations yet." detail="Start a conversation from an artist profile on the web record." />}</ScrollView>;
}

function ChatView({ conversation, token, user, onBack }: { conversation: Conversation; token: string; user: User; onBack: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState("");
  const messages = useApiQuery<Message[]>("messages", `/api/conversations/${conversation.id}/messages?limit=50`, token);
  const send = useMutation({ mutationFn: () => api<Message>(`/api/conversations/${conversation.id}/messages`, { method: "POST", body: jsonBody({ body }) }, token), onSuccess: () => { setBody(""); messages.refetch(); } });
  return <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}><Header title={conversation.title || "Conversation"} onBack={onBack} /><FlatList inverted data={[...(messages.data || [])].reverse()} keyExtractor={(item) => item.id} contentContainerStyle={{ padding: 16 }} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" renderItem={({ item }) => <View style={[styles.messageBubble, { alignSelf: item.senderId === user.id ? "flex-end" : "flex-start", backgroundColor: item.senderId === user.id ? colors.primary : colors.card, borderColor: colors.border }]}><Text style={{ color: item.senderId === user.id ? colors.primaryForeground : colors.foreground }}>{item.body}</Text></View>} ListEmptyComponent={<EmptyState icon="message-circle" title="No messages yet." detail="Say hello to start this conversation." />} /><View style={[styles.composer, { paddingBottom: insets.bottom + 8, borderTopColor: colors.border, backgroundColor: colors.background }]}><TextInput value={body} onChangeText={setBody} placeholder="Write a message…" placeholderTextColor={colors.mutedForeground} style={[styles.composerInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} /><Pressable onPress={() => body.trim() && send.mutate()} style={[styles.sendButton, { backgroundColor: colors.primary }]}><Feather name="arrow-up" size={20} color={colors.primaryForeground} /></Pressable></View></KeyboardAvoidingView>;
}

function ProfileView({ token, user, profile, onBack, openProfile, onSignOut }: { token: string; user: User; profile: User; onBack?: () => void; openProfile: (user: User) => void; onSignOut: () => void }) {
  const colors = useColors();
  const stats = useApiQuery<{ followersCount: number; followingCount: number; postsCount: number }>("stats", `/api/users/${profile.username}/stats`, token);
  const portfolio = useApiQuery<Array<{ id: string; imageUrl?: string; title?: string; description?: string }>>("portfolio", `/api/portfolio/${profile.id}`, token);
  const following = useApiQuery<{ isFollowing: boolean }>("following", `/api/users/${profile.id}/is-following`, token, profile.id !== user.id);
  const follow = useMutation({ mutationFn: () => api(`/api/users/${profile.id}/${following.data?.isFollowing ? "unfollow" : "follow"}`, { method: "POST" }, token), onSuccess: () => following.refetch() });
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.screenContent}>{onBack && <Pressable onPress={onBack} style={styles.backRow}><Feather name="arrow-left" size={18} color={colors.foreground} /><Text style={[styles.body, { color: colors.foreground }]}>Back</Text></Pressable>}<View style={styles.profileTop}><Avatar user={profile} size={84} /><View style={styles.profileIdentity}><Text style={[styles.profileName, { color: colors.foreground }]}>{profile.username}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{profile.role} {profile.isVerified ? "· VERIFIED" : ""}</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{profile.bio || "Keeping the work visible."}</Text></View></View><View style={[styles.statsRow, { borderColor: colors.border }]}><Stat value={stats.data?.postsCount || 0} label="WORK" /><Stat value={stats.data?.followersCount || 0} label="FOLLOWERS" /><Stat value={stats.data?.followingCount || 0} label="FOLLOWING" /></View>{profile.id !== user.id ? <Pressable onPress={() => follow.mutate()} style={[styles.primaryButton, { backgroundColor: colors.foreground }]}><Text style={[styles.buttonText, { color: colors.background }]}>{following.data?.isFollowing ? "FOLLOWING" : "FOLLOW"}</Text></Pressable> : null}<SectionLabel>PORTFOLIO</SectionLabel>{portfolio.isLoading ? <LoadingState /> : portfolio.data?.length ? <View style={styles.discoveryGrid}>{portfolio.data.map((item) => <View key={item.id} style={[styles.gridTile, { backgroundColor: colors.secondary }]}>{item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.gridImage} /> : <Feather name="image" size={24} color={colors.mutedForeground} />}</View>)}</View> : <EmptyState icon="grid" title="No portfolio entries yet." detail="Portfolio work will appear here when it is published." />}{profile.id === user.id && <View style={styles.settingsBlock}><SectionLabel>ACCOUNT</SectionLabel><MenuButton icon="briefcase" label="Jobs board" onPress={() => openProfile({ ...user, __view: "jobs" } as User & { __view: string })} /><MenuButton icon="calendar" label="Bookings" onPress={() => openProfile({ ...user, __view: "bookings" } as User & { __view: string })} /><MenuButton icon="bell" label="Notifications" onPress={() => openProfile({ ...user, __view: "notifications" } as User & { __view: string })} /><MenuButton icon="bookmark" label="Saved work" onPress={() => openProfile({ ...user, __view: "saved" } as User & { __view: string })} /><MenuButton icon="settings" label="Settings" onPress={() => openProfile({ ...user, __view: "settings" } as User & { __view: string })} /><Pressable onPress={onSignOut} style={[styles.menuButton, { borderTopColor: colors.border }]}><Feather name="log-out" size={19} color={colors.destructive} /><Text style={[styles.menuLabel, { color: colors.destructive }]}>Sign out</Text></Pressable></View>}</ScrollView>;
}

function Stat({ value, label }: { value: number; label: string }) { const colors = useColors(); return <View style={styles.stat}><Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{label}</Text></View>; }
function MenuButton({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) { const colors = useColors(); return <Pressable onPress={onPress} style={[styles.menuButton, { borderTopColor: colors.border }]}><Feather name={icon} size={19} color={colors.foreground} /><Text style={[styles.menuLabel, { color: colors.foreground }]}>{label}</Text><Feather name="chevron-right" size={18} color={colors.mutedForeground} /></Pressable>; }

function ListView({ kind, token, user, onBack }: { kind: "jobs" | "bookings" | "notifications" | "saved"; token: string; user: User; onBack: () => void }) {
  const colors = useColors();
  const paths = { jobs: "/api/jobs", bookings: "/api/bookings", notifications: "/api/notifications?limit=50", saved: "/api/saved-posts" };
  const query = useApiQuery<unknown[]>(kind, paths[kind], token);
  const title = { jobs: "Jobs board", bookings: "Bookings", notifications: "Notifications", saved: "Saved work" }[kind];
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.screenContent}><Pressable onPress={onBack} style={styles.backRow}><Feather name="arrow-left" size={18} color={colors.foreground} /><Text style={[styles.body, { color: colors.foreground }]}>Profile</Text></Pressable><Text style={[styles.kicker, { color: colors.primary }]}>ACCOUNT / {kind.toUpperCase()}</Text><Text style={[styles.screenTitle, { color: colors.foreground }]}>{title}</Text>{query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message={(query.error as Error).message} retry={() => query.refetch()} /> : query.data?.length ? query.data.map((item, index) => <View key={(item as { id?: string }).id || String(index)} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>{kind === "jobs" ? <><Text style={[styles.cardTitle, { color: colors.foreground }]}>{((item as Job).job?.title || "Open role")}</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{(item as Job).job?.description || "See the full opportunity on Tattoo Record."}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{(item as Job).job?.location || "LOCATION TBA"}</Text></> : kind === "bookings" ? <><Text style={[styles.cardTitle, { color: colors.foreground }]}>{(item as Booking).artist?.username || (item as Booking).client?.username || "Tattoo appointment"}</Text><Text style={[styles.meta, { color: colors.primary }]}>{(item as Booking).status || "PENDING"} · {(item as Booking).date || "DATE TBA"}</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{(item as Booking).notes || "No notes added."}</Text></> : kind === "notifications" ? <><Text style={[styles.cardTitle, { color: colors.foreground }]}>{(item as Notification).type.replaceAll("_", " ")}</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{(item as Notification).isRead ? "Read notification" : "New activity on your record."}</Text></> : <><Text style={[styles.cardTitle, { color: colors.foreground }]}>{(item as Post).post?.caption || "Saved tattoo work"}</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>Saved from the community feed.</Text></>}</View>) : <EmptyState icon={kind === "jobs" ? "briefcase" : kind === "bookings" ? "calendar" : kind === "notifications" ? "bell" : "bookmark"} title={`No ${title.toLowerCase()} yet.`} detail="When there is new activity, it will appear here." />}</ScrollView>;
}

function SettingsView({ token, user, onBack, onSignOut }: { token: string; user: User; onBack: () => void; onSignOut: () => void }) {
  const colors = useColors();
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [bio, setBio] = useState(user.bio || "");
  const [status, setStatus] = useState("");
  const save = async () => { try { await api("/api/users/me", { method: "PUT", body: jsonBody({ firstName, lastName, bio }) }, token); setStatus("Profile saved."); } catch (e) { setStatus(e instanceof Error ? e.message : "Unable to save."); } };
  return <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: colors.background }} bottomOffset={60} contentContainerStyle={styles.screenContent}><Pressable onPress={onBack} style={styles.backRow}><Feather name="arrow-left" size={18} color={colors.foreground} /><Text style={[styles.body, { color: colors.foreground }]}>Profile</Text></Pressable><Text style={[styles.kicker, { color: colors.primary }]}>ACCOUNT / SETTINGS</Text><Text style={[styles.screenTitle, { color: colors.foreground }]}>Your details.</Text><Field label="FIRST NAME" value={firstName} onChangeText={setFirstName} placeholder="First name" /><Field label="LAST NAME" value={lastName} onChangeText={setLastName} placeholder="Last name" /><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>BIO</Text><TextInput multiline value={bio} onChangeText={setBio} placeholder="A short note about your work…" placeholderTextColor={colors.mutedForeground} style={[styles.captionInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />{status ? <Text style={[styles.body, { color: status.includes("saved") ? colors.primary : colors.destructive }]}>{status}</Text> : null}<Pressable onPress={save} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>SAVE PROFILE</Text></Pressable><Pressable onPress={onSignOut} style={[styles.dangerButton, { borderColor: colors.destructive }]}><Text style={[styles.buttonText, { color: colors.destructive }]}>SIGN OUT</Text></Pressable></KeyboardAwareScrollViewCompat>;
}

function AppShell() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token, signOut } = useAuth();
  const [view, setView] = useState<AppView>("home");
  const [profile, setProfile] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const openProfile = (next: User) => {
    const nextView = (next as User & { __view?: AppView }).__view;
    if (nextView) { setView(nextView); setMenuOpen(false); return; }
    setProfile(next); setView("profile");
  };
  if (!user || !token) return <AuthScreen />;
  const content = view === "home" ? <HomeView token={token} user={user} openProfile={openProfile} /> : view === "discover" ? <DiscoverView token={token} openProfile={openProfile} /> : view === "create" ? <CreateView token={token} user={user} /> : view === "inbox" ? <InboxView token={token} user={user} onChatOpenChange={setChatOpen} /> : view === "profile" ? <ProfileView token={token} user={user} profile={profile || user} onBack={profile ? () => { setProfile(null); setView("home"); } : undefined} openProfile={openProfile} onSignOut={signOut} /> : view === "settings" ? <SettingsView token={token} user={user} onBack={() => setView("profile")} onSignOut={signOut} /> : <ListView kind={view} token={token} user={user} onBack={() => setView("profile")} />;
  const navItems: Array<{ key: AppView; icon: keyof typeof Feather.glyphMap; label: string }> = [{ key: "home", icon: "home", label: "Home" }, { key: "discover", icon: "search", label: "Discover" }, { key: "create", icon: "plus-square", label: "Create" }, { key: "inbox", icon: "message-circle", label: "Inbox" }, { key: "profile", icon: "user", label: "Profile" }];
  const bottomInset = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 4);
  return <View style={[styles.appRoot, { backgroundColor: colors.background }]}>{!chatOpen && <Header title={view === "home" ? undefined : view.toUpperCase()} onMenu={() => setMenuOpen(true)} />}{content}{!chatOpen && <View style={[styles.bottomNav, { borderTopColor: colors.border, backgroundColor: colors.background, minHeight: 60 + bottomInset, paddingBottom: bottomInset }]}>{navItems.map((item) => <Pressable key={item.key} testID={`nav-${item.key}`} onPress={() => { Keyboard.dismiss(); setChatOpen(false); setProfile(null); setView(item.key); }} style={styles.navItem}><Feather name={item.icon} size={21} color={view === item.key ? colors.primary : colors.mutedForeground} /><Text style={[styles.navLabel, { color: view === item.key ? colors.primary : colors.mutedForeground }]}>{item.label}</Text></Pressable>)}</View>}<Modal visible={menuOpen} animationType="slide" transparent onRequestClose={() => setMenuOpen(false)}><Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)}><Pressable style={[styles.menuSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 30) }]} onPress={(e) => e.stopPropagation()}><View style={[styles.sheetHandle, { backgroundColor: colors.border }]} /><Logo /><Text style={[styles.body, { color: colors.mutedForeground, marginTop: 8 }]}>{user.username} · {user.role}</Text><View style={styles.sheetMenu}><MenuButton icon="briefcase" label="Jobs board" onPress={() => openProfile({ ...user, __view: "jobs" } as User & { __view: View })} /><MenuButton icon="calendar" label="Bookings" onPress={() => openProfile({ ...user, __view: "bookings" } as User & { __view: View })} /><MenuButton icon="bell" label="Notifications" onPress={() => openProfile({ ...user, __view: "notifications" } as User & { __view: View })} /><MenuButton icon="bookmark" label="Saved work" onPress={() => openProfile({ ...user, __view: "saved" } as User & { __view: View })} /><MenuButton icon="settings" label="Settings" onPress={() => openProfile({ ...user, __view: "settings" } as User & { __view: View })} /></View><Pressable onPress={signOut} style={styles.signOut}><Feather name="log-out" size={19} color={colors.destructive} /><Text style={[styles.menuLabel, { color: colors.destructive }]}>Sign out</Text></Pressable></Pressable></Pressable></Modal></View>;
}

export default function TabOneScreen() {
  const { hydrated } = useAuth();
  if (!hydrated) return <LoadingState />;
  return <AppShell />;
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  authRoot: { flex: 1 },
  authContent: { paddingHorizontal: 22, justifyContent: "center", flexGrow: 1 },
  authMark: { width: 54, height: 54, justifyContent: "center", alignItems: "center", marginBottom: 24 },
  authMarkText: { fontFamily: "Space Grotesk", fontSize: 21, fontWeight: "700" },
  authKicker: { fontFamily: "Space Mono", fontSize: 10, letterSpacing: 1.1, marginBottom: 14 },
  authTitle: { fontFamily: "Space Grotesk", fontSize: 44, lineHeight: 41, fontWeight: "700", letterSpacing: -1.7 },
  authDetail: { fontFamily: "Space Grotesk", fontSize: 16, lineHeight: 23, marginTop: 16, maxWidth: 330 },
  authForm: { gap: 14, marginTop: 28 },
  authToggle: { alignItems: "center", marginTop: 24, padding: 12 },
  demoBlock: { marginTop: 28 },
  header: { minHeight: 68, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", borderBottomWidth: 1 },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: "Space Mono", fontSize: 11, letterSpacing: 1 },
  headerRight: { width: 44, alignItems: "flex-end" },
  wordmark: { fontFamily: "Space Grotesk", fontWeight: "700", letterSpacing: -0.7 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  screenContent: { padding: 16, paddingBottom: 110 },
  heroRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 },
  kicker: { fontFamily: "Space Mono", fontSize: 10, letterSpacing: 1.1 },
  screenTitle: { fontFamily: "Space Grotesk", fontSize: 34, lineHeight: 35, fontWeight: "700", letterSpacing: -1.1, marginTop: 5 },
  body: { fontFamily: "Space Grotesk", fontSize: 14, lineHeight: 20 },
  muted: { fontFamily: "Space Grotesk", fontSize: 14, marginTop: 10 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 22, marginBottom: 10 },
  sectionLabel: { fontFamily: "Space Mono", fontSize: 10, letterSpacing: 1.05 },
  link: { fontFamily: "Space Mono", fontSize: 10, letterSpacing: 0.5 },
  storyRow: { gap: 14, paddingBottom: 8 },
  story: { alignItems: "center", width: 66 },
  storyRing: { borderWidth: 2, padding: 2, borderRadius: 36 },
  storyText: { fontFamily: "Space Mono", fontSize: 8, marginTop: 5, maxWidth: 66 },
  postCard: { borderWidth: 1, marginBottom: 16 },
  postHeader: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  flex: { flex: 1 },
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Space Grotesk", fontWeight: "700" },
  username: { fontFamily: "Space Grotesk", fontSize: 14, fontWeight: "700" },
  meta: { fontFamily: "Space Mono", fontSize: 9, letterSpacing: 0.55, marginTop: 3 },
  postImage: { width: "100%", aspectRatio: 1 },
  noMedia: { width: "100%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  postActions: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8 },
  postCopy: { paddingHorizontal: 13, paddingBottom: 15, gap: 6 },
  likeCount: { fontFamily: "Space Grotesk", fontWeight: "700", fontSize: 13 },
  caption: { fontFamily: "Space Grotesk", fontSize: 14, lineHeight: 20 },
  searchBox: { borderWidth: 1, minHeight: 50, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginTop: 22 },
  searchInput: { flex: 1, padding: 0, marginLeft: 10, fontFamily: "Space Grotesk", fontSize: 15 },
  artistRail: { gap: 10, paddingBottom: 8 },
  artistCard: { width: 125, padding: 13, borderWidth: 1 },
  artistName: { fontFamily: "Space Grotesk", fontWeight: "700", marginTop: 10 },
  artistRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: 1 },
  discoveryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  gridTile: { width: "32.3%", aspectRatio: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  gridImage: { width: "100%", height: "100%" },
  captureRow: { flexDirection: "row", gap: 10, marginTop: 26, marginBottom: 25 },
  captureCard: { flex: 1, minHeight: 150, borderWidth: 1, padding: 16, justifyContent: "flex-end", gap: 5 },
  captureTitle: { fontFamily: "Space Mono", fontSize: 12, letterSpacing: 0.7, marginTop: 30 },
  uploadPreview: { borderWidth: 1, aspectRatio: 1, marginTop: 24, overflow: "hidden", position: "relative" },
  uploadImage: { width: "100%", height: "100%" },
  videoPreview: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  removeAsset: { position: "absolute", right: 10, top: 10, width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  captionInput: { minHeight: 120, borderWidth: 1, padding: 13, fontFamily: "Space Grotesk", fontSize: 15, textAlignVertical: "top", marginBottom: 14 },
  input: { borderWidth: 1, minHeight: 48, paddingHorizontal: 13, fontFamily: "Space Grotesk", fontSize: 15 },
  fieldLabel: { fontFamily: "Space Mono", fontSize: 10, letterSpacing: 0.8, marginBottom: 7 },
  primaryButton: { minHeight: 50, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, marginTop: 5 },
  outlineButton: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, borderWidth: 1 },
  dangerButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderWidth: 1, marginTop: 12 },
  buttonText: { fontFamily: "Space Mono", fontSize: 11, letterSpacing: 0.75, fontWeight: "700" },
  pressed: { opacity: 0.72 },
  errorText: { fontFamily: "Space Grotesk", fontSize: 13, lineHeight: 18 },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  roleChip: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9 },
  roleText: { fontFamily: "Space Mono", fontSize: 9, letterSpacing: 0.4 },
  centerState: { alignItems: "center", justifyContent: "center", paddingVertical: 50, gap: 7 },
  stateTitle: { fontFamily: "Space Grotesk", fontSize: 18, fontWeight: "700", marginTop: 4 },
  conversationRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15, borderBottomWidth: 1 },
  unread: { minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: 11 },
  unreadText: { fontFamily: "Space Mono", fontSize: 10 },
  messageBubble: { padding: 12, maxWidth: "82%", borderWidth: 1, marginBottom: 8 },
  composer: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, padding: 8 },
  composerInput: { flex: 1, minHeight: 44, borderWidth: 1, paddingHorizontal: 12, fontFamily: "Space Grotesk", fontSize: 15 },
  sendButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  profileTop: { flexDirection: "row", gap: 16, alignItems: "center", marginTop: 14, marginBottom: 22 },
  profileIdentity: { flex: 1, gap: 5 },
  profileName: { fontFamily: "Space Grotesk", fontSize: 26, fontWeight: "700", letterSpacing: -0.7 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 15, marginBottom: 17 },
  stat: { alignItems: "center", gap: 4 },
  statValue: { fontFamily: "Space Grotesk", fontSize: 22, fontWeight: "700" },
  settingsBlock: { marginTop: 18 },
  menuButton: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 13, borderTopWidth: 1 },
  menuLabel: { flex: 1, fontFamily: "Space Grotesk", fontSize: 15, fontWeight: "600" },
  listCard: { borderWidth: 1, padding: 15, marginBottom: 10, gap: 7 },
  cardTitle: { fontFamily: "Space Grotesk", fontSize: 18, fontWeight: "700" },
  bottomNav: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopWidth: 1, flexDirection: "row" },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, minHeight: 60 },
  navLabel: { fontFamily: "Space Mono", fontSize: 8, letterSpacing: 0.3 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(18,18,18,0.42)", justifyContent: "flex-end" },
  menuSheet: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, minHeight: 430 },
  sheetHandle: { width: 42, height: 4, alignSelf: "center", marginBottom: 22 },
  sheetMenu: { marginTop: 20 },
  signOut: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 13, marginTop: 16 },
});