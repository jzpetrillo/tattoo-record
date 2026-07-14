import { embed, isVoyageEnabled } from "./index";

export { isVoyageEnabled };

export function buildPostText(post: {
  caption?: string | null;
  styles?: string[] | null;
  aiTags?: string[] | null;
  subjects?: string[] | null;
}): string {
  const parts: string[] = [];
  if (post.caption) parts.push(post.caption);
  if (post.styles?.length) parts.push(`styles: ${post.styles.join(", ")}`);
  if (post.subjects?.length) parts.push(`subjects: ${post.subjects.join(", ")}`);
  if (post.aiTags?.length) parts.push(`tags: ${post.aiTags.join(", ")}`);
  return parts.join(" | ") || "tattoo artwork";
}

export function buildUserText(user: {
  username?: string | null;
  bio?: string | null;
  role?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const parts: string[] = [];
  if (user.role) parts.push(`role: ${user.role.toLowerCase()}`);
  if (user.firstName || user.lastName) {
    parts.push([user.firstName, user.lastName].filter(Boolean).join(" "));
  }
  if (user.username) parts.push(`@${user.username}`);
  if (user.bio) parts.push(user.bio);
  return parts.join(" | ") || "tattoo community member";
}

export async function embedPost(post: {
  caption?: string | null;
  styles?: string[] | null;
  aiTags?: string[] | null;
  subjects?: string[] | null;
}): Promise<number[]> {
  return embed(buildPostText(post));
}

export async function embedUser(user: {
  username?: string | null;
  bio?: string | null;
  role?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<number[]> {
  return embed(buildUserText(user));
}
