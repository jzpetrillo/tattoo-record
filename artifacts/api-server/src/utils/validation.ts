import { z } from "zod/v4";
import { insertStudioApprovalRequestSchema as _insertStudioApprovalRequestSchema } from "@workspace/db";
import { DEMO_LOGIN_ROLES } from "../config/demo-mode";

export const insertStudioApprovalRequestSchema = _insertStudioApprovalRequestSchema;

const ALLOWED_EXTERNAL_IMAGE_HOSTS = new Set([
  "api.dicebear.com",
  "ui-avatars.com",
  "picsum.photos",
  "fastly.picsum.photos",
  "commondatastorage.googleapis.com",
]);

const ALLOWED_EXTERNAL_VIDEO_HOSTS = new Set([
  "commondatastorage.googleapis.com",
]);

const UNLISTED_MEDIA_DOMAIN_MESSAGE =
  "This media URL is from an unlisted domain and may be blocked by the browser's security policy";

function isAllowedMediaUrl(value: string, type: "image" | "video"): boolean {
  if (value === "" || value.startsWith("/api/media/") || value.startsWith("blob:")) {
    return true;
  }
  if (type === "image" && value.startsWith("data:")) return true;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || (url.port !== "" && url.port !== "443")) return false;
    const allowedHosts = type === "image"
      ? ALLOWED_EXTERNAL_IMAGE_HOSTS
      : ALLOWED_EXTERNAL_VIDEO_HOSTS;
    return allowedHosts.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

const mediaItemSchema = z.object({
  publicId: z.string(),
  url: z.string(),
  type: z.enum(["image", "video", "IMAGE", "VIDEO"]),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
}).superRefine((item, ctx) => {
  const type = item.type.toLowerCase() as "image" | "video";
  if (!isAllowedMediaUrl(item.url, type)) {
    ctx.addIssue({
      code: "custom",
      path: ["url"],
      message: UNLISTED_MEDIA_DOMAIN_MESSAGE,
    });
  }
});

const portfolioMediaItemSchema = z.object({
  publicId: z.string().optional(),
  url: z.string(),
  type: z.enum(["image", "video", "IMAGE", "VIDEO"]),
  width: z.number().optional(),
  height: z.number().optional(),
}).superRefine((item, ctx) => {
  const type = item.type.toLowerCase() as "image" | "video";
  if (!isAllowedMediaUrl(item.url, type)) {
    ctx.addIssue({
      code: "custom",
      path: ["url"],
      message: UNLISTED_MEDIA_DOMAIN_MESSAGE,
    });
  }
}).transform((item) => ({
  ...item,
  publicId: item.publicId ?? item.url,
}));

const compactMediaItemSchema = z.object({
  publicId: z.string(),
  url: z.string(),
  type: z.enum(["image", "video", "IMAGE", "VIDEO"]),
}).superRefine((item, ctx) => {
  const type = item.type.toLowerCase() as "image" | "video";
  if (!isAllowedMediaUrl(item.url, type)) {
    ctx.addIssue({
      code: "custom",
      path: ["url"],
      message: UNLISTED_MEDIA_DOMAIN_MESSAGE,
    });
  }
});

const imageUrlSchema = z.string().refine((value) => isAllowedMediaUrl(value, "image"), {
  message: UNLISTED_MEDIA_DOMAIN_MESSAGE,
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").transform((email) => email.toLowerCase()),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address").transform((email) => email.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid or expired reset link"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const requestEmailChangeSchema = z.object({
  email: z.string().trim().email("Invalid email address").transform((email) => email.toLowerCase()),
});

export const confirmEmailChangeSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid or expired email verification link"),
});

export const demoLoginSchema = z.object({
  role: z.enum(DEMO_LOGIN_ROLES),
});

export const registerSchema = z.object({
  email: z.string().trim().email("Invalid email address").transform((email) => email.toLowerCase()),
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ARTIST", "STUDIO", "ENTHUSIAST"]).default("ENTHUSIAST"),
});

