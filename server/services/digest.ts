import { db } from "../db";
import { sql, gte } from "drizzle-orm";
import * as schema from "@shared/schema";
import { generateWeeklyDigestText } from "./ai/vision";
import { flags } from "../config/flags";

async function getUserDigestStats(userId: string, since: Date) {
  const [followers] = await db.execute(sql`
    SELECT COUNT(*) as count FROM follows
    WHERE following_id = ${userId}
      AND created_at >= ${since}
  `);

  const [likes] = await db.execute(sql`
    SELECT COUNT(*) as count FROM post_likes pl
    JOIN posts p ON p.id = pl.post_id
    WHERE p.author_id = ${userId}
      AND pl.created_at >= ${since}
  `);

  const [comments] = await db.execute(sql`
    SELECT COUNT(*) as count FROM comments c
    JOIN posts p ON p.id = c.post_id
    WHERE p.author_id = ${userId}
      AND c.created_at >= ${since}
      AND c.deleted_at IS NULL
  `);

  const topPosts = await db.execute(sql`
    SELECT caption FROM posts
    WHERE author_id = ${userId}
      AND deleted_at IS NULL
      AND created_at >= ${since}
    ORDER BY like_count DESC
    LIMIT 1
  `);

  return {
    newFollowers: Number((followers as any).count ?? 0),
    newLikes: Number((likes as any).count ?? 0),
    newComments: Number((comments as any).count ?? 0),
    topPostCaption: topPosts.length > 0 ? (topPosts[0] as any).caption : null,
  };
}

export async function sendWeeklyDigests() {
  if (!flags.aiDigest) return;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const users = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
    })
    .from(schema.users)
    .where(sql`${schema.users.deletedAt} IS NULL AND ${schema.users.isBanned} = false`);

  let sent = 0;
  for (const user of users) {
    try {
      const stats = await getUserDigestStats(user.id, since);
      if (stats.newFollowers === 0 && stats.newLikes === 0 && stats.newComments === 0) continue;

      const message = await generateWeeklyDigestText({
        username: user.username,
        ...stats,
      });

      await db.insert(schema.notifications).values({
        userId: user.id,
        type: "SYSTEM",
        payload: {
          digestType: "WEEKLY",
          message,
          stats,
          period: { from: since.toISOString(), to: new Date().toISOString() },
        },
      });
      sent++;
    } catch (err) {
      console.error(`[digest] Failed for user ${user.id}:`, err);
    }
  }

  console.log(`[digest] Sent ${sent} weekly digests`);
}

export function startDigestScheduler() {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      await sendWeeklyDigests();
    } catch (err) {
      console.error("[digest] Scheduler error:", err);
    }
  }, WEEK_MS);
  console.log("[digest] Weekly digest scheduler started");
}
