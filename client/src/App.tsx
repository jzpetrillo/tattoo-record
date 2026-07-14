import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
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
      <Route path="/live-events" component={LiveEvents} />
      <Route path="/live" component={LiveEvents} />
      <Route path="/jobs/:id" component={JobDetail} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/create">{() => <ProtectedRoute component={Create} />}</Route>
      <Route path="/reels" component={Reels} />
      <Route path="/saved">{() => <ProtectedRoute component={SavedPosts} />}</Route>
      <Route path="/flash-sales" component={FlashSales} />
      <Route path="/bookings">{() => <ProtectedRoute component={Bookings} />}</Route>
      <Route path="/ai-recommendations">{() => <ProtectedRoute component={AIRecommendations} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={Settings} />}</Route>
      <Route path="/auth" component={Auth} />
      <Route path="/admin">{() => <AdminRoute />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
