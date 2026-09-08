export const terminalBookingStatuses = ["COMPLETED", "CANCELLED"] as const;

export type BookingStatusFilter = "all" | "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED" | "REJECTED";

type PaginatedBookings<T> = {
  items: T[];
};

export function getAdminBookingsUrl(status: BookingStatusFilter): string {
  if (status === "all") return "/api/admin/bookings";
  return `/api/admin/bookings?status=${encodeURIComponent(status)}`;
}

export function getAdminBookingItems<T extends { status: string }>(
  response: T[] | PaginatedBookings<T>,
  status: BookingStatusFilter,
): T[] {
  const items = Array.isArray(response) ? response : response.items;
  return status === "all" ? items : items.filter((booking) => booking.status === status);
}