import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { ArrowLeft, AlertCircle, Clock, MapPin, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useFlashSale, flashSaleAvailability } from "@/lib/flash-sales";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <SidebarNav />
      <main className="lg:ml-64 pb-24 lg:pb-8 pt-4 max-w-4xl mx-auto px-4">{children}</main>
      <MobileNav />
    </div>
  );
}

function remaining(expiresAt: string, now: number) {
  const diff = Date.parse(expiresAt) - now;
  if (!Number.isFinite(diff) || diff <= 0) return "Expired";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m ${s}s left`;
}

export default function FlashSaleDetailPage() {
  const [, params] = useRoute("/flash-sales/:id");
  const id = params?.id ?? "";
  const [, setLocation] = useLocation();
  const { token, user } = useAuth();
  const { data: sale, isLoading, isError, refetch, isFetching } = useFlashSale(id);
  const [now, setNow] = useState(() => Date.now());
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [id]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = sale ? `${sale.title} — Flash Sale | Tattoo Record` : "Flash Sale | Tattoo Record";
    return () => { document.title = previousTitle; };
  }, [sale?.title]);

  const back = (
    <button
      onClick={() => (window.history.length > 1 ? window.history.back() : setLocation("/flash-sales"))}
      className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ink hover:text-cobalt"
      data-testid="button-back"
    >
      <ArrowLeft className="w-4 h-4" /> Back
    </button>
  );

  if (isLoading) {
    return (
      <Shell>
        {back}
        <div className="border-2 border-ink bg-card animate-pulse" data-testid="skeleton-flash-sale">
          <div className="aspect-square bg-secondary" />
          <div className="p-5 space-y-3">
            <div className="h-7 w-2/3 bg-secondary" />
            <div className="h-4 w-full bg-secondary" />
            <div className="h-10 w-1/3 bg-secondary" />
          </div>
        </div>
      </Shell>
    );
  }

  if (isError || sale === undefined) {
    return (
      <Shell>
        {back}
        <div className="border-2 border-ink bg-card p-10 text-center" data-testid="state-error">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-ink" />
          <h1 className="text-2xl font-bold uppercase tracking-tight mb-2">Could not load sale</h1>
          <p className="font-mono text-sm text-muted-foreground mb-6">Check your connection and try again.</p>
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            variant="outline"
            className="border-ink rounded-none font-mono uppercase tracking-wider text-xs"
            data-testid="button-retry"
          >
            Try again
          </Button>
        </div>
      </Shell>
    );
  }

  if (sale === null) {
    return (
      <Shell>
        {back}
        <div className="border-2 border-ink bg-card p-10 text-center" data-testid="state-not-found">
          <Zap className="w-8 h-8 mx-auto mb-3 text-ink" />
          <h1 className="text-2xl font-bold uppercase tracking-tight mb-2">Flash sale not found</h1>
          <p className="font-mono text-sm text-muted-foreground mb-6">It was removed or never existed.</p>
          <Button
            onClick={() => setLocation("/flash-sales")}
            variant="outline"
            className="border-ink rounded-none font-mono uppercase tracking-wider text-xs"
            data-testid="button-all-sales"
          >
            Browse flash sales
          </Button>
        </div>
      </Shell>
    );
  }

  const a = flashSaleAvailability(sale, now);
  const saved = Math.max(0, sale.originalPriceCents - sale.flashPriceCents);
  const pct =
    sale.originalPriceCents > 0 && saved > 0 ? Math.round((saved / sale.originalPriceCents) * 100) : 0;
  const media = sale.media ?? [];
  const current = media[Math.min(active, Math.max(0, media.length - 1))];
  const isVideo = (m?: { url: string; type: string }) =>
    !!m && (String(m.type).toLowerCase() === "video" || /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(m.url));
  const isStudio = user?.role === "STUDIO";
  const loc = sale.artist.location;

  let status = "";
  if (!sale.isActive) status = "This sale is no longer active.";
  else if (a.expired) status = "This sale has expired.";
  else if (a.soldOut) status = "Sold out. All slots have been booked.";

  return (
    <Shell>
      {back}
      <article className="border-2 border-ink bg-card" data-testid={`flash-sale-detail-${sale.id}`}>
        {current && (
          <div className="bg-ink border-b-2 border-ink relative">
            {isVideo(current) ? (
              <video src={current.url} className="w-full max-h-[75vh] object-contain" controls playsInline />
            ) : (
              <img src={current.url} alt={sale.title} className="w-full max-h-[75vh] object-contain" />
            )}
            {!a.bookable && (
              <div className="absolute top-3 left-3 bg-ink text-background px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest">
                {a.soldOut ? "Sold Out" : a.expired ? "Expired" : "Inactive"}
              </div>
            )}
          </div>
        )}
        {media.length > 1 && (
          <div className="flex gap-2 p-3 border-b-2 border-ink overflow-x-auto" data-testid="gallery-thumbs">
            {media.map((m, i) => (
              <button
                key={`${m.url}-${i}`}
                onClick={() => setActive(i)}
                className={`w-16 h-16 shrink-0 border-2 bg-secondary ${i === active ? "border-ink" : "border-ink/20"}`}
                aria-label={`Show image ${i + 1}`}
                data-testid={`button-thumb-${i}`}
              >
                {isVideo(m) ? (
                  <video src={m.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="p-5 space-y-5">
          <div>
            <div className="inline-flex items-center gap-1 bg-flash px-2 py-0.5 mb-3">
              <Zap className="w-3 h-3 text-[#111] fill-current" />
              <span className="font-mono text-[10px] font-bold tracking-widest text-[#111]">FLASH</span>
            </div>
            <h1 className="text-3xl font-bold uppercase tracking-tight" data-testid="text-sale-title">
              {sale.title}
            </h1>
            <Link
              href={`/u/${sale.artist.username}`}
              className="inline-block mt-2 font-mono text-xs uppercase tracking-widest text-ink hover:text-cobalt border-b border-ink/30"
              data-testid="link-artist"
            >
              by {sale.artist.username}
            </Link>
            {loc?.city && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {[loc.city, loc.country].filter(Boolean).join(", ")}
              </div>
            )}
          </div>

          {sale.description && (
            <p className="border-l-2 border-ink pl-4 text-[15px] leading-relaxed whitespace-pre-wrap" data-testid="text-sale-description">
              {sale.description}
            </p>
          )}

          <div className="border-2 border-ink p-4 flex flex-wrap items-end gap-x-6 gap-y-2">
            <span className="text-4xl font-bold" data-testid="text-flash-price">{usd(sale.flashPriceCents)}</span>
            <span className="text-lg text-muted-foreground line-through" data-testid="text-original-price">
              {usd(sale.originalPriceCents)}
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-widest" data-testid="text-savings">
              Save {usd(saved)} ({pct}% off)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs uppercase tracking-widest">
            <div className="border border-ink/20 p-3" data-testid="text-slots">
              <div className="text-muted-foreground mb-1">Availability</div>
              <div className="font-bold text-ink">
                {a.soldOut
                  ? "Sold out"
                  : `${a.remainingSlots} of ${sale.availableSlots} ${a.remainingSlots === 1 ? "slot" : "slots"} left`}
              </div>
            </div>
            <div className="border border-ink/20 p-3" data-testid="text-expiry">
              <div className="text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Expires
              </div>
              <div className="font-bold text-ink">
                {new Date(sale.expiresAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
              <div className="mt-1 text-muted-foreground normal-case tracking-normal" data-testid="text-countdown">
                {remaining(sale.expiresAt, now)}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t-2 border-ink">
            {status && (
              <p className="font-mono text-sm mt-4 mb-3 font-bold" data-testid="text-unavailable">{status}</p>
            )}
            {a.bookable && !token && (
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mt-4 mb-3" data-testid="text-signin-guidance">
                <Link href="/auth" className="text-ink font-bold border-b border-ink/30 hover:text-cobalt">
                  Sign in
                </Link>{" "}
                to book this flash sale.
              </p>
            )}
            {a.bookable && token && isStudio && (
              <p className="font-mono text-xs text-muted-foreground mt-4 mb-3" data-testid="text-studio-note">
                Studio accounts cannot book flash sales. Sign in with a client or artist account to book.
              </p>
            )}
            <Button
              className="mt-2 w-full sm:w-auto rounded-none border-2 border-ink bg-ink text-background font-mono font-bold uppercase tracking-wider hover:bg-cobalt hover:border-cobalt shadow-[2px_2px_0px_0px_#111]"
              disabled={!a.bookable || !token || isStudio}
              onClick={() => setLocation(`/bookings?flashSale=${encodeURIComponent(sale.id)}`)}
              data-testid="button-book-flash-sale"
            >
              {a.bookable ? "Book this flash sale" : a.soldOut ? "Sold out" : a.expired ? "Expired" : "Unavailable"}
            </Button>
          </div>
        </div>
      </article>
    </Shell>
  );
}
