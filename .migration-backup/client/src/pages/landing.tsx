import { Link } from "wouter";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleUserRound,
  Image,
  MessageCircle,
  Search,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const audience = [
  {
    title: "Artists",
    icon: CircleUserRound,
    description: "Build a portfolio with a point of view, manage bookings, release flash work, and get discovered.",
    details: ["Portfolio tools", "Bookings", "Flash sales"],
  },
  {
    title: "Studios",
    icon: Store,
    description: "Keep your roster visible, post opportunities, and make every detail of your studio easier to trust.",
    details: ["Artist network", "Job board", "Studio profile"],
  },
  {
    title: "Enthusiasts",
    icon: Sparkles,
    description: "Find artists whose work speaks to you, book with confidence, and keep the work you love close.",
    details: ["Artist discovery", "Saved work", "Direct booking"],
  },
];

const coreFeatures = [
  { title: "Portfolios & Feed", icon: Image, description: "A living record of work worth revisiting." },
  { title: "Bookings & Deposits", icon: CalendarDays, description: "Clear appointments, clear expectations." },
  { title: "Direct Messaging", icon: MessageCircle, description: "The conversation stays close to the work." },
  { title: "Flash Sales", icon: Zap, description: "Limited work, made visible at the right moment." },
  { title: "Studio Job Board", icon: BriefcaseBusiness, description: "New opportunities for the people making the culture." },
  { title: "Stories & Reels", icon: Search, description: "A faster way to see what is happening now." },
];

export default function Landing() {
  const features = import.meta.env.VITE_AI_ENABLED === "true"
    ? [...coreFeatures, { title: "AI Discovery", icon: Sparkles, description: "Find relevant work through richer visual context." }]
    : coreFeatures;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground" data-testid="landing-page">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="press-nameplate text-xl sm:text-2xl" data-testid="landing-wordmark">
            Tattoo Record
          </Link>
          <nav className="flex items-center gap-2" aria-label="Account actions">
            <Button asChild variant="outline" size="sm" className="rounded-none border-foreground px-3 sm:px-4" data-testid="landing-sign-in">
              <Link href="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-none bg-cobalt px-3 text-white hover:bg-cobalt/90 sm:px-4" data-testid="landing-sign-up">
              <Link href="/auth?mode=register">Sign up</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="halftone border-b border-foreground text-background">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16 lg:px-8 lg:py-28">
            <div className="max-w-3xl">
              <p className="mb-5 font-mono text-xs uppercase tracking-[0.16em] text-background/70">
                Nº 01 — The Tattoo Community Platform
              </p>
              <h1 className="press-nameplate max-w-3xl text-[clamp(3.4rem,9vw,7.5rem)] leading-[0.82] tracking-[-0.06em]">
                Where tattoo culture gets its record.
              </h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-background/80 sm:text-lg">
                A shared place for artists, studios, and collectors to find the work, the people, and the next appointment that matters.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-none bg-background px-6 text-foreground hover:bg-background/90">
                  <Link href="/auth?mode=register">
                    Create free account <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-none border-background bg-transparent px-6 text-background hover:bg-background hover:text-foreground">
                  <Link href="/auth">Explore the feed</Link>
                </Button>
              </div>
            </div>

            <div className="relative min-h-72 border border-background/50 bg-background/10 p-4 sm:min-h-96">
              <div className="absolute inset-4 border border-background/30" />
              <div className="relative flex h-full min-h-64 flex-col justify-between p-3 sm:min-h-80 sm:p-5">
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-background/65">Image archive / incoming</span>
                <div className="max-w-48 border-l-2 border-cobalt pl-3">
                  <p className="press-nameplate text-2xl leading-none">A space for the work before the work.</p>
                  <p className="mt-3 text-sm text-background/70">Drop a hero tattoo image here when the archive is ready.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="meta text-xs">A shared field guide</p>
              <h2 className="press-nameplate mt-2 text-4xl leading-none sm:text-5xl">Built for everyone in the room.</h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Tattoo Record keeps the people who make, house, and collect the work in the same conversation.
            </p>
          </div>

          <div className="grid grid-cols-1 border border-border md:grid-cols-3 md:divide-x md:divide-border">
            {audience.map(({ title, icon: Icon, description, details }, index) => (
              <article key={title} className={`p-6 sm:p-8 ${index > 0 ? "border-t border-border md:border-t-0" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <Icon className="h-7 w-7 text-cobalt" strokeWidth={1.5} aria-hidden="true" />
                  <span className="meta text-xs">0{index + 1}</span>
                </div>
                <h3 className="press-nameplate mt-10 text-3xl">{title}</h3>
                <p className="mt-4 min-h-20 text-sm leading-relaxed text-muted-foreground">{description}</p>
                <ul className="mt-7 space-y-2 border-t border-border pt-5 text-sm">
                  {details.map((detail) => (
                    <li key={detail} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-cobalt" aria-hidden="true" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-secondary/35">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mb-8">
              <p className="meta text-xs">The working index</p>
              <h2 className="press-nameplate mt-2 text-4xl leading-none sm:text-5xl">Everything in one place.</h2>
            </div>
            <div className="grid grid-cols-1 gap-px bg-foreground sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ title, icon: Icon, description }, index) => (
                <article key={title} className="group min-h-52 bg-background p-6 transition-colors duration-200 hover:bg-cobalt hover:text-white sm:p-7">
                  <div className="flex items-start justify-between">
                    <Icon className="h-6 w-6 text-cobalt transition-colors group-hover:text-white" strokeWidth={1.5} aria-hidden="true" />
                    <span className="meta text-xs group-hover:text-white/70">0{index + 1}</span>
                  </div>
                  <h3 className="press-nameplate mt-12 text-2xl leading-none">{title}</h3>
                  <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground transition-colors group-hover:text-white/80">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="halftone text-background">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-background/70">The next entry starts here</p>
              <h2 className="press-nameplate mt-3 text-[clamp(3rem,8vw,6.25rem)] leading-[0.84] tracking-[-0.06em]">
                Put your work on the record.
              </h2>
            </div>
            <Button asChild size="lg" className="w-full rounded-none bg-background px-6 text-foreground hover:bg-background/90 sm:w-auto">
              <Link href="/auth?mode=register">
                Get started — it&apos;s free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p className="press-nameplate text-lg">Tattoo Record</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm" aria-label="Footer navigation">
            <Link href="/auth" className="hover:text-cobalt">Sign in</Link>
            <Link href="/auth?mode=register" className="hover:text-cobalt">Sign up</Link>
            <Link href="/auth" className="hover:text-cobalt">Explore</Link>
            <Link href="/auth" className="hover:text-cobalt">Jobs</Link>
          </nav>
          <p className="meta text-xs">© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}