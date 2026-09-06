import type { Express } from "express";
import { createServer, type Server } from "http";
import { Readable } from "node:stream";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcrypt";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db, pool } from "../db";
import * as schema from "@workspace/db";
import { storage } from "../storage";
import { requireAuth, optionalAuth, requireRole, generateToken, type AuthRequest } from "../middleware/auth";
import {
  contentTypeFromKey,
  getMediaSize,
  getMediaStream,
  isManagedMediaKey,
  isStorageConfigured,
  MEDIA_FOLDERS,
  uploadMedia,
  deleteMedia,
} from "../services/object-storage";
import { generateTattooRecommendations } from "../services/ai/recommendations";
import { setupMessageWebSocket, broadcastNewMessage } from "../services/websocket";
import { setupLiveWebSocket } from "../services/websocket-live";
import { startStoryCleanupScheduler } from "../services/story-cleanup";
import { getPersonalizedFeed, getTrendingPosts, getFeaturedPosts, getForYouRecommendations } from "../services/feed-algorithm";
import * as validation from "../utils/validation";
import { flags } from "../config/flags";
import { tagTattooImage } from "../services/ai/vision";
import { embedPost, isVoyageEnabled } from "../services/ai/embeddings";
import { embed } from "../services/ai/index";
import { startDigestScheduler } from "../services/digest";
import { initDatabase } from "../db-init";
import { isDemoLoginEnabled, isDemoLoginRoleAllowed } from "../config/demo-mode";
import { sendEmailChangeVerificationEmail, sendPasswordResetEmail } from "../services/password-reset-email";

// Strip password hash before sending user objects to clients
function safeUser<T extends { hashedPassword?: unknown }>(user: T): Omit<T, "hashedPassword"> {
  const { hashedPassword: _omit, ...safe } = user;
  return safe;
}

function publicUser(user: schema.User) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    bannerImageUrl: user.bannerImageUrl,
    website: user.website,
    instagram: user.instagram,
    tiktok: user.tiktok,
    twitter: user.twitter,
    location: user.location,
    isVerified: user.isVerified,
    verificationStatus: user.verificationStatus,
    createdAt: user.createdAt,
  };
}

function pipeMediaStream(stream: Readable, res: import("express").Response) {
  stream.once("error", (error: unknown) => {
    if (res.headersSent) {
      res.destroy(error instanceof Error ? error : undefined);
      return;
    }

    if (error instanceof Error && /not found/i.test(error.message)) {
      res.status(404).end();
      return;
    }

    console.error("[media] Failed to stream object:", error);
    res.status(500).end();
  });
  stream.pipe(res);
  return res;
}

// Safe error responder: surfaces Zod validation messages (400) but returns a
// generic message for all other errors so internal details never reach clients.
function sendError(res: any, error: any): void {
  if (error?.name === "ZodError") {
    const msg = error.issues?.[0]?.message ?? error.errors?.[0]?.message ?? "Validation failed";
    res.status(400).json({ message: msg });
  } else {
    console.error("[route-error]", error);
    res.status(500).json({ message: "An unexpected error occurred" });
  }
}

function getCanonicalAppUrl(): string {
  const configuredUrl = process.env.APP_URL;
  const developmentUrl =
    process.env.NODE_ENV !== "production" && process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : undefined;
  const candidate = configuredUrl || developmentUrl;

  if (!candidate) {
    throw new Error("APP_URL must be configured for emailed security links.");
  }

  const appUrl = new URL(candidate);
  const isDevelopmentLocalhost =
    process.env.NODE_ENV !== "production" &&
    appUrl.protocol === "http:" &&
    (appUrl.hostname === "localhost" || appUrl.hostname === "127.0.0.1");
  if (appUrl.protocol !== "https:" && !isDevelopmentLocalhost) {
    throw new Error("APP_URL must use HTTPS.");
  }
  if (appUrl.username || appUrl.password || appUrl.search || appUrl.hash) {
    throw new Error("APP_URL must be a clean public origin without credentials, query, or fragment.");
  }

  appUrl.pathname = appUrl.pathname.replace(/\/+$/, "");
  return appUrl.toString().replace(/\/$/, "");
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
  // Relax the limit in development/test so repeated test runs don't exhaust
  // the bucket. In production the tight limit (20) still applies.
  max: process.env.NODE_ENV === "production" ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later." },
});

const emailChangeIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many email change requests. Please try again later." },
});

const emailChangeAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 5 : 100,
  keyGenerator: (req: AuthRequest) => req.userId || "unauthenticated",
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many email change requests. Please try again later." },
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const isTestEnvironment = process.env.NODE_ENV === "test";

  // Setup WebSockets
  if (!isTestEnvironment) {
    setupMessageWebSocket(httpServer);
    setupLiveWebSocket(httpServer);
  }

  // Initialise DB extensions & AI infrastructure
  await initDatabase();

  // Start background jobs
  if (!isTestEnvironment) {
    startStoryCleanupScheduler();
    if (flags.aiDigest) startDigestScheduler();
  }

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
      if (
        error?.code === "23505" &&
        ["users_email_unique", "users_email_lower_unique_idx"].includes(error?.constraint)
      ) {
        return res.status(400).json({ message: "Email already registered" });
      }
      if (error?.code === "23505" && error?.constraint === "users_username_unique") {
        return res.status(400).json({ message: "Username already taken" });
      }
      sendError(res, error);
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

      if (user.isBanned) {
        return res.status(403).json({ message: "Your account has been suspended" });
      }

      const token = generateToken(user.id);
      res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, isVerified: user.isVerified, verificationStatus: user.verificationStatus } });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    const genericResponse = {
      message: "If an account exists for that email, a password reset link is on its way.",
    };

    try {
      const { email } = validation.forgotPasswordSchema.parse(req.body);
      const normalizedEmail = email.trim().toLowerCase();
      const result = await pool.query<{ id: string; email: string; is_banned: boolean }>(
        `SELECT id, email, is_banned
         FROM users
         WHERE LOWER(email) = $1
         LIMIT 1`,
        [normalizedEmail],
      );
      const user = result.rows[0];

      if (!user || user.is_banned) {
        return res.json(genericResponse);
      }

      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      await pool.query(
        `DELETE FROM password_reset_tokens
         WHERE user_id = $1 OR expires_at <= NOW()`,
        [user.id],
      );
      await pool.query(
        `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
        [tokenHash, user.id],
      );

      const baseUrl = getCanonicalAppUrl();
      const resetUrl = `${baseUrl}/auth?mode=reset&token=${encodeURIComponent(rawToken)}`;

      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (emailError) {
        await pool.query(
          "DELETE FROM password_reset_tokens WHERE token_hash = $1",
          [tokenHash],
        );
        throw emailError;
      }

      return res.json(genericResponse);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    try {
      const { token, password } = validation.resetPasswordSchema.parse(req.body);
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const hashedPassword = await bcrypt.hash(password, 10);
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        const tokenResult = await client.query<{ user_id: string }>(
          `SELECT user_id
           FROM password_reset_tokens
           WHERE token_hash = $1
             AND used_at IS NULL
             AND expires_at > NOW()
           FOR UPDATE`,
          [tokenHash],
        );
        const resetToken = tokenResult.rows[0];

        if (!resetToken) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "This password reset link is invalid or has expired." });
        }

        const updatedUser = await client.query(
          `UPDATE users
           SET hashed_password = $1, updated_at = NOW()
           WHERE id = $2 AND is_banned = FALSE
           RETURNING id`,
          [hashedPassword, resetToken.user_id],
        );
        if (updatedUser.rowCount === 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "This password reset link is invalid or has expired." });
        }

        await client.query(
          `UPDATE password_reset_tokens
           SET used_at = NOW()
           WHERE user_id = $1 AND used_at IS NULL`,
          [resetToken.user_id],
        );
        await client.query("COMMIT");
        return res.json({ message: "Your password has been reset. You can now sign in." });
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post(
    "/api/auth/request-email-change",
    emailChangeIpLimiter,
    requireAuth,
    emailChangeAccountLimiter,
    async (req: AuthRequest, res) => {
    try {
      const { email: newEmail } = validation.requestEmailChangeSchema.parse(req.body);
      const client = await pool.connect();
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");

      try {
        await client.query("BEGIN");

        const currentUserResult = await client.query<{ id: string; email: string }>(
          `SELECT id, email
           FROM users
           WHERE id = $1 AND is_banned = FALSE AND deleted_at IS NULL
           FOR UPDATE`,
          [req.userId],
        );
        const currentUser = currentUserResult.rows[0];
        if (!currentUser) {
          await client.query("ROLLBACK");
          return res.status(404).json({ message: "User not found" });
        }

        if (currentUser.email.toLowerCase() === newEmail) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "That is already your current email address." });
        }

        const existingUserResult = await client.query<{ id: string }>(
          `SELECT id
           FROM users
           WHERE LOWER(email) = $1
           LIMIT 1`,
          [newEmail],
        );
        if (existingUserResult.rows[0]) {
          await client.query("ROLLBACK");
          return res.status(409).json({ message: "That email address is already in use." });
        }

        // Locking the user row makes repeat requests deterministic: only the
        // latest committed request remains pending for this account.
        await client.query(
          `DELETE FROM email_change_tokens
           WHERE user_id = $1 OR expires_at <= NOW()`,
          [req.userId],
        );
        await client.query(
          `INSERT INTO email_change_tokens (token_hash, user_id, new_email, expires_at)
           VALUES ($1, $2, $3, NOW() + INTERVAL '30 minutes')`,
          [tokenHash, req.userId, newEmail],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }

      const baseUrl = getCanonicalAppUrl();
      const verificationUrl = `${baseUrl}/verify-email-change?token=${encodeURIComponent(rawToken)}`;

      try {
        await sendEmailChangeVerificationEmail(newEmail, verificationUrl);
      } catch (emailError) {
        await pool.query("DELETE FROM email_change_tokens WHERE token_hash = $1", [tokenHash]);
        console.error("[email-change] Verification email delivery failed", {
          error: emailError instanceof Error ? emailError.message : "Unknown email delivery error",
        });
        return res.status(502).json({
          message: "We could not send the verification email. Please try again.",
        });
      }

      return res.json({
        message: "A verification link has been sent to your new email address.",
        email: newEmail,
        expiresInMinutes: 30,
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/auth/email-change-status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const pendingResult = await pool.query<{ new_email: string; expires_at: Date }>(
        `SELECT new_email, expires_at
         FROM email_change_tokens
         WHERE user_id = $1
           AND used_at IS NULL
           AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [req.userId],
      );
      const pending = pendingResult.rows[0];
      return res.json({
        pending: pending
          ? { email: pending.new_email, expiresAt: pending.expires_at }
          : null,
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/confirm-email-change", async (req, res) => {
    try {
      const { token } = validation.confirmEmailChangeSchema.parse(req.body);
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        const tokenResult = await client.query<{
          user_id: string;
          new_email: string;
          used_at: Date | null;
          expires_at: Date;
        }>(
          `SELECT user_id, new_email, used_at, expires_at
           FROM email_change_tokens
           WHERE token_hash = $1
           FOR UPDATE`,
          [tokenHash],
        );
        const emailChange = tokenResult.rows[0];

        if (
          !emailChange ||
          emailChange.used_at ||
          new Date(emailChange.expires_at).getTime() <= Date.now()
        ) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "This email verification link is invalid or has expired." });
        }

        const userResult = await client.query<{
          id: string;
          is_banned: boolean;
          deleted_at: Date | null;
        }>(
          `SELECT id, is_banned, deleted_at
           FROM users
           WHERE id = $1
           FOR UPDATE`,
          [emailChange.user_id],
        );
        const user = userResult.rows[0];
        if (!user || user.is_banned || user.deleted_at) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "This email verification link is invalid or has expired." });
        }

        const existingUserResult = await client.query<{ id: string }>(
          `SELECT id
           FROM users
           WHERE LOWER(email) = $1 AND id <> $2
           LIMIT 1`,
          [emailChange.new_email.toLowerCase(), emailChange.user_id],
        );
        if (existingUserResult.rows[0]) {
          await client.query("ROLLBACK");
          return res.status(409).json({ message: "That email address is already in use. Request a new email change link." });
        }

        const updatedUserResult = await client.query<{
          id: string;
          email: string;
          username: string;
          role: string;
          first_name: string | null;
          last_name: string | null;
          bio: string | null;
          website: string | null;
          avatar_url: string | null;
          is_verified: boolean;
          email_verified_at: Date | null;
          verification_status: string | null;
        }>(
          `UPDATE users
           SET email = $1, email_verified_at = NOW(), updated_at = NOW()
           WHERE id = $2
           RETURNING id, email, username, role, first_name, last_name, bio, website,
                     avatar_url, is_verified, email_verified_at, verification_status`,
          [emailChange.new_email, emailChange.user_id],
        );
        const updatedUser = updatedUserResult.rows[0];
        if (!updatedUser) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "This email verification link is invalid or has expired." });
        }

        await client.query(
          `UPDATE email_change_tokens
           SET used_at = NOW()
           WHERE user_id = $1 AND used_at IS NULL`,
          [emailChange.user_id],
        );
        await client.query("COMMIT");

        return res.json({
          message: "Your email address has been updated and verified.",
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            username: updatedUser.username,
            role: updatedUser.role,
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            bio: updatedUser.bio,
            website: updatedUser.website,
            avatarUrl: updatedUser.avatar_url,
            isVerified: updatedUser.is_verified,
            emailVerifiedAt: updatedUser.email_verified_at,
            verificationStatus: updatedUser.verification_status,
          },
        });
      } catch (error: any) {
        await client.query("ROLLBACK").catch(() => undefined);
        if (
          error?.code === "23505" &&
          ["users_email_unique", "users_email_lower_unique_idx"].includes(error?.constraint)
        ) {
          return res.status(409).json({
            message: "That email address is already in use. Request a new email change link.",
          });
        }
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      sendError(res, error);
    }
    },
  );

  app.post("/api/auth/demo-login", authLimiter, async (req, res) => {
    if (!isDemoLoginEnabled()) {
      return res.status(404).json({ message: "Not found" });
    }

    try {
      const { role } = validation.demoLoginSchema.parse(req.body);
      if (!isDemoLoginRoleAllowed(role)) {
        return res.status(404).json({ message: "Not found" });
      }

      const demoEmails = {
        ARTIST: "artist1@tattoorecord.com",
        STUDIO: "studio1@tattoorecord.com",
        ENTHUSIAST: "enthusiast1@tattoorecord.com",
        ADMIN: "admin@tattoorecord.com",
      } as const;
      const user = await storage.getUserByEmail(demoEmails[role]);

      if (!user || user.role !== role) {
        return res.status(404).json({ message: "Demo account not found" });
      }
      if (user.isBanned) {
        return res.status(403).json({ message: "Your account has been suspended" });
      }

      const token = generateToken(user.id);
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          verificationStatus: user.verificationStatus,
        },
      });
    } catch (error: any) {
      sendError(res, error);
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

  app.get("/api/users/:id", optionalAuth, async (req: AuthRequest, res) => {
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
      res.json(req.userId === user.id ? safeUser(user) : publicUser(user));
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
      sendError(res, error);
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
          payload: { actorId: req.userId } as any,
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

  app.get("/api/posts/:id", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      // Enforce visibility: FOLLOWERS-only posts require authentication and a follow relationship.
      // optionalAuth has already verified the token and enforced ban/deleted status; if req.userId
      // is not set here the caller is unauthenticated (or had an invalid/banned token).
      if (post.post?.visibility === "FOLLOWERS") {
        if (!req.userId) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const isAuthor = post.post.authorId === req.userId;
        const isAdmin = req.userRole === "ADMIN";
        if (!isAuthor && !isAdmin) {
          const isFollower = await storage.isFollowing(req.userId, post.post.authorId);
          if (!isFollower) {
            return res.status(403).json({ message: "This post is only visible to followers" });
          }
        }
      }

      let isLiked = false;
      let isSaved = false;
      if (req.userId) {
        const [likedRows, savedRows] = await Promise.all([
          db
            .select({ id: schema.postLikes.id })
            .from(schema.postLikes)
            .where(and(eq(schema.postLikes.postId, req.params.id), eq(schema.postLikes.userId, req.userId)))
            .limit(1),
          db
            .select({ id: schema.savedPosts.id })
            .from(schema.savedPosts)
            .where(and(eq(schema.savedPosts.postId, req.params.id), eq(schema.savedPosts.userId, req.userId)))
            .limit(1),
        ]);
        isLiked = likedRows.length > 0;
        isSaved = savedRows.length > 0;
      }

      res.json({ ...post, isLiked, isSaved });
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
        // Chain embedding after tagging so it includes AI-generated styles/subjects
        tagTattooImage(imageMedia.url)
          .then(async (tags) => {
            if (tags) {
              await storage.updatePostTags(post.id, {
                aiTags: tags,
                styles: tags.styles,
                subjects: tags.subjects,
              });
            }
            if (flags.aiSemanticSearch && isVoyageEnabled()) {
              const vec = await embedPost({
                caption: post.caption,
                styles: tags?.styles ?? (post.styles as any),
                subjects: tags?.subjects,
              });
              await storage.updatePostEmbedding(post.id, vec);
            }
          })
          .catch((err) => console.error("[ai-tag]", err));
      } else if (flags.aiSemanticSearch && isVoyageEnabled()) {
        // No autotag — embed with whatever caption/styles the post already has
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
      sendError(res, error);
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
          payload: { actorId: req.userId, postId: req.params.id } as any,
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

  app.patch("/api/posts/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { caption } = validation.updatePostCaptionSchema.parse(req.body);
      const result = await storage.getPost(req.params.id);
      if (!result) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (result.post.authorId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to update this post" });
      }
      if (!caption && (!result.post.media || result.post.media.length === 0)) {
        return res.status(400).json({ message: "A post without media must have a caption" });
      }

      const updatedPost = await storage.updatePostCaption(req.params.id, caption || null);
      res.json(updatedPost);
    } catch (error: any) {
      sendError(res, error);
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
            payload: { actorId: req.userId, postId: req.params.postId, commentId: comment.id } as any,
          }).catch((e) => console.error("notification failed:", e));
        }
      }).catch(() => {});
      res.json(comment);
    } catch (error: any) {
      sendError(res, error);
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
      res.status(500).json({ message: "Internal server error" });
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
      sendError(res, error);
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
      res.status(500).json({ message: "Internal server error" });
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
      sendError(res, error);
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
      if (withUserId === req.userId) {
        return res.status(400).json({ message: "You cannot message yourself" });
      }

      const otherUser = await storage.getUser(withUserId);
      if (!otherUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const conversation = await storage.getOrCreateConversation([req.userId!, withUserId]);
      const messages = await storage.getMessages(conversation.id, 50);
      res.json({ conversation, messages, otherUser: publicUser(otherUser) });
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
      res.status(500).json({ message: "Internal server error" });
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
      const validated = validation.updatePortfolioItemSchema.parse(req.body);
      await storage.updatePortfolioItem(req.params.id, validated);
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
      sendError(res, error);
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
      sendError(res, error);
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
      sendError(res, error);
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
      if (error?.status === 409 || error?.code === "23505") {
        return res.status(409).json({ message: "You have already applied to this job" });
      }
      console.error("[job apply]", error);
      res.status(500).json({ message: "An unexpected error occurred" });
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
      sendError(res, error);
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
      let validated: ReturnType<typeof validation.updateFlashSaleSchema.parse>;
      try {
        validated = validation.updateFlashSaleSchema.parse(req.body);
      } catch (err: any) {
        return res.status(400).json({ message: err.errors?.[0]?.message || "Validation failed" });
      }
      // Re-check flashPrice < originalPrice by merging partial values with the stored sale,
      // so a partial update cannot set flashPriceCents >= the persisted originalPriceCents.
      const storedSale = flashSale as any;
      const mergedFlash = validated.flashPriceCents ?? storedSale.flashPriceCents;
      const mergedOriginal = validated.originalPriceCents ?? storedSale.originalPriceCents;
      if (mergedFlash >= mergedOriginal) {
        return res.status(400).json({ message: "Flash price must be less than original price" });
      }
      const { expiresAt, ...flashRest } = validated;
      const updated = await storage.updateFlashSale(req.params.id, {
        ...flashRest,
        ...(expiresAt !== undefined ? { expiresAt: new Date(expiresAt) } : {}),
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Booking Routes
  // NOTE: This endpoint intentionally returns ALL booking statuses (including CANCELLED)
  // when no `status` query param is provided. The notifications page relies on this to
  // resolve booking titles for cancellation notifications — if CANCELLED bookings were
  // excluded by default, the title lookup would fail and fall back to "your booking".
  // Do not add a default status filter here without updating that lookup.
  app.get("/api/bookings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const isAdmin = req.userRole === "ADMIN";
      const filters: { artistId?: string; clientId?: string; status?: string; callerId?: string } = {
        artistId: req.query.artistId as string | undefined,
        clientId: req.query.clientId as string | undefined,
        status: req.query.status as string | undefined
      };
      // Non-admins may only see bookings they are party to.
      if (!isAdmin) {
        filters.callerId = req.userId!;
      }
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
      const isAdmin = req.userRole === "ADMIN";
      if (!isAdmin && booking.artistId !== req.userId && booking.clientId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to view this booking" });
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
      // Parse through the safe update schema — strips paymentStatus, totalPriceCents, etc.
      let validated: ReturnType<typeof validation.updateBookingSchema.parse>;
      try {
        validated = validation.updateBookingSchema.parse(req.body);
      } catch (err: any) {
        return res.status(400).json({ message: err.errors?.[0]?.message || "Validation failed" });
      }
      const { status, ...rest } = validated;
      // Enforce role-based status transition rules
      if (status !== undefined) {
        const isArtist = booking.artistId === req.userId;
        const currentStatus = booking.status as string;
        // Statuses only the artist may set
        const artistOnlyStatuses = new Set(["APPROVED", "REJECTED", "COMPLETED"]);
        // Valid transitions keyed by current status — artists only
        const artistTransitions: Record<string, Set<string>> = {
          PENDING:   new Set(["APPROVED", "REJECTED", "CANCELLED"]),
          APPROVED:  new Set(["COMPLETED", "CANCELLED"]),
          REJECTED:  new Set([]),
          COMPLETED: new Set([]),
          CANCELLED: new Set([]),
        };
        // Valid transitions for clients
        const clientTransitions: Record<string, Set<string>> = {
          PENDING:   new Set(["CANCELLED"]),
          APPROVED:  new Set([]),
          REJECTED:  new Set([]),
          COMPLETED: new Set([]),
          CANCELLED: new Set([]),
        };
        // Reject if client tries to set an artist-only status
        if (!isArtist && artistOnlyStatuses.has(status)) {
          return res.status(403).json({ message: "Not authorized to set this booking status" });
        }
        // Reject if the transition is not in the allowed set for the caller's role
        const allowed = isArtist
          ? (artistTransitions[currentStatus] ?? new Set())
          : (clientTransitions[currentStatus] ?? new Set());
        if (!allowed.has(status)) {
          return res.status(403).json({ message: `Cannot transition booking from ${currentStatus} to ${status}` });
        }
      }
      const { scheduledAt, ...restWithoutDate } = rest;
      const bookingUpdate = {
        ...restWithoutDate,
        ...(scheduledAt !== undefined ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(status !== undefined ? { status } : {}),
      };
      const updated = await storage.updateBooking(req.params.id, bookingUpdate);
      // Notify the client when their booking is approved
      if (status === "APPROVED") {
        storage.createNotification({
          userId: booking.clientId,
          type: "APPROVAL",
          payload: { actorId: req.userId, bookingId: booking.id, bookingTitle: booking.title } as any,
        }).catch((e) => console.error("[approval notification]", e));
      }
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
      // Enforce the same role-based transition policy as PUT:
      // cancellation via DELETE is equivalent to setting status → CANCELLED.
      // Clients may only cancel PENDING bookings; artists may cancel PENDING or APPROVED.
      const isArtist = booking.artistId === req.userId;
      const currentStatus = booking.status as string;
      const cancellableByClient = new Set(["PENDING"]);
      const cancellableByArtist = new Set(["PENDING", "APPROVED"]);
      const cancellable = isArtist ? cancellableByArtist : cancellableByClient;
      if (!cancellable.has(currentStatus)) {
        return res.status(403).json({
          message: `Cannot cancel a booking that is already ${currentStatus}`,
        });
      }
      await storage.deleteBooking(req.params.id);
      res.json({ message: "Booking cancelled" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Client requests cancellation of an APPROVED booking
  app.post("/api/bookings/:id/cancellation-request", requireAuth, async (req: AuthRequest, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      // Only the client may request cancellation
      if (booking.clientId !== req.userId) {
        return res.status(403).json({ message: "Only the client can request a cancellation" });
      }
      // Only allowed on APPROVED bookings
      if (booking.status !== "APPROVED") {
        return res.status(400).json({ message: "Cancellation requests can only be made on approved bookings" });
      }
      // Prevent duplicate requests
      if (booking.cancellationRequested) {
        return res.status(409).json({ message: "A cancellation request is already pending for this booking" });
      }
      // Mark the booking as having a pending cancellation request
      await storage.updateBooking(req.params.id, { cancellationRequested: true });
      // Notify the artist
      storage.createNotification({
        userId: booking.artistId,
        type: "CANCELLATION_REQUEST",
        payload: { bookingId: booking.id, clientId: req.userId, bookingTitle: booking.title } as any,
      }).catch((e) => console.error("[cancellation-request notification]", e));
      res.json({ message: "Cancellation request sent to the artist" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Artist responds to a cancellation request
  app.post("/api/bookings/:id/cancellation-response", requireAuth, async (req: AuthRequest, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      // Only the artist may respond
      if (booking.artistId !== req.userId) {
        return res.status(403).json({ message: "Only the artist can respond to a cancellation request" });
      }
      if (!booking.cancellationRequested) {
        return res.status(400).json({ message: "No cancellation request pending for this booking" });
      }
      const { approve } = req.body;
      if (typeof approve !== "boolean") {
        return res.status(400).json({ message: "approve (boolean) is required" });
      }
      if (approve) {
        // Approve: cancel the booking
        await storage.updateBooking(req.params.id, { status: "CANCELLED", cancellationRequested: false });
        storage.createNotification({
          userId: booking.clientId,
          type: "CANCELLATION_APPROVED",
          payload: { bookingId: booking.id, artistId: req.userId, bookingTitle: booking.title } as any,
        }).catch((e) => console.error("[cancellation-approved notification]", e));
        res.json({ message: "Cancellation approved" });
      } else {
        // Reject: clear the request flag
        await storage.updateBooking(req.params.id, { cancellationRequested: false });
        storage.createNotification({
          userId: booking.clientId,
          type: "CANCELLATION_REJECTED",
          payload: { bookingId: booking.id, artistId: req.userId, bookingTitle: booking.title } as any,
        }).catch((e) => console.error("[cancellation-rejected notification]", e));
        res.json({ message: "Cancellation request rejected" });
      }
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
      sendError(res, error);
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
  app.get("/api/upload/status", requireAuth, (_req: AuthRequest, res) => {
    res.json({ available: isStorageConfigured() });
  });

  app.post("/api/upload", requireAuth, (req: AuthRequest, res, next) => {
    if (!isStorageConfigured()) {
      return res.status(503).json({ message: "Image uploads are temporarily unavailable." });
    }
    upload.single("file")(req as any, res as any, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ message: "File is too large. Maximum upload size is 50 MB." });
        }
        return res.status(400).json({ message: "Invalid file upload." });
      }
      if (error) return next(error);
      next();
    });
  }, async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
        return res.status(400).json({ message: `Unsupported file type: ${req.file.mimetype}` });
      }

      const folder = req.body.folder || "general";
      if (!MEDIA_FOLDERS.includes(folder)) {
        return res.status(400).json({ message: "Unsupported media folder" });
      }

      const result = await uploadMedia(req.file.buffer, folder, req.userId!, req.file.mimetype);
      res.json(result);
    } catch (error: any) {
      console.error("[upload] Media upload failed:", error);
      res.status(502).json({ message: "Image upload failed. Please try again." });
    }
  });

  app.get("/api/media/*key", async (req, res) => {
    const key = Array.isArray(req.params.key) ? req.params.key.join("/") : req.params.key;
    if (!isManagedMediaKey(key) || !isStorageConfigured()) {
      return res.status(404).end();
    }

    try {
      const mediaSize = await getMediaSize(key);
      const rangeHeader = req.headers.range;
      const contentType = contentTypeFromKey(key);
      res.setHeader("Content-Type", contentType);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      if (!rangeHeader) {
        res.setHeader("Content-Length", mediaSize);
        res.status(200);
        return pipeMediaStream(getMediaStream(key), res);
      }

      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
      if (!match || (!match[1] && !match[2])) {
        res.setHeader("Content-Range", `bytes */${mediaSize}`);
        return res.status(416).end();
      }

      let start = match[1] ? Number(match[1]) : Math.max(mediaSize - Number(match[2]), 0);
      let end = match[2] ? Number(match[2]) : mediaSize - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= mediaSize || start > end) {
        res.setHeader("Content-Range", `bytes */${mediaSize}`);
        return res.status(416).end();
      }
      end = Math.min(end, mediaSize - 1);

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${mediaSize}`);
      res.setHeader("Content-Length", end - start + 1);
      return pipeMediaStream(getMediaStream(key, { start, end }), res);
    } catch (error: any) {
      if (error?.statusCode === 404 || /not found/i.test(error?.message || "")) {
        return res.status(404).end();
      }
      console.error("[media] Failed to serve object:", error);
      return res.status(500).end();
    }
  });

  app.delete("/api/upload/*publicId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const publicId = Array.isArray(req.params.publicId)
        ? req.params.publicId.join("/")
        : req.params.publicId;
      if (!isManagedMediaKey(publicId) || !publicId.includes(`/${req.userId}/`)) {
        return res.status(403).json({ message: "Not authorized to delete this resource" });
      }
      await deleteMedia(publicId);
      res.json({ message: "Media deleted" });
    } catch (error: any) {
      if (error?.statusCode === 404 || /not found/i.test(error?.message || "")) {
        return res.status(404).json({ message: "Media not found" });
      }
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
  app.post("/api/studio-approvals", requireAuth, async (req: AuthRequest, res) => {
    try {
      const initiator = await storage.getUser(req.userId!);
      if (!initiator || (initiator.role !== "ARTIST" && initiator.role !== "STUDIO")) {
        return res.status(403).json({ message: "Only artists and studios can create connection requests." });
      }
      const studioId = initiator.role === "ARTIST" ? req.body.studioId : req.userId;
      const artistId = initiator.role === "STUDIO" ? req.body.artistId : req.userId;
      if (typeof studioId !== "string" || typeof artistId !== "string" || studioId === artistId) {
        return res.status(400).json({ message: "A valid artist and studio are required." });
      }
      const counterparty = await storage.getUser(initiator.role === "ARTIST" ? studioId : artistId);
      const expectedRole = initiator.role === "ARTIST" ? "STUDIO" : "ARTIST";
      if (!counterparty || counterparty.role !== expectedRole) {
        return res.status(400).json({ message: `The selected user is not a ${expectedRole.toLowerCase()}.` });
      }
      const validated = validation.insertStudioApprovalRequestSchema.parse({
        studioId,
        artistId,
        initiatedBy: initiator.role,
        status: "PENDING",
        note: req.body.note,
      });
      const request = await storage.createStudioApprovalRequest(validated);
      await storage.createNotification({
        userId: counterparty.id,
        type: "APPROVAL",
        payload: {
          actorId: initiator.id,
          requestId: request.id,
          action: "STUDIO_CONNECTION_REQUEST",
          initiatedBy: initiator.role,
          note: request.note,
          message: initiator.role === "ARTIST"
            ? `${initiator.username} requested to connect with your studio.`
            : `${initiator.username} invited you to connect with their studio.`,
        },
      });
      res.json(request);
    } catch (error: any) {
      if (error?.code === "STUDIO_APPROVAL_ALREADY_CONNECTED") {
        return res.status(409).json({ message: "These accounts are already connected." });
      }
      if (error?.code === "STUDIO_APPROVAL_PENDING_EXISTS" || error?.code === "23505") {
        return res.status(409).json({ message: "A pending connection request already exists." });
      }
      sendError(res, error);
    }
  });

  app.get("/api/studio-approvals", requireAuth, async (req: AuthRequest, res) => {
    try {
      const currentUser = await storage.getUser(req.userId!);
      if (!currentUser || (currentUser.role !== "ARTIST" && currentUser.role !== "STUDIO")) {
        return res.status(403).json({ message: "Not authorized to view connection requests." });
      }
      // Client filters can narrow the result but can never select a different
      // participant's requests.
      const filters: any = currentUser.role === "STUDIO"
        ? { studioId: req.userId }
        : { artistId: req.userId };
      if (req.query.status) {
        filters.status = req.query.status as string;
      }

      const requests = await storage.getStudioApprovalRequests(filters);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/studio-approvals/:id/approve", requireAuth, async (req: AuthRequest, res) => {
    try {
      const approvalReq = await storage.getStudioApprovalRequestById(req.params.id);
      if (!approvalReq) return res.status(404).json({ message: "Request not found" });
      if (approvalReq.status !== "PENDING") return res.status(409).json({ message: "Only pending requests can be approved." });
      const isCounterparty = approvalReq.initiatedBy === "ARTIST"
        ? approvalReq.studioId === req.userId
        : approvalReq.artistId === req.userId;
      if (!isCounterparty) return res.status(403).json({ message: "Not authorized" });
      if (!await storage.updateStudioApprovalStatus(req.params.id, "APPROVED")) {
        return res.status(409).json({ message: "Only pending requests can be approved." });
      }
      await storage.createNotification({
        userId: approvalReq.initiatedBy === "ARTIST" ? approvalReq.artistId : approvalReq.studioId,
        type: "APPROVAL",
        payload: {
          actorId: req.userId,
          requestId: approvalReq.id,
          action: "STUDIO_CONNECTION_APPROVED",
          message: "Your studio connection was approved.",
        },
      });
      res.json({ message: "Request approved" });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.put("/api/studio-approvals/:id/reject", requireAuth, async (req: AuthRequest, res) => {
    try {
      const approvalReq = await storage.getStudioApprovalRequestById(req.params.id);
      if (!approvalReq) return res.status(404).json({ message: "Request not found" });
      if (approvalReq.status !== "PENDING") return res.status(409).json({ message: "Only pending requests can be rejected." });
      const isCounterparty = approvalReq.initiatedBy === "ARTIST"
        ? approvalReq.studioId === req.userId
        : approvalReq.artistId === req.userId;
      if (!isCounterparty) return res.status(403).json({ message: "Not authorized" });
      if (!await storage.updateStudioApprovalStatus(req.params.id, "REJECTED")) {
        return res.status(409).json({ message: "Only pending requests can be rejected." });
      }
      await storage.createNotification({
        userId: approvalReq.initiatedBy === "ARTIST" ? approvalReq.artistId : approvalReq.studioId,
        type: "APPROVAL",
        payload: {
          actorId: req.userId,
          requestId: approvalReq.id,
          action: "STUDIO_CONNECTION_REJECTED",
          message: "Your studio connection was declined.",
        },
      });
      res.json({ message: "Request rejected" });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.delete("/api/studio-approvals/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const approvalReq = await storage.getStudioApprovalRequestById(req.params.id);
      if (!approvalReq) return res.status(404).json({ message: "Connection not found" });
      if (approvalReq.studioId !== req.userId && approvalReq.artistId !== req.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (approvalReq.status !== "APPROVED") {
        return res.status(409).json({ message: "Only approved connections can be removed." });
      }
      if (!await storage.revokeStudioApproval(req.params.id)) {
        return res.status(409).json({ message: "Only approved connections can be removed." });
      }
      res.json({ message: "Connection removed" });
    } catch (error: any) {
      sendError(res, error);
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

  app.get("/api/studios/:studioId/feed", requireAuth, async (req, res) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 60, 1), 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const posts = await storage.getStudioArtistPosts(req.params.studioId, limit, offset);
      res.json(posts);
    } catch (error: any) {
      sendError(res, error);
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
      sendError(res, error);
    }
  });

  app.put("/api/admin/users/:id/reject", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.rejectUser(req.params.id);
      res.json({ message: "User rejected successfully" });
    } catch (error: any) {
      sendError(res, error);
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
      sendError(res, error);
    }
  });

  // Admin - Ban/Unban user
  app.put("/api/admin/users/:id/ban", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.banUser(req.params.id);
      res.json({ message: "User banned successfully" });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.put("/api/admin/users/:id/unban", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.unbanUser(req.params.id);
      res.json({ message: "User unbanned successfully" });
    } catch (error: any) {
      sendError(res, error);
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
      sendError(res, error);
    }
  });

  app.put("/api/admin/posts/:id/feature", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.featurePost(req.params.id);
      res.json({ message: "Post featured successfully" });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.put("/api/admin/posts/:id/unfeature", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.unfeaturePost(req.params.id);
      res.json({ message: "Post unfeatured successfully" });
    } catch (error: any) {
      sendError(res, error);
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
      sendError(res, error);
    }
  });

  app.put("/api/admin/jobs/:id/activate", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.activateJob(req.params.id);
      res.json({ message: "Job activated successfully" });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.put("/api/admin/jobs/:id/deactivate", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.deactivateJob(req.params.id);
      res.json({ message: "Job deactivated successfully" });
    } catch (error: any) {
      sendError(res, error);
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
      sendError(res, error);
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
      sendError(res, error);
    }
  });

  // Admin - Toggle flash sale active status
  app.put("/api/admin/flash-sales/:id/toggle", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.toggleFlashSaleActive(req.params.id);
      res.json({ message: "Flash sale status toggled" });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  // Admin - Update flash sale
  app.put("/api/admin/flash-sales/:id", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const updated = await storage.updateFlashSale(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      sendError(res, error);
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
      sendError(res, error);
    }
  });

  // Admin - Cancel booking (status override)
  app.put("/api/admin/bookings/:id/cancel", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      await storage.cancelBookingAdmin(req.params.id);
      res.json({ message: "Booking cancelled successfully" });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  // Admin - Mark booking complete (status override — always writes COMPLETED, never REJECTED)
  app.put("/api/admin/bookings/:id/complete", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.status !== "APPROVED") {
        return res.status(400).json({ message: "Only APPROVED bookings can be marked complete" });
      }
      await storage.completeBookingAdmin(req.params.id);
      res.json({ message: "Booking marked as complete" });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  // Admin - List recent CSP violation reports
  app.get("/api/admin/csp-violations", requireAuth, requireRole(["ADMIN"]), async (_req: AuthRequest, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, blocked_uri, violated_directive, document_uri, referrer, user_agent, created_at
           FROM csp_violations
          ORDER BY created_at DESC
          LIMIT 200`,
      );
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin - Clear all CSP violation reports
  app.delete("/api/admin/csp-violations", requireAuth, requireRole(["ADMIN"]), async (_req: AuthRequest, res) => {
    try {
      await pool.query("DELETE FROM csp_violations");
      res.json({ message: "All CSP violation reports cleared." });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
