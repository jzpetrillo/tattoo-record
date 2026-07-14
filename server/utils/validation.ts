import { z } from "zod";
import { insertStudioApprovalRequestSchema as _insertStudioApprovalRequestSchema } from "@shared/schema";

export const insertStudioApprovalRequestSchema = _insertStudioApprovalRequestSchema;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ARTIST", "STUDIO", "ENTHUSIAST"]).default("ENTHUSIAST"),
});

export const createPostSchema = z.object({
  caption: z.string().optional(),
  media: z.array(z.object({
    publicId: z.string(),
    url: z.string(),
    type: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional()
  })).optional().default([]),
  location: z.object({
    city: z.string().optional(),
    country: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional()
  }).optional(),
  visibility: z.enum(["PUBLIC", "FOLLOWERS"]).default("PUBLIC")
}).refine((data) => {
  // Trim and check caption
  const hasCaption = data.caption && data.caption.trim().length > 0;
  const hasMedia = data.media && data.media.length > 0;
  return hasCaption || hasMedia;
}, {
  message: "Post must have either a non-empty caption or media",
  path: ["caption"]
});

export const createCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(1000)
});

export const createMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().optional(),
  media: z.object({
    publicId: z.string(),
    url: z.string(),
    type: z.string()
  }).optional(),
  replyToId: z.string().uuid().optional()
});

export const createStorySchema = z.object({
  media: z.object({
    publicId: z.string(),
    url: z.string(),
    type: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional()
  })
});

export const createJobSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "APPRENTICESHIP"]),
  description: z.string().min(1),
  location: z.string().max(255).optional(),
  salaryMinCents: z.number().int().positive().optional(),
  salaryMaxCents: z.number().int().positive().optional()
});

export const createFlashSaleSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  originalPriceCents: z.number().int().positive("Original price must be positive"),
  flashPriceCents: z.number().int().positive("Flash price must be positive"),
  availableSlots: z.number().int().min(1, "Must have at least 1 slot"),
  expiresAt: z.string().refine(v => new Date(v) > new Date(), { message: "Expiry must be in the future" }),
  media: z.array(z.object({ publicId: z.string(), url: z.string(), type: z.string() })).optional(),
  styles: z.array(z.string()).optional(),
}).refine(d => d.flashPriceCents < d.originalPriceCents, {
  message: "Flash price must be less than original price",
  path: ["flashPriceCents"],
});

export const createBookingSchema = z.object({
  artistId: z.string().uuid("Invalid artist ID"),
  scheduledAt: z.string().refine(v => new Date(v) > new Date(), { message: "Appointment must be in the future" }),
  totalPriceCents: z.number().int().nonnegative().optional(),
  depositCents: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
  tattooStyle: z.string().optional(),
  tattooSize: z.string().optional(),
  flashSaleId: z.string().uuid().optional(),
}).refine(d => d.depositCents == null || d.totalPriceCents == null || d.depositCents <= d.totalPriceCents, {
  message: "Deposit cannot exceed total price",
  path: ["depositCents"],
});

export const jobApplySchema = z.object({
  coverLetter: z.string().min(10, "Cover letter must be at least 10 characters").max(5000),
});

export const aiRecommendationSchema = z.object({
  description: z.string().optional(),
  style: z.string().optional(),
  placement: z.string().optional(),
  size: z.string().optional()
});

// Whitelist of fields a user is allowed to update on their own profile.
// Critical fields (role, isVerified, verificationStatus, isBanned, etc.) are excluded.
export const updateUserSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  bannerUrl: z.string().url().optional().or(z.literal("")),
  location: z.object({
    city: z.string().optional(),
    country: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
  website: z.string().url().optional().or(z.literal("")),
  socialHandles: z.record(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional(),
  hourlyRateCents: z.number().int().nonnegative().optional(),
  address: z.string().max(500).optional(),
});
