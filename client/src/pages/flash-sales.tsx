import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { Link } from "wouter";
import { Zap, Clock, DollarSign, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function FlashSalesPage() {
  const { token } = useAuth();

  const { data: flashSales = [], isLoading } = useQuery({
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
      <div className="min-h-screen bg-background flex">
        <SidebarNav />
        <main className="flex-1 md:ml-64 mb-16 md:mb-0">
          <div className="max-w-7xl mx-auto p-4">
            <div className="text-center py-8">
              <div className="animate-pulse">
                <div className="h-8 bg-secondary rounded w-48 mx-auto mb-4"></div>
                <div className="h-4 bg-secondary rounded w-32 mx-auto"></div>
              </div>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <SidebarNav />
      <main className="flex-1 md:ml-64 mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto p-4 lg:pt-8">
          {/* Header */}
          <div className="border-b border-border pb-4 mb-6">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-yellow-500" />
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-tight" data-testid="text-page-title">
                  Flash Sales
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Limited-time tattoo deals from artists
                </p>
              </div>
            </div>
          </div>

          {/* Flash Sales Grid */}
          {flashSales.length === 0 ? (
            <div className="text-center py-12 border border-border rounded-lg" data-testid="empty-state">
              <Zap className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No active flash sales</h2>
              <p className="text-muted-foreground">
                Check back soon for limited-time tattoo deals
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {flashSales.map((sale: any) => (
                <Link
                  key={sale.id}
                  href={`/u/${sale.artist?.username || ''}`}
                  data-testid={`flash-sale-${sale.id}`}
                >
                  <Card className="p-0 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border-border group">
                    {/* Sale Image */}
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

                    {/* Sale Details */}
                    <div className="p-4 space-y-3">
                      {/* Title & Artist */}
                      <div>
                        <h3 className="font-semibold text-lg line-clamp-1 mb-1" data-testid={`sale-title-${sale.id}`}>
                          {sale.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          by {sale.artist?.username || 'Unknown Artist'}
                        </p>
                      </div>

                      {/* Description */}
                      {sale.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {sale.description}
                        </p>
                      )}

                      {/* Pricing */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-bold text-lg">${sale.discountedPrice}</span>
                        </div>
                        {sale.originalPrice && sale.originalPrice > sale.discountedPrice && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground line-through">
                              ${sale.originalPrice}
                            </span>
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              {Math.round((1 - sale.discountedPrice / sale.originalPrice) * 100)}% OFF
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        {/* Time Remaining */}
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-4 h-4 ${getUrgencyColor(sale.endDate)}`} />
                          <span className={`text-sm font-medium ${getUrgencyColor(sale.endDate)}`}>
                            {getRemainingTime(sale.endDate)}
                          </span>
                        </div>

                        {/* Slots */}
                        {sale.spotsAvailable && (
                          <div className="text-sm text-muted-foreground">
                            {sale.spotsAvailable} {sale.spotsAvailable === 1 ? 'spot' : 'spots'} left
                          </div>
                        )}
                      </div>

                      {/* Location */}
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
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
