import { Skeleton } from "@/components/ui/skeleton";

export function PostCardSkeleton() {
  return (
    <div className="border border-border bg-background" data-testid="skeleton-post">
      <div className="flex items-center gap-3 p-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="aspect-square w-full" />
      <div className="p-4 space-y-3">
        <div className="flex gap-4">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-6" />
        </div>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function UserCardSkeleton() {
  return (
    <div className="border border-border bg-background" data-testid="skeleton-user">
      <Skeleton className="aspect-square w-full" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border border-border" data-testid="skeleton-notification">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function BookingCardSkeleton() {
  return (
    <div className="p-4 border border-border rounded-none space-y-3" data-testid="skeleton-booking">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function FlashSaleCardSkeleton() {
  return (
    <div className="border border-border bg-background overflow-hidden" data-testid="skeleton-flash-sale">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="p-4 border border-border" data-testid="skeleton-job">
      <div className="flex justify-between items-start mb-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-3" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-border" data-testid="skeleton-message">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

export function StorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0" data-testid="skeleton-story">
      <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-full" />
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6" data-testid="skeleton-feed">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ExploreGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="skeleton-explore">
      {Array.from({ length: count }).map((_, i) => (
        <UserCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function LiveStreamCardSkeleton() {
  return (
    <div className="border border-border bg-background overflow-hidden" data-testid="skeleton-live-stream">
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-14" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export function AdminCardSkeleton() {
  return (
    <div className="border border-border bg-background p-6 space-y-3" data-testid="skeleton-admin-card">
      <div className="flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

export function AdminStatSkeleton() {
  return (
    <div className="border border-border bg-background p-6" data-testid="skeleton-admin-stat">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="w-4 h-4" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-9 w-16" />
    </div>
  );
}

export function PortfolioGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="skeleton-portfolio">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-border rounded-lg overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
