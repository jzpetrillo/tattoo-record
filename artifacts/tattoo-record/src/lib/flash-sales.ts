import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface FlashSale {
  id: string;
  artistId: string;
  title: string;
  description?: string | null;
  originalPriceCents: number;
  flashPriceCents: number;
  availableSlots: number;
  bookedSlots: number;
  expiresAt: string;
  isActive: boolean;
  media: { url: string; type: string }[];
  artist: {
    id: string;
    username: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
    location?: { city?: string; country?: string } | null;
  };
}

export async function fetchFlashSale(id: string): Promise<FlashSale | null> {
  try {
    const response = await apiRequest("GET", `/api/flash-sales/${encodeURIComponent(id)}`);
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("404:")) return null;
    throw error;
  }
}

export function useFlashSale(id: string) {
  return useQuery<FlashSale | null>({
    queryKey: [`/api/flash-sales/${id}`],
    queryFn: () => fetchFlashSale(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    retry: false,
  });
}

export function flashSaleAvailability(sale: FlashSale, now = Date.now()) {
  const remainingSlots = Math.max(0, sale.availableSlots - sale.bookedSlots);
  const soldOut = remainingSlots === 0;
  const expired = !Number.isFinite(Date.parse(sale.expiresAt)) || Date.parse(sale.expiresAt) <= now;
  return {
    remainingSlots,
    soldOut,
    expired,
    bookable: sale.isActive && !soldOut && !expired,
  };
}
