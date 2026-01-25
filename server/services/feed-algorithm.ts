import { db } from "../db";
import { posts, follows, postLikes, savedPosts, users } from "@shared/schema";
import { eq, desc, and, inArray, notInArray, isNull, sql, or } from "drizzle-orm";

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
  
  // If user doesn't follow anyone, show them the public feed (discovery mode)
  if (followedUserIds.length === 0) {
    return getPublicFeed(limit, offset, userId);
  }
  
  // Include user's own posts in their feed
  const userIdsToShow = [...followedUserIds, userId];

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
      )`.as("isLiked") : sql<boolean>`false`.as("isLiked"),
      isSaved: userId ? sql<boolean>`EXISTS(
        SELECT 1 FROM ${savedPosts} 
        WHERE ${savedPosts.postId} = ${posts.id} 
        AND ${savedPosts.userId} = ${userId}
      )`.as("isSaved") : sql<boolean>`false`.as("isSaved"),
      engagementScore: sql<number>`
        (${posts.likeCount} * 2 + ${posts.commentCount} * 3) / 
        EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) * 3600
      `.as("engagementScore")
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(
      and(
        isNull(posts.deletedAt),
        eq(posts.visibility, "PUBLIC")
      )
    )
    .orderBy(desc(sql`"engagementScore"`))
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
      )`.as("isLiked") : sql<boolean>`false`.as("isLiked"),
      isSaved: userId ? sql<boolean>`EXISTS(
        SELECT 1 FROM ${savedPosts} 
        WHERE ${savedPosts.postId} = ${posts.id} 
        AND ${savedPosts.userId} = ${userId}
      )`.as("isSaved") : sql<boolean>`false`.as("isSaved"),
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

// Get "For You" recommendations - artists and posts based on user's interests
export async function getForYouRecommendations(userId: string, limit: number = 10) {
  // 1. Get users the current user follows
  const followedUsers = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));
  
  const followedUserIds = followedUsers.map((f) => f.followingId);
  const excludeIds = [...followedUserIds, userId];
  
  // 2. Find "similar users" - users who are followed by the same people the current user follows
  let similarUserIds: { followingId: string }[] = [];
  if (followedUserIds.length > 0 && excludeIds.length > 0) {
    similarUserIds = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(
        and(
          inArray(follows.followerId, followedUserIds),
          notInArray(follows.followingId, excludeIds)
        )
      )
      .groupBy(follows.followingId)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(limit);
  }

  const recommendedUserIds = similarUserIds.map(u => u.followingId);

  // 3. Get suggested users with their details (simplified query without complex subqueries)
  let suggestedUsers: any[] = [];
  if (recommendedUserIds.length > 0) {
    const userResults = await db
      .select()
      .from(users)
      .where(
        and(
          inArray(users.id, recommendedUserIds),
          eq(users.isVerified, true)
        )
      )
      .limit(limit);
    
    // Get follower counts separately
    for (const user of userResults) {
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(follows)
        .where(eq(follows.followingId, user.id));
      
      suggestedUsers.push({
        user,
        followersCount: countResult?.count || 0,
        mutualFollows: 0
      });
    }
  }

  // 4. If not enough recommendations, fall back to popular verified artists/studios
  if (suggestedUsers.length < limit) {
    const additionalLimit = limit - suggestedUsers.length;
    const excludeAll = [...excludeIds, ...suggestedUsers.map(s => s.user.id)];
    
    if (excludeAll.length > 0) {
      const popularUserResults = await db
        .select()
        .from(users)
        .where(
          and(
            notInArray(users.id, excludeAll),
            eq(users.isVerified, true),
            or(eq(users.role, "ARTIST"), eq(users.role, "STUDIO"))
          )
        )
        .limit(additionalLimit);
      
      for (const user of popularUserResults) {
        const [countResult] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(follows)
          .where(eq(follows.followingId, user.id));
        
        suggestedUsers.push({
          user,
          followersCount: countResult?.count || 0,
          mutualFollows: 0
        });
      }
    }
  }
  
  // Sort by follower count
  suggestedUsers.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));

  // 5. Get recommended posts from users the current user doesn't follow
  let recommendedPosts: any[] = [];
  if (excludeIds.length > 0) {
    recommendedPosts = await db
      .select({
        post: posts,
        author: users,
        isLiked: sql<boolean>`EXISTS(
          SELECT 1 FROM post_likes 
          WHERE post_likes.post_id = posts.id 
          AND post_likes.user_id = ${userId}
        )`.as("isLiked"),
        isSaved: sql<boolean>`EXISTS(
          SELECT 1 FROM saved_posts 
          WHERE saved_posts.post_id = posts.id 
          AND saved_posts.user_id = ${userId}
        )`.as("isSaved"),
        engagementScore: sql<number>`
          (posts.like_count * 2 + posts.comment_count * 3) / 
          GREATEST(EXTRACT(EPOCH FROM (NOW() - posts.created_at)), 1) * 3600
        `.as("engagementScore")
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          notInArray(posts.authorId, excludeIds),
          isNull(posts.deletedAt),
          eq(posts.visibility, "PUBLIC"),
          sql`posts.media::text != '[]'`
        )
      )
      .orderBy(desc(sql`"engagementScore"`))
      .limit(limit);
  }

  return {
    suggestedUsers: suggestedUsers.map(s => ({
      ...s.user,
      followersCount: s.followersCount,
      mutualFollows: s.mutualFollows,
      reason: s.mutualFollows > 0 ? "Followed by people you follow" : "Popular in your area"
    })),
    recommendedPosts
  };
}
