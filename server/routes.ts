import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import multer from "multer";
import { storage } from "./storage";
import { requireAuth, requireRole, generateToken, type AuthRequest } from "./middleware/auth";
import { uploadMedia, deleteMedia } from "./services/cloudinary";
import { generateTattooRecommendations } from "./services/openai";
import { setupMessageWebSocket } from "./services/websocket";
import { setupLiveWebSocket } from "./services/websocket-live";
import { startStoryCleanupScheduler } from "./services/story-cleanup";
import { getPersonalizedFeed, getTrendingPosts } from "./services/feed-algorithm";
import * as validation from "./utils/validation";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Setup WebSockets
  setupMessageWebSocket(httpServer);
  setupLiveWebSocket(httpServer);

  // Start background jobs
  startStoryCleanupScheduler();

  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
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

  app.post("/api/auth/login", async (req, res) => {
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
      res.status(500).json({ message: error.message });
    }
  });

  // User Routes
  app.get("/api/users/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/users/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const updates = req.body;
      const user = await storage.updateUser(req.userId!, updates);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Social Routes
  app.post("/api/users/:id/follow", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.followUser(req.userId!, req.params.id);
      res.json({ message: "Followed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users/:id/unfollow", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.unfollowUser(req.userId!, req.params.id);
      res.json({ message: "Unfollowed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Post Routes
  app.get("/api/posts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const authorId = req.query.authorId as string;
      
      if (authorId) {
        const posts = await storage.getPosts({ limit, offset, authorId });
        res.json(posts);
      } else {
        const feed = await getPersonalizedFeed(req.userId!, limit, offset);
        res.json(feed);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
      res.status(500).json({ message: error.message });
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
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/posts/:id/like", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.likePost(req.params.id, req.userId!);
      res.json({ message: "Post liked" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/posts/:id/like", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.unlikePost(req.params.id, req.userId!);
      res.json({ message: "Post unliked" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/posts/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.deletePost(req.params.id);
      res.json({ message: "Post deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Comment Routes
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.postId);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
      res.json(comment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/posts/:postId/comments/:commentId", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.deleteComment(req.params.commentId);
      res.json({ message: "Comment deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stories/:userId", async (req, res) => {
    try {
      const stories = await storage.getStories(req.params.userId);
      res.json(stories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Message Routes
  app.get("/api/conversations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const conversations = await storage.getConversations(req.userId!);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getMessages(req.params.id, limit);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/conversations/:id/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      const message = await storage.createMessage({
        conversationId: req.params.id,
        senderId: req.userId!,
        body: req.body.body || null,
        media: req.body.media || null,
        replyToId: req.body.replyToId || null
      });
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
      res.status(500).json({ message: error.message });
    }
  });

  // Portfolio Routes
  app.get("/api/portfolio/:artistId", async (req, res) => {
    try {
      const portfolio = await storage.getPortfolio(req.params.artistId);
      res.json(portfolio);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/portfolio", requireAuth, requireRole(["ARTIST"]), async (req: AuthRequest, res) => {
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

  app.put("/api/portfolio/:id", requireAuth, requireRole(["ARTIST"]), async (req: AuthRequest, res) => {
    try {
      await storage.updatePortfolioItem(req.params.id, req.body);
      res.json({ message: "Portfolio item updated" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/portfolio/:id", requireAuth, requireRole(["ARTIST"]), async (req: AuthRequest, res) => {
    try {
      await storage.deletePortfolioItem(req.params.id);
      res.json({ message: "Portfolio item deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Job Routes
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getJobs(req.query);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

  app.post("/api/jobs/:jobId/apply", requireAuth, requireRole(["ARTIST"]), async (req: AuthRequest, res) => {
    try {
      await storage.applyToJob(req.params.jobId, req.userId!, req.body);
      res.json({ message: "Application submitted" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Livestream Routes
  app.get("/api/livestream-events", async (req, res) => {
    try {
      const events = await storage.getLivestreamEvents(req.query);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
      await storage.updateLivestreamEvent(req.params.id, req.body);
      res.json({ message: "Event updated" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/live-events/:eventId/start", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.updateLivestreamEvent(req.params.eventId, {
        status: "LIVE",
        startedAt: new Date()
      });
      res.json({ message: "Stream started" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/live-events/:eventId/end", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.updateLivestreamEvent(req.params.eventId, {
        status: "ENDED",
        endedAt: new Date()
      });
      res.json({ message: "Stream ended" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/hashtags/trending", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const hashtags = await storage.getTrendingHashtags(limit);
      res.json(hashtags);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Notification Routes
  app.get("/api/notifications", requireAuth, async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getNotifications(req.userId!, limit);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ message: "Notification marked as read" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.userId!);
      res.json({ message: "All notifications marked as read" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/discovery/trending", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const posts = await getTrendingPosts(limit);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Upload Routes
  app.post("/api/upload", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const folder = req.body.folder || "general";
      const resourceType = req.file.mimetype.startsWith("video") ? "video" : "image";
      
      const result = await uploadMedia(req.file.buffer, folder, resourceType);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/upload/:publicId", requireAuth, async (req: AuthRequest, res) => {
    try {
      await deleteMedia(req.params.publicId);
      res.json({ message: "Media deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Routes
  app.post("/api/ai/tattoo-recommendations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = validation.aiRecommendationSchema.parse(req.body);
      const recommendations = await generateTattooRecommendations(validated);
      res.json(recommendations);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
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
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/studio-approvals/:id/approve", requireAuth, requireRole(["STUDIO"]), async (req: AuthRequest, res) => {
    try {
      await storage.updateStudioApprovalStatus(req.params.id, "APPROVED");
      res.json({ message: "Request approved" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/studio-approvals/:id/reject", requireAuth, requireRole(["STUDIO"]), async (req: AuthRequest, res) => {
    try {
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
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/artists/:artistId/studio", async (req, res) => {
    try {
      const studio = await storage.getArtistStudio(req.params.artistId);
      res.json(studio);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Routes
  app.get("/api/admin/pending-users", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

  return httpServer;
}