export const createPostSchema = z.object({
  taggedAccountIds: z.array(z.string().uuid()).max(10, "You can tag up to 10 artists or studios").default([])
    .refine((ids) => new Set(ids).size === ids.length, "An account can only be tagged once"),
  type: z.enum(["POST", "REEL", "STORY"]).default("POST"),
  caption: z.string().optional(),
  media: z.array(mediaItemSchema).optional().default([]),
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

export const updatePostCaptionSchema = z.object({
  caption: z.string().max(5000, "Caption must be 5,000 characters or fewer").transform((caption) => caption.trim()),
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
  media: z.array(compactMediaItemSchema).optional(),
  styles: z.array(z.string()).optional(),
}).refine(d => d.flashPriceCents < d.originalPriceCents, {
  message: "Flash price must be less than original price",
  path: ["flashPriceCents"],
});

export const createBookingSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  artistId: z.string().uuid("Invalid artist ID"),
  scheduledAt: z.string().refine(v => new Date(v) > new Date(), { message: "Appointment must be in the future" }),
  durationMinutes: z.number().int().positive().default(120),
  totalPriceCents: z.number().int().nonnegative().optional(),
  depositCents: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  tattooStyle: z.string().optional(),
  tattooSize: z.string().optional(),
  flashSaleId: z.string().uuid().optional(),
  referenceImages: z.array(z.object({ publicId: z.string(), url: z.string() })).optional(),
  reminderPreference: z.enum(["DAY_BEFORE", "WEEK_BEFORE", "NONE", "BOTH"]).optional(),
}).refine(d => d.depositCents == null || d.totalPriceCents == null || d.depositCents <= d.totalPriceCents, {
  message: "Deposit cannot exceed total price",
  path: ["depositCents"],
});

// Only the fields a booking party is allowed to update via PUT /api/bookings/:id.
// Payment fields (paymentStatus, totalPriceCents, depositCents) are intentionally
// excluded — use the dedicated mark-deposit-paid / mark-fully-paid endpoints.
export const updateBookingSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  scheduledAt: z.string().refine(v => new Date(v) > new Date(), { message: "Appointment must be in the future" }).optional(),
  durationMinutes: z.number().int().positive().optional(),
  referenceImages: z.array(z.object({ publicId: z.string(), url: z.string() })).optional(),
  notes: z.string().optional(),
  reminderPreference: z.enum(["DAY_BEFORE", "WEEK_BEFORE", "NONE", "BOTH"]).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"]).optional(),
});

// Fields an artist may update on their own portfolio item.
// Matches actual portfolio_items columns; excludes ownership (artistId).
export const portfolioItemSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  media: z.array(portfolioMediaItemSchema).optional(),
  categories: z.array(z.string()).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const createPortfolioItemSchema = portfolioItemSchema.extend({
  title: z.string().min(1).max(255),
});

export const updatePortfolioItemSchema = portfolioItemSchema;

// Fields an artist may update on their own flash sale.
// Excludes ownership (artistId), counter (bookedSlots), and isActive toggle
// (which has its own admin endpoint).
export const updateFlashSaleSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  originalPriceCents: z.number().int().positive().optional(),
  flashPriceCents: z.number().int().positive().optional(),
  availableSlots: z.number().int().min(1).optional(),
  expiresAt: z.string().refine(v => new Date(v) > new Date(), { message: "Expiry must be in the future" }).optional(),
  media: z.array(compactMediaItemSchema).optional(),
  styles: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.flashPriceCents !== undefined && data.originalPriceCents !== undefined) {
    if (data.flashPriceCents >= data.originalPriceCents) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Flash price must be less than original price", path: ["flashPriceCents"] });
    }
  }
});

// Livestream events were previously created and updated from raw req.body, which
// let a client set hostId, status, viewer counts and timestamps directly — on
// update that meant the host could reassign the event to another user. Only the
// author-supplied fields belong here; everything else is server-owned.
export const createLivestreamEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  scheduledFor: z.coerce.date().optional(),
});

export const updateLivestreamEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(255).optional(),
  scheduledFor: z.coerce.date().optional(),
});

export const jobApplySchema = z.object({
  coverLetter: z.string().min(10, "Cover letter must be at least 10 characters").max(5000),
  portfolioSnapshot: z.array(z.record(z.string(), z.unknown())).default([]),
});

export const aiRecommendationSchema = z.object({
  description: z.string().optional(),
  style: z.string().optional(),
  placement: z.string().optional(),
  size: z.string().optional()
});

// Whitelist of fields a user is allowed to update on their own profile.
// Critical fields (role, isVerified, verificationStatus, isBanned, etc.) are excluded.
const managedMediaUrlSchema = imageUrlSchema;

export const updateUserSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  avatarUrl: managedMediaUrlSchema.optional(),
  bannerImageUrl: managedMediaUrlSchema.optional(),
  location: z.object({
    city: z.string().optional(),
    country: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
  website: z.string().url().optional().or(z.literal("")),
  socialHandles: z.record(z.string(), z.string()).optional(),
});
