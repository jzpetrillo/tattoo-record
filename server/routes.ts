import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "./db";
import * as schema from "@shared/schema";
import { storage } from "./storage";
import { requireAuth, requireRole, generateToken, type AuthRequest } from "./middleware/auth";
import { uploadMedia, deleteMedia } from "./services/cloudinary";
import { generateTattooRecommendations } from "./services/ai/recommendations";
import { setupMessageWebSocket, broadcastNewMessage } from "./services/websocket";
import { setupLiveWebSocket } from "./services/websocket-live";
import { startStoryCleanupScheduler } from "./services/story-cleanup";
import { getPersonalizedFeed, getTrendingPosts, getFeaturedPosts, getForYouRecommendations } from "./services/feed-algorithm";
import * as validation from "./utils/validation";
import { flags } from "./config/flags";
import { tagTattooImage } from "./services/ai/vision";
import { embedPost, isVoyageEnabled } from "./services/ai/embeddings";
import { embed } from "./services/ai/index";
import { startDigestScheduler } from "./services/digest";
import { initDatabase } from "./db-init";

// Strip password hash before sending user objects to clients
function safeUser<T extends { hashedPassword?: string }>(user: T): Omit<T, "hashedPassword"> {
  const { hashedPassword: _omit, ...safe } = user as any;
  return safe;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later." },
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Setup WebSockets
  setupMessageWebSocket(httpServer);
  setupLiveWebSocket(httpServer);

  // Initialise DB extensions & AI infrastructure
  await initDatabase();

  // Start background jobs
  startStoryCleanupScheduler();
  if (flags.aiDigest) startDigestScheduler();

  // Authentication Routes
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const validated = validation.registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validated.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const existingUsername = await storage.getUserByUsername(validated.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(validated.password, 10);
      
      // Set verification status based on role
      const verificationStatus = (validated.role === "ARTIST" || validated.role === "STUDIO") 
        ? "PENDING" 
        : null;
      
      const user = await storage.createUser({
        ...validated,
        hashedPassword,
        verificationStatus
      });

      const token = generateToken(user.id);
      res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, verificationStatus: user.verificationStatus } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const validated = validation.loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validated.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(validated.password, user.hashedPassword);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken(user.id);
      res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, isVerified: user.isVerified, verificationStatus: user.verificationStatus } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req: AuthRequest, res) => {
    try {
      res.json({ message: "Logged out successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }
      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }
      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });
      const valid = await bcrypt.compare(currentPassword, user.hashedPassword);
      if (!valid) return res.status(401).json({ message: "Current password is incorrect" });
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(req.userId!, { hashedPassword });
      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User Routes
  app.get("/api/users", async (req, res) => {
    try {
      const type = req.query.type as string;
      const take = parseInt(req.query.take as string) || 24;
      const skip = parseInt(req.query.skip as string) || 0;
      
      const users = await storage.getUsers({ type, take, skip });
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(safeUser(user));
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      // Check if it's a UUID format (with hyphens) or a username
      const param = req.params.id;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);
      
      const user = isUUID
        ? await storage.getUser(param)
        : await storage.getUserByUsername(param);
        
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(safeUser(user));
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = validation.updateUserSchema.parse(req.body);
      const user = await storage.updateUser(req.userId!, validated);
      res.json(safeUser(user));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Social Routes
  app.post("/api/users/:id/follow", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.userId === req.params.id) return res.status(400).json({ message: "Cannot follow yourself" });
      const alreadyFollowing = await storage.isFollowing(req.userId!, req.params.id);
      if (!alreadyFollowing) {
        await storage.followUser(req.userId!, req.params.id);
        // Notify the followed user
        storage.createNotification({
          userId: req.params.id,
          type: "FOLLOW",
          payload: { actorId: req.userId },
        }).catch((e) => console.error("notification failed:", e));
      }
      res.json({ message: "Followed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users/:id/unfollow", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.unfollowUser(req.userId!, req.params.id);
      res.json({ message: "Unfollowed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id/is-following", requireAuth, async (req: AuthRequest, res) => {
    try {
      const isFollowing = await storage.isFollowing(req.userId!, req.params.id);
      res.json({ isFollowing });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id/stats", async (req, res) => {
    try {
      const param = req.params.id;
      // Check if it's a UUID format (with hyphens)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);
      
      // Get user first to resolve username to ID if needed
      const user = isUUID
        ? await storage.getUser(param)
        : await storage.getUserByUsername(param);
        
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const [followers, following, postsCount] = await Promise.all([
        storage.getFollowers(user.id),
        storage.getFollowing(user.id),
        storage.getPostCount(user.id),
      ]);

      res.json({
        followersCount: followers.length,
        followingCount: following.length,
        postsCount,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Post Routes
  app.get("/api/posts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const authorId = req.query.authorId as string;
      const type = req.query.type as "POST" | "REEL" | "STORY" | undefined;
      const featured = req.query.featured === "true";
      
      if (authorId) {
        const posts = await storage.getPosts({ limit, offset, authorId, type });
        res.json(posts);
      } else if (featured) {
        const posts = await getFeaturedPosts(limit, req.userId);
        res.json(posts);
      } else if (type) {
        const posts = await storage.getPosts({ limit, offset, type });
        res.json(posts);
      } else {
        const feed = await getPersonalizedFeed(req.userId!, limit, offset);
        res.json(feed);
      }
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/posts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = validation.createPostSchema.parse(req.body);
      const post = await storage.createPost({
        ...validated,
        authorId: req.userId!
      });
      res.json(post);

      // Fire-and-forget AI enrichment after response is sent
      const imageMedia = (post.media as any[] || []).find((m: any) => m.type === "image");
      if (flags.aiAutotag && imageMedia?.url) {
        tagTattooImage(imageMedia.url)
          .then((tags) => {
            if (tags) {
              return storage.updatePostTags(post.id, {
                aiTags: tags,
                styles: tags.styles,
                subjects: tags.subjects,
              });
            }
          })
          .catch((err) => console.error("[ai-tag]", err));
      }
      if (flags.aiSemanticSearch && isVoyageEnabled()) {
        embedPost({ caption: post.caption, styles: post.styles as any })
          .then((vec) => storage.updatePostEmbedding(post.id, vec))
          .catch((err) => console.error("[embed]", err));
      }
      storage.logEvent({
        userId: req.userId,
        type: "post.created",
        entityId: post.id,
        entityType: "post",
      }).catch(() => {});
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/posts/:id/like", requireAuth, async (req: AuthRequest, res) => {
    try {
      const postResult = await storage.getPost(req.params.id);
      if (!postResult) return res.status(404).json({ message: "Post not found" });
      const wasLiked = await storage.likePost(req.params.id, req.userId!);
      if (wasLiked && postResult.post.authorId !== req.userId) {
        storage.createNotification({
          userId: postResult.post.authorId,
          type: "LIKE",
          payload: { actorId: req.userId, postId: req.params.id },
        }).catch((e) => console.error("[like notification]", e));
      }
      if (wasLiked) {
        storage.logEvent({
          userId: req.userId,
          type: "post_like",
          entityId: req.params.id,
          entityType: "post",
        }).catch(() => {});
      }
      res.json({ message: "Post liked" });
    } catch (error: any) {
      console.error("[like post]", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/posts/:id/like", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.unlikePost(req.params.id, req.userId!);
      res.json({ message: "Post unliked" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/posts/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await storage.getPost(req.params.id);
      if (!result) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (result.post.authorId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to delete this post" });
      }
      await storage.deletePost(req.params.id);
      res.json({ message: "Post deleted" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // For You Recommendations
  app.get("/api/for-you", requireAuth, async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const recommendations = await getForYouRecommendations(req.userId!, limit);
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Comment Routes
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.postId);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/posts/:postId/comments", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = validation.createCommentSchema.parse(req.body);
      const comment = await storage.createComment({
        ...validated,
        postId: req.params.postId,
        userId: req.userId!
      });
      // Notify the post author if they're not the commenter
      storage.getPost(req.params.postId).then((postResult) => {
        if (postResult && postResult.post.authorId !== req.userId) {
          storage.createNotification({
            userId: postResult.post.authorId,
            type: "COMMENT",
            payload: { actorId: req.userId, postId: req.params.postId, commentId: comment.id },
          }).catch((e) => console.error("notification failed:", e));
        }
      }).catch(() => {});
      res.json(comment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/posts/:postId/comments/:commentId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const [comment] = await db
        .select()
        .from(schema.comments)
        .where(and(eq(schema.comments.id, req.params.commentId), isNull(schema.comments.deletedAt)))
        .limit(1);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      // Allow deletion by the comment author only
      if (comment.userId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to delete this comment" });
      }
      await storage.deleteComment(req.params.commentId);
      res.json({ message: "Comment deleted" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Saved Posts (Bookmarks) Routes
  app.post("/api/saved-posts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { postId, collectionName } = req.body;
      const saved = await storage.savePost(req.userId!, postId, collectionName);
      res.json(saved);
      storage.logEvent({
        userId: req.userId,
        type: "post_save",
        entityId: postId,
        entityType: "post",
      }).catch(() => {});
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/saved-posts/:postId", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.unsavePost(req.userId!, req.params.postId);
      res.json({ message: "Post unsaved" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/saved-posts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const collectionName = req.query.collection as string | undefined;
      const saved = await storage.getSavedPosts(req.userId!, collectionName);
      res.json(saved);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/saved-posts/check/:postId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const isSaved = await storage.isPostSaved(req.userId!, req.params.postId);
      res.json({ isSaved });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/saved-posts/collections", requireAuth, async (req: AuthRequest, res) => {
    try {
      const collections = await storage.getSavedCollections(req.userId!);
      res.json(collections);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Story Routes
  app.post("/api/stories", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = validation.createStorySchema.parse(req.body);
      const ttlHours = parseInt(process.env.STORY_TTL_HOURS || "24");
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
      const story = await storage.createStory({
        userId: req.userId!,
        media: validated.media,
        expiresAt
      });
      res.json(story);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/stories", requireAuth, async (req: AuthRequest, res) => {
    try {
      const stories = await storage.getActiveStories();
      res.json(stories);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/stories/:userId", async (req, res) => {
    try {
      const stories = await storage.getStories(req.params.userId);
      res.json(stories);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Message Routes
  app.get("/api/conversations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const conversations = await storage.getConversations(req.userId!);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { participantIds, isGroup, title } = req.body;
      const conversation = await storage.createConversation(
        [...participantIds, req.userId!],
        isGroup,
        title
      );
      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/conversations/:id/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      // Verify the requesting user is a participant in this conversation
      const [participant] = await db
        .select()
        .from(schema.conversationParticipants)
        .where(and(
          eq(schema.conversationParticipants.conversationId, req.params.id),
          eq(schema.conversationParticipants.userId, req.userId!)
        ))
        .limit(1);
      if (!participant) {
        return res.status(403).json({ message: "Not a participant in this conversation" });
      }
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getMessages(req.params.id, limit);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/conversations/:id/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      // Verify the requesting user is a participant in this conversation
      const [participant] = await db
        .select()
        .from(schema.conversationParticipants)
        .where(and(
          eq(schema.conversationParticipants.conversationId, req.params.id),
          eq(schema.conversationParticipants.userId, req.userId!)
        ))
        .limit(1);
      if (!participant) {
        return res.status(403).json({ message: "Not a participant in this conversation" });
      }
      const validated = validation.createMessageSchema.parse({
        conversationId: req.params.id,
        body: req.body.body,
        media: req.body.media,
        replyToId: req.body.replyToId,
      });
      const messageData = {
        ...validated,
        senderId: req.userId!,
      };
      const message = await storage.createMessage(messageData as any);
      // Broadcast to conversation participants via WebSocket
      broadcastNewMessage(req.params.id, message).catch((e) => console.error("WS broadcast failed:", e));
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/conversations/:id/read", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.markConversationAsRead(req.params.id, req.userId!);
      res.json({ message: "Marked as read" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      const withUserId = req.query.withUserId as string;
      if (!withUserId) {
        return res.status(400).json({ message: "withUserId parameter required" });
      }
      
      const conversation = await storage.getOrCreateConversation([req.userId!, withUserId]);
      const messages = await storage.getMessages(conversation.id, 50);
      res.json({ conversation, messages });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Portfolio Routes
  app.get("/api/portfolio/:artistId", async (req, res) => {
    try {
      const portfolio = await storage.getPortfolio(req.params.artistId);
      res.json(portfolio);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/portfolio", requireAuth, requireRole(["ARTIST", "STUDIO"]), async (req: AuthRequest, res) => {
    try {
      const item = await storage.createPortfolioItem({
        ...req.body,
        artistId: req.userId!
      });
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/portfolio/:id", requireAuth, requireRole(["ARTIST", "STUDIO"]), async (req: AuthRequest, res) => {
    try {
      const item = await storage.getPortfolioItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Portfolio item not found" });
      }
      if (item.artistId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to edit this portfolio item" });
      }
      await storage.updatePortfolioItem(req.params.id, req.body);
      res.json({ message: "Portfolio item updated" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/portfolio/:id", requireAuth, requireRole(["ARTIST", "STUDIO"]), async (req: AuthRequest, res) => {
    try {
      const item = await storage.getPortfolioItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Portfolio item not found" });
      }
      if (item.artistId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to delete this portfolio item" });
      }
      await storage.deletePortfolioItem(req.params.id);
      res.json({ message: "Portfolio item deleted" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Job Routes
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getJobs(req.query);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJobById(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/jobs", requireAuth, requireRole(["STUDIO"]), async (req: AuthRequest, res) => {
    try {
      const validated = validation.createJobSchema.parse(req.body);
      const job = await storage.createJob({
        ...validated,
        studioId: req.userId!
      });
      res.json(job);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/jobs/:id", requireAuth, requireRole(["STUDIO"]), async (req: AuthRequest, res) => {
    try {
      const job = await storage.getJobById(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (job.job.studioId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to edit this job" });
      }
      const validated = validation.createJobSchema.parse(req.body);
      await storage.updateJob(req.params.id, validated);
      res.json({ message: "Job updated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/jobs/:id", requireAuth, requireRole(["STUDIO"]), async (req: AuthRequest, res) => {
    try {
      const job = await storage.getJobById(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (job.job.studioId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to delete this job" });
      }
      await storage.deleteJob(req.params.id);
      res.json({ message: "Job deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/jobs/:jobId/apply", requireAuth, requireRole(["ARTIST"]), async (req: AuthRequest, res) => {
    try {
      const validated = validation.jobApplySchema.parse(req.body);
      const job = await storage.getJobById(req.params.jobId);
      if (!job) return res.status(404).json({ message: "Job not found" });
      if (!job.job.isActive) return res.status(400).json({ message: "This job is no longer accepting applications" });
      await storage.applyToJob(req.params.jobId, req.userId!, validated);
      res.json({ message: "Application submitted" });
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ message: error.errors?.[0]?.message || "Validation failed" });
      }
      if (error?.status === 409) {
        return res.status(409).json({ message: error.message });
      }
      console.error("[job apply]", error);
      res.status(400).json({ message: "Could not submit application. Please try again." });
    }
  });

  app.get("/api/jobs/:jobId/applications", requireAuth, async (req: AuthRequest, res) => {
    try {
      const job = await storage.getJobById(req.params.jobId);
      if (!job) return res.status(404).json({ message: "Job not found" });
      if (job.job.studioId !== req.userId && req.userRole !== "ADMIN") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const applications = await storage.getJobApplications(req.params.jobId);
      res.json(applications);
    } catch (error: any) {
      console.error("[jobs/applications]", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Flash Sales Routes
  app.get("/api/flash-sales", async (req, res) => {
    try {
      const artistId = req.query.artistId as string | undefined;
      const activeOnly = req.query.active === 'true' || req.query.active === undefined;
      const flashSales = await storage.getFlashSales(artistId, activeOnly);
      res.json(flashSales);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/flash-sales/:id", async (req, res) => {
    try {
      const flashSale = await storage.getFlashSale(req.params.id);
      if (!flashSale) {
        return res.status(404).json({ message: "Flash sale not found" });
      }
      res.json(flashSale);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/flash-sales", requireAuth, requireRole(["ARTIST"]), async (req: AuthRequest, res) => {
    try {
      const validated = validation.createFlashSaleSchema.parse(req.body);
      const flashSale = await storage.createFlashSale({
        ...validated,
        expiresAt: new Date(validated.expiresAt),
        artistId: req.userId!
      });
      res.json(flashSale);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/flash-sales/:id", requireAuth, requireRole(["ARTIST"]), async (req: AuthRequest, res) => {
    try {
      const flashSale = await storage.getFlashSale(req.params.id);
      if (!flashSale) {
        return res.status(404).json({ message: "Flash sale not found" });
      }
      if ((flashSale as any).artistId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to edit this flash sale" });
      }
      const updated = await storage.updateFlashSale(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Booking Routes
  app.get("/api/bookings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const filters = {
        artistId: req.query.artistId as string | undefined,
        clientId: req.query.clientId as string | undefined,
        status: req.query.status as string | undefined
      };
      const bookings = await storage.getBookings(filters);
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/bookings/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/bookings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = validation.createBookingSchema.parse(req.body);
      const booking = await storage.createBooking({
        ...validated,
        scheduledAt: new Date(validated.scheduledAt),
        clientId: req.userId!
      });
      res.json(booking);
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ message: error.errors?.[0]?.message || "Validation failed" });
      }
      console.error("[booking create]", error);
      res.status(400).json({ message: "Could not create booking. Please check your input." });
    }
  });

  app.put("/api/bookings/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      // Only the artist or client involved in the booking may update it
      if (booking.artistId !== req.userId && booking.clientId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to update this booking" });
      }
      const updated = await storage.updateBooking(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark deposit as paid
  app.post("/api/bookings/:id/mark-deposit-paid", requireAuth, async (req: AuthRequest, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      // Only the artist can mark deposit as paid
      if (booking.artistId !== req.userId) {
        return res.status(403).json({ message: "Only the artist can mark deposit as paid" });
      }
      const updated = await storage.updateBooking(req.params.id, {
        paymentStatus: "DEPOSIT_PAID",
        depositPaidAt: new Date()
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark as fully paid
  app.post("/api/bookings/:id/mark-fully-paid", requireAuth, async (req: AuthRequest, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      // Only the artist can mark as fully paid
      if (booking.artistId !== req.userId) {
        return res.status(403).json({ message: "Only the artist can mark as fully paid" });
      }
      const updated = await storage.updateBooking(req.params.id, {
        paymentStatus: "FULLY_PAID",
        fullPaymentAt: new Date()
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/bookings/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      // Only the artist or client involved in the booking may cancel it
      if (booking.artistId !== req.userId && booking.clientId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to cancel this booking" });
      }
      await storage.deleteBooking(req.params.id);
      res.json({ message: "Booking cancelled" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Process booking reminders (admin only)
  app.post("/api/bookings/process-reminders", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const bookings = await storage.getBookingsNeedingReminders();
      const remindersCreated: string[] = [];
      
      for (const booking of bookings) {
        // Create notification for the client
        if (booking.clientId) {
          const timeUntil = booking.scheduledAt 
            ? Math.ceil((new Date(booking.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60))
            : 0;
          
          let timeMessage = "";
          if (timeUntil <= 24) {
            timeMessage = timeUntil <= 1 ? "in 1 hour" : `in ${timeUntil} hours`;
          } else {
            const days = Math.ceil(timeUntil / 24);
            timeMessage = days === 1 ? "tomorrow" : `in ${days} days`;
          }
          
          const artistName = booking.artist?.firstName 
            ? `${booking.artist.firstName} ${booking.artist.lastName || ''}`.trim()
            : booking.artist?.username || "your artist";
          
          await storage.createNotification({
            userId: booking.clientId,
            type: "SYSTEM",
            payload: {
              type: "BOOKING_REMINDER",
              bookingId: booking.id,
              title: booking.title || "Upcoming Appointment",
              artistName,
              scheduledAt: booking.scheduledAt?.toISOString() || "",
              message: `Your appointment "${booking.title || "tattoo session"}" with ${artistName} is ${timeMessage}!`
            } as Record<string, any>
          });
          
          await storage.markReminderSent(booking.id);
          remindersCreated.push(booking.id);
        }
      }
      
      res.json({ 
        message: `Processed ${bookings.length} bookings, sent ${remindersCreated.length} reminders`,
        remindersCreated 
      });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Livestream Routes
  app.get("/api/livestream-events", async (req, res) => {
    try {
      const events = await storage.getLivestreamEvents(req.query);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/livestream-events", requireAuth, async (req: AuthRequest, res) => {
    try {
      const event = await storage.createLivestreamEvent({
        ...req.body,
        hostId: req.userId!
      });
      res.json(event);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/livestream-events/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const [event] = await db
        .select()
        .from(schema.livestreamEvents)
        .where(eq(schema.livestreamEvents.id, req.params.id))
        .limit(1);
      if (!event) {
        return res.status(404).json({ message: "Livestream event not found" });
      }
      if (event.hostId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to edit this event" });
      }
      await storage.updateLivestreamEvent(req.params.id, req.body);
      res.json({ message: "Event updated" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/live-events/:eventId/start", requireAuth, async (req: AuthRequest, res) => {
    try {
      const [event] = await db.select().from(schema.livestreamEvents).where(eq(schema.livestreamEvents.id, req.params.eventId)).limit(1);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (event.hostId !== req.userId) return res.status(403).json({ message: "Not authorized" });
      await storage.updateLivestreamEvent(req.params.eventId, { status: "LIVE", startedAt: new Date() });
      res.json({ message: "Stream started" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/live-events/:eventId/end", requireAuth, async (req: AuthRequest, res) => {
    try {
      const [event] = await db.select().from(schema.livestreamEvents).where(eq(schema.livestreamEvents.id, req.params.eventId)).limit(1);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (event.hostId !== req.userId) return res.status(403).json({ message: "Not authorized" });
      await storage.updateLivestreamEvent(req.params.eventId, { status: "ENDED", endedAt: new Date() });
      res.json({ message: "Stream ended" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Search Routes
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const [users, posts, hashtags] = await Promise.all([
        storage.searchUsers(query),
        storage.searchPosts(query),
        storage.searchHashtags(query)
      ]);
      res.json({ users, posts, hashtags });
      if (query) {
        storage.logEvent({
          type: "search_performed",
          payload: { query },
        }).catch(() => {});
      }
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Semantic search (Phase 3 — requires VOYAGE_API_KEY + pgvector)
  app.get("/api/search/semantic", async (req, res) => {
    try {
      const query = (req.query.q as string || "").trim();
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      if (!query) return res.json({ posts: [], available: false });
      if (!flags.aiSemanticSearch || !isVoyageEnabled()) {
        return res.json({ posts: [], available: false });
      }
      const queryEmbedding = await embed(query);
      const posts = await storage.semanticSearchPosts(queryEmbedding, limit);
      res.json({ posts, available: true });
      storage.logEvent({
        type: "search_performed",
        payload: { query, semantic: true },
      }).catch(() => {});
    } catch (error: any) {
      console.error("[semantic-search]", error.message);
      res.json({ posts: [], available: false });
    }
  });

  app.get("/api/hashtags/trending", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const hashtags = await storage.getTrendingHashtags(limit);
      res.json(hashtags);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notification Routes
  app.get("/api/notifications", requireAuth, async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getNotifications(req.userId!, limit);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ message: "Notification marked as read" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.userId!);
      res.json({ message: "All notifications marked as read" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/discovery/trending", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const posts = await getTrendingPosts(limit);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upload Routes
  app.post("/api/upload", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
        return res.status(400).json({ message: `Unsupported file type: ${req.file.mimetype}` });
      }

      const folder = req.body.folder || "general";
      const resourceType = req.file.mimetype.startsWith("video") ? "video" : "image";
      
      const result = await uploadMedia(req.file.buffer, folder, resourceType);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/upload/:publicId(*)", requireAuth, async (req: AuthRequest, res) => {
    try {
      const publicId = req.params.publicId;
      // Cloudinary IDs are namespaced as tattoo-record/<folder>/<userId>/...
      // Accept both the namespaced form and the legacy bare form for the current user.
      const isNamespaced = publicId.startsWith(`tattoo-record/`) && publicId.includes(`/${req.userId}/`);
      const userFolderPrefixes = [
        `posts/${req.userId}/`,
        `stories/${req.userId}/`,
        `portfolios/${req.userId}/`,
        `avatars/${req.userId}/`,
        `banners/${req.userId}/`,
        `messages/${req.userId}/`,
      ];
      const isLegacyPrefix = userFolderPrefixes.some(prefix => publicId.startsWith(prefix));
      if (!isNamespaced && !isLegacyPrefix) {
        return res.status(403).json({ message: "Not authorized to delete this resource" });
      }
      await deleteMedia(publicId);
      res.json({ message: "Media deleted" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // AI Routes
  app.post("/api/ai/tattoo-recommendations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = validation.aiRecommendationSchema.parse(req.body);
      const recommendations = await generateTattooRecommendations(validated);
      res.json(recommendations);
      storage.logEvent({
        userId: req.userId,
        type: "ai_recommendation_served",
        entityType: "recommendations",
      }).catch(() => {});
    } catch (error: any) {
      console.error("[ai-recs]", error);
      res.status(503).json({ message: "AI recommendations are temporarily unavailable. Please try again later." });
    }
  });

  // Studio Approval Routes
  app.post("/api/studio-approvals", requireAuth, requireRole(["ARTIST"]), async (req: AuthRequest, res) => {
    try {
      const validated = validation.insertStudioApprovalRequestSchema.parse({
        ...req.body,
        artistId: req.userId,
        status: "PENDING"
      });
      const request = await storage.createStudioApprovalRequest(validated);
      res.json(request);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/studio-approvals", requireAuth, async (req: AuthRequest, res) => {
    try {
      const filters: any = {};
      
      if (req.query.studioId) {
        filters.studioId = req.query.studioId as string;
      }
      if (req.query.artistId) {
        filters.artistId = req.query.artistId as string;
      }
      if (req.query.status) {
        filters.status = req.query.status as string;
      }

      const requests = await storage.getStudioApprovalRequests(filters);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/studio-approvals/:id/approve", requireAuth, requireRole(["STUDIO"]), async (req: AuthRequest, res) => {
    try {
      const approvalReq = await storage.getStudioApprovalRequestById(req.params.id);
      if (!approvalReq) return res.status(404).json({ message: "Request not found" });
      if (approvalReq.studioId !== req.userId) return res.status(403).json({ message: "Not authorized" });
      await storage.updateStudioApprovalStatus(req.params.id, "APPROVED");
      res.json({ message: "Request approved" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/studio-approvals/:id/reject", requireAuth, requireRole(["STUDIO"]), async (req: AuthRequest, res) => {
    try {
      const approvalReq = await storage.getStudioApprovalRequestById(req.params.id);
      if (!approvalReq) return res.status(404).json({ message: "Request not found" });
      if (approvalReq.studioId !== req.userId) return res.status(403).json({ message: "Not authorized" });
      await storage.updateStudioApprovalStatus(req.params.id, "REJECTED");
      res.json({ message: "Request rejected" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/studios/:studioId/artists", async (req, res) => {
    try {
      const artists = await storage.getApprovedArtists(req.params.studioId);
      res.json(artists);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/artists/:artistId/studio", async (req, res) => {
    try {
      const studio = await storage.getArtistStudio(req.params.artistId);
      res.json(studio);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin Routes
  app.get("/api/admin/users", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const status = req.query.status as string | undefined;
      const role = req.query.role as string | undefined;
      
      // Get all users (artists and studios only)
      const allUsers = await storage.getUsers({ type: role, take: 1000, skip: 0 });
      
      // Filter by verification status
      let filteredUsers = allUsers.filter((u: any) => 
        u.role === "ARTIST" || u.role === "STUDIO"
      );
      
      if (status === "PENDING") {
        filteredUsers = filteredUsers.filter((u: any) => u.verificationStatus === "PENDING");
      } else if (status === "APPROVED") {
        filteredUsers = filteredUsers.filter((u: any) => u.verificationStatus === "APPROVED");
      } else if (status === "REJECTED") {
        filteredUsers = filteredUsers.filter((u: any) => u.verificationStatus === "REJECTED");
      }
      // else return ALL artists and studios
      
      res.json(filteredUsers);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/pending-users", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/users/:id/approve", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.approveUser(req.params.id);
      res.json({ message: "User approved successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/users/:id/reject", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.rejectUser(req.params.id);
      res.json({ message: "User rejected successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin Stats Dashboard
  app.get("/api/admin/stats", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin - Get ALL users (including enthusiasts)
  app.get("/api/admin/all-users", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const { role, search, limit = "50", offset = "0" } = req.query;
      const users = await storage.getAllUsersAdmin({
        role: role as string | undefined,
        search: search as string | undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin - Delete user
  app.delete("/api/admin/users/:id", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin - Ban/Unban user
  app.put("/api/admin/users/:id/ban", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.banUser(req.params.id);
      res.json({ message: "User banned successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/users/:id/unban", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.unbanUser(req.params.id);
      res.json({ message: "User unbanned successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin - Posts Management
  app.get("/api/admin/posts", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const { limit = "50", offset = "0", featured } = req.query;
      const posts = await storage.getAdminPosts({
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        featured: featured === "true" ? true : featured === "false" ? false : undefined
      });
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/posts/:id", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.deletePost(req.params.id);
      res.json({ message: "Post deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/posts/:id/feature", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.featurePost(req.params.id);
      res.json({ message: "Post featured successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/posts/:id/unfeature", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.unfeaturePost(req.params.id);
      res.json({ message: "Post unfeatured successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin - Jobs Management
  app.get("/api/admin/jobs", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const jobs = await storage.getAllJobsAdmin();
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/jobs/:id", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.deleteJob(req.params.id);
      res.json({ message: "Job deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/jobs/:id/activate", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.activateJob(req.params.id);
      res.json({ message: "Job activated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/jobs/:id/deactivate", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.deactivateJob(req.params.id);
      res.json({ message: "Job deactivated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin - Flash Sales Management
  app.get("/api/admin/flash-sales", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const sales = await storage.getAllFlashSalesAdmin();
      res.json(sales);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/flash-sales/:id", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.deleteFlashSale(req.params.id);
      res.json({ message: "Flash sale deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin - Bookings Overview
  app.get("/api/admin/bookings", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const bookings = await storage.getAllBookingsAdmin();
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin - Change user role
  app.put("/api/admin/users/:id/role", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const { role } = req.body;
      if (!["ARTIST", "STUDIO", "ENTHUSIAST", "ADMIN"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      await storage.changeUserRole(req.params.id, role);
      res.json({ message: "User role updated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin - Toggle flash sale active status
  app.put("/api/admin/flash-sales/:id/toggle", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.toggleFlashSaleActive(req.params.id);
      res.json({ message: "Flash sale status toggled" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin - Update flash sale
  app.put("/api/admin/flash-sales/:id", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const updated = await storage.updateFlashSale(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin - Create flash sale on behalf of an artist
  app.post("/api/admin/flash-sales", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const { artistId, title, description, originalPriceCents, flashPriceCents, availableSlots, expiresAt } = req.body;
      if (!artistId || !title || !originalPriceCents || !flashPriceCents || !availableSlots || !expiresAt) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const sale = await storage.createFlashSale({
        artistId,
        title,
        description: description || null,
        originalPriceCents: parseInt(originalPriceCents),
        flashPriceCents: parseInt(flashPriceCents),
        availableSlots: parseInt(availableSlots),
        expiresAt: new Date(expiresAt),
        media: [],
        isActive: true,
      });
      res.status(201).json(sale);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin - Cancel booking (status override)
  app.put("/api/admin/bookings/:id/cancel", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.cancelBookingAdmin(req.params.id);
      res.json({ message: "Booking cancelled successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  return httpServer;
}
