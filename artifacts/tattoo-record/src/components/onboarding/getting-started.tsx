import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth, type User } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";

interface UserStats {
  postsCount: number;
}

function getDismissalKey(userId: string) {
  return `tr-onboarding-dismissed:${userId}`;
}

function readDismissed(userId: string) {
  try {
    return localStorage.getItem(getDismissalKey(userId)) === "1";
  } catch {
    return false;
  }
}

function saveDismissed(userId: string) {
  try {
    localStorage.setItem(getDismissalKey(userId), "1");
  } catch {
    // Dismissal still applies for the current session when storage is unavailable.
  }
}

export default function GettingStarted() {
  const { user, token } = useAuth();
  const [dismissed, setDismissed] = useState(() => (user ? readDismissed(user.id) : false));

  const { data: profile } = useQuery<User>({
    queryKey: ["/api/users/me"],
    enabled: Boolean(token && user?.id),
  });
  const { data: stats } = useQuery<UserStats>({
    queryKey: [`/api/users/${user?.id}/stats`],
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (user?.id) {
      setDismissed(readDismissed(user.id));
    }
  }, [user?.id]);

  const currentUser = profile ?? user;
  const steps = useMemo(() => [
    {
      label: "Add a profile photo",
      complete: Boolean(currentUser?.avatarUrl),
      href: "/settings",
    },
    {
      label: "Complete your profile",
      complete: Boolean(currentUser?.bio?.trim()),
      href: "/settings",
    },
    {
      label: "Share your first post",
      complete: (stats?.postsCount ?? 0) >= 1,
      href: "/create",
    },
  ], [currentUser?.avatarUrl, currentUser?.bio, stats?.postsCount]);

  if (!user || !currentUser || dismissed) return null;

  const completedCount = steps.filter((step) => step.complete).length;
  if (completedCount === steps.length) return null;

  const dismiss = () => {
    saveDismissed(user.id);
    setDismissed(true);
  };

  return (
    <section className="border border-ink bg-paper p-4 sm:p-5 mb-4" aria-labelledby="getting-started-title" data-testid="getting-started">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="meta text-[0.65rem] mb-1">New here</p>
          <h2 id="getting-started-title" className="press-nameplate text-xl sm:text-2xl">Getting started</h2>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 min-h-11 min-w-11 -mr-2 -mt-2 inline-flex items-center justify-center text-ink/60 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
          aria-label="Dismiss getting started"
          data-testid="button-dismiss-getting-started"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="meta text-[0.65rem]">{completedCount} of {steps.length} done</p>
        <div className="h-1 flex-1 max-w-40 bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completedCount} aria-label={`${completedCount} of ${steps.length} onboarding steps complete`}>
          <div className="h-full bg-cobalt transition-[width]" style={{ width: `${(completedCount / steps.length) * 100}%` }} />
        </div>
      </div>

      <ul className="mt-4 divide-y divide-ink/10">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className={`h-5 w-5 shrink-0 border flex items-center justify-center ${step.complete ? "border-cobalt bg-cobalt text-white" : "border-ink/30 text-transparent"}`} aria-hidden="true">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span className={`text-sm min-w-0 flex-1 ${step.complete ? "text-ink/55 line-through" : "text-ink"}`}>{step.label}</span>
            {!step.complete && (
              <Link href={step.href} className="shrink-0 text-xs font-mono uppercase tracking-wider text-cobalt underline underline-offset-4 hover:text-ink" data-testid={`link-onboarding-${step.href.slice(1)}`}>
                Start
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}