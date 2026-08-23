import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { Link } from "wouter";
import { Zap, Clock, MapPin, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlashSaleCardSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/empty-state";

interface FlashSale {
  id: string;
  title: string;
  description?: string;
  flashPriceCents: number | null;
  originalPriceCents: number | null;
  expiresAt: string;
  availableSlots: number | null;
  bookedSlots: number | null;
  media?: { url: string; type: string }[];
  artist?: {
    id: string;
    username: string;
    location?: {
      city?: string;
      country?: string;
    };
  };
}

function useCountdown() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

export default function FlashSalesPage() {
  const { token } = useAuth();
  useCountdown(); // triggers a re-render every minute so timers stay live

  const { data: flashSales = [], isLoading, isError, refetch } = useQuery<FlashSale[]>({
    queryKey: ["/api/flash-sales?active=true"],
    enabled: !!token,
  });

  const getRemainingTime = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    return `${hours}h ${minutes}m`;
  };

  const getUrgencyClass = (expiresAt: string) => {
    const hoursRemaining = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursRemaining <= 2) return "font-bold text-foreground";
    if (hoursRemaining <= 6) return "font-medium text-foreground";
    return "text-muted-foreground";
  };

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

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => <FlashSaleCardSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">Failed to load flash sales</p>
            <button onClick={() => refetch()} className="text-sm text-primary underline">Try again</button>
          </div>
        ) : flashSales.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No active flash sales"
            description="Check back soon for limited-time tattoo deals from artists."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flashSales.map((sale) => {
              const spotsRemaining =
                sale.availableSlots != null
                  ? sale.availableSlots - (sale.bookedSlots ?? 0)
                  : null;
              const isSoldOut =
                sale.availableSlots != null &&
                (sale.bookedSlots ?? 0) >= sale.availableSlots;

              const cardContent = (
                <Card
                  className={`p-0 overflow-hidden transition-all border border-border group ${
                    isSoldOut ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <div className="aspect-square bg-secondary relative overflow-hidden">
                    {sale.media && sale.media.length > 0 ? (
                      <>
                        <img
                          src={sale.media[0].url}
                          alt={sale.title}
                          className={`w-full h-full object-cover transition-transform ${
                            !isSoldOut ? "group-hover:scale-105" : "grayscale"
                          }`}
                        />
                        {isSoldOut ? (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white text-lg font-mono font-bold tracking-widest uppercase">
                              Sold Out
                            </span>
                          </div>
                        ) : (
                          <div className="absolute top-3 right-3 bg-flash px-3 py-1 flex items-center gap-1">
                            <Zap className="w-4 h-4 text-[#111] fill-current" />
                            <span className="text-[#111] text-sm font-mono font-bold tracking-widest">FLASH</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        {isSoldOut ? (
                          <span className="text-base font-mono font-bold tracking-widest uppercase text-muted-foreground">
                            Sold Out
                          </span>
                        ) : (
                          <Zap className="w-16 h-16" />
                        )}
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
                      <span className="font-bold text-lg">${((sale.flashPriceCents ?? 0) / 100).toFixed(2)}</span>
                      {sale.originalPriceCents && sale.flashPriceCents && sale.originalPriceCents > sale.flashPriceCents && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground line-through">
                            ${(sale.originalPriceCents / 100).toFixed(2)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round((1 - sale.flashPriceCents / sale.originalPriceCents) * 100)}% OFF
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className={`flex items-center gap-1.5 text-sm ${getUrgencyClass(sale.expiresAt)}`}>
                        <Clock className="w-4 h-4" />
                        <span>{getRemainingTime(sale.expiresAt)}</span>
                      </div>
                      {isSoldOut ? (
                        <Badge variant="destructive" className="text-xs" data-testid={`sold-out-badge-${sale.id}`}>
                          Sold Out
                        </Badge>
                      ) : spotsRemaining != null ? (
                        <div className="text-sm text-muted-foreground">
                          {spotsRemaining} {spotsRemaining === 1 ? 'spot' : 'spots'} left
                        </div>
                      ) : null}
                    </div>
                    {sale.artist?.location?.city && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{sale.artist.location.city}, {sale.artist.location.country}</span>
                      </div>
                    )}
                  </div>
                </Card>
              );

              return isSoldOut ? (
                <div key={sale.id} data-testid={`flash-sale-${sale.id}`}>
                  {cardContent}
                </div>
              ) : (
                <Link
                  key={sale.id}
                  href={`/u/${sale.artist?.username || ''}`}
                  data-testid={`flash-sale-${sale.id}`}
                >
                  {cardContent}
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
