import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { Link } from "wouter";
import { Zap, Clock, DollarSign, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";

interface FlashSale {
  id: string;
  title: string;
  description?: string;
  discountedPrice: number | null;
  originalPrice: number | null;
  endDate: string;
  spotsAvailable: number | null;
  imageUrl: string | null;
  artist?: {
    id: string;
    username: string;
    location?: {
      city?: string;
      country?: string;
    };
  };
}

export default function FlashSalesPage() {
  const { token } = useAuth();

  const { data: flashSales = [], isLoading } = useQuery<FlashSale[]>({
    queryKey: ["/api/flash-sales?active=true"],
    enabled: !!token,
  });

  const getRemainingTime = (endDate: string) => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const diff = end - now;

    if (diff <= 0) return "Expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const getUrgencyColor = (endDate: string) => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const hoursRemaining = (end - now) / (1000 * 60 * 60);

    if (hoursRemaining <= 2) return "text-red-500";
    if (hoursRemaining <= 6) return "text-orange-500";
    return "text-green-500";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SidebarNav />
        <main className="lg:ml-64 pb-20 lg:pb-8 pt-4 max-w-6xl mx-auto px-4">
          <div className="mb-6">
            <div className="h-8 bg-secondary rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-secondary rounded w-64 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border border-border overflow-hidden animate-pulse">
                <div className="aspect-square bg-secondary" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-secondary rounded w-3/4" />
                  <div className="h-4 bg-secondary rounded w-1/2" />
                  <div className="h-6 bg-secondary rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <main className="lg:ml-64 pb-20 lg:pb-8 pt-4 max-w-6xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1" data-testid="text-page-title">
              Flash Sales
            </h1>
            <p className="text-sm text-muted-foreground">
              Limited-time tattoo deals from artists
            </p>
          </div>
        </div>

        {/* Flash Sales Grid */}
        {flashSales.length === 0 ? (
          <div className="text-center py-12 border border-border" data-testid="empty-state">
            <Zap className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No active flash sales</h2>
            <p className="text-muted-foreground">
              Check back soon for limited-time tattoo deals
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flashSales.map((sale) => (
              <Link
                key={sale.id}
                href={`/u/${sale.artist?.username || ''}`}
                data-testid={`flash-sale-${sale.id}`}
              >
                <Card className="p-0 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border-border group">
                  <div className="aspect-square bg-secondary relative overflow-hidden">
                    {sale.imageUrl ? (
                      <>
                        <img
                          src={sale.imageUrl}
                          alt={sale.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute top-3 right-3 bg-yellow-500 rounded-full px-3 py-1 flex items-center gap-1">
                          <Zap className="w-4 h-4 text-white fill-current" />
                          <span className="text-white text-sm font-bold">FLASH</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Zap className="w-16 h-16" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg line-clamp-1 mb-1" data-testid={`sale-title-${sale.id}`}>
                        {sale.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        by {sale.artist?.username || 'Unknown Artist'}
                      </p>
                    </div>
                    {sale.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {sale.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-bold text-lg">${sale.discountedPrice ?? 0}</span>
                      </div>
                      {sale.originalPrice && sale.discountedPrice && sale.originalPrice > sale.discountedPrice && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground line-through">
                            ${sale.originalPrice}
                          </span>
                          <span className="text-sm font-semibold text-green-600">
                            {Math.round((1 - sale.discountedPrice / sale.originalPrice) * 100)}% OFF
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-4 h-4 ${getUrgencyColor(sale.endDate)}`} />
                        <span className={`text-sm font-medium ${getUrgencyColor(sale.endDate)}`}>
                          {getRemainingTime(sale.endDate)}
                        </span>
                      </div>
                      {sale.spotsAvailable && (
                        <div className="text-sm text-muted-foreground">
                          {sale.spotsAvailable} {sale.spotsAvailable === 1 ? 'spot' : 'spots'} left
                        </div>
                      )}
                    </div>
                    {sale.artist?.location?.city && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{sale.artist.location.city}, {sale.artist.location.country}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
