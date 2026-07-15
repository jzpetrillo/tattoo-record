import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and, desc, asc, isNull, isNotNull, sql, or, ilike, inArray, lte, gte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

// Public user columns — never includes hashedPassword or email.
// Use this in every query that returns user data to clients.
const publicUserColumns = {
  id: schema.users.id,
  username: schema.users.username,
  role: schema.users.role,
  firstName: schema.users.firstName,
  lastName: schema.users.lastName,
  bio: schema.users.bio,
  avatarUrl: schema.users.avatarUrl,
  bannerImageUrl: schema.users.bannerImageUrl,
  website: schema.users.website,
  instagram: schema.users.instagram,
  tiktok: schema.users.tiktok,
  twitter: schema.users.twitter,
  location: schema.users.location,
  isVerified: schema.users.isVerified,
  verificationStatus: schema.users.verificationStatus,
  createdAt: schema.users.createdAt,
};

export interface IStorage {
  // User operations
  getUser(id: string): Promise<schema.User | undefined>;
  getUsers(options: { type?: string; take?: number; skip?: number }): Promise<any[]>;
  getUserByEmail(email: string): Promise<schema.User | undefined>;
  getUserByUsername(username: string): Promise<schema.User | undefined>;
  createUser(user: schema.InsertUser): Promise<schema.User>;
  updateUser(id: string, updates: Partial<schema.User>): Promise<schema.User | undefined>;
  
  // Post operations
  getPost(id: string): Promise<any>;
  getPosts(options: { limit?: number; offset?: number; authorId?: string; type?: string }): Promise<any[]>;
  createPost(post: schema.InsertPost): Promise<schema.Post>;
  deletePost(id: string): Promise<void>;
  likePost(postId: string, userId: string): Promise<void>;
  unlikePost(postId: string, userId: string): Promise<void>;
  
  // Comment operations
  getComments(postId: string): Promise<any[]>;
  createComment(comment: schema.InsertComment): Promise<schema.Comment>;
  deleteComment(id: string): Promise<void>;
  
  // Follow operations
  followUser(followerId: string, followingId: string): Promise<void>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  getFollowers(userId: string): Promise<any[]>;
  getFollowing(userId: string): Promise<any[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  
  // Story operations
  createStory(story: schema.InsertStory): Promise<schema.Story>;
  getStories(userId?: string): Promise<any[]>;
  getActiveStories(): Promise<any[]>;
  
  // Message operations
  createConversation(participantIds: string[], isGroup?: boolean, title?: string): Promise<any>;
  getOrCreateConversation(participantIds: string[]): Promise<any>;
  getConversations(userId: string): Promise<any[]>;
  getMessages(conversationId: string, limit?: number): Promise<any[]>;
  createMessage(message: schema.InsertMessage): Promise<schema.Message>;
  markConversationAsRead(conversationId: string, userId: string): Promise<void>;
  
  // Portfolio operations
  getPortfolio(artistId: string): Promise<schema.PortfolioItem[]>;
  getPortfolioItem(id: string): Promise<schema.PortfolioItem | undefined>;
  createPortfolioItem(item: schema.InsertPortfolioItem): Promise<schema.PortfolioItem>;
  updatePortfolioItem(id: string, updates: Partial<schema.PortfolioItem>): Promise<void>;
  deletePortfolioItem(id: string): Promise<void>;
  
  // Job operations
  getJobs(filters?: any): Promise<any[]>;
  getJobById(id: string): Promise<any>;
  createJob(job: schema.InsertJobPosting): Promise<schema.JobPosting>;
  updateJob(id: string, updates: Partial<schema.JobPosting>): Promise<void>;
  deleteJob(id: string): Promise<void>;
  applyToJob(jobId: string, artistId: string, data: any): Promise<void>;
  
  // Livestream operations
  createLivestreamEvent(event: schema.InsertLivestreamEvent): Promise<schema.LivestreamEvent>;
  getLivestreamEvents(filters?: any): Promise<any[]>;
  updateLivestreamEvent(id: string, updates: Partial<schema.LivestreamEvent>): Promise<void>;
  
  // Search operations
  searchUsers(query: string): Promise<any[]>;
  searchPosts(query: string): Promise<any[]>;
  searchHashtags(query: string): Promise<any[]>;
  getTrendingHashtags(limit?: number): Promise<any[]>;
  
  // Notification operations
  getNotifications(userId: string, limit?: number): Promise<any[]>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  createNotification(notification: schema.InsertNotification): Promise<schema.Notification>;
  
  // Studio approval operations
  createStudioApprovalRequest(request: schema.InsertStudioApprovalRequest): Promise<schema.StudioApprovalRequest>;
  getStudioApprovalRequests(filters: { studioId?: string; artistId?: string; status?: string }): Promise<any[]>;
  getStudioApprovalRequestById(id: string): Promise<any>;
  updateStudioApprovalStatus(id: string, status: string): Promise<void>;
  getApprovedArtists(studioId: string): Promise<any[]>;
  getArtistStudio(artistId: string): Promise<any>;
  
  // Admin operations
  getPendingUsers(): Promise<any[]>;
  approveUser(userId: string): Promise<void>;
  rejectUser(userId: string): Promise<void>;
  getAdminStats(): Promise<{
    totalUsers: number;
    usersByRole: Record<string, number>;
    totalPosts: number;
    totalBookings: number;
    totalJobs: number;
    pendingVerifications: number;
  }>;
  getAllUsersAdmin(options: { role?: string; search?: string; limit: number; offset: number }): Promise<any[]>;
  deleteUser(userId: string): Promise<void>;
  banUser(userId: string): Promise<void>;
  unbanUser(userId: string): Promise<void>;
  changeUserRole(userId: string, role: string): Promise<void>;
  toggleFlashSaleActive(saleId: string): Promise<void>;
  cancelBookingAdmin(bookingId: string): Promise<void>;
  getAdminPosts(options: { limit: number; offset: number; featured?: boolean }): Promise<any[]>;
  featurePost(postId: string): Promise<void>;
  unfeaturePost(postId: string): Promise<void>;
  getAllJobsAdmin(): Promise<any[]>;
  activateJob(jobId: string): Promise<void>;
  deactivateJob(jobId: string): Promise<void>;
  getAllFlashSalesAdmin(): Promise<any[]>;
  deleteFlashSale(saleId: string): Promise<void>;
  getAllBookingsAdmin(): Promise<any[]>;

  // AI operations
  updatePostTags(postId: string, tags: { subjects?: string[]; styles?: string[]; aiTags?: { styles: string[]; subjects: string[]; colorProfile: string; placement: string } | null }): Promise<void>;
  updatePostEmbedding(postId: string, embedding: number[]): Promise<void>;
  semanticSearchPosts(queryEmbedding: number[], limit?: number): Promise<any[]>;
  logEvent(event: { userId?: string; type: string; entityId?: string; entityType?: string; payload?: Record<string, any> }): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return user;
  }

