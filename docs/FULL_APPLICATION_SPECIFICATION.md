# Tattoo Record — Full Application Specification

**Document version**: 1.0  
**Date**: May 2026  
**Prepared for**: CTO, Product Lead, QA Engineer, Security Reviewer, Operations Team  
**Status**: Production-ready with known limitations documented herein

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [Complete Feature Inventory](#2-complete-feature-inventory)
3. [User Role & Permission Matrix](#3-user-role--permission-matrix)
4. [Full Frontend Architecture](#4-full-frontend-architecture)
5. [Full Backend Architecture](#5-full-backend-architecture)
6. [Complete Database Documentation](#6-complete-database-documentation)
7. [Authentication & Security Review](#7-authentication--security-review)
8. [Stripe & Financial Systems Audit](#8-stripe--financial-systems-audit)
9. [Public Pages & SEO Audit](#9-public-pages--seo-audit)
10. [Third-Party Integrations](#10-third-party-integrations)
11. [Automation & Workflow Systems](#11-automation--workflow-systems)
12. [Full QA & Testing Audit](#12-full-qa--testing-audit)
13. [Performance & Scalability Audit](#13-performance--scalability-audit)
14. [Missing Features / Incomplete Areas](#14-missing-features--incomplete-areas)
15. [Production Readiness Assessment](#15-production-readiness-assessment)
16. [Launch Blockers](#launch-blockers)
17. [Recommended Next 30 Days](#recommended-next-30-days)
18. [Appendix](#16-appendix)

---

# 1. Executive Overview

## What the Application Does

Tattoo Record is a full-stack social community platform purpose-built for the tattoo industry. It connects three distinct user types — tattoo **artists**, tattoo **studios**, and tattoo **enthusiasts** — in a social-media-style environment that also supports professional workflows including booking appointments, posting flash sales, listing and applying for jobs, and watching live streams.

The platform takes visual and UX cues from Instagram: a media-rich feed, stories, reels, profiles with follower counts, a direct messaging system, and an explore/discovery page. On top of the social layer sits a layer of business tooling not found on general social networks: appointment booking with payment status tracking, flash tattoo sales with countdown timers, a job board for studio-to-artist hiring, an AI recommendation engine for tattoo design ideas, and a comprehensive admin panel for content moderation and user verification.

## Primary User Types

| Role | Description |
|------|-------------|
| **ARTIST** | Independent tattoo artist. Posts work, receives bookings, runs flash sales, applies for studio jobs, goes live. Requires admin verification before full feature access. |
| **STUDIO** | Tattoo studio business. Posts work, creates job listings, manages artist affiliation requests, receives bookings. Requires admin verification. |
| **ENTHUSIAST** | Tattoo fan/client. Follows artists, saves posts, requests bookings, engages with content. No verification required. |
| **ADMIN** | Platform operator. Verifies artists/studios, moderates content, manages all users and posts. |

## Core Business Workflows

1. **Content Discovery**: Users browse a personalized feed, trending explore page, and a "For You" algorithmic recommendation rail.
2. **Artist Verification**: Artists/Studios register and wait for admin approval before their verified badge appears.
3. **Booking Flow**: Clients request appointments from verified artists; artists approve/reject; payment status is tracked manually.
4. **Flash Sales**: Artists post time-limited tattoo slots at discounted prices; clients book them directly.
5. **Job Board**: Studios post openings; artists apply with portfolio snapshots.
6. **Live Streaming**: Artists go live; followers watch and react in real time.
7. **AI Tattoo Design**: Users describe their idea to an AI and receive a styled recommendation.

## Main Platform Capabilities

- Social feed with posts, reels, and stories
- Real-time 1:1 and group messaging with read receipts and typing indicators
- Live streaming with reactions and viewer count
- Booking/appointment management with payment status
- Flash tattoo sales with countdown timers and slot management
- Job board with studio-to-artist applications
- Portfolio management for artists
- AI-powered tattoo design recommendations (OpenAI GPT-4o)
- Trending hashtag discovery
- Admin dashboard for verification, moderation, and analytics
- Story highlights (schema-only, frontend incomplete)
- Studio-to-artist affiliation requests

## Current Build Status

| Layer | Status |
|-------|--------|
| Frontend (React/Vite) | ✅ Feature-complete with documented gaps |
| Backend (Express/TypeScript) | ✅ All endpoints functional |
| Database (PostgreSQL/Drizzle) | ✅ Schema deployed, 29 tables |
| Auth (JWT/bcrypt) | ✅ Hardened, rate-limited |
| Media (Cloudinary) | ✅ Upload/delete functional — requires production secrets |
| AI (OpenAI) | ✅ Functional — requires production API key |
| Real-time (WebSocket) | ⚠️ Functional with a critical privacy bug (see §7) |
| Payments | ❌ No payment processor — manual status tracking only |
| Email | ❌ No email integration |
| Helmet/CORS hardening | ⚠️ Missing HTTP security headers |

## Intended Production Architecture

- **Hosting**: Replit (containerized Node.js + Vite SSR serving)
- **Database**: Neon serverless PostgreSQL (connection pooling via `@neondatabase/serverless`)
- **Media**: Cloudinary CDN for all image/video storage
- **Domain**: `.replit.app` subdomain or custom domain
- **Process**: Single Node.js process serving both Express API and Vite-built frontend
- **Real-time**: Two in-process WebSocket servers (path `/ws` for messaging, `/ws/live` for livestreams)

---

# 2. Complete Feature Inventory

## 2.1 Authentication & User Management

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Registration, Login, Session Management |
| **Purpose** | Allow users to create accounts and authenticate |
| **User types** | All roles |
| **Frontend routes** | `/auth` |
| **Backend APIs** | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` |
| **DB tables** | `users` |
| **Status** | ✅ Complete |
| **Known issues** | No email verification step; no password reset flow; JWT stored in localStorage (XSS risk) |
| **Dependencies** | bcrypt, jsonwebtoken, express-rate-limit |

## 2.2 Social Feed

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Personalized Feed, Featured Content, For You Rail |
| **Purpose** | Show relevant posts to authenticated users |
| **User types** | All authenticated |
| **Frontend routes** | `/` |
| **Backend APIs** | `GET /api/posts`, `GET /api/for-you` |
| **DB tables** | `posts`, `follows`, `post_likes`, `saved_posts`, `users` |
| **Status** | ✅ Complete |
| **Known issues** | Feed for new users with 0 follows falls through to trending. `staleTime: Infinity` means feed never auto-refreshes. `document.getElementById` used instead of React Ref for featured scroll |
| **Dependencies** | `feed-algorithm.ts` service |

## 2.3 Post Creation

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Create Post / Reel / Story |
| **Purpose** | Let users publish content (text, images, video) |
| **User types** | All authenticated |
| **Frontend routes** | `/create` → modal overlay |
| **Backend APIs** | `POST /api/posts`, `POST /api/upload` |
| **DB tables** | `posts`, `hashtags`, `post_hashtags` |
| **Status** | ✅ Complete — supports caption-only, media posts, reels, stories |
| **Known issues** | No video thumbnail generation; hashtag parsing from caption is client-side with no deduplication guard |
| **Dependencies** | Cloudinary |

## 2.4 Stories

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Stories (24-hour ephemeral content) |
| **Purpose** | Short-lived media visible for 24 hours |
| **User types** | All authenticated (create); All (view) |
| **Frontend routes** | `/` (StoriesBar component, modal viewer) |
| **Backend APIs** | `POST /api/stories` (via post creation), `GET /api/stories` |
| **DB tables** | `stories`, `story_highlights`, `highlight_stories` |
| **Status** | ⚠️ Partial — creation and viewing work; highlights system (schema + tables exist) has no frontend UI |
| **Known issues** | Story highlights have tables but no API endpoints and no UI. Cleanup scheduler deletes expired stories every 10 minutes (potential orphaned Cloudinary assets if DB delete fails) |
| **Dependencies** | `story-cleanup.ts` scheduler |

## 2.5 Explore / Discovery

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Explore Page — User Discovery + Trending Hashtags |
| **Purpose** | Surface artists, studios, enthusiasts, and trending content |
| **User types** | All authenticated |
| **Frontend routes** | `/explore` |
| **Backend APIs** | `GET /api/users`, `GET /api/hashtags/trending` |
| **DB tables** | `users`, `hashtags`, `post_hashtags` |
| **Status** | ✅ Complete |
| **Known issues** | Style and location filtering is client-side (no server-side query) — will not scale with large user datasets |
| **Dependencies** | None |

## 2.6 Profiles

| Attribute | Detail |
|-----------|--------|
| **Feature name** | User Profiles |
| **Purpose** | Display artist/studio/enthusiast info, portfolio, posts |
| **User types** | All (view); Authenticated (edit own) |
| **Frontend routes** | `/profile`, `/profile/:username`, `/u/:username` |
| **Backend APIs** | `GET /api/users/:id`, `PUT /api/users/me`, `GET /api/posts?authorId=`, `GET /api/users/:id/stats` |
| **DB tables** | `users`, `artist_profiles`, `studio_profiles`, `portfolio_items`, `posts` |
| **Status** | ✅ Complete |
| **Known issues** | `artist_profiles` and `studio_profiles` sub-tables exist but profile page reads/writes to `users` table fields directly. Sub-tables contain `styles`, `rateCents`, `availability`, `yearsExperience` (artist) and `name`, `description`, `services`, `hours`, `paymentMethods` (studio) which are not surfaced in the UI |
| **Dependencies** | None |

## 2.7 Portfolio Management

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Portfolio CRUD |
| **Purpose** | Artists maintain a dedicated gallery of completed work |
| **User types** | ARTIST |
| **Frontend routes** | `/profile` (Portfolio tab) |
| **Backend APIs** | `GET /api/portfolio/:userId`, `POST /api/portfolio`, `PUT /api/portfolio/:id`, `DELETE /api/portfolio/:id` |
| **DB tables** | `portfolio_items` |
| **Status** | ✅ Complete |
| **Known issues** | Portfolio upload requires Cloudinary secrets configured |
| **Dependencies** | Cloudinary |

## 2.8 Follow / Unfollow

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Social Follow System |
| **Purpose** | Users follow each other; drives feed and notifications |
| **User types** | All authenticated |
| **Frontend routes** | Profile page (Follow button), Notifications (Follow back) |
| **Backend APIs** | `POST /api/users/:id/follow`, `POST /api/users/:id/unfollow`, `GET /api/users/:id/is-following`, `GET /api/users/:id/stats` |
| **DB tables** | `follows`, `notifications` |
| **Status** | ✅ Complete |
| **Known issues** | No mutual follow detection on frontend; no "follow back" suggestion logic beyond notifications |
| **Dependencies** | None |

## 2.9 Likes, Comments, Saves

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Post Engagement (Like, Comment, Save) |
| **Purpose** | Core social engagement loop |
| **User types** | All authenticated |
| **Frontend routes** | Feed, Profile, Post detail (via PostCard) |
| **Backend APIs** | `POST/DELETE /api/posts/:id/like`, `GET/POST/DELETE /api/posts/:postId/comments`, `POST/GET/DELETE /api/saved-posts` |
| **DB tables** | `post_likes`, `comments`, `saved_posts`, `posts` (counters) |
| **Status** | ✅ Complete |
| **Known issues** | Like/comment counters are denormalized on `posts` table (updated atomically with SQL expressions — correct approach, but drift possible if queries fail mid-transaction) |
| **Dependencies** | None |

## 2.10 Search

| Attribute | Detail |
|-----------|--------|
| **Feature name** | User Search |
| **Purpose** | Find users by name or username |
| **User types** | All authenticated |
| **Frontend routes** | `/search` |
| **Backend APIs** | `GET /api/search?q=` |
| **DB tables** | `users` |
| **Status** | ✅ Complete |
| **Known issues** | Search covers users only — no post/hashtag/content search |
| **Dependencies** | None |

## 2.11 Direct Messaging

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Real-time Messaging (DM + Group) |
| **Purpose** | 1:1 and group chat with WebSocket real-time delivery |
| **User types** | All authenticated |
| **Frontend routes** | `/messages` |
| **Backend APIs** | `GET /api/conversations`, `POST /api/conversations`, `GET /api/conversations/:id/messages`, `PUT /api/conversations/:id/read`, `POST /api/messages` |
| **DB tables** | `conversations`, `conversation_participants`, `messages` |
| **Status** | ⚠️ Functional with CRITICAL privacy bug |
| **Known issues** | **CRITICAL**: `broadcastToConversation()` in `websocket.ts` broadcasts to ALL connected clients except the sender — does not filter by conversation membership. Any connected user receives messages from all conversations. Group conversations are supported in schema and API but UI defaults to 1:1 only. Voice messages (`voiceUrl` column) have no frontend UI. Message reactions (`reactions` JSONB) have limited UI support. |
| **Dependencies** | WebSocket server on `/ws` |

## 2.12 Notifications

| Attribute | Detail |
|-----------|--------|
| **Feature name** | In-App Notifications |
| **Purpose** | Inform users of follows, likes, comments, approvals |
| **User types** | All authenticated |
| **Frontend routes** | `/notifications` |
| **Backend APIs** | `GET /api/notifications`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all` |
| **DB tables** | `notifications` |
| **Status** | ✅ Complete |
| **Known issues** | Notifications use JSONB `payload` column with an `actorId` field; queried with PostgreSQL `->>` operator (no index on JSON sub-fields). Notification delivery is DB-only — no push notification, no email. |
| **Dependencies** | None |

## 2.13 Bookings

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Appointment Booking System |
| **Purpose** | Clients schedule tattoo sessions with artists |
| **User types** | All authenticated (create); ARTIST (manage) |
| **Frontend routes** | `/bookings` |
| **Backend APIs** | `GET /api/bookings`, `POST /api/bookings`, `PUT /api/bookings/:id`, `DELETE /api/bookings/:id`, `POST /api/bookings/:id/mark-deposit-paid`, `POST /api/bookings/:id/mark-fully-paid` |
| **DB tables** | `bookings`, `flash_sales` |
| **Status** | ⚠️ Partial — core CRUD complete; payment tracking is manual; no real payments |
| **Known issues** | `paymentStatus` values (`UNPAID`, `DEPOSIT_PAID`, `FULLY_PAID`, `REFUNDED`) are set manually by artists with no Stripe integration. No email confirmations sent. `reminderSentAt` column exists but no reminder sending logic is implemented. |
| **Dependencies** | None (Stripe integration absent) |

## 2.14 Flash Sales

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Flash Tattoo Sales |
| **Purpose** | Artists post limited-time discounted slots; clients book them |
| **User types** | ARTIST (create); All authenticated (view/book) |
| **Frontend routes** | `/flash-sales` |
| **Backend APIs** | `GET /api/flash-sales`, `POST /api/flash-sales`, `PUT /api/flash-sales/:id`, `DELETE /api/flash-sales/:id` |
| **DB tables** | `flash_sales`, `bookings` |
| **Status** | ⚠️ Partial — display and booking work; countdown timer does not auto-update; no slot availability push |
| **Known issues** | Countdown timer (`getRemainingTime()`) is computed in render with no `setInterval` — does not tick unless component re-renders. `bookedSlots` counter is incremented in the booking creation path but can theoretically over-book under concurrent requests (no database-level atomic check with `WHERE bookedSlots < availableSlots`). |
| **Dependencies** | None |

## 2.15 Jobs Board

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Studio Job Postings + Artist Applications |
| **Purpose** | Studios recruit artists; artists discover studio opportunities |
| **User types** | STUDIO (post); ARTIST (apply); All (view) |
| **Frontend routes** | `/jobs`, `/jobs/:id` |
| **Backend APIs** | `GET /api/jobs`, `POST /api/jobs`, `PATCH /api/jobs/:id`, `DELETE /api/jobs/:id`, `POST /api/jobs/:id/apply`, `GET /api/jobs/:id/applications` |
| **DB tables** | `job_postings`, `job_applications` |
| **Status** | ✅ Complete |
| **Known issues** | Application management UI (viewing/updating application status) is in admin panel only; artists cannot see application status in their own UI; no notification sent to studio when artist applies |
| **Dependencies** | None |

## 2.16 Live Streaming

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Livestream Events |
| **Purpose** | Artists broadcast live; viewers watch and react |
| **User types** | ARTIST/STUDIO (host); All authenticated (view) |
| **Frontend routes** | `/live-events`, `/live` |
| **Backend APIs** | `GET /api/livestream-events`, `POST /api/livestream-events`, `PUT /api/livestream-events/:id`, `DELETE /api/livestream-events/:id` |
| **DB tables** | `livestream_events`, `livestream_participants`, `live_comments`, `live_reactions` |
| **Status** | ⚠️ Partial — event creation and real-time comments/reactions work; actual video streaming is not implemented (no WebRTC, RTMP, or HLS) |
| **Known issues** | **The platform has no actual video streaming infrastructure**. The feature shows event cards and allows live chat but does not stream video. Viewer count has a race condition in `handleJoin` (`viewerTotal + 1` without atomicity). `livestream_participants`, `live_comments`, `live_reactions` tables are populated but there are no API endpoints to read them (only WebSocket). |
| **Dependencies** | WebSocket server on `/ws/live` |

## 2.17 AI Tattoo Recommendations

| Attribute | Detail |
|-----------|--------|
| **Feature name** | AI Tattoo Design Advisor |
| **Purpose** | Generate personalized tattoo style and design recommendations |
| **User types** | All authenticated |
| **Frontend routes** | `/ai-recommendations` |
| **Backend APIs** | `POST /api/ai/tattoo-recommendations` |
| **DB tables** | None (stateless) |
| **Status** | ✅ Complete (requires `OPENAI_API_KEY`) |
| **Known issues** | Recommendations are not stored — refreshing the page loses results. Falls back gracefully to static message if API key missing. Uses GPT-4o which may be expensive at scale. |
| **Dependencies** | OpenAI API |

## 2.18 Admin Dashboard

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Admin Control Panel |
| **Purpose** | Platform operations: verification, moderation, analytics |
| **User types** | ADMIN only |
| **Frontend routes** | `/admin` |
| **Backend APIs** | All `/api/admin/*` endpoints |
| **DB tables** | All tables (read-only analytics); `users`, `posts`, `job_postings`, `bookings` (writes) |
| **Status** | ✅ Complete |
| **Known issues** | Admin page is client-side guarded (added May 2026) and backend-guarded with `requireRole(["ADMIN"])`. Stats query still iterates all user rows in memory for role breakdown instead of using SQL `GROUP BY`. |
| **Dependencies** | None |

## 2.19 Studio-Artist Affiliation

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Studio Approval / Affiliation Requests |
| **Purpose** | Artists request to affiliate with studios |
| **User types** | ARTIST (request); STUDIO (approve/reject) |
| **Frontend routes** | Profile page (Connection dialog) |
| **Backend APIs** | `POST /api/studios/apply`, `GET /api/studio-approvals`, `PUT /api/studio-approvals/:id/approve`, `PUT /api/studio-approvals/:id/reject` |
| **DB tables** | `studio_approval_requests` |
| **Status** | ⚠️ Partial — API complete; UI is partially integrated via `StudioConnectionDialog` component |
| **Known issues** | N+1 query issue in `getStudioApprovalRequests()` — fetches each artist and studio individually in a loop instead of using a JOIN. |
| **Dependencies** | None |

## 2.20 Saved Posts / Collections

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Bookmark / Saved Posts with Collections |
| **Purpose** | Users organize saved content into named collections |
| **User types** | All authenticated |
| **Frontend routes** | `/saved` |
| **Backend APIs** | `GET /api/saved-posts`, `POST /api/saved-posts`, `DELETE /api/saved-posts/:postId`, `GET /api/saved-posts/collections` |
| **DB tables** | `saved_posts` |
| **Status** | ✅ Complete |
| **Known issues** | Collections are stored as `collectionName` varchar on each row — no dedicated collections table, limiting collection management capabilities |
| **Dependencies** | None |

## 2.21 Trending Hashtags

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Hashtag Analytics |
| **Purpose** | Surface trending tattoo styles and topics |
| **User types** | All authenticated (view) |
| **Frontend routes** | `/explore` |
| **Backend APIs** | `GET /api/hashtags/trending`, `POST /api/hashtags/update-trending` (internal) |
| **DB tables** | `hashtags`, `post_hashtags` |
| **Status** | ✅ Complete |
| **Known issues** | Trending score update uses raw SQL subquery on `post_hashtags`. No scheduled trigger — relies on being called manually or after post creation. No rate-limiting on the update endpoint. |
| **Dependencies** | None |

## 2.22 Reels

| Attribute | Detail |
|-----------|--------|
| **Feature name** | Short-form Video Feed |
| **Purpose** | TikTok-style vertical video scroll |
| **User types** | All authenticated |
| **Frontend routes** | `/reels` |
| **Backend APIs** | `GET /api/posts?type=REEL` |
| **DB tables** | `posts` (type = REEL) |
| **Status** | ⚠️ Partial — grid layout renders video URLs but no in-feed autoplay, no swipe-to-scroll UI |
| **Known issues** | No video player with play/pause controls. No lazy loading. All reels load simultaneously. |
| **Dependencies** | Cloudinary (video storage) |

---

# 3. User Role & Permission Matrix

## Role Overview

| Feature / Action | ADMIN | ARTIST | STUDIO | ENTHUSIAST | Public |
|-----------------|-------|--------|--------|------------|--------|
| Register / Login | ✅ | ✅ | ✅ | ✅ | ✅ |
| View public feed | ✅ | ✅ | ✅ | ✅ | ⚠️ (landing only) |
| Create posts/reels/stories | ✅ | ✅ | ✅ | ✅ | ❌ |
| Like / comment / save | ✅ | ✅ | ✅ | ✅ | ❌ |
| Follow users | ✅ | ✅ | ✅ | ✅ | ❌ |
| View profiles | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit own profile | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage portfolio | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create flash sales | ✅ | ✅ (verified) | ❌ | ❌ | ❌ |
| Create bookings (as client) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve/reject bookings | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| Create job postings | ✅ | ❌ | ✅ | ❌ | ❌ |
| Apply to jobs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Go live / create livestream | ✅ | ✅ | ✅ | ❌ | ❌ |
| Direct messaging | ✅ | ✅ | ✅ | ✅ | ❌ |
| AI recommendations | ✅ | ✅ | ✅ | ✅ | ❌ |
| Studio affiliation request | ❌ | ✅ | ❌ | ❌ | ❌ |
| Approve affiliation requests | ❌ | ❌ | ✅ | ❌ | ❌ |
| Admin dashboard | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve/reject users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete any post | ✅ | ❌ | ❌ | ❌ | ❌ |
| Feature posts | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ban/delete users | ✅ | ❌ | ❌ | ❌ | ❌ |
| View admin stats | ✅ | ❌ | ❌ | ❌ | ❌ |

## Navigation Differences

- **ADMIN**: All nav items + `/admin` link visible
- **ARTIST**: All nav items; Portfolio tab on own profile; Book Now CTA on others' profiles
- **STUDIO**: All nav items; View Jobs CTA on profiles; can post jobs from Jobs page
- **ENTHUSIAST**: All nav items except no special CTAs; cannot manage portfolio
- **Public (unauthenticated)**: Sees only the Tattoo Record landing/splash page at `/`; redirected to `/auth` if attempting protected routes

## Data Visibility

- All posts with `visibility: PUBLIC` are visible to all authenticated users
- Posts with `visibility: FOLLOWERS` are visible only to followers (backend enforced via feed queries)
- `hashedPassword` is stripped from ALL API responses via `safeUser()` helper
- Users cannot read other users' private messages (WebSocket broadcast bug notwithstanding — see §7)
- Booking details are visible only to the artist and client involved

---

# 4. Full Frontend Architecture

## 4.1 Technology Stack

| Technology | Version / Details |
|-----------|-------------------|
| React | 18+ |
| TypeScript | Strict mode |
| Vite | Dev server + production build |
| Wouter | Client-side routing |
| TanStack Query (React Query) | v5 — server state management |
| Zustand | Client state (auth, persisted to localStorage) |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Component library (Radix UI primitives) |
| React Hook Form | Form state management |
| Zod | Schema validation (shared with backend via `@shared/schema`) |
| Lucide React | Icon set |
| Drizzle-Zod | Shared validation schemas between frontend/backend |

## 4.2 Routing Structure (wouter)

All routes defined in `client/src/App.tsx`:

| Path | Component | Guard | Notes |
|------|-----------|-------|-------|
| `/` | `Home` | None | Renders splash for guests, feed for auth |
| `/search` | `Search` | None | Should be protected; currently open |
| `/explore` | `Explore` | None | Should be protected; currently open |
| `/messages` | `Messages` | `ProtectedRoute` | Redirects to `/auth` if not logged in |
| `/notifications` | `Notifications` | `ProtectedRoute` | Redirects to `/auth` |
| `/profile` | `Profile` | None | Own profile |
| `/profile/:username` | `Profile` | None | Public profile view |
| `/u/:username` | `Profile` | None | Alias for profile |
| `/live-events` | `LiveEvents` | None | |
| `/live` | `LiveEvents` | None | Alias |
| `/jobs/:id` | `JobDetail` | None | Single job view |
| `/jobs` | `Jobs` | None | Job board |
| `/create` | `Create` | `ProtectedRoute` | Content creation |
| `/reels` | `Reels` | None | |
| `/saved` | `SavedPosts` | `ProtectedRoute` | |
| `/flash-sales` | `FlashSales` | None | |
| `/bookings` | `Bookings` | `ProtectedRoute` | |
| `/ai-recommendations` | `AIRecommendations` | `ProtectedRoute` | |
| `/auth` | `Auth` | None | Login/register |
| `/admin` | (via `AdminRoute`) | `AdminRoute` | Role-checked component |
| `*` | `NotFound` | None | 404 page |

**Design gap**: `/search`, `/explore`, `/reels`, `/flash-sales`, `/jobs`, `/live-events`, `/live`, and `/jobs/:id` are unauthenticated. Given the platform's nature as a private community, these likely should require login.

## 4.3 State Management

### Auth Store (Zustand + localStorage)
```
Store key: "auth-storage"
State: { user: User | null, token: string | null }
Actions: setAuth(user, token), clearAuth()
Persistence: localStorage via Zustand persist middleware
```

### Server State (TanStack Query v5)
- `staleTime: Infinity` — data never considered stale; no background refetch
- `retry: false` — failed queries do not retry
- `refetchOnWindowFocus: false` — no refetch on tab switch
- Custom `getQueryFn` auto-attaches Bearer token and handles 401 by clearing auth + redirecting

### Toasts
- Custom reducer-based hook (`use-toast.ts`)
- Max 1 concurrent toast
- No global provider needed — uses singleton listener pattern

## 4.4 API Communication Layer

**`client/src/lib/queryClient.ts`**:
- `apiRequest(method, url, body?)` — fetch wrapper with JSON headers, auth injection, 401 handling
- `getQueryFn({on401})` — default query function; joins queryKey array into URL
- Token read from `localStorage` directly (not Zustand store) to avoid hook restrictions in async context

**`client/src/lib/api.ts`**:
- `apiRequest(method, url, body?, token?)` — lower-level fetch wrapper; supports FormData
- `uploadFile(file, folder, token)` — specialized uploader for `POST /api/upload`

**`client/src/lib/websocket.ts`**:
- `createWebSocket(path, onMessage)` — factory with `ws://` / `wss://` protocol auto-detection
- `sendWebSocketMessage(socket, type, payload)` — JSON serializer

## 4.5 Component Structure

```
client/src/components/
├── for-you/
│   ├── ForYouRail.tsx          # Horizontal recommendation scroll
│   └── UserRecommendationCard.tsx
├── layout/
│   ├── SidebarNav.tsx          # Desktop left sidebar navigation
│   ├── MobileNav.tsx           # Mobile bottom tab bar
│   ├── PageLayout.tsx          # Main content wrapper with consistent padding
│   └── Marquee.tsx             # Scrolling info banner
├── live/
│   ├── LiveStreamCard.tsx      # Event preview card
│   └── LiveStreamViewer.tsx    # Live event viewing UI
├── messages/
│   ├── ChatWindow.tsx          # Main chat interface
│   ├── ConversationList.tsx    # Left panel conversation list
│   └── MessageBubble.tsx       # Individual message component
├── posts/
│   ├── PostCard.tsx            # Full post with likes/comments/saves
│   ├── PostFeed.tsx            # Scrollable list of PostCards
│   ├── CreatePostModal.tsx     # Multi-step post creation
│   └── PostMedia.tsx           # Media renderer (image/video)
├── stories/
│   ├── StoriesBar.tsx          # Horizontal story avatars
│   └── StoryViewer.tsx         # Full-screen story overlay
├── ui/                         # shadcn/ui base components
│   ├── button.tsx, card.tsx, dialog.tsx, input.tsx, ... (full shadcn set)
│   ├── empty-state.tsx         # Standardized empty state
│   ├── status-badge.tsx        # B&W status label
│   └── skeletons.tsx           # Skeleton loader library
└── studio-connection-dialog.tsx # Artist → Studio affiliation UI
```

## 4.6 Design System

- **Palette**: Monochrome — pure white backgrounds, black text, black borders, no color accents
- **Typography**: System sans-serif with bold editorial headings
- **Components**: All from shadcn/ui (Radix UI primitives) with Tailwind overrides
- **Borders**: Sharp-edged, `rounded-none` or minimal rounding
- **Spacing**: Consistent `pt-4 pb-20` on page containers for mobile nav clearance
- **Loading states**: Standardized skeleton components from `skeletons.tsx`
- **Empty states**: Standardized from `empty-state.tsx`
- **Status badges**: B&W from `status-badge.tsx`

## 4.7 Form Architecture

- React Hook Form + Zod resolvers via `zodResolver`
- Shared Zod schemas from `@shared/schema` (drizzle-zod generated) extended with `.extend()` for frontend-specific validation
- All forms wrapped in shadcn `Form` component with proper `FormField`, `FormItem`, `FormLabel`, `FormMessage` structure

## 4.8 Mobile Strategy

- Fixed bottom navigation bar (`MobileNav`) below `768px`
- Fixed left sidebar (`SidebarNav`) above `768px`
- `useIsMobile()` hook using `window.matchMedia('(max-width: 768px)')`
- All page containers include `pb-20` to clear the mobile nav bar
- No dedicated mobile-specific layouts beyond nav

## 4.9 Known UI Inconsistencies / Design Debt

1. `/search`, `/explore`, `/reels`, `/jobs`, `/flash-sales`, `/live-events` — no auth guard (inconsistent with platform intent)
2. Reels page renders a grid instead of a TikTok-style swipe feed
3. No video player controls on video posts in any feed
4. Flash sale countdown does not tick in real time
5. Story highlights — schema exists, no frontend
6. Group message creation — no UI, only 1:1 chat initiated from profiles
7. `document.getElementById` for featured post scroll in Home (anti-pattern)

---

# 5. Full Backend Architecture

## 5.1 Technology Stack

| Technology | Version / Details |
|-----------|-------------------|
| Node.js | 18+ |
| Express.js | 4.x |
| TypeScript | Executed via `tsx` in dev; `esbuild` in production |
| Drizzle ORM | PostgreSQL adapter |
| @neondatabase/serverless | Neon PostgreSQL connection driver |
| bcrypt | Password hashing (10 rounds) |
| jsonwebtoken | JWT signing/verification |
| express-rate-limit | Auth endpoint rate limiting (added May 2026) |
| multer | File upload handling (memory storage, 50MB limit) |
| ws | WebSocket server |

## 5.2 Server Setup (`server/index.ts`)

- Express app with `express.json()` (with `rawBody` capture for future webhook signature verification)
- `express.urlencoded({ extended: false })`
- Request logging middleware: logs method, path, status, duration, truncated response body (auth routes excluded from body logging)
- Global error handler: `(err, req, res, next)` → `res.status(err.status || 500).json({ message: err.message })`
- In development: Vite dev middleware serves frontend
- In production: `express.static()` serves built frontend from `dist/public`
- **No Helmet.js** — missing standard HTTP security headers
- **No CORS configuration** — relies on same-origin serving (acceptable for Replit, risk on custom domain)

## 5.3 Authentication Middleware (`server/middleware/auth.ts`)

### `generateToken(userId: string): string`
- Signs JWT with `process.env.JWT_SECRET || process.env.SESSION_SECRET`
- Expiry: 7 days
- Algorithm: HS256 (default)

### `requireAuth`
1. Extract `Authorization: Bearer <token>` header
2. Verify JWT signature and expiry
3. Query DB for user existence and `deletedAt IS NULL` (deleted/banned users cannot authenticate)
4. Attach `req.userId` and `req.userRole`
5. Failure: 401

### `requireRole(roles: string[])`
- Higher-order middleware; checks `req.userRole` against allowed roles array
- Failure: 403

## 5.4 Complete API Endpoint Reference

### Authentication

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/api/auth/register` | None | 20/15min | Create account; auto-sets `PENDING` verification for ARTIST/STUDIO |
| POST | `/api/auth/login` | None | 20/15min | Returns `{ token, user: safeUser }` |
| POST | `/api/auth/logout` | Required | None | Client-side only (token removal); returns 200 |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | None | Paginated list; supports `type`, `take`, `skip` |
| GET | `/api/users/me` | Required | Current user (no hashedPassword) |
| GET | `/api/users/:id` | None | User by UUID or username (no hashedPassword) |
| PUT | `/api/users/me` | Required | Update profile fields (whitelist validated) |
| POST | `/api/users/:id/follow` | Required | Follow user |
| POST | `/api/users/:id/unfollow` | Required | Unfollow user |
| GET | `/api/users/:id/is-following` | Required | Boolean following check |
| GET | `/api/users/:id/stats` | None | `{ followers, following, posts }` counts |

### Posts & Feed

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/posts` | Required | Personalized feed; supports `?featured=true`, `?authorId=`, `?type=` |
| POST | `/api/posts` | Required | Create post/reel/story |
| GET | `/api/posts/:id` | None | Single post |
| DELETE | `/api/posts/:id` | Required | Soft-delete (author only) |
| POST | `/api/posts/:id/like` | Required | Like post |
| DELETE | `/api/posts/:id/like` | Required | Unlike post |
| GET | `/api/for-you` | Required | Algorithmic For-You feed |

### Comments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/posts/:postId/comments` | None | Get comments |
| POST | `/api/posts/:postId/comments` | Required | Add comment |
| DELETE | `/api/posts/:postId/comments/:id` | Required | Delete comment (author only) |

### Stories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/stories` | Required | Active stories from followed users |
| POST | `/api/stories` | Required | Create story (24h TTL) |

### Saved Posts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/saved-posts` | Required | User's saved posts; supports `?collection=` |
| POST | `/api/saved-posts` | Required | Save post to optional collection |
| DELETE | `/api/saved-posts/:postId` | Required | Unsave |
| GET | `/api/saved-posts/collections` | Required | List user's collection names |

### Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/search` | Required | User search by `?q=` (name/username) |

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Required | User's notifications |
| POST | `/api/notifications/:id/read` | Required | Mark one read |
| POST | `/api/notifications/read-all` | Required | Mark all read |

### Messaging

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/conversations` | Required | List conversations |
| POST | `/api/conversations` | Required | Create conversation |
| GET | `/api/conversations/:id/messages` | Required | Message history (participant check) |
| PUT | `/api/conversations/:id/read` | Required | Update read timestamp |
| POST | `/api/messages` | Required | Send message |

### Portfolio

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/portfolio/:userId` | None | Artist portfolio items |
| POST | `/api/portfolio` | Required | Create portfolio item |
| PUT | `/api/portfolio/:id` | Required | Update (owner only) |
| DELETE | `/api/portfolio/:id` | Required | Delete (owner only) |

### Jobs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/jobs` | None | Active job listings |
| POST | `/api/jobs` | Required (STUDIO) | Create posting |
| PATCH | `/api/jobs/:id` | Required (STUDIO) | Update posting |
| DELETE | `/api/jobs/:id` | Required (STUDIO) | Remove posting |
| POST | `/api/jobs/:id/apply` | Required (ARTIST) | Apply with cover letter + portfolio |
| GET | `/api/jobs/:id/applications` | Required (STUDIO) | View applicants |

### Bookings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/bookings` | Required | User's bookings (artist or client view) |
| POST | `/api/bookings` | Required | Create booking request |
| PUT | `/api/bookings/:id` | Required | Update status (artist/client only) |
| DELETE | `/api/bookings/:id` | Required | Cancel booking |
| POST | `/api/bookings/:id/mark-deposit-paid` | Required | Manual payment status update |
| POST | `/api/bookings/:id/mark-fully-paid` | Required | Manual payment status update |

### Flash Sales

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/flash-sales` | None | Active sales; supports `?active=true` |
| POST | `/api/flash-sales` | Required (ARTIST) | Create sale |
| PUT | `/api/flash-sales/:id` | Required (ARTIST) | Update sale |
| DELETE | `/api/flash-sales/:id` | Required (ARTIST) | Remove sale |

### Livestreams

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/livestream-events` | None | Events; supports `?status=` filter |
| POST | `/api/livestream-events` | Required | Create/schedule event |
| PUT | `/api/livestream-events/:id` | Required | Update event |
| DELETE | `/api/livestream-events/:id` | Required | Cancel event |

### Hashtags

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/hashtags/trending` | Required | Top trending hashtags |
| POST | `/api/hashtags/update-trending` | Required | Recalculate trending scores |

### Studio Approvals

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/studios/apply` | Required (ARTIST) | Request studio affiliation |
| GET | `/api/studio-approvals` | Required (STUDIO) | List pending/approved requests |
| PUT | `/api/studio-approvals/:id/approve` | Required (STUDIO) | Approve request |
| PUT | `/api/studio-approvals/:id/reject` | Required (STUDIO) | Reject request |

### Upload

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/upload` | Required | Upload to Cloudinary; MIME whitelist enforced; 50MB max |
| DELETE | `/api/upload/:publicId` | Required | Delete from Cloudinary; folder prefix check |

### AI

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/ai/tattoo-recommendations` | Required | Generate recommendation via GPT-4o |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/stats` | ADMIN | Platform statistics |
| GET | `/api/admin/users` | ADMIN | All users with search/filter |
| PUT | `/api/admin/users/:id/approve` | ADMIN | Verify user |
| PUT | `/api/admin/users/:id/reject` | ADMIN | Reject verification |
| PUT | `/api/admin/users/:id/ban` | ADMIN | Ban user |
| PUT | `/api/admin/users/:id/unban` | ADMIN | Unban user |
| GET | `/api/admin/posts` | ADMIN | All posts |
| PUT | `/api/admin/posts/:id/feature` | ADMIN | Feature post |
| PUT | `/api/admin/posts/:id/unfeature` | ADMIN | Unfeature post |
| DELETE | `/api/admin/posts/:id` | ADMIN | Hard delete post |
| GET | `/api/admin/jobs` | ADMIN | All job listings |
| GET | `/api/admin/bookings` | ADMIN | All bookings |
| POST | `/api/admin/flash-sales` | ADMIN | Create flash sale (admin) |
| PUT | `/api/admin/flash-sales/:id` | ADMIN | Update flash sale |
| DELETE | `/api/admin/flash-sales/:id` | ADMIN | Delete flash sale |

## 5.5 Services

### `server/services/cloudinary.ts`
- Uses Cloudinary v2 SDK
- `uploadMedia(buffer, folder, resourceType)` → `{ publicId, url, type, width?, height?, duration? }`
- `deleteMedia(publicId)` → void
- All assets stored under `tattoorecord/` folder prefix
- Errors: generic message "Cloudinary upload failed"

### `server/services/openai.ts`
- Uses `gpt-4o` model with JSON response format
- `generateTattooRecommendations(preferences)` → `{ styles, placement, size, colors, description, aftercare }`
- Prompt engineering: structured JSON output instructions embedded in system message
- Graceful degradation: falls back to static response if `OPENAI_API_KEY` not set (not fully — throws on missing key)

### `server/services/websocket.ts`
- Path: `/ws`
- Handles: `NEW_MESSAGE`, `READ_RECEIPT`, `TYPING_START`, `TYPING_STOP`, `REACTION`, `PRESENCE`
- Heartbeat: 30-second ping/pong interval
- **CRITICAL BUG**: `broadcastToConversation()` broadcasts to all connected clients (ignoring conversation membership). Any logged-in user with an open WebSocket connection receives all real-time messages from all conversations.

### `server/services/websocket-live.ts`
- Path: `/ws/live`
- Handles: `JOIN`, `LEAVE`, `LIVE_COMMENT`, `LIVE_REACTION`
- Viewer count tracked in-memory per event ID
- Race condition: join increments `viewerTotal` non-atomically

### `server/services/story-cleanup.ts`
- `setInterval` every 10 minutes
- Finds `stories WHERE expiresAt < NOW()`
- Deletes Cloudinary asset for each, then deletes DB record
- Error isolation: Cloudinary failure per story is caught and logged; process continues

### `server/services/feed-algorithm.ts`
- `getPersonalizedFeed(userId, limit, offset)` — posts from followed + own, sorted by engagement score
- `getPublicFeed(limit, offset)` — fallback for empty follows
- `getTrendingPosts(limit, offset)` — ranked by `(likeCount * 2 + commentCount) / GREATEST(hours_elapsed, 1)`
- `getFeaturedPosts(limit, offset)` — admin-curated `isFeatured` posts
- `getForYouRecommendations(userId, limit)` — suggested users and posts from non-followed accounts

## 5.6 Validation Layer (`server/utils/validation.ts`)

All schemas defined and actively used in routes:

| Schema | Endpoint |
|--------|----------|
| `loginSchema` | POST `/api/auth/login` |
| `registerSchema` | POST `/api/auth/register` |
| `createPostSchema` | POST `/api/posts` |
| `createCommentSchema` | POST `/api/posts/:postId/comments` |
| `createMessageSchema` | POST `/api/messages` |
| `createStorySchema` | POST `/api/stories` |
| `createJobSchema` | POST `/api/jobs`, PATCH `/api/jobs/:id` |
| `aiRecommendationSchema` | POST `/api/ai/tattoo-recommendations` |
| `updateUserSchema` | PUT `/api/users/me` |
| `insertStudioApprovalRequestSchema` | POST `/api/studios/apply` |

---

# 6. Complete Database Documentation

## 6.1 Database Technology

- **Provider**: Neon (serverless PostgreSQL)
- **Driver**: `@neondatabase/serverless`
- **ORM**: Drizzle ORM
- **Connection**: `DATABASE_URL` environment variable
- **Migrations**: Drizzle push (`npm run db:push`)

## 6.2 Enum Types

| Enum Name | Values |
|-----------|--------|
| `role` | ARTIST, STUDIO, ENTHUSIAST, ADMIN |
| `visibility` | PUBLIC, FOLLOWERS |
| `notification_type` | FOLLOW, LIKE, COMMENT, APPROVAL, SYSTEM |
| `conversation_role` | MEMBER, ADMIN |
| `approval_status` | PENDING, APPROVED, REJECTED |
| `job_type` | FULL_TIME, PART_TIME, CONTRACT, APPRENTICESHIP |
| `application_status` | SUBMITTED, REVIEWING, ACCEPTED, REJECTED |
| `livestream_status` | SCHEDULED, LIVE, ENDED |
| `consultation_status` | REQUESTED, CONFIRMED, DECLINED, COMPLETED |
| `platform` | INSTAGRAM, TIKTOK, OTHER |
| `post_type` | POST, REEL, STORY |
| `payment_status` | UNPAID, DEPOSIT_PAID, FULLY_PAID, REFUNDED |
| `reminder_preference` | NONE, DAY_BEFORE, WEEK_BEFORE, BOTH |

## 6.3 Table Reference

### `users` — Core identity table
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | NOT NULL | PK, random |
| email | varchar(255) | NOT NULL | Unique |
| username | varchar(50) | NOT NULL | Unique |
| hashedPassword | text | NOT NULL | bcrypt 10 rounds; stripped from all API responses |
| role | roleEnum | NOT NULL | Default: ENTHUSIAST |
| firstName | varchar(100) | YES | |
| lastName | varchar(100) | YES | |
| bio | text | YES | |
| avatarUrl | text | YES | Cloudinary URL |
| bannerImageUrl | text | YES | Cloudinary URL |
| website | text | YES | |
| instagram | varchar(100) | YES | Handle only |
| tiktok | varchar(100) | YES | |
| twitter | varchar(100) | YES | |
| isVerified | boolean | NOT NULL | Default: false; set by admin |
| verificationStatus | approvalStatusEnum | YES | PENDING/APPROVED/REJECTED |
| location | jsonb | YES | `{city, country, lat, lng}` |
| links | jsonb | YES | Array of `{label, url}` |
| socialHandles | jsonb | YES | `{platform: handle}` |
| createdAt | timestamp | NOT NULL | |
| updatedAt | timestamp | NOT NULL | |
| deletedAt | timestamp | YES | Soft delete / ban |

**Potential issues**: `location` as JSONB prevents indexed geo queries. `links` and `socialHandles` overlap with top-level `instagram`/`tiktok`/`twitter` columns (duplication). `verificationStatus` null for ENTHUSIAST role (expected, but requires null checks).

---

### `studio_profiles` — Extended studio data
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → users.id (CASCADE), UNIQUE |
| name | varchar(255) | Studio business name |
| description | text | |
| services | jsonb | `[]` array of service objects |
| hours | jsonb | `{}` operating hours |
| paymentMethods | jsonb | `[]` accepted payments |

**Usage**: Created at STUDIO registration. Not surfaced in main profile UI — data is unused in frontend display.

---

### `artist_profiles` — Extended artist data
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → users.id (CASCADE), UNIQUE |
| styles | jsonb | Tattoo style specialties |
| rateCents | integer | Hourly/session rate |
| availability | jsonb | `{}` weekly schedule |
| yearsExperience | integer | |

**Usage**: Not surfaced in frontend profile display — data is stored but not shown to users.

---

### `posts` — All content (posts, reels, stories)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| authorId | uuid | FK → users.id (CASCADE) |
| type | postTypeEnum | POST / REEL / STORY |
| caption | text | Optional; required if no media |
| media | jsonb | `[{publicId, url, type, width, height}]` |
| likeCount | integer | Denormalized counter; atomically updated |
| commentCount | integer | Denormalized counter |
| saveCount | integer | Denormalized counter |
| location | jsonb | `{name, lat, lng}` |
| styles | jsonb | Associated tattoo styles |
| isFeatured | boolean | Admin-curated |
| visibility | visibilityEnum | PUBLIC / FOLLOWERS |
| deletedAt | timestamp | Soft delete |

**Indices**: authorId, type, createdAt, isFeatured

---

### `post_likes` — Many-to-many like junction
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| postId | uuid | FK → posts.id (CASCADE) |
| userId | uuid | FK → users.id (CASCADE) |
| createdAt | timestamp | |

**Index**: Unique composite on (postId, userId) — prevents duplicate likes

---

### `comments`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| postId | uuid | FK → posts.id (CASCADE) |
| userId | uuid | FK → users.id (CASCADE) |
| body | text | 1-1000 chars (validated) |
| createdAt | timestamp | |
| deletedAt | timestamp | Soft delete |

---

### `notifications`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → users.id (CASCADE) |
| type | notificationTypeEnum | FOLLOW/LIKE/COMMENT/APPROVAL/SYSTEM |
| payload | jsonb | `{actorId, postId, message, ...}` — flexible but unindexed |
| isRead | boolean | Default: false |
| createdAt | timestamp | |

**Issue**: `payload->>'actorId'` queried with PostgreSQL `->>` operator in storage layer. No JSON index — full scan on large notification datasets.

---

### `conversations`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| isGroup | boolean | Default: false |
| title | varchar(255) | Group name (nullable for DMs) |
| lastMessageAt | timestamp | Used for ordering |

---

### `conversation_participants`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| conversationId | uuid | FK → conversations.id (CASCADE) |
| userId | uuid | FK → users.id (CASCADE) |
| role | conversationRoleEnum | MEMBER/ADMIN |
| lastReadAt | timestamp | Read receipt tracking |

**Index**: Unique on (conversationId, userId); Index on userId

---

### `messages`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| conversationId | uuid | FK → conversations.id (CASCADE) |
| senderId | uuid | FK → users.id (CASCADE) |
| body | text | Optional (media-only messages allowed) |
| media | jsonb | `{publicId, url, type}` |
| voiceUrl | text | Voice message URL — no frontend UI |
| replyToId | uuid | Self-reference for threads (no FK constraint defined) |
| reactions | jsonb | `[{emoji, userId}]` |
| sentAt | timestamp | |
| deletedAt | timestamp | |

---

### `stories`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → users.id (CASCADE) |
| media | jsonb | `{publicId, url, type, width, height}` |
| expiresAt | timestamp | 24h from creation |
| createdAt | timestamp | |

---

### `story_highlights` + `highlight_stories`
- `story_highlights`: user-created highlight collections
- `highlight_stories`: junction table linking stories to highlights
- **Status**: Tables exist and are migrated; no API endpoints; no frontend UI

---

### `portfolio_items`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| artistId | uuid | FK → users.id (CASCADE) |
| title | varchar(255) | |
| description | text | |
| media | jsonb | Array of media objects |
| categories | jsonb | Style tags |
| sortOrder | integer | Manual ordering |

---

### `studio_approval_requests`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| studioId | uuid | FK → users.id (CASCADE) |
| artistId | uuid | FK → users.id (CASCADE) |
| status | approvalStatusEnum | PENDING/APPROVED/REJECTED |
| note | text | Optional context |

---

### `job_postings`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| studioId | uuid | FK → users.id (CASCADE) |
| title | varchar(255) | |
| type | jobTypeEnum | FULL_TIME/PART_TIME/CONTRACT/APPRENTICESHIP |
| description | text | |
| location | varchar(255) | |
| isActive | boolean | Default: true |
| salaryMinCents | integer | Nullable |
| salaryMaxCents | integer | Nullable |

---

### `job_applications`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| jobId | uuid | FK → job_postings.id (CASCADE) |
| artistId | uuid | FK → users.id (CASCADE) |
| coverLetter | text | |
| portfolioSnapshot | jsonb | Snapshot of portfolio at apply time |
| status | applicationStatusEnum | SUBMITTED/REVIEWING/ACCEPTED/REJECTED |

---

### `livestream_events`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| hostId | uuid | FK → users.id (CASCADE) |
| title | varchar(255) | |
| scheduledFor | timestamp | |
| startedAt / endedAt | timestamp | Lifecycle tracking |
| status | livestreamStatusEnum | SCHEDULED/LIVE/ENDED |
| viewerPeak / viewerTotal | integer | Analytics counters |

---

### `livestream_participants`, `live_comments`, `live_reactions`
- Populated by WebSocket events
- No REST API read endpoints — data only accessible in real-time via WebSocket
- Historical data queryable directly in DB but not exposed to frontend

---

### `consultation_requests`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| artistId | uuid | FK → users.id |
| requesterId | uuid | FK → users.id |
| preferredTimes | jsonb | Array of time slots |
| status | consultationStatusEnum | REQUESTED/CONFIRMED/DECLINED/COMPLETED |
| notes | text | |

**Status**: **Schema and table exist; NO API endpoints; NO frontend UI.** Dead schema.

---

### `hashtags` + `post_hashtags`
- `hashtags`: `{id, tag, uses, trendingScore, createdAt, updatedAt}`
- `post_hashtags`: junction between posts and hashtags
- Trending score recalculated on demand via raw SQL subquery counting 7-day usage

---

### `follows`
- `{id, followerId, followingId, createdAt}`
- Unique constraint on (followerId, followingId)

---

### `post_shares`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| postId | uuid | FK → posts.id (CASCADE) |
| userId | uuid | FK → users.id (CASCADE) |
| platform | platformEnum | INSTAGRAM/TIKTOK/OTHER |
| sharedAt | timestamp | |

**Status**: Table exists; no API endpoint to record shares; no frontend "share" action. Dead schema.

---

### `saved_posts`
- `{id, postId, userId, collectionName, savedAt}`
- Unique on (postId, userId)

---

### `flash_sales`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| artistId | uuid | FK → users.id (CASCADE) |
| title | varchar(255) | |
| description | text | |
| media | jsonb | Array of media |
| originalPriceCents | integer | Full price |
| flashPriceCents | integer | Discounted price |
| availableSlots | integer | Default: 1 |
| bookedSlots | integer | Default: 0; incremented on booking |
| expiresAt | timestamp | |
| isActive | boolean | Default: true |

**Issue**: No atomic check preventing overbooking when `bookedSlots >= availableSlots`. Concurrent booking requests could exceed slot count.

---

### `bookings`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| artistId | uuid | FK → users.id |
| clientId | uuid | FK → users.id |
| flashSaleId | uuid | FK → flash_sales.id (SET NULL) — optional |
| title | varchar(255) | |
| description | text | |
| referenceImages | jsonb | Client-provided reference photos |
| scheduledAt | timestamp | |
| durationMinutes | integer | Default: 120 |
| depositCents | integer | |
| totalPriceCents | integer | |
| status | approvalStatusEnum | PENDING/APPROVED/REJECTED |
| paymentStatus | paymentStatusEnum | UNPAID/DEPOSIT_PAID/FULLY_PAID/REFUNDED |
| depositPaidAt / fullPaymentAt | timestamp | Manual timestamps |
| reminderPreference | reminderPreferenceEnum | DAY_BEFORE/WEEK_BEFORE/BOTH/NONE |
| reminderSentAt | timestamp | Set when reminder is sent — **no sending logic exists** |
| notes | text | |

---

## 6.4 ERD Relationship Summary

```
users ──< posts ──< post_likes
      │         └─< comments
      │         └─< post_hashtags >── hashtags
      │         └─< saved_posts
      │         └─< post_shares
      ├──< follows (self-join)
      ├──< notifications
      ├──< stories ──< highlight_stories >── story_highlights
      ├──< portfolio_items
      ├──< studio_profiles (1:1)
      ├──< artist_profiles (1:1)
      ├──< job_postings ──< job_applications
      ├──< studio_approval_requests (artist side)
      ├──< studio_approval_requests (studio side)
      ├──< flash_sales ──< bookings
      ├──< bookings (artist side)
      ├──< bookings (client side)
      ├──< livestream_events ──< livestream_participants
      │                      └─< live_comments
      │                      └─< live_reactions
      ├──< consultation_requests (artist)
      ├──< consultation_requests (requester)
      └──< conversation_participants >── conversations ──< messages
```

## 6.5 Soft Delete Behavior

| Table | Soft Delete Column | Applied |
|-------|-------------------|---------|
| users | deletedAt | Yes — banned/deleted users |
| posts | deletedAt | Yes — user-deleted posts |
| comments | deletedAt | Yes |
| messages | deletedAt | Yes |

All other tables use hard deletes via CASCADE.

---

# 7. Authentication & Security Review

## 7.1 Authentication Flow

1. User submits email/password to `POST /api/auth/login`
2. bcrypt compares password against stored hash (10 rounds)
3. On success: `generateToken(userId)` creates 7-day JWT signed with `SESSION_SECRET`
4. JWT returned to client; stored in Zustand state + persisted to `localStorage`
5. All subsequent requests include `Authorization: Bearer <token>` header
6. `requireAuth` middleware verifies JWT on each protected request, re-queries DB to confirm user still exists and is not deleted

## 7.2 Security Hardening Applied (May 2026)

| Fix | Status |
|-----|--------|
| Password hash stripped from all user API responses (`safeUser()`) | ✅ Fixed |
| Rate limiting on auth endpoints (20/15min) | ✅ Fixed |
| File upload: 50MB size limit | ✅ Fixed |
| File upload: MIME type allowlist | ✅ Fixed |
| `DELETE /api/upload/:publicId` folder prefix check | ✅ Fixed |
| Admin route client-side guard | ✅ Fixed |
| Protected routes client-side guard | ✅ Fixed |
| `getAdminStats()` no longer does full `SELECT *` on users | ✅ Fixed |

## 7.3 Security Risks — Open

### CRITICAL

| Risk | Detail | Recommendation |
|------|--------|----------------|
| **WebSocket broadcast privacy leak** | `broadcastToConversation()` in `websocket.ts` sends real-time messages to ALL connected WebSocket clients, not only conversation participants. Any user with an open browser tab receives other users' messages in real time. | Fix `broadcastToConversation()` to check `conversationId` against participant list before delivering. Maintain a `Map<conversationId, Set<ws>>` of subscribers. |

### HIGH

| Risk | Detail | Recommendation |
|------|--------|----------------|
| **JWT in localStorage** | XSS attack can exfiltrate tokens. Standard for SPAs but elevated risk on a platform allowing rich user-generated content. | Move to httpOnly cookie with refresh token rotation post-launch |
| **No Helmet.js** | Missing `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Content-Security-Policy` | Add `helmet()` to `server/index.ts` |
| **Flash sale overbooking** | No `WHERE bookedSlots < availableSlots` atomic check on booking creation | Add `FOR UPDATE` lock or CAS check in `createBooking()` |

### MEDIUM

| Risk | Detail | Recommendation |
|------|--------|----------------|
| **No CORS configuration** | Relies on same-origin serving; custom domain deployment could allow cross-origin requests | Add `cors()` middleware with explicit `origin` whitelist |
| **Upload folder prefix check is broad** | `DELETE /api/upload/:publicId` allows deletion if publicId starts with any of several generic prefixes (e.g. `general/`), not specifically the user's own uploads | Track `publicId` in a DB column and verify ownership at deletion time |
| **No CSRF protection** | JWT in Authorization header provides implicit CSRF protection for API calls but cookie-based upgrade in future would need `csurf` or SameSite cookies | Note for future cookie migration |
| **Notification JSONB unindexed** | `payload->>'actorId'` query on large notification tables will do full scans | Add GIN index on `notifications.payload` |

### LOW

| Risk | Detail |
|------|--------|
| No webhook signature verification | `rawBody` is captured but no signature check exists. No webhooks are implemented yet. |
| `JWT_SECRET` falls back to `SESSION_SECRET` | If `JWT_SECRET` is not set, uses `SESSION_SECRET`. Both are available — no actual risk, but should be documented. |
| No request body size limit | `express.json()` has no `limit` set; defaults to 100kb. Large JSON payloads possible. |

## 7.4 Input Validation Summary

- All API endpoints that accept a body use Zod schemas from `server/utils/validation.ts`
- Drizzle ORM uses parameterized queries — SQL injection not possible through ORM methods
- File type and size validated at upload endpoint
- UUID format checked before DB queries where route accepts `:id`

---

# 8. Stripe & Financial Systems Audit

## 8.1 Current State

**Stripe is not integrated.** There is no payment processor of any kind.

## 8.2 What Exists (Manual Only)

The booking system has a `paymentStatus` enum (`UNPAID`, `DEPOSIT_PAID`, `FULLY_PAID`, `REFUNDED`) with two manual status endpoints:
- `POST /api/bookings/:id/mark-deposit-paid`
- `POST /api/bookings/:id/mark-fully-paid`

Artists manually update these after receiving payment through external channels (cash, Venmo, etc.).

## 8.3 Financial Risk Assessment

| Risk | Severity | Detail |
|------|----------|--------|
| No payment collection | HIGH | Platform cannot facilitate or verify any financial transaction |
| No audit trail | HIGH | Payment status is manually set with no external verification |
| Overbooking on flash sales | HIGH | `bookedSlots` can exceed `availableSlots` under concurrent requests |
| No refund handling | MEDIUM | `REFUNDED` status exists but no refund flow or logic |
| No platform revenue model | MEDIUM | No commission, subscription, or fee collection |
| No financial reconciliation | MEDIUM | No way to reconcile platform bookings with actual payments received |
| `depositPaidAt` / `fullPaymentAt` | LOW | Timestamps set to `NOW()` server-side when status is updated — useful for audit but easily bypassed |

## 8.4 Recommended Integration Path

1. Stripe Connect (marketplace model) for artist payouts
2. Platform takes a configurable commission (e.g., 10%) on each booking
3. Deposit collection at booking approval (Stripe Payment Intents)
4. Full payment at completion
5. Refund via Stripe Refunds API
6. Webhook verification (already have `rawBody` capture in place)

---

# 9. Public Pages & SEO Audit

## 9.1 Public vs. Protected Pages

| Route | Current | Recommended |
|-------|---------|-------------|
| `/` | Public (splash for guests, feed for auth) | Public — correct |
| `/auth` | Public | Public — correct |
| `/explore` | Unauthenticated accessible | Should require auth |
| `/search` | Unauthenticated accessible | Should require auth |
| `/jobs` | Unauthenticated accessible | Consider auth gate |
| `/flash-sales` | Unauthenticated accessible | Consider auth gate |
| `/reels` | Unauthenticated accessible | Should require auth |
| `/profile/:username` | Unauthenticated accessible | Consider public profiles for SEO |
| `/u/:username` | Unauthenticated accessible | Same as above |

## 9.2 SEO Status

- **No meta tags** on any page beyond the root `index.html` title
- **No Open Graph tags** — sharing links show no preview on social media
- **No structured data** (JSON-LD for artists, businesses, etc.)
- **No sitemap** — no `sitemap.xml` generated
- **No robots.txt** — search engines will crawl everything
- **SPA routing** — all routes are client-side; server returns `index.html` for all paths — search engines cannot index individual pages without SSR or prerendering

## 9.3 SEO Recommendations (Post-Launch)

1. Add per-page `<title>` and `<meta name="description">` via React Helmet or equivalent
2. Add Open Graph tags for public profile pages
3. Implement `sitemap.xml` listing public profiles
4. Add `robots.txt` with appropriate `Disallow` rules
5. Consider static rendering or prerendering for public profile pages for SEO indexability

---

# 10. Third-Party Integrations

## 10.1 Cloudinary (Media Storage & CDN)

| Attribute | Detail |
|-----------|--------|
| Purpose | Store and serve all user-uploaded images and videos |
| Status | ✅ Fully functional |
| Implementation | Server-side upload via `cloudinary.ts` service; client sends raw file to Express `/api/upload`, server pipes to Cloudinary |
| Auth | API Key + Secret (`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME`) |
| Folder structure | `tattoorecord/{folder}/{filename}` |
| Failure handling | Generic error message; no retry logic |
| Missing | No image transformation (resizing/thumbnailing before storage); no video thumbnail generation; no CDN cache invalidation on delete |
| Production readiness | ✅ Ready once secrets set |

## 10.2 OpenAI (AI Recommendations)

| Attribute | Detail |
|-----------|--------|
| Purpose | AI-generated tattoo design recommendations |
| Status | ✅ Functional |
| Model | GPT-4o |
| Implementation | `generateTattooRecommendations()` in `openai.ts`; structured JSON response |
| Auth | `OPENAI_API_KEY` environment variable |
| Failure handling | Throws if API key missing (no graceful fallback); no retry; no timeout |
| Missing | Response not stored in DB; no cost tracking; no rate limiting per user |
| Production readiness | ⚠️ Ready once key set; consider per-user rate limiting |

## 10.3 Neon (PostgreSQL Database)

| Attribute | Detail |
|-----------|--------|
| Purpose | Primary data store |
| Status | ✅ Fully integrated |
| Driver | `@neondatabase/serverless` with WebSocket protocol for Neon's serverless edge |
| Connection | `DATABASE_URL` |
| Pooling | Neon serverless handles connection pooling internally |
| Production readiness | ✅ Ready |

## 10.4 Not Integrated (Future)

| Service | Purpose |
|---------|---------|
| Stripe | Payment processing |
| SendGrid / Resend | Transactional email |
| Instagram API | Social import / verification |
| TikTok API | Social import / verification |
| YouTube API | Video integration |
| Push notifications (FCM/APNS) | Mobile push |
| Analytics (Google Analytics / Mixpanel) | Usage tracking |
| Sentry | Error monitoring |

---

# 11. Automation & Workflow Systems

## 11.1 Story Cleanup (Active)

```
setInterval → every 10 minutes
  → SELECT stories WHERE expiresAt < NOW()
  → FOR EACH: deleteMedia(publicId) → db.delete(story)
```

Only background automation currently running in-process.

## 11.2 User Verification Workflow

```
ARTIST/STUDIO registers
  → verificationStatus = PENDING
  → isVerified = false
  → Cannot access verified-only features

ADMIN reviews → approves
  → verificationStatus = APPROVED
  → isVerified = true

ADMIN reviews → rejects
  → verificationStatus = REJECTED
  → User notified via in-app APPROVAL notification
```

## 11.3 Booking Status Workflow

```
Client creates booking
  → status = PENDING

Artist approves
  → status = APPROVED

Artist marks deposit paid (manual)
  → paymentStatus = DEPOSIT_PAID

Artist marks fully paid (manual)
  → paymentStatus = FULLY_PAID

Booking completed
  → status = APPROVED (no COMPLETED status — uses APPROVED as terminal)

Cancellation
  → status = REJECTED (dual-purpose for cancel/reject)
```

**Issues**: No `COMPLETED` or `CANCELLED` status distinct from `REJECTED`. `reminderSentAt` is tracked but no reminder system sends emails.

## 11.4 Flash Sale Slot Tracking

```
Artist creates flash sale
  → bookedSlots = 0, availableSlots = N

Client books
  → bookedSlots++ (NOT ATOMIC — RACE CONDITION RISK)
  → If bookedSlots >= availableSlots: sale considered full (UI only — backend does not enforce)
```

## 11.5 Hashtag Trending

```
Post created with hashtag
  → Hashtag upserted (insert or update uses counter)

POST /api/hashtags/update-trending called
  → Raw SQL: count hashtag usage in last 7 days
  → Update trendingScore column
  → Not on a schedule — manual trigger only
```

---

# 12. Full QA & Testing Audit

## 12.1 Existing Tests

**None.** There are no automated tests of any kind:
- No unit tests
- No integration tests
- No E2E tests (Playwright, Cypress, etc.)
- No API contract tests
- No snapshot tests

## 12.2 Manual Testing Coverage (Verified Working)

| Flow | Tested |
|------|--------|
| Registration (all roles) | ✅ |
| Login with demo accounts | ✅ |
| Password hash not in API responses | ✅ |
| Rate limiting on auth endpoints | ✅ |
| Admin route guard (non-admin redirect) | ✅ |
| File upload MIME rejection | ✅ |
| Post creation (text-only) | Via seed data |
| Feed rendering | ✅ |

## 12.3 Critical Untested Areas

| Area | Risk Level |
|------|-----------|
| WebSocket message delivery to correct participants only | CRITICAL |
| Flash sale booking under concurrent requests (overbooking) | HIGH |
| Booking status transitions and payment tracking | HIGH |
| Group conversation creation and messaging | HIGH |
| Story expiry and cleanup | MEDIUM |
| Admin approval → verified badge appearing on profile | MEDIUM |
| Portfolio CRUD with Cloudinary uploads | MEDIUM |
| AI recommendations with real OpenAI key | MEDIUM |
| Mobile layout across devices | MEDIUM |
| Job application flow end-to-end | MEDIUM |

## 12.4 Launch Readiness Checklist

### Must Do Before Launch

- [ ] Fix WebSocket `broadcastToConversation()` privacy bug
- [ ] Fix flash sale overbooking (atomic DB check)
- [ ] Set all production environment variables
- [ ] Run `npm run db:push` on production database
- [ ] Change admin account password from `Test1234!`
- [ ] Confirm Cloudinary secrets work in production
- [ ] Confirm OpenAI key works in production (if AI feature enabled at launch)
- [ ] Add Helmet.js for HTTP security headers
- [ ] Manually test full booking flow end-to-end
- [ ] Manually test messaging flow (send, receive, read receipt)
- [ ] Verify admin approval workflow completes correctly
- [ ] Remove or seed-protect demo quick-login buttons from production

### Recommended Before Launch

- [ ] Add per-user rate limiting on AI endpoint (cost control)
- [ ] Add GIN index on `notifications.payload` for performance
- [ ] Fix N+1 query in `getStudioApprovalRequests()`
- [ ] Replace in-memory admin stats user loop with `GROUP BY` SQL query
- [ ] Add `Content-Security-Policy` header with Cloudinary domain

### Nice to Have

- [ ] Flash sale countdown real-time ticking (add `setInterval`)
- [ ] Reels vertical scroll UI
- [ ] Add auth guard to `/search`, `/explore`, `/reels`, `/flash-sales`

---

# 13. Performance & Scalability Audit

## 13.1 Query Performance Concerns

| Issue | Location | Impact |
|-------|----------|--------|
| Explore filters are client-side | `explore.tsx` | All users fetched; filtered in browser |
| N+1 in `getStudioApprovalRequests` | `storage.ts` | Separate query per artist/studio row |
| Admin stats loop over all users in memory | `storage.ts` | Degrades with user growth |
| Notification JSONB unindexed payload | DB | Full scan for actorId lookups |
| Feed algorithm uses complex raw SQL | `feed-algorithm.ts` | Multiple subqueries per page request |
| `staleTime: Infinity` | `queryClient.ts` | Stale data shown until manual refresh |

## 13.2 WebSocket Scalability

- Both WebSocket servers are **in-process** — they run inside the single Node.js process
- No horizontal scaling possible without a shared message broker (Redis Pub/Sub)
- No WebSocket session persistence — reconnect loses state
- Currently: acceptable for a single-instance deployment

## 13.3 File Upload Performance

- Files are buffered entirely in memory (`multer.memoryStorage()`) before upload to Cloudinary
- 50MB max per upload
- No streaming upload — memory spike for large video files
- No parallel upload support

## 13.4 Frontend Bundle

- Single Vite bundle — no code splitting configured
- All pages and components loaded upfront
- Large component files (admin.tsx is extensive)
- No lazy loading on routes
- Image optimization: relies entirely on Cloudinary CDN transformations (not configured on upload)

## 13.5 Database Indexes

Well-indexed for common access patterns:
- `posts` → authorId, type, createdAt, isFeatured ✅
- `follows` → followerId, followingId ✅
- `notifications` → userId ✅ (but not payload sub-fields ❌)
- `messages` → conversationId, sentAt ✅
- `stories` → userId, expiresAt ✅
- `flash_sales` → artistId, isActive, expiresAt ✅
- `bookings` → artistId, clientId, scheduledAt, paymentStatus ✅

## 13.6 Caching

- **None**. No Redis, no in-memory cache, no HTTP cache headers
- `staleTime: Infinity` in TanStack Query prevents background refetches but is not server-side caching
- Cloudinary CDN handles media delivery caching automatically

---

# 14. Missing Features / Incomplete Areas

## 14.1 Schema-Only (Dead Tables — No API/UI)

| Table | Status |
|-------|--------|
| `consultation_requests` | Schema only; no API endpoints; no frontend UI |
| `story_highlights` | Schema only; no API endpoints; no frontend UI |
| `highlight_stories` | Schema only; dependent on story_highlights |
| `post_shares` | Schema only; no `POST /api/posts/:id/share` endpoint; no frontend share button |
| `artist_profiles` | Created on register; not readable/editable in UI |
| `studio_profiles` | Created on register; not readable/editable in UI |

## 14.2 Partially Implemented Features

| Feature | Gap |
|---------|-----|
| Live streaming | Event management works; **no actual video streaming** (no WebRTC/RTMP/HLS) |
| Group messaging | Schema and API support groups; frontend only creates 1:1 conversations |
| Reels | Posts stored; **no vertical scroll player**, no autoplay |
| Booking reminders | `reminderSentAt` column tracked; **no email/notification sender** |
| Hashtag trending update | Works but **not scheduled** — requires manual API trigger |
| Flash sale countdown | Computed correctly; **does not auto-tick** without page re-render |

## 14.3 Missing UI for Backend Features

| Backend Feature | Missing Frontend |
|----------------|-----------------|
| `application_status` updates | Artists can't see their application status; studios can't update status in UI |
| Voice messages (`voiceUrl`) | Column exists; no recording or playback UI |
| Message reactions | `reactions` JSONB exists; limited UI support |
| `visibility: FOLLOWERS` posts | Backend enforced; no toggle in post creation form |
| `location` on posts | Backend stores; limited frontend input |
| Studio hours / services | `studio_profiles` fields; not shown anywhere |
| Artist rate / availability | `artist_profiles` fields; not shown anywhere |

## 14.4 Production Operations Gaps

| Gap | Risk |
|-----|------|
| No error monitoring (Sentry etc.) | Cannot detect production errors without log scraping |
| No structured logging | Server logs are `console.log` based — no log levels, no correlation IDs |
| No health check endpoint | Load balancer / uptime monitoring has nothing to ping |
| No database migration system | Schema changes require manual `db:push` |
| No backup strategy documentation | Relies entirely on Neon's built-in backups |
| Demo accounts not removed | `Test1234!` credentials in production are a security risk |

---

# 15. Production Readiness Assessment

## Overall Score: 72 / 100

| Area | Score | Notes |
|------|-------|-------|
| Frontend | 78/100 | Feature-complete; gaps in video, highlights, real-time countdown |
| Backend | 80/100 | All endpoints functional; WebSocket privacy bug is critical |
| Security | 70/100 | Auth hardened; WebSocket leak, no Helmet, JWT in localStorage |
| Database | 82/100 | Well-designed; dead tables, missing indexes on notifications.payload |
| Payment System | 15/100 | Manual tracking only; no Stripe |
| Email System | 0/100 | Not implemented |
| Scalability | 55/100 | In-process WebSocket, no caching, client-side filtering |
| Testing | 5/100 | No automated tests |
| Observability | 10/100 | Console.log only; no APM, no error tracking |

## MUST FIX Before Launch

1. **[CRITICAL]** Fix WebSocket `broadcastToConversation()` — privacy leak sending all messages to all users
2. **[CRITICAL]** Fix flash sale overbooking — add atomic slot check in `createBooking()`
3. **[HIGH]** Change all demo account passwords (`Test1234!`)
4. **[HIGH]** Set `CLOUDINARY_*` and `OPENAI_API_KEY` secrets in production
5. **[HIGH]** Add `helmet()` middleware for HTTP security headers

## SHOULD FIX Before Launch

6. Remove or disable demo quick-login buttons on auth page in production
7. Add GIN index on `notifications.payload` column
8. Add per-user rate limiting on AI endpoint
9. Fix N+1 query in studio approval requests
10. Add a `/health` endpoint for uptime monitoring

## NICE TO HAVE

11. Flash sale countdown auto-tick with `setInterval`
12. Reels vertical scroll player
13. Auth guards on `/search`, `/explore`, `/reels`
14. Story highlights UI
15. Sentry error monitoring integration
16. Route-level code splitting in Vite config

---

# Launch Blockers

The following issues **must be resolved before going live**:

| # | Issue | Severity | Est. Fix Time |
|---|-------|----------|---------------|
| 1 | WebSocket `broadcastToConversation()` sends messages to all users | CRITICAL | 2–4 hours |
| 2 | Flash sale booking has no atomic slot limit check | CRITICAL | 1–2 hours |
| 3 | Demo account passwords (`Test1234!`) exist in DB | CRITICAL | 15 minutes |
| 4 | Production environment secrets not configured | BLOCKER | 30 minutes |
| 5 | No Helmet.js HTTP security headers | HIGH | 30 minutes |

---

# Recommended Next 30 Days

## Week 1 — Fix Launch Blockers

- Fix WebSocket privacy bug (conversation-scoped broadcast)
- Add atomic overbooking protection on flash sales
- Rotate demo account passwords
- Set production secrets
- Add `helmet()` middleware
- Deploy to production and run smoke tests

## Week 2 — Core Quality

- Add health check endpoint (`GET /health`)
- Integrate Sentry for error monitoring
- Add GIN index on notifications.payload
- Fix N+1 in studio approval requests
- Add auth guards to remaining unprotected routes
- Add per-user rate limiting on AI endpoint

## Week 3 — Missing Features

- Flash sale countdown auto-tick
- Story highlights UI (create, view, manage)
- Artist/studio extended profile fields (rates, hours, services)
- Application status visible to applying artists
- Post visibility toggle in create form

## Week 4 — Growth & Stability

- Stripe Connect integration planning and implementation
- Transactional email provider setup (booking confirmations, reminders)
- SEO: Open Graph meta tags on public profile pages
- Reels vertical scroll player
- Automated test suite setup (at minimum: auth, booking, WebSocket)

---

# 16. Appendix

## A. Full Route Map

```
/ (Home)
/auth (Login / Register)
/search (User Search)
/explore (Discovery + Trending)
/profile (Own Profile)
/profile/:username (Public Profile)
/u/:username (Public Profile alias)
/messages (Direct Messaging — Protected)
/notifications (Notifications — Protected)
/create (Content Creation — Protected)
/reels (Reels Feed)
/saved (Saved Posts — Protected)
/flash-sales (Flash Sales)
/bookings (Booking Management — Protected)
/jobs (Job Board)
/jobs/:id (Job Detail)
/live-events (Live Events)
/live (Live Events alias)
/ai-recommendations (AI Tattoo Advisor — Protected)
/admin (Admin Dashboard — Admin Only)
* (404 Not Found)
```

## B. Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✅ Required | Neon PostgreSQL connection string |
| `PGHOST` | ✅ Required | PostgreSQL host |
| `PGPORT` | ✅ Required | PostgreSQL port |
| `PGUSER` | ✅ Required | PostgreSQL username |
| `PGPASSWORD` | ✅ Required | PostgreSQL password |
| `PGDATABASE` | ✅ Required | PostgreSQL database name |
| `SESSION_SECRET` | ✅ Required | JWT signing secret (min 32 chars) |
| `JWT_SECRET` | Optional | Overrides SESSION_SECRET for JWT |
| `CLOUDINARY_CLOUD_NAME` | Required for uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Required for uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Required for uploads | Cloudinary API secret |
| `OPENAI_API_KEY` | Required for AI | OpenAI API key |
| `NODE_ENV` | Set by Replit | `development` or `production` |

## C. Scheduled Jobs

| Job | Interval | Location |
|-----|----------|----------|
| Story cleanup | Every 10 minutes | `server/services/story-cleanup.ts` → `startStoryCleanupScheduler()` |

No other cron jobs or scheduled tasks exist.

## D. WebSocket Endpoints

| Path | Purpose | Messages |
|------|---------|---------|
| `/ws` | Real-time messaging | NEW_MESSAGE, READ_RECEIPT, TYPING_START, TYPING_STOP, REACTION, PRESENCE |
| `/ws/live` | Livestream events | JOIN, LEAVE, LIVE_COMMENT, LIVE_REACTION |

## E. File/Folder Architecture

```
/
├── client/                    # Frontend (React + Vite)
│   ├── index.html
│   └── src/
│       ├── App.tsx             # Router + providers
│       ├── main.tsx            # Entry point
│       ├── index.css           # Tailwind + CSS variables
│       ├── components/         # Reusable UI components
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # API, queryClient, WebSocket utils
│       └── pages/              # Route-level page components
├── server/                    # Backend (Express + TypeScript)
│   ├── index.ts               # Server bootstrap
│   ├── routes.ts              # All API routes (~1350 lines)
│   ├── storage.ts             # Database access layer (~1200 lines)
│   ├── db.ts                  # Drizzle database connection
│   ├── middleware/
│   │   └── auth.ts            # JWT auth middleware
│   ├── services/
│   │   ├── cloudinary.ts      # Cloudinary SDK wrapper
│   │   ├── openai.ts          # OpenAI SDK wrapper
│   │   ├── websocket.ts       # Messaging WebSocket
│   │   ├── websocket-live.ts  # Livestream WebSocket
│   │   ├── story-cleanup.ts   # Background story expiry
│   │   └── feed-algorithm.ts  # Feed ranking SQL
│   ├── utils/
│   │   └── validation.ts      # Zod request schemas
│   └── vite.ts                # Vite dev middleware integration
├── shared/
│   └── schema.ts              # Drizzle schema (shared frontend/backend)
├── docs/                      # Documentation
│   ├── FULL_APPLICATION_SPECIFICATION.md (this file)
│   ├── LAUNCH_CHECKLIST.md
│   ├── QA_APP_MAP.md
│   ├── QA_INTENDED_USE_AND_FEATURES.md
│   └── QA_REPORT.md
├── drizzle.config.ts          # Drizzle ORM configuration
├── package.json               # Dependencies + scripts
├── tsconfig.json              # TypeScript config
├── vite.config.ts             # Vite build config
└── replit.md                  # Project overview + preferences
```

## F. Key NPM Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | 4.x | HTTP server |
| drizzle-orm | Latest | ORM |
| @neondatabase/serverless | Latest | Neon PostgreSQL driver |
| drizzle-zod | Latest | Schema → Zod generation |
| bcrypt | 5.x | Password hashing |
| jsonwebtoken | 9.x | JWT handling |
| express-rate-limit | Latest | Auth rate limiting |
| multer | 1.x | File upload parsing |
| cloudinary | 2.x | Media storage SDK |
| openai | 4.x | AI recommendations SDK |
| ws | 8.x | WebSocket server |
| react | 18.x | Frontend framework |
| vite | 5.x | Build tool |
| wouter | 3.x | Client routing |
| @tanstack/react-query | 5.x | Server state management |
| zustand | 4.x | Client state management |
| tailwindcss | 3.x | CSS utility framework |
| @radix-ui/* | Latest | Accessible UI primitives |
| react-hook-form | 7.x | Form state |
| zod | 3.x | Schema validation |
| lucide-react | Latest | Icon set |

## G. Test Accounts (Development Only — MUST CHANGE IN PRODUCTION)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@tattoorecord.com | Test1234! |
| Artist | artist1@tattoorecord.com | Test1234! |
| Studio | studio1@tattoorecord.com | Test1234! |
| Enthusiast | enthusiast1@tattoorecord.com | Test1234! |

## H. Known Dead / Unused Code

| Item | Location | Status |
|------|----------|--------|
| `consultation_requests` | `shared/schema.ts`, `storage.ts` | No API, no UI |
| `story_highlights` / `highlight_stories` | Schema + storage | No API, no UI |
| `post_shares` | Schema | No API, no UI |
| `artist_profiles` / `studio_profiles` | Schema, created on register | Not exposed in profile UI |
| Voice message UI | `voiceUrl` column | Schema only — no record or playback |

---

*Document generated May 2026. Reflects actual implemented system at commit f744e6f9.*
