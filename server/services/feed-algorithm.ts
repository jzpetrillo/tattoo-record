import { db } from "../db";
import { posts, follows, postLikes, savedPosts, users } from "@shared/schema";
import { eq, desc, and, inArray, isNull, sql } from "drizzle-orm";

export async function getPersonalizedFeed(
  userId: string,
  limit: number = 20,
  offset: number = 0
) {
  console.log(`[FEED] getPersonalizedFeed called for userId: ${userId}`);
  
  const followedUsers = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));

  const followedUserIds = followedUsers.map((f) => f.followingId);
  console.log(`[FEED] User ${userId} follows ${followedUserIds.length} users:`, followedUserIds);
  
  // Include user's own posts in their feed
  // Even if they don't follow anyone, they should see their own posts
  const userIdsToShow = [...followedUserIds, userId];
  console.log(`[FEED] userIdsToShow (${userIdsToShow.length}):`, userIdsToShow);

  const feedPosts = await db
    .select({
      post: posts,
      author: users,
      isLiked: sql<boolean>`EXISTS(
        SELECT 1 FROM ${postLikes} 
        WHERE ${postLikes.postId} = ${posts.id} 
        AND ${postLikes.userId} = ${userId}
      )`.as("isLiked"),
      isSaved: sql<boolean>`EXISTS(
        SELECT 1 FROM ${savedPosts} 
        WHERE ${savedPosts.postId} = ${posts.id} 
        AND ${savedPosts.userId} = ${userId}
      )`.as("isSaved"),
      engagementScore: sql<number>`
        (${posts.likeCount} * 2 + ${posts.commentCount} * 3) / 
        EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) * 3600
      `.as("engagement_score")
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(
      and(
        inArray(posts.authorId, userIdsToShow),
        isNull(posts.deletedAt),
        eq(posts.visibility, "PUBLIC")
      )
    )
    .orderBy(desc(sql`engagement_score`))
    .limit(limit)
    .offset(offset);

  console.log(`[FEED DEBUG] User ${userId} - Found ${feedPosts.length} posts`);
  if (feedPosts.length > 0) {
    feedPosts.forEach((item, idx) => {
      console.log(`[FEED DEBUG] Post ${idx + 1}: id=${item.post.id}, caption=${item.post.caption?.substring(0, 50) || '(empty)'}, media=${item.post.media?.length || 0} items, score=${item.engagementScore}`);
    });
  }

  return feedPosts;
}

export async function getPublicFeed(limit: number = 20, offset: number = 0, userId?: string) {
  const feedPosts = await db
    .select({
      post: posts,
      author: users,
      isLiked: userId ? sql<boolean>`EXISTS(
        SELECT 1 FROM ${postLikes} 
        WHERE ${postLikes.postId} = ${posts.id} 
        AND ${postLikes.userId} = ${userId}
      )`.as("is_liked") : sql<boolean>`false`.as("is_liked"),
      isSaved: userId ? sql<boolean>`EXISTS(
        SELECT 1 FROM ${savedPosts} 
        WHERE ${savedPosts.postId} = ${posts.id} 
        AND ${savedPosts.userId} = ${userId}
      )`.as("is_saved") : sql<boolean>`false`.as("is_saved"),
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

export async function getFeaturedPosts(limit: number = 20, userId?: string) {
  return db
    .select({
      post: posts,
      author: users,
      isLiked: userId ? sql<boolean>`EXISTS(
        SELECT 1 FROM ${postLikes} 
        WHERE ${postLikes.postId} = ${posts.id} 
        AND ${postLikes.userId} = ${userId}
      )`.as("is_liked") : sql<boolean>`false`.as("is_liked"),
      isSaved: userId ? sql<boolean>`EXISTS(
        SELECT 1 FROM ${savedPosts} 
        WHERE ${savedPosts.postId} = ${posts.id} 
        AND ${savedPosts.userId} = ${userId}
      )`.as("is_saved") : sql<boolean>`false`.as("is_saved"),
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(
      and(
        isNull(posts.deletedAt),
        eq(posts.visibility, "PUBLIC"),
        eq(posts.isFeatured, true)
      )
    )
    .orderBy(desc(posts.createdAt))
    .limit(limit);
}
