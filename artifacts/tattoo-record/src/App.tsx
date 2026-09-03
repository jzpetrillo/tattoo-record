import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { apiRequest as queryApiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useAuth, type User } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Search from "@/pages/search";
import Explore from "@/pages/explore";
import Reels from "@/pages/reels";
import Messages from "@/pages/messages";
import Notifications from "@/pages/notifications";
import Profile from "@/pages/profile";
import LiveEvents from "@/pages/live-events";
import Jobs from "@/pages/jobs";
import JobDetail from "@/pages/job-detail";
import Create from "@/pages/create";
import Auth from "@/pages/auth";
import AdminDashboard from "@/pages/admin";
import SavedPosts from "@/pages/saved-posts";
import FlashSales from "@/pages/flash-sales";
import Bookings from "@/pages/bookings";
import AIRecommendations from "@/pages/ai-recommendations";
import Settings from "@/pages/settings";
import VerifyEmailChange from "@/pages/verify-email-change";
import PostDetail from "@/pages/post-detail";
import { ErrorBoundary } from "@/components/error-boundary";

const liveEnabled = import.meta.env.VITE_LIVE_ENABLED === "true";
const aiEnabled = import.meta.env.VITE_AI_ENABLED === "true";

function AdminRoute() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token || user?.role !== "ADMIN") {
      setLocation("/");
    }
  }, [token, user, setLocation]);

  if (!token || user?.role !== "ADMIN") return null;
  return <AdminDashboard />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { token } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token) setLocation("/auth");
  }, [token, setLocation]);

  if (!token) return null;
  return <Component />;
}

function FeatureRoute({
  enabled,
  component: Component,
  requiresAuth = false,
}: {
  enabled: boolean;
  component: React.ComponentType;
  requiresAuth?: boolean;
}) {
  if (!enabled) return <NotFound />;
  return requiresAuth ? <ProtectedRoute component={Component} /> : <Component />;
}

function AuthExpiryListener() {
  useEffect(() => {
    const handleAuthExpiry = () => useAuth.getState().clearAuth();
    window.addEventListener("auth-expired", handleAuthExpiry);
    return () => window.removeEventListener("auth-expired", handleAuthExpiry);
  }, []);

  return null;
}

function AuthUserHydrator() {
  const { user, token, setAuth } = useAuth();
  const { data } = useQuery<User>({
    queryKey: ["/api/users/me", "auth-hydration", user?.id],
    queryFn: async () => {
      const res = await queryApiRequest("GET", "/api/users/me");
      return res.json();
    },
    enabled: Boolean(token && user?.id),
    staleTime: 0,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (data && token) {
      setAuth(data, token);
    }
  }, [data, token, setAuth]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={Search} />
      <Route path="/explore" component={Explore} />
      <Route path="/messages">{() => <ProtectedRoute component={Messages} />}</Route>
      <Route path="/notifications">{() => <ProtectedRoute component={Notifications} />}</Route>
      <Route path="/profile">{() => <ProtectedRoute component={Profile} />}</Route>
      <Route path="/profile/:username" component={Profile} />
      <Route path="/u/:username" component={Profile} />
      <Route path="/live-events">{() => <FeatureRoute enabled={liveEnabled} component={LiveEvents} />}</Route>
      <Route path="/live">{() => <FeatureRoute enabled={liveEnabled} component={LiveEvents} />}</Route>
      <Route path="/jobs/:id" component={JobDetail} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/create">{() => <ProtectedRoute component={Create} />}</Route>
      <Route path="/reels" component={Reels} />
      <Route path="/posts/:id" component={PostDetail} />
      <Route path="/saved">{() => <ProtectedRoute component={SavedPosts} />}</Route>
      <Route path="/flash-sales" component={FlashSales} />
      <Route path="/bookings">{() => <ProtectedRoute component={Bookings} />}</Route>
      <Route path="/ai-recommendations">{() => <FeatureRoute enabled={aiEnabled} component={AIRecommendations} requiresAuth />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={Settings} />}</Route>
      <Route path="/verify-email-change" component={VerifyEmailChange} />
      <Route path="/auth" component={Auth} />
      <Route path="/admin">{() => <AdminRoute />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function RoutedApp() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Router />
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthExpiryListener />
        <AuthUserHydrator />
        <Toaster />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <RoutedApp />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
