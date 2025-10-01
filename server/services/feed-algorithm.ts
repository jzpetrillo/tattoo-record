import { db } from "../db";
import { posts, follows, postLikes, users } from "@shared/schema";
import { eq, desc, and, inArray, isNull, sql } from "drizzle-orm";

export async function getPersonalizedFeed(
  userId: string,
  limit: number = 20,
  offset: number = 0
) {
  const followedUsers = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));

  const followedUserIds = followedUsers.map((f) => f.followingId);

  if (followedUserIds.length === 0) {
    return getPublicFeed(limit, offset);
  }

  const feedPosts = await db
    .select({
      post: posts,
      author: users,
      engagementScore: sql<number>`
        (${posts.likeCount} * 2 + ${posts.commentCount} * 3) / 
        EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) * 3600
      `.as("engagement_score")
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(
      and(
        inArray(posts.authorId, followedUserIds),
        isNull(posts.deletedAt),
        eq(posts.visibility, "PUBLIC")
      )
    )
    .orderBy(desc(sql`engagement_score`))
    .limit(limit)
    .offset(offset);

  return feedPosts;
}

export async function getPublicFeed(limit: number = 20, offset: number = 0) {
  const feedPosts = await db
    .select({
      post: posts,
      author: users,
      engagementScore: sql<number>`
        (${posts.likeCount} * 2 + ${posts.commentCount} * 3) / 
        EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) * 3600
      `.as("engagement_score")
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(
      and(
        isNull(posts.deletedAt),
        eq(posts.visibility, "PUBLIC")
      )
    )
    .orderBy(desc(sql`engagement_score`))
    .limit(limit)
    .offset(offset);

  return feedPosts;
}

export async function getTrendingPosts(limit: number = 20) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return db
    .select({
      post: posts,
      author: users
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(
      and(
        isNull(posts.deletedAt),
        eq(posts.visibility, "PUBLIC"),
        sql`${posts.createdAt} > ${oneDayAgo}`
      )
    )
    .orderBy(
      desc(sql`${posts.likeCount} + ${posts.commentCount}`)
    )
    .limit(limit);
}
