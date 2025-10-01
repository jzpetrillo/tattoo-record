import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import LiveStreamCard from "@/components/live/live-stream-card";
import { useAuth } from "@/hooks/use-auth";

export default function LiveEvents() {
  const { token } = useAuth();

  const { data: liveEvents } = useQuery({
    queryKey: ["/api/livestream-events?status=LIVE"],
    enabled: !!token,
  });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-64 xl:ml-72 pb-20 lg:pb-0">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Live Events</h1>
            <p className="text-muted-foreground">Watch artists create amazing tattoos in real-time</p>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-full font-medium text-sm whitespace-nowrap" data-testid="filter-live-now">
              <i className="fas fa-circle text-[6px] mr-2 animate-pulse"></i>
              Live Now ({liveEvents?.length || 0})
            </button>
            <button className="px-4 py-2 bg-secondary text-muted-foreground hover:text-foreground rounded-full font-medium text-sm whitespace-nowrap transition-colors" data-testid="filter-upcoming">
              Upcoming
            </button>
            <button className="px-4 py-2 bg-secondary text-muted-foreground hover:text-foreground rounded-full font-medium text-sm whitespace-nowrap transition-colors" data-testid="filter-following">
              Following
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {liveEvents?.map((item: any) => (
              <LiveStreamCard key={item.event.id} event={item.event} host={item.host} />
            ))}
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