  async getUserByUsername(username: string) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
    return user;
  }

  async createUser(insertUser: schema.InsertUser) {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<schema.User>) {
    const [user] = await db
      .update(schema.users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  }

  async getUsers(options: { type?: string; take?: number; skip?: number }) {
    const { type, take = 24, skip = 0 } = options;
    
    const conditions = [isNull(schema.users.deletedAt)];
    if (type && ["ARTIST", "STUDIO", "ENTHUSIAST"].includes(type)) {
      conditions.push(eq(schema.users.role, type as any));
    }

    const users = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        role: schema.users.role,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        bio: schema.users.bio,
        avatarUrl: schema.users.avatarUrl,
        bannerImageUrl: schema.users.bannerImageUrl,
        website: schema.users.website,
        instagram: schema.users.instagram,
        tiktok: schema.users.tiktok,
        twitter: schema.users.twitter,
        location: schema.users.location,
        isVerified: schema.users.isVerified,
        verificationStatus: schema.users.verificationStatus,
        createdAt: schema.users.createdAt
      })
      .from(schema.users)
      .where(and(...conditions))
      .limit(take)
      .offset(skip)
      .orderBy(desc(schema.users.createdAt));

    return users;
  }

  async getPost(id: string) {
    const [result] = await db
      .select({
        post: schema.posts,
        author: publicUserColumns
      })
      .from(schema.posts)
      .innerJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
      .where(and(eq(schema.posts.id, id), isNull(schema.posts.deletedAt)))
      .limit(1);
    return result;
  }

  async getPosts(options: { limit?: number; offset?: number; authorId?: string; type?: string }) {
    const { limit = 20, offset = 0, authorId, type } = options;
    
    const conditions = [isNull(schema.posts.deletedAt)];
    if (authorId) {
      conditions.push(eq(schema.posts.authorId, authorId));
    }
    if (type && ["POST", "REEL", "STORY"].includes(type)) {
      conditions.push(eq(schema.posts.type, type as any));
    }

    return db
      .select({
        post: schema.posts,
        author: publicUserColumns
      })
      .from(schema.posts)
      .innerJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
      .where(and(...conditions))
      .orderBy(desc(schema.posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createPost(post: schema.InsertPost) {
    const [newPost] = await db.insert(schema.posts).values(post).returning();
    return newPost;
  }

  async deletePost(id: string) {
    await db
      .update(schema.posts)
      .set({ deletedAt: new Date() })
      .where(eq(schema.posts.id, id));
  }

  async likePost(postId: string, userId: string) {
    await db.insert(schema.postLikes).values({ postId, userId });
    await db
      .update(schema.posts)
      .set({ likeCount: sql`${schema.posts.likeCount} + 1` })
      .where(eq(schema.posts.id, postId));
  }

  async unlikePost(postId: string, userId: string) {
    await db
      .delete(schema.postLikes)
      .where(and(eq(schema.postLikes.postId, postId), eq(schema.postLikes.userId, userId)));
    await db
      .update(schema.posts)
      .set({ likeCount: sql`${schema.posts.likeCount} - 1` })
      .where(eq(schema.posts.id, postId));
  }

  async getComments(postId: string) {
    return db
      .select({
        comment: schema.comments,
        user: publicUserColumns
      })
      .from(schema.comments)
      .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
      .where(and(eq(schema.comments.postId, postId), isNull(schema.comments.deletedAt)))
      .orderBy(desc(schema.comments.createdAt));
  }

  async createComment(comment: schema.InsertComment) {
    const [newComment] = await db.insert(schema.comments).values(comment).returning();
    await db
      .update(schema.posts)
      .set({ commentCount: sql`${schema.posts.commentCount} + 1` })
      .where(eq(schema.posts.id, comment.postId));
    return newComment;
  }

  async deleteComment(id: string) {
    const [comment] = await db
      .update(schema.comments)
      .set({ deletedAt: new Date() })
      .where(eq(schema.comments.id, id))
      .returning();
    
    if (comment) {
      await db
        .update(schema.posts)
        .set({ commentCount: sql`${schema.posts.commentCount} - 1` })
        .where(eq(schema.posts.id, comment.postId));
    }
  }

  async followUser(followerId: string, followingId: string) {
    await db.insert(schema.follows).values({ followerId, followingId });
  }

  async unfollowUser(followerId: string, followingId: string) {
    await db
      .delete(schema.follows)
      .where(and(eq(schema.follows.followerId, followerId), eq(schema.follows.followingId, followingId)));
  }

  async getFollowers(userId: string) {
    return db
      .select({ user: publicUserColumns })
      .from(schema.follows)
      .innerJoin(schema.users, eq(schema.follows.followerId, schema.users.id))
      .where(eq(schema.follows.followingId, userId));
  }

  async getFollowing(userId: string) {
    return db
      .select({ user: publicUserColumns })
      .from(schema.follows)
      .innerJoin(schema.users, eq(schema.follows.followingId, schema.users.id))
      .where(eq(schema.follows.followerId, userId));
  }

  async isFollowing(followerId: string, followingId: string) {
    const [result] = await db
      .select()
      .from(schema.follows)
      .where(and(eq(schema.follows.followerId, followerId), eq(schema.follows.followingId, followingId)))
      .limit(1);
    return !!result;
  }

  async createStory(story: schema.InsertStory) {
    const ttlHours = parseInt(process.env.STORY_TTL_HOURS || "24");
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    
    const [newStory] = await db
      .insert(schema.stories)
      .values({ ...story, expiresAt })
      .returning();
    return newStory;
  }

  async getStories(userId?: string) {
    const conditions: any[] = [sql`${schema.stories.expiresAt} > NOW()`];
    if (userId) {
      conditions.push(eq(schema.stories.userId, userId));
    }

    return db
      .select({
        story: schema.stories,
        user: publicUserColumns
      })
      .from(schema.stories)
      .innerJoin(schema.users, eq(schema.stories.userId, schema.users.id))
      .where(and(...conditions))
      .orderBy(desc(schema.stories.createdAt));
  }

  async getActiveStories() {
    return this.getStories();
  }

  async createConversation(participantIds: string[], isGroup = false, title?: string) {
    const [conversation] = await db
      .insert(schema.conversations)
      .values({ isGroup, title })
      .returning();

    for (const userId of participantIds) {
      await db.insert(schema.conversationParticipants).values({
        conversationId: conversation.id,
        userId,
        role: "MEMBER"
      });
    }

    return conversation;
  }

  async getOrCreateConversation(participantIds: string[]) {
    if (participantIds.length !== 2) {
      throw new Error("getOrCreateConversation requires exactly 2 participant IDs");
    }

    const [userId1, userId2] = participantIds;

    const existingConversations = await db
      .select({ conversation: schema.conversations })
      .from(schema.conversations)
      .innerJoin(
        schema.conversationParticipants,
        eq(schema.conversations.id, schema.conversationParticipants.conversationId)
      )
      .where(
        and(
          eq(schema.conversations.isGroup, false),
          eq(schema.conversationParticipants.userId, userId1)
        )
      );

    for (const { conversation } of existingConversations) {
      const participants = await db
        .select()
        .from(schema.conversationParticipants)
        .where(eq(schema.conversationParticipants.conversationId, conversation.id));

      const participantUserIds = participants.map(p => p.userId).sort();
      const targetUserIds = [userId1, userId2].sort();

      if (JSON.stringify(participantUserIds) === JSON.stringify(targetUserIds)) {
        return conversation;
      }
    }

    return this.createConversation(participantIds, false);
  }

  async getConversations(userId: string) {
    const result: any = await db
      .select({
        conversation: schema.conversations,
        participants: sql`json_agg(${schema.users})`.as("participants")
      })
      .from(schema.conversationParticipants)
      .innerJoin(schema.conversations, eq(schema.conversationParticipants.conversationId, schema.conversations.id))
      .innerJoin(schema.users, eq(schema.conversationParticipants.userId, schema.users.id))
      .where(eq(schema.conversationParticipants.userId, userId))
      .groupBy(schema.conversations.id)
      .orderBy(desc(schema.conversations.lastMessageAt));
    return result;
  }

  async getMessages(conversationId: string, limit = 50) {
    return db
      .select({
        message: schema.messages,
        sender: publicUserColumns
      })
      .from(schema.messages)
      .innerJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
      .where(and(eq(schema.messages.conversationId, conversationId), isNull(schema.messages.deletedAt)))
      .orderBy(desc(schema.messages.sentAt))
      .limit(limit);
  }

  async createMessage(message: schema.InsertMessage) {
    const [newMessage] = await db.insert(schema.messages).values(message).returning();
    
    await db
      .update(schema.conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(schema.conversations.id, message.conversationId));

    return newMessage;
  }

  async markConversationAsRead(conversationId: string, userId: string) {
    await db
      .update(schema.conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(schema.conversationParticipants.conversationId, conversationId),
          eq(schema.conversationParticipants.userId, userId)
        )
      );
  }

  async getPortfolio(artistId: string) {
    return db
      .select()
      .from(schema.portfolioItems)
      .where(eq(schema.portfolioItems.artistId, artistId))
      .orderBy(schema.portfolioItems.sortOrder);
  }

  async getPortfolioItem(id: string) {
    const [item] = await db
      .select()
      .from(schema.portfolioItems)
      .where(eq(schema.portfolioItems.id, id))
      .limit(1);
    return item;
  }

  async createPortfolioItem(item: schema.InsertPortfolioItem) {
    const [newItem] = await db.insert(schema.portfolioItems).values(item).returning();
    return newItem;
  }

  async updatePortfolioItem(id: string, updates: Partial<schema.PortfolioItem>) {
    await db
      .update(schema.portfolioItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.portfolioItems.id, id));
  }

  async deletePortfolioItem(id: string) {
    await db.delete(schema.portfolioItems).where(eq(schema.portfolioItems.id, id));
  }

  async getJobs(filters: any = {}) {
    let query = db
      .select({
        job: schema.jobPostings,
        studio: schema.users
      })
      .from(schema.jobPostings)
      .innerJoin(schema.users, eq(schema.jobPostings.studioId, schema.users.id))
      .where(eq(schema.jobPostings.isActive, true));

    return query.orderBy(desc(schema.jobPostings.createdAt));
  }

  async getJobById(id: string) {
    const [result] = await db
      .select({
        job: schema.jobPostings,
        studio: schema.users
      })
      .from(schema.jobPostings)
      .innerJoin(schema.users, eq(schema.jobPostings.studioId, schema.users.id))
      .where(eq(schema.jobPostings.id, id));
    
    return result;
  }

  async createJob(job: schema.InsertJobPosting) {
    const [newJob] = await db.insert(schema.jobPostings).values(job).returning();
    return newJob;
  }

  async updateJob(id: string, updates: Partial<schema.JobPosting>) {
    await db
      .update(schema.jobPostings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.jobPostings.id, id));
  }

  async deleteJob(id: string) {
    await db
      .update(schema.jobPostings)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.jobPostings.id, id));
  }

  async applyToJob(jobId: string, artistId: string, data: any) {
    await db.insert(schema.jobApplications).values({
      jobId,
      artistId,
      coverLetter: data.coverLetter,
      portfolioSnapshot: data.portfolioSnapshot
    });
  }

  async createLivestreamEvent(event: schema.InsertLivestreamEvent) {
    const [newEvent] = await db.insert(schema.livestreamEvents).values(event).returning();
    return newEvent;
  }

  async getLivestreamEvents(filters: any = {}) {
    const baseQuery = db
      .select({
        event: schema.livestreamEvents,
        host: publicUserColumns
      })
      .from(schema.livestreamEvents)
      .innerJoin(schema.users, eq(schema.livestreamEvents.hostId, schema.users.id));

    if (filters.status) {
      return baseQuery
        .where(eq(schema.livestreamEvents.status, filters.status))
        .orderBy(desc(schema.livestreamEvents.createdAt));
    }

    return baseQuery.orderBy(desc(schema.livestreamEvents.createdAt));
  }

  async updateLivestreamEvent(id: string, updates: Partial<schema.LivestreamEvent>) {
    await db
      .update(schema.livestreamEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.livestreamEvents.id, id));
  }

  async searchUsers(query: string) {
    return db
      .select(publicUserColumns)
      .from(schema.users)
      .where(ilike(schema.users.username, `%${query}%`))
      .limit(20);
  }

  async searchPosts(query: string) {
    return db
      .select({
        post: schema.posts,
        author: publicUserColumns
      })
      .from(schema.posts)
      .innerJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
      .where(
        and(
          ilike(schema.posts.caption, `%${query}%`),
          isNull(schema.posts.deletedAt)
        )
      )
      .orderBy(desc(schema.posts.createdAt))
      .limit(20);
  }

  async searchHashtags(query: string) {
    return db
      .select()
      .from(schema.hashtags)
      .where(ilike(schema.hashtags.tag, `%${query}%`))
      .orderBy(desc(schema.hashtags.uses))
      .limit(20);
  }

  async getNotifications(userId: string, limit = 50) {
    return db
      .select({
        notification: schema.notifications,
        actor: publicUserColumns
      })
      .from(schema.notifications)
      .leftJoin(
        schema.users,
        sql`${schema.notifications.payload}->>'actorId' = ${schema.users.id}::text`
      )
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit);
  }

  async getStudioApprovalRequestById(id: string) {
    const [result] = await db
      .select()
      .from(schema.studioApprovalRequests)
      .where(eq(schema.studioApprovalRequests.id, id))
      .limit(1);
    return result;
  }

  async markNotificationAsRead(id: string) {
    await db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string) {
    await db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.userId, userId));
  }

  async createNotification(notification: schema.InsertNotification) {
    const [created] = await db
      .insert(schema.notifications)
      .values(notification)
      .returning();
    return created;
  }

  async updatePostTags(postId: string, tags: { subjects?: string[]; styles?: string[]; aiTags?: { styles: string[]; subjects: string[]; colorProfile: string; placement: string } | null }) {
    const updates: any = { aiTaggedAt: new Date(), updatedAt: new Date() };
    if (tags.subjects !== undefined) updates.subjects = tags.subjects;
    if (tags.styles !== undefined) updates.styles = tags.styles;
    if (tags.aiTags !== undefined) updates.aiTags = tags.aiTags;
    await db.update(schema.posts).set(updates).where(eq(schema.posts.id, postId));
  }

  async updatePostEmbedding(postId: string, embedding: number[]) {
    const { pool } = await import("./db");
    const vecStr = `[${embedding.join(",")}]`;
    await pool.query("UPDATE posts SET embedding = $1::vector WHERE id = $2", [vecStr, postId]);
  }

  async semanticSearchPosts(queryEmbedding: number[], limit = 20) {
    const { pool } = await import("./db");
    const vecStr = `[${queryEmbedding.join(",")}]`;
    const result = await pool.query(
      `SELECT
         p.id, p.author_id, p.type, p.caption, p.media, p.like_count, p.comment_count,
         p.save_count, p.location, p.styles, p.subjects, p.ai_tags, p.ai_tagged_at,
         p.is_featured, p.visibility, p.created_at, p.updated_at,
         u.id as u_id, u.username, u.role, u.first_name, u.last_name,
         u.bio, u.avatar_url, u.banner_image_url, u.is_verified,
         u.verification_status,
         1 - (p.embedding <=> $1::vector) as similarity
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.deleted_at IS NULL AND p.embedding IS NOT NULL
       ORDER BY p.embedding <=> $1::vector
       LIMIT $2`,
      [vecStr, limit]
    );
    return result.rows.map((row: any) => ({
      post: {
        id: row.id,
        authorId: row.author_id,
        type: row.type,
        caption: row.caption,
        media: row.media,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        saveCount: row.save_count,
        location: row.location,
        styles: row.styles,
        subjects: row.subjects,
        aiTags: row.ai_tags,
        isFeatured: row.is_featured,
        visibility: row.visibility,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      author: {
        id: row.u_id,
        username: row.username,
        role: row.role,
        firstName: row.first_name,
        lastName: row.last_name,
        bio: row.bio,
        avatarUrl: row.avatar_url,
        bannerImageUrl: row.banner_image_url,
        isVerified: row.is_verified,
        verificationStatus: row.verification_status,
      },
      similarity: row.similarity,
    }));
  }

  async logEvent(event: { userId?: string; type: string; entityId?: string; entityType?: string; payload?: Record<string, any> }) {
    try {
      await db.insert(schema.events).values({
        userId: event.userId,
        type: event.type,
        entityId: event.entityId,
        entityType: event.entityType,
        payload: event.payload ?? {},
      });
    } catch (err) {
      console.warn("[telemetry] logEvent failed silently:", err instanceof Error ? err.message : err);
    }
  }

  async createStudioApprovalRequest(request: schema.InsertStudioApprovalRequest) {
    const [created] = await db
      .insert(schema.studioApprovalRequests)
      .values(request)
      .returning();
    return created;
  }

  async getStudioApprovalRequests(filters: { studioId?: string; artistId?: string; status?: string }) {
    const conditions: any[] = [];
    
    if (filters.studioId) {
      conditions.push(eq(schema.studioApprovalRequests.studioId, filters.studioId));
    }
    if (filters.artistId) {
      conditions.push(eq(schema.studioApprovalRequests.artistId, filters.artistId));
    }
    if (filters.status) {
      conditions.push(eq(schema.studioApprovalRequests.status, filters.status as any));
    }

    const artistAlias = alias(schema.users, "artist");
    const studioAlias = alias(schema.users, "studio");

    const enriched = await db
      .select({
        request: schema.studioApprovalRequests,
        artist: {
          id: artistAlias.id,
          username: artistAlias.username,
          role: artistAlias.role,
          firstName: artistAlias.firstName,
          lastName: artistAlias.lastName,
          avatarUrl: artistAlias.avatarUrl,
          isVerified: artistAlias.isVerified,
          verificationStatus: artistAlias.verificationStatus,
          createdAt: artistAlias.createdAt,
        },
        studio: {
          id: studioAlias.id,
          username: studioAlias.username,
          role: studioAlias.role,
          firstName: studioAlias.firstName,
          lastName: studioAlias.lastName,
          avatarUrl: studioAlias.avatarUrl,
          isVerified: studioAlias.isVerified,
          verificationStatus: studioAlias.verificationStatus,
          createdAt: studioAlias.createdAt,
        },
      })
      .from(schema.studioApprovalRequests)
      .innerJoin(artistAlias, eq(schema.studioApprovalRequests.artistId, artistAlias.id))
      .innerJoin(studioAlias, eq(schema.studioApprovalRequests.studioId, studioAlias.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.studioApprovalRequests.createdAt));

    return enriched;
  }

  async updateStudioApprovalStatus(id: string, status: string) {
    await db
      .update(schema.studioApprovalRequests)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(schema.studioApprovalRequests.id, id));
  }

  async getApprovedArtists(studioId: string) {
    return db
      .select({
        request: schema.studioApprovalRequests,
        artist: publicUserColumns
      })
      .from(schema.studioApprovalRequests)
      .innerJoin(
        schema.users,
        eq(schema.studioApprovalRequests.artistId, schema.users.id)
      )
      .where(
        and(
          eq(schema.studioApprovalRequests.studioId, studioId),
          eq(schema.studioApprovalRequests.status, 'APPROVED')
        )
      )
      .orderBy(desc(schema.studioApprovalRequests.updatedAt));
  }

  async getArtistStudio(artistId: string) {
    const [result] = await db
      .select({
        request: schema.studioApprovalRequests,
        studio: publicUserColumns
      })
      .from(schema.studioApprovalRequests)
      .innerJoin(
        schema.users,
        eq(schema.studioApprovalRequests.studioId, schema.users.id)
      )
      .where(
        and(
          eq(schema.studioApprovalRequests.artistId, artistId),
          eq(schema.studioApprovalRequests.status, 'APPROVED')
        )
      )
      .orderBy(desc(schema.studioApprovalRequests.updatedAt))
      .limit(1);
    
    return result;
  }

  // Admin operations
  async getPendingUsers() {
    return db
      .select()
      .from(schema.users)
      .where(eq(schema.users.verificationStatus, 'PENDING'))
      .orderBy(desc(schema.users.createdAt));
  }

  async approveUser(userId: string) {
    await db
      .update(schema.users)
      .set({ 
        verificationStatus: 'APPROVED',
        isVerified: true,
        updatedAt: new Date() 
      })
      .where(eq(schema.users.id, userId));
  }

  async rejectUser(userId: string) {
    await db
      .update(schema.users)
      .set({ 
        verificationStatus: 'REJECTED',
        updatedAt: new Date() 
      })
      .where(eq(schema.users.id, userId));
  }

  // Saved Posts (Bookmarks)
  async savePost(userId: string, postId: string, collectionName?: string) {
    const [saved] = await db
      .insert(schema.savedPosts)
      .values({ userId, postId, collectionName })
      .returning();
    
    await db
      .update(schema.posts)
      .set({ saveCount: sql`${schema.posts.saveCount} + 1` })
      .where(eq(schema.posts.id, postId));
    
    return saved;
  }

  async unsavePost(userId: string, postId: string) {
    await db
      .delete(schema.savedPosts)
      .where(
        and(
          eq(schema.savedPosts.userId, userId),
          eq(schema.savedPosts.postId, postId)
        )
      );
    
    await db
      .update(schema.posts)
      .set({ saveCount: sql`${schema.posts.saveCount} - 1` })
      .where(eq(schema.posts.id, postId));
  }

  async getSavedPosts(userId: string, collectionName?: string) {
    const conditions = [eq(schema.savedPosts.userId, userId)];
    
    if (collectionName) {
      conditions.push(eq(schema.savedPosts.collectionName, collectionName));
    }

    return db
      .select({
        savedPost: schema.savedPosts,
        post: schema.posts,
        author: publicUserColumns
      })
      .from(schema.savedPosts)
      .innerJoin(schema.posts, eq(schema.savedPosts.postId, schema.posts.id))
      .innerJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
      .where(and(...conditions))
      .orderBy(desc(schema.savedPosts.savedAt));
  }

  async getSavedCollections(userId: string) {
    const collections = await db
      .selectDistinct({ collectionName: schema.savedPosts.collectionName })
      .from(schema.savedPosts)
      .where(
        and(
          eq(schema.savedPosts.userId, userId),
          isNotNull(schema.savedPosts.collectionName)
        )
      );
    
    return collections.map(c => c.collectionName).filter(Boolean);
  }

  async isPostSaved(userId: string, postId: string) {
    const [saved] = await db
      .select()
      .from(schema.savedPosts)
      .where(
        and(
          eq(schema.savedPosts.userId, userId),
          eq(schema.savedPosts.postId, postId)
        )
      )
      .limit(1);
    
    return !!saved;
  }

  // Flash Sales
  async createFlashSale(data: typeof schema.flashSales.$inferInsert) {
    const [flashSale] = await db
      .insert(schema.flashSales)
      .values(data)
      .returning();
    return flashSale;
  }

  async getFlashSales(artistId?: string, activeOnly: boolean = true) {
    const now = new Date();
    const conditions = [];
    
    if (artistId) {
      conditions.push(eq(schema.flashSales.artistId, artistId));
    }
    
    if (activeOnly) {
      conditions.push(
        eq(schema.flashSales.isActive, true),
        sql`${schema.flashSales.expiresAt} > ${now}`
      );
    }
    
    const results = await db
      .select({
        flashSale: schema.flashSales,
        artist: publicUserColumns
      })
      .from(schema.flashSales)
      .innerJoin(schema.users, eq(schema.flashSales.artistId, schema.users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(schema.flashSales.expiresAt));
    
    return results.map(r => ({
      ...r.flashSale,
      artist: r.artist,
      discountedPrice: r.flashSale.flashPriceCents ? r.flashSale.flashPriceCents / 100 : null,
      originalPrice: r.flashSale.originalPriceCents ? r.flashSale.originalPriceCents / 100 : null,
      endDate: r.flashSale.expiresAt,
      spotsAvailable: r.flashSale.availableSlots,
      imageUrl: r.flashSale.media?.[0]?.url || null
    }));
  }

  async getFlashSale(id: string) {
    const [result] = await db
      .select({
        flashSale: schema.flashSales,
        artist: publicUserColumns
      })
      .from(schema.flashSales)
      .innerJoin(schema.users, eq(schema.flashSales.artistId, schema.users.id))
      .where(eq(schema.flashSales.id, id))
      .limit(1);
    
    if (!result) return undefined;
    
    return {
      ...result.flashSale,
      artist: result.artist,
      discountedPrice: result.flashSale.flashPriceCents ? result.flashSale.flashPriceCents / 100 : null,
      originalPrice: result.flashSale.originalPriceCents ? result.flashSale.originalPriceCents / 100 : null,
      endDate: result.flashSale.expiresAt,
      spotsAvailable: result.flashSale.availableSlots,
      imageUrl: result.flashSale.media?.[0]?.url || null
    };
  }

  async updateFlashSale(id: string, data: Partial<typeof schema.flashSales.$inferInsert>) {
    const [updated] = await db
      .update(schema.flashSales)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.flashSales.id, id))
      .returning();
    
    return updated;
  }

  // Bookings
  async createBooking(data: typeof schema.bookings.$inferInsert) {
    return db.transaction(async (tx) => {
      // Atomically claim a flash sale slot inside a transaction.
      // If the booking insert subsequently fails, the slot increment is rolled back.
      if (data.flashSaleId) {
        const [claimed] = await tx
          .update(schema.flashSales)
          .set({ bookedSlots: sql`${schema.flashSales.bookedSlots} + 1` })
          .where(
            and(
              eq(schema.flashSales.id, data.flashSaleId),
              sql`${schema.flashSales.bookedSlots} < ${schema.flashSales.availableSlots}`,
              eq(schema.flashSales.isActive, true),
              sql`${schema.flashSales.expiresAt} > NOW()`
            )
          )
          .returning({ id: schema.flashSales.id });

        if (!claimed) {
          throw new Error("This flash sale is fully booked or no longer available");
        }
      }

      const [booking] = await tx
        .insert(schema.bookings)
        .values(data)
        .returning();

      return booking;
    });
  }

  async getBookings(filters: { artistId?: string; clientId?: string; status?: string }) {
    const conditions = [];
    
    if (filters.artistId) {
      conditions.push(eq(schema.bookings.artistId, filters.artistId));
    }
    if (filters.clientId) {
      conditions.push(eq(schema.bookings.clientId, filters.clientId));
    }
    if (filters.status) {
      conditions.push(eq(schema.bookings.status, filters.status as any));
    }
    
    const artistUser = alias(schema.users, "artist");
    const clientUser = alias(schema.users, "client");
    const artistCols = { id: artistUser.id, username: artistUser.username, role: artistUser.role, firstName: artistUser.firstName, lastName: artistUser.lastName, avatarUrl: artistUser.avatarUrl, isVerified: artistUser.isVerified };
    const clientCols = { id: clientUser.id, username: clientUser.username, role: clientUser.role, firstName: clientUser.firstName, lastName: clientUser.lastName, avatarUrl: clientUser.avatarUrl, isVerified: clientUser.isVerified };
    
    const results = await db
      .select({
        booking: schema.bookings,
        artist: artistCols,
        client: clientCols
      })
      .from(schema.bookings)
      .leftJoin(artistUser, eq(schema.bookings.artistId, artistUser.id))
      .leftJoin(clientUser, eq(schema.bookings.clientId, clientUser.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.bookings.scheduledAt));
    
    return results.map(r => ({
      ...r.booking,
      artist: r.artist,
      client: r.client
    }));
  }

  async getBooking(id: string) {
    const artistUser = alias(schema.users, "artist");
    const clientUser = alias(schema.users, "client");
    const artistCols = { id: artistUser.id, username: artistUser.username, role: artistUser.role, firstName: artistUser.firstName, lastName: artistUser.lastName, avatarUrl: artistUser.avatarUrl, isVerified: artistUser.isVerified };
    const clientCols = { id: clientUser.id, username: clientUser.username, role: clientUser.role, firstName: clientUser.firstName, lastName: clientUser.lastName, avatarUrl: clientUser.avatarUrl, isVerified: clientUser.isVerified };
    
    const [result] = await db
      .select({
        booking: schema.bookings,
        artist: artistCols,
        client: clientCols
      })
      .from(schema.bookings)
      .leftJoin(artistUser, eq(schema.bookings.artistId, artistUser.id))
      .leftJoin(clientUser, eq(schema.bookings.clientId, clientUser.id))
      .where(eq(schema.bookings.id, id))
      .limit(1);
    
    if (!result) return undefined;
    
    return {
      ...result.booking,
      artist: result.artist,
      client: result.client
    };
  }

  async updateBooking(id: string, data: Partial<typeof schema.bookings.$inferInsert>) {
    const [updated] = await db
      .update(schema.bookings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.bookings.id, id))
      .returning();
    
    return updated;
  }

  async deleteBooking(id: string) {
    const [booking] = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, id))
      .limit(1);
    
    await db
      .delete(schema.bookings)
      .where(eq(schema.bookings.id, id));
    
    // If it was a flash sale booking, decrement booked slots
    if (booking?.flashSaleId) {
      await db
        .update(schema.flashSales)
        .set({ bookedSlots: sql`${schema.flashSales.bookedSlots} - 1` })
        .where(eq(schema.flashSales.id, booking.flashSaleId));
    }
  }

  // Trending Hashtags
  async getTrendingHashtags(limit: number = 10) {
    return db
      .select()
      .from(schema.hashtags)
      .orderBy(desc(schema.hashtags.trendingScore), desc(schema.hashtags.uses))
      .limit(limit);
  }

  async updateHashtagTrending() {
    // Calculate trending score based on recent usage (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    await db.execute(sql`
      UPDATE hashtags
      SET trending_score = (
        SELECT COUNT(*) 
        FROM post_hashtags 
        WHERE post_hashtags.hashtag_id = hashtags.id 
        AND post_hashtags.created_at > ${sevenDaysAgo}
      )
    `);
  }

  // Booking reminders
  async getBookingsNeedingReminders() {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const artistUser = alias(schema.users, "artist");
    const clientUser = alias(schema.users, "client");
    
    // Get approved bookings within reminder windows that haven't been reminded yet
    const results = await db
      .select({
        booking: schema.bookings,
        artist: artistUser,
        client: clientUser
      })
      .from(schema.bookings)
      .leftJoin(artistUser, eq(schema.bookings.artistId, artistUser.id))
      .leftJoin(clientUser, eq(schema.bookings.clientId, clientUser.id))
      .where(
        and(
          eq(schema.bookings.status, "APPROVED"),
          isNull(schema.bookings.reminderSentAt),
          or(
            // Day before reminders
            and(
              or(
                eq(schema.bookings.reminderPreference, "DAY_BEFORE"),
                eq(schema.bookings.reminderPreference, "BOTH")
              ),
              lte(schema.bookings.scheduledAt, oneDayFromNow),
              gte(schema.bookings.scheduledAt, now)
            ),
            // Week before reminders
            and(
              or(
                eq(schema.bookings.reminderPreference, "WEEK_BEFORE"),
                eq(schema.bookings.reminderPreference, "BOTH")
              ),
              lte(schema.bookings.scheduledAt, oneWeekFromNow),
              gte(schema.bookings.scheduledAt, now)
            )
          )
        )
      );
    
    return results.map(r => ({
      ...r.booking,
      artist: r.artist,
      client: r.client
    }));
  }

  async markReminderSent(bookingId: string) {
    const [updated] = await db
      .update(schema.bookings)
      .set({ reminderSentAt: new Date() })
      .where(eq(schema.bookings.id, bookingId))
      .returning();
    
    return updated;
  }

  // Admin Stats
  async getAdminStats() {
    // Use COUNT aggregates and grouped queries — never SELECT * for stats
    const userRows = await db
      .select({ role: schema.users.role, verificationStatus: schema.users.verificationStatus })
      .from(schema.users)
      .where(isNull(schema.users.deletedAt));

    const [postCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.posts)
      .where(isNull(schema.posts.deletedAt));

    const [bookingCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.bookings);

    const [jobCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.jobPostings);

    const usersByRole: Record<string, number> = {};
    let pendingVerifications = 0;

    userRows.forEach(user => {
      usersByRole[user.role] = (usersByRole[user.role] || 0) + 1;
      if (user.verificationStatus === "PENDING") {
        pendingVerifications++;
      }
    });

    return {
      totalUsers: userRows.length,
      usersByRole,
      totalPosts: Number(postCount?.count ?? 0),
      totalBookings: Number(bookingCount?.count ?? 0),
      totalJobs: Number(jobCount?.count ?? 0),
      pendingVerifications
    };
  }

  async getAllUsersAdmin(options: { role?: string; search?: string; limit: number; offset: number }) {
    let query = db.select({
      id: schema.users.id,
      email: schema.users.email,
      username: schema.users.username,
      role: schema.users.role,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      bio: schema.users.bio,
      avatarUrl: schema.users.avatarUrl,
      isVerified: schema.users.isVerified,
      isBanned: schema.users.isBanned,
      verificationStatus: schema.users.verificationStatus,
      location: schema.users.location,
      createdAt: schema.users.createdAt,
      deletedAt: schema.users.deletedAt
    }).from(schema.users);
    
    const conditions: any[] = [];
    
    if (options.role) {
      conditions.push(eq(schema.users.role, options.role as any));
    }
    
    if (options.search) {
      conditions.push(
        or(
          sql`${schema.users.username} ILIKE ${'%' + options.search + '%'}`,
          sql`${schema.users.email} ILIKE ${'%' + options.search + '%'}`
        )
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query
      .orderBy(desc(schema.users.createdAt))
      .limit(options.limit)
      .offset(options.offset);
  }

  async deleteUser(userId: string) {
    await db.update(schema.users)
      .set({ deletedAt: new Date() })
      .where(eq(schema.users.id, userId));
  }

  async banUser(userId: string) {
    await db.update(schema.users)
      .set({ isBanned: true })
      .where(eq(schema.users.id, userId));
  }

  async unbanUser(userId: string) {
    await db.update(schema.users)
      .set({ isBanned: false })
      .where(eq(schema.users.id, userId));
  }

  async changeUserRole(userId: string, role: string) {
    await db.update(schema.users)
      .set({ role: role as any })
      .where(eq(schema.users.id, userId));
  }

  async toggleFlashSaleActive(saleId: string) {
    await db.update(schema.flashSales)
      .set({
        isActive: sql`NOT ${schema.flashSales.isActive}`,
        updatedAt: new Date()
      })
      .where(eq(schema.flashSales.id, saleId));
  }

  async cancelBookingAdmin(bookingId: string) {
    await db.update(schema.bookings)
      .set({ status: "REJECTED" as any, updatedAt: new Date() })
      .where(eq(schema.bookings.id, bookingId));
  }

  async getAdminPosts(options: { limit: number; offset: number; featured?: boolean }) {
    let query = db
      .select({
        post: schema.posts,
        author: {
          id: schema.users.id,
          username: schema.users.username,
          email: schema.users.email,
          role: schema.users.role,
          avatarUrl: schema.users.avatarUrl,
          isVerified: schema.users.isVerified
        }
      })
      .from(schema.posts)
      .leftJoin(schema.users, eq(schema.posts.authorId, schema.users.id));
    
    if (options.featured !== undefined) {
      query = query.where(eq(schema.posts.isFeatured, options.featured)) as any;
    }
    
    const results = await query
      .orderBy(desc(schema.posts.createdAt))
      .limit(options.limit)
      .offset(options.offset);
    
    return results.map(r => ({
      ...r.post,
      author: r.author
    }));
  }

  async featurePost(postId: string) {
    await db.update(schema.posts)
      .set({ isFeatured: true })
      .where(eq(schema.posts.id, postId));
  }

  async unfeaturePost(postId: string) {
    await db.update(schema.posts)
      .set({ isFeatured: false })
      .where(eq(schema.posts.id, postId));
  }

  async getAllJobsAdmin() {
    const results = await db
      .select({
        job: schema.jobPostings,
        studio: {
          id: schema.users.id,
          username: schema.users.username,
          email: schema.users.email,
          role: schema.users.role,
          avatarUrl: schema.users.avatarUrl,
          isVerified: schema.users.isVerified
        }
      })
      .from(schema.jobPostings)
      .leftJoin(schema.users, eq(schema.jobPostings.studioId, schema.users.id))
      .orderBy(desc(schema.jobPostings.createdAt));
    
    return results.map(r => ({
      ...r.job,
      studio: r.studio
    }));
  }

  async activateJob(jobId: string) {
    await db.update(schema.jobPostings)
      .set({ isActive: true })
      .where(eq(schema.jobPostings.id, jobId));
  }

  async deactivateJob(jobId: string) {
    await db.update(schema.jobPostings)
      .set({ isActive: false })
      .where(eq(schema.jobPostings.id, jobId));
  }

  async getAllFlashSalesAdmin() {
    const results = await db
      .select({
        sale: schema.flashSales,
        artist: {
          id: schema.users.id,
          username: schema.users.username,
          email: schema.users.email,
          role: schema.users.role,
          avatarUrl: schema.users.avatarUrl,
          isVerified: schema.users.isVerified
        }
      })
      .from(schema.flashSales)
      .leftJoin(schema.users, eq(schema.flashSales.artistId, schema.users.id))
      .orderBy(desc(schema.flashSales.createdAt));
    
    return results.map(r => ({
      ...r.sale,
      artist: r.artist
    }));
  }

  async deleteFlashSale(saleId: string) {
    await db.delete(schema.flashSales)
      .where(eq(schema.flashSales.id, saleId));
  }

  async getAllBookingsAdmin() {
    const artistUser = alias(schema.users, "artist");
    const clientUser = alias(schema.users, "client");
    
    const results = await db
      .select({
        booking: schema.bookings,
        artist: {
          id: artistUser.id,
          username: artistUser.username,
          email: artistUser.email,
          role: artistUser.role,
          avatarUrl: artistUser.avatarUrl,
          isVerified: artistUser.isVerified
        },
        client: {
          id: clientUser.id,
          username: clientUser.username,
          email: clientUser.email,
          role: clientUser.role,
          avatarUrl: clientUser.avatarUrl,
          isVerified: clientUser.isVerified
        }
      })
      .from(schema.bookings)
      .leftJoin(artistUser, eq(schema.bookings.artistId, artistUser.id))
      .leftJoin(clientUser, eq(schema.bookings.clientId, clientUser.id))
      .orderBy(desc(schema.bookings.createdAt));
    
    return results.map(r => ({
      ...r.booking,
      artist: r.artist,
      client: r.client
    }));
  }
}

export const storage = new DatabaseStorage();
