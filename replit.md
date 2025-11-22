# Inktagram - Tattoo Social Community Platform

## Overview

Inktagram is a production-ready, full-stack tattoo social community platform designed for artists, studios, and enthusiasts to connect, share work, and collaborate. It features real-time messaging, live streaming, portfolio management, job postings, and AI-powered tattoo design recommendations. The platform is built as a modern monorepo, leveraging React for the frontend, Express for the backend, PostgreSQL for data persistence, and WebSockets for real-time functionalities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a clean, minimalist black-and-white aesthetic inspired by editorial magazine layouts. It utilizes pure white backgrounds, black text, minimal borders, and reduced border radius for sharper edges. Consistent navigation is provided through a fixed left sidebar for desktop and a bottom navigation for mobile, both using icon-only designs where appropriate. Profile pages are inspired by Instagram, featuring gradient-bordered avatars, dynamic statistics, and role-specific information.

### Technical Implementations
**Frontend**: Built with React 18 and Vite, using Wouter for routing. State management combines Zustand for authentication, TanStack Query for server state, and local component state for UI. shadcn/ui with Radix UI and Tailwind CSS form the component system. Form handling uses React Hook Form with Zod for validation.
**Backend**: An Express.js server in TypeScript handles API requests. Drizzle ORM interfaces with PostgreSQL. JWT-based authentication with bcrypt hashing and RBAC (`ARTIST`, `STUDIO`, `ENTHUSIAST` roles) is implemented. Multer and Cloudinary manage file uploads and media storage. Two WebSocket servers handle real-time messaging and live streaming.
**Data Storage**: PostgreSQL is the primary data store, utilizing Drizzle ORM. The schema includes over 22 tables for users, posts, messages, portfolios, jobs, and live events, with UUIDs for primary keys, timestamps, and soft deletes. JSONB columns store flexible data like media arrays and location data. Composite and foreign key indexes optimize queries.

### Feature Specifications
*   **Caption-Only Posts**: Supports posts without media, requiring only text.
*   **Artist-Studio Connection System**: Allows artists to request affiliation with studios, managed through a formal approval workflow.
*   **Profile Page Design**: Instagram-inspired layout with gradient-bordered avatars, dynamic stats, content tabs (Posts, Reels, Stories), and role-specific information (e.g., studio address for studios, studio connection for artists). Includes verified badges and optional banner images.
*   **Admin Verification System**: Requires admin approval for `ARTIST` and `STUDIO` roles, managed via an Admin Dashboard.
*   **Save/Bookmark System**: Users can save posts to personalized collections. Implemented with `saved_posts` table, POST/DELETE `/api/saved-posts/:postId` endpoints, and isSaved flags in feed queries via SQL EXISTS. SavedPosts page at `/saved` displays bookmarked content. Cache invalidation updates both `/api/posts` and `/api/saved-posts` on mutations.
*   **Trending Hashtags**: Real-time hashtag analytics on Explore page showing top trending tattoo styles. GET `/api/hashtags/trending` endpoint aggregates `hashtag_usage` table. Horizontal scrollable chips display usage counts. Composite indexes on (hashtagId, postId) optimize queries.
*   **Featured Content**: Admin-curated posts appear in homepage carousel. `posts.isFeatured` boolean flag, `getFeaturedPosts()` function in feed-algorithm.ts returns posts with isLiked/isSaved personalization. GET `/api/posts?featured=true` endpoint serves carousel.
*   **Flash Sales**: Limited-time flash tattoo sales with countdown timers and special pricing. `flash_sales` table tracks pricing (cents), slots, and date ranges. GET `/api/flash-sales?active=true` filters by date. FlashSalesPage at `/flash-sales` displays grid with urgency indicators ("Ending Soon" <24h, "Just Added" <7d). Pricing model: originalPriceCents, discountPriceCents, depositCents, availableSlots decrements with bookings.
*   **Discovery Filters**: Advanced filtering on Explore page by role (ARTIST/STUDIO/ENTHUSIAST), tattoo style (12+ styles: Traditional, Realism, Japanese, etc.), and location (case-insensitive search). GET `/api/users?type={ROLE}` for backend filtering. TATTOO_STYLES constant defined in explore.tsx. useEffect resets style filter when switching from ARTIST role to prevent orphaned filters.
*   **Booking System**: Comprehensive appointment scheduling connecting clients with artists. `bookings` table tracks status workflow (PENDING → APPROVED/REJECTED → COMPLETED/CANCELLED). Bookings page at `/bookings` with tab-based filtering and create booking dialog. Artists can approve/reject/complete bookings, clients can cancel. Query optimization uses hierarchical keys `["/api/bookings", { status }]` with custom queryFn. refetchQueries ensures immediate UI updates across tabs. Artist selection dropdown with staleTime: 0 for fresh data.
*   **Feed Optimizations**: All feed queries (`getPersonalizedFeed`, `getPublicFeed`, `getFeaturedPosts`) include `isLiked` and `isSaved` flags via SQL EXISTS subqueries (e.g., `EXISTS(SELECT 1 FROM post_likes WHERE postId = posts.id AND userId = $userId)`). Single query returns posts + user interaction state, preventing N+1 problems. useEffect in PostCard syncs local state with feed prop changes. Cache invalidation: like/unlike invalidates `/api/posts`, save/unsave invalidates both `/api/posts` AND `/api/saved-posts`.

## External Dependencies
*   **Cloudinary**: Media management for image and video uploads, storage, transformations, and CDN delivery.
*   **OpenAI API**: Powers AI-driven tattoo design recommendations based on user preferences.
*   **Neon Database**: Serverless PostgreSQL provider, utilized with `@neondatabase/serverless` for connection pooling.
*   **JWT (jsonwebtoken)**: Used for stateless authentication.
*   **Vite**: Frontend development and build tool.
*   **tsx**: TypeScript execution in development.
*   **esbuild**: Server bundling for production.
