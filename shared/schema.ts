import { relations, sql } from "drizzle-orm";
import { 
  pgTable, 
  uuid, 
  text, 
  varchar, 
  timestamp, 
  boolean, 
  integer, 
  jsonb,
  pgEnum,
  index,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum("role", ["ARTIST", "STUDIO", "ENTHUSIAST"]);
export const visibilityEnum = pgEnum("visibility", ["PUBLIC", "FOLLOWERS"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "FOLLOW",
  "LIKE",
  "COMMENT",
  "APPROVAL",
  "SYSTEM"
]);
export const conversationRoleEnum = pgEnum("conversation_role", ["MEMBER", "ADMIN"]);
export const approvalStatusEnum = pgEnum("approval_status", [
  "PENDING",
  "APPROVED",
  "REJECTED"
]);
export const jobTypeEnum = pgEnum("job_type", [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "APPRENTICESHIP"
]);
export const applicationStatusEnum = pgEnum("application_status", [
  "SUBMITTED",
  "REVIEWING",
  "ACCEPTED",
  "REJECTED"
]);
export const livestreamStatusEnum = pgEnum("livestream_status", [
  "SCHEDULED",
  "LIVE",
  "ENDED"
]);
export const consultationStatusEnum = pgEnum("consultation_status", [
  "REQUESTED",
  "CONFIRMED",
  "DECLINED",
  "COMPLETED"
]);
export const platformEnum = pgEnum("platform", ["INSTAGRAM", "TIKTOK", "OTHER"]);

// Core Tables
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  role: roleEnum("role").notNull().default("ENTHUSIAST"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  isVerified: boolean("is_verified").notNull().default(false),
  location: jsonb("location").$type<{
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  }>(),
  links: jsonb("links").$type<string[]>().default([]),
  socialHandles: jsonb("social_handles").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at")
});

export const studioProfiles = pgTable("studio_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  services: jsonb("services").$type<string[]>().default([]),
  hours: jsonb("hours").$type<Record<string, string>>().default({}),
  paymentMethods: jsonb("payment_methods").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const artistProfiles = pgTable("artist_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  styles: jsonb("styles").$type<string[]>().default([]),
  rateCents: integer("rate_cents"),
  availability: jsonb("availability").$type<Record<string, any>>().default({}),
  yearsExperience: integer("years_experience"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  caption: text("caption"),
  media: jsonb("media").$type<Array<{
    publicId: string;
    url: string;
    type: string;
    width?: number;
    height?: number;
    duration?: number;
  }>>().notNull().default([]),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  location: jsonb("location").$type<{
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  }>(),
  visibility: visibilityEnum("visibility").notNull().default("PUBLIC"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at")
}, (table) => ({
  authorIdx: index("posts_author_idx").on(table.authorId),
  createdAtIdx: index("posts_created_at_idx").on(table.createdAt)
}));

export const postLikes = pgTable("post_likes", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  uniqueLike: uniqueIndex("unique_post_like").on(table.postId, table.userId)
}));

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at")
}, (table) => ({
  postIdx: index("comments_post_idx").on(table.postId)
}));

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  payload: jsonb("payload").$type<Record<string, any>>().notNull().default({}),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  userIdx: index("notifications_user_idx").on(table.userId)
}));

// Messaging & Communication
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  isGroup: boolean("is_group").notNull().default(false),
  title: varchar("title", { length: 255 }),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const conversationParticipants = pgTable("conversation_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: conversationRoleEnum("role").notNull().default("MEMBER"),
  lastReadAt: timestamp("last_read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  uniqueParticipant: uniqueIndex("unique_conversation_participant").on(table.conversationId, table.userId),
  userIdx: index("conversation_participants_user_idx").on(table.userId)
}));

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body"),
  media: jsonb("media").$type<{
    publicId: string;
    url: string;
    type: string;
  }>(),
  voiceUrl: text("voice_url"),
  replyToId: uuid("reply_to_id").references(() => messages.id),
  reactions: jsonb("reactions").$type<Array<{
    userId: string;
    emoji: string;
  }>>().default([]),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at")
}, (table) => ({
  conversationIdx: index("messages_conversation_idx").on(table.conversationId),
  sentAtIdx: index("messages_sent_at_idx").on(table.sentAt)
}));

// Stories & Highlights
export const stories = pgTable("stories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  media: jsonb("media").$type<{
    publicId: string;
    url: string;
    type: string;
    width?: number;
    height?: number;
    duration?: number;
  }>().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  userIdx: index("stories_user_idx").on(table.userId),
  expiresAtIdx: index("stories_expires_at_idx").on(table.expiresAt)
}));

export const storyHighlights = pgTable("story_highlights", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 100 }).notNull(),
  coverUrl: text("cover_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const highlightStories = pgTable("highlight_stories", {
  id: uuid("id").primaryKey().defaultRandom(),
  highlightId: uuid("highlight_id").notNull().references(() => storyHighlights.id, { onDelete: "cascade" }),
  storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  uniqueHighlightStory: uniqueIndex("unique_highlight_story").on(table.highlightId, table.storyId)
}));

// Professional Features
export const portfolioItems = pgTable("portfolio_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  media: jsonb("media").$type<Array<{
    publicId: string;
    url: string;
    type: string;
    width?: number;
    height?: number;
  }>>().notNull().default([]),
  categories: jsonb("categories").$type<string[]>().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  artistIdx: index("portfolio_items_artist_idx").on(table.artistId)
}));

export const studioApprovalRequests = pgTable("studio_approval_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  artistId: uuid("artist_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: approvalStatusEnum("status").notNull().default("PENDING"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  studioIdx: index("studio_approval_requests_studio_idx").on(table.studioId),
  artistIdx: index("studio_approval_requests_artist_idx").on(table.artistId)
}));

export const jobPostings = pgTable("job_postings", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  type: jobTypeEnum("type").notNull(),
  description: text("description").notNull(),
  location: varchar("location", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  salaryMinCents: integer("salary_min_cents"),
  salaryMaxCents: integer("salary_max_cents"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  studioIdx: index("job_postings_studio_idx").on(table.studioId),
  isActiveIdx: index("job_postings_is_active_idx").on(table.isActive)
}));

export const jobApplications = pgTable("job_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => jobPostings.id, { onDelete: "cascade" }),
  artistId: uuid("artist_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coverLetter: text("cover_letter"),
  portfolioSnapshot: jsonb("portfolio_snapshot").$type<any[]>().default([]),
  status: applicationStatusEnum("status").notNull().default("SUBMITTED"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  jobIdx: index("job_applications_job_idx").on(table.jobId),
  artistIdx: index("job_applications_artist_idx").on(table.artistId)
}));

// Live Streaming
export const livestreamEvents = pgTable("livestream_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  scheduledFor: timestamp("scheduled_for"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  status: livestreamStatusEnum("status").notNull().default("SCHEDULED"),
  viewerPeak: integer("viewer_peak").notNull().default(0),
  viewerTotal: integer("viewer_total").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  hostIdx: index("livestream_events_host_idx").on(table.hostId),
  statusIdx: index("livestream_events_status_idx").on(table.status)
}));

export const livestreamParticipants = pgTable("livestream_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => livestreamEvents.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
  isHost: boolean("is_host").notNull().default(false)
}, (table) => ({
  eventIdx: index("livestream_participants_event_idx").on(table.eventId)
}));

export const liveComments = pgTable("live_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => livestreamEvents.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  postedAt: timestamp("posted_at").notNull().defaultNow()
}, (table) => ({
  eventIdx: index("live_comments_event_idx").on(table.eventId)
}));

export const liveReactions = pgTable("live_reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => livestreamEvents.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  postedAt: timestamp("posted_at").notNull().defaultNow()
});

// Consultations
export const consultationRequests = pgTable("consultation_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requesterId: uuid("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  preferredTimes: jsonb("preferred_times").$type<string[]>().default([]),
  status: consultationStatusEnum("status").notNull().default("REQUESTED"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  artistIdx: index("consultation_requests_artist_idx").on(table.artistId)
}));

// Auxiliary Tables
export const hashtags = pgTable("hashtags", {
  id: uuid("id").primaryKey().defaultRandom(),
  tag: varchar("tag", { length: 100 }).notNull().unique(),
  uses: integer("uses").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const postHashtags = pgTable("post_hashtags", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  hashtagId: uuid("hashtag_id").notNull().references(() => hashtags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  uniquePostHashtag: uniqueIndex("unique_post_hashtag").on(table.postId, table.hashtagId)
}));

export const follows = pgTable("follows", {
  id: uuid("id").primaryKey().defaultRandom(),
  followerId: uuid("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: uuid("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  uniqueFollow: uniqueIndex("unique_follow").on(table.followerId, table.followingId),
  followerIdx: index("follows_follower_idx").on(table.followerId),
  followingIdx: index("follows_following_idx").on(table.followingId)
}));

export const postShares = pgTable("post_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: platformEnum("platform").notNull(),
  sharedAt: timestamp("shared_at").notNull().defaultNow()
}, (table) => ({
  postIdx: index("post_shares_post_idx").on(table.postId)
}));

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  posts: many(posts),
  studioProfile: one(studioProfiles),
  artistProfile: one(artistProfiles),
  followers: many(follows, { relationName: "followers" }),
  following: many(follows, { relationName: "following" })
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id]
  }),
  likes: many(postLikes),
  comments: many(comments),
  hashtags: many(postHashtags)
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  participants: many(conversationParticipants),
  messages: many(messages)
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id]
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id]
  }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id]
  })
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  likeCount: true,
  commentCount: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  deletedAt: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
  deletedAt: true,
  reactions: true
});

export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  createdAt: true
});

export const insertPortfolioItemSchema = createInsertSchema(portfolioItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertLivestreamEventSchema = createInsertSchema(livestreamEvents).omit({
  id: true,
  viewerPeak: true,
  viewerTotal: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;
export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type InsertPortfolioItem = z.infer<typeof insertPortfolioItemSchema>;
export type JobPosting = typeof jobPostings.$inferSelect;
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type LivestreamEvent = typeof livestreamEvents.$inferSelect;
export type InsertLivestreamEvent = z.infer<typeof insertLivestreamEventSchema>;
