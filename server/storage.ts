import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and, desc, isNull, sql, or, ilike, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<schema.User | undefined>;
  getUserByEmail(email: string): Promise<schema.User | undefined>;
  getUserByUsername(username: string): Promise<schema.User | undefined>;
  createUser(user: schema.InsertUser): Promise<schema.User>;
  updateUser(id: string, updates: Partial<schema.User>): Promise<schema.User | undefined>;
  
  // Post operations
  getPost(id: string): Promise<any>;
  getPosts(options: { limit?: number; offset?: number; authorId?: string }): Promise<any[]>;
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
  getConversations(userId: string): Promise<any[]>;
  getMessages(conversationId: string, limit?: number): Promise<any[]>;
  createMessage(message: schema.InsertMessage): Promise<schema.Message>;
  markConversationAsRead(conversationId: string, userId: string): Promise<void>;
  
  // Portfolio operations
  getPortfolio(artistId: string): Promise<schema.PortfolioItem[]>;
  createPortfolioItem(item: schema.InsertPortfolioItem): Promise<schema.PortfolioItem>;
  updatePortfolioItem(id: string, updates: Partial<schema.PortfolioItem>): Promise<void>;
  deletePortfolioItem(id: string): Promise<void>;
  
  // Job operations
  getJobs(filters?: any): Promise<any[]>;
  createJob(job: schema.InsertJobPosting): Promise<schema.JobPosting>;
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
  updateStudioApprovalStatus(id: string, status: string): Promise<void>;
  getApprovedArtists(studioId: string): Promise<any[]>;
  getArtistStudio(artistId: string): Promise<any>;
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

  async getPost(id: string) {
    const [result] = await db
      .select({
        post: schema.posts,
        author: schema.users
      })
      .from(schema.posts)
      .innerJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
      .where(and(eq(schema.posts.id, id), isNull(schema.posts.deletedAt)))
      .limit(1);
    return result;
  }

  async getPosts(options: { limit?: number; offset?: number; authorId?: string }) {
    const { limit = 20, offset = 0, authorId } = options;
    
    const conditions = [isNull(schema.posts.deletedAt)];
    if (authorId) {
      conditions.push(eq(schema.posts.authorId, authorId));
    }

    return db
      .select({
        post: schema.posts,
        author: schema.users
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
        user: schema.users
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
      .select({ user: schema.users })
      .from(schema.follows)
      .innerJoin(schema.users, eq(schema.follows.followerId, schema.users.id))
      .where(eq(schema.follows.followingId, userId));
  }

  async getFollowing(userId: string) {
    return db
      .select({ user: schema.users })
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
        user: schema.users
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
        sender: schema.users
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

  async createJob(job: schema.InsertJobPosting) {
    const [newJob] = await db.insert(schema.jobPostings).values(job).returning();
    return newJob;
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
        host: schema.users
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
      .select()
      .from(schema.users)
      .where(
        or(
          ilike(schema.users.username, `%${query}%`),
          ilike(schema.users.email, `%${query}%`)
        )
      )
      .limit(20);
  }

  async searchPosts(query: string) {
    return db
      .select({
        post: schema.posts,
        author: schema.users
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

  async getTrendingHashtags(limit = 10) {
    return db
      .select()
      .from(schema.hashtags)
      .orderBy(desc(schema.hashtags.uses))
      .limit(limit);
  }

  async getNotifications(userId: string, limit = 50) {
    return db
      .select({
        notification: schema.notifications,
        actor: schema.users
      })
      .from(schema.notifications)
      .leftJoin(
        schema.users,
        sql`${schema.notifications.payload}->>'actorId' = ${schema.users.id}`
      )
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit);
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

    const requests = await db
      .select()
      .from(schema.studioApprovalRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.studioApprovalRequests.createdAt));

    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const [artist] = await db.select().from(schema.users).where(eq(schema.users.id, request.artistId)).limit(1);
        const [studio] = await db.select().from(schema.users).where(eq(schema.users.id, request.studioId)).limit(1);
        return { request, artist, studio };
      })
    );

    return enrichedRequests;
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
        artist: schema.users
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
        studio: schema.users
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
}

export const storage = new DatabaseStorage();
