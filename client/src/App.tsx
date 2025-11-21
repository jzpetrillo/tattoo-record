import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Search from "@/pages/search";
import Explore from "@/pages/explore";
import Messages from "@/pages/messages";
import Notifications from "@/pages/notifications";
import Profile from "@/pages/profile";
import LiveEvents from "@/pages/live-events";
import Jobs from "@/pages/jobs";
import JobDetail from "@/pages/job-detail";
import Create from "@/pages/create";
import Auth from "@/pages/auth";
import AdminDashboard from "@/pages/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={Search} />
      <Route path="/explore" component={Explore} />
      <Route path="/messages" component={Messages} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/profile" component={Profile} />
      <Route path="/profile/:username" component={Profile} />
      <Route path="/u/:username" component={Profile} />
      <Route path="/live-events" component={LiveEvents} />
      <Route path="/live" component={LiveEvents} />
      <Route path="/jobs/:id" component={JobDetail} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/create" component={Create} />
      <Route path="/reels" component={Explore} />
      <Route path="/auth" component={Auth} />
      <Route path="/admin" component={AdminDashboard} />
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
