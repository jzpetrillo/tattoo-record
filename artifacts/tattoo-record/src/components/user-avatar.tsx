import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  username?: string | null;
  className?: string;
  alt?: string;
  "data-testid"?: string;
}

function getUserInitials({
  firstName,
  lastName,
  displayName,
  username,
}: Omit<UserAvatarProps, "avatarUrl" | "className" | "alt" | "data-testid">): string {
  const names = [firstName, lastName].filter((name): name is string => Boolean(name?.trim()));
  if (names.length) return names.map((name) => name.trim()[0]).join("").slice(0, 2).toUpperCase();

  const fallbackName = displayName?.trim() || username?.trim() || "U";
  const words = fallbackName.split(/\s+/).filter(Boolean);
  return words.length > 1
    ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
    : fallbackName.slice(0, 2).toUpperCase();
}

export default function UserAvatar({
  avatarUrl,
  firstName,
  lastName,
  displayName,
  username,
  className,
  alt,
  "data-testid": testId,
}: UserAvatarProps) {
  const initials = getUserInitials({ firstName, lastName, displayName, username });
  const label = alt || displayName || username || "User";

  return (
    <Avatar className={cn("rounded-none bg-background border border-ink", className)} data-testid={testId}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={label} className="object-cover" />}
      <AvatarFallback className="rounded-none bg-cobalt text-primary-foreground font-mono font-bold text-[0.7em]">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}