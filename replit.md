# Inktagram - Tattoo Social Community Platform

## Overview

Inktagram is a production-ready, full-stack tattoo social community platform that enables artists, studios, and enthusiasts to connect, share work, and collaborate. The platform features real-time messaging, live streaming capabilities, portfolio management, job postings, and AI-powered tattoo design recommendations. Built as a modern monorepo, it combines a React-based frontend with an Express backend, utilizing PostgreSQL for data persistence and WebSocket for real-time features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Routing**: The application uses a single-page architecture with Wouter for client-side routing. The frontend is built with React 18 and Vite as the build tool, providing fast development and optimized production builds.

**State Management**: The application uses a hybrid state management approach:
- Zustand with persistence middleware handles authentication state and user sessions
- TanStack Query (React Query) manages server state, caching, and data synchronization
- Local component state for UI-specific concerns

**UI Component System**: Built on shadcn/ui components with Radix UI primitives, providing accessible, customizable components styled with Tailwind CSS. The design system uses a clean, minimalist black-and-white aesthetic inspired by editorial magazine layouts (nestmag.online), with pure white backgrounds, black text, minimal borders, and reduced border radius for sharper edges.

**Navigation Components**: Consistent navigation across all pages using `SidebarNav` (desktop) and `MobileNav` (mobile):
- SidebarNav: Fixed left sidebar with uppercase logo, minimal spacing, small icons (5x5), clean hover states
- MobileNav: Bottom navigation with icon-only design, no labels for minimal footprint
- All pages (home, messages, jobs, profile, live-events, explore, search) use the same navigation components for consistency

**Form Handling**: React Hook Form combined with Zod for schema validation provides type-safe form management with minimal re-renders.

**Real-time Communication**: WebSocket connections are established for messaging and live streaming features, with automatic reconnection handling and heartbeat mechanisms.

### Backend Architecture

**Server Framework**: Express.js with TypeScript provides the HTTP API layer. The server uses middleware for JSON parsing, request logging, and body capture for debugging.

**Database Layer**: Drizzle ORM interfaces with PostgreSQL (Neon-compatible) using a connection pool from @neondatabase/serverless. The database schema defines 22+ tables covering users, posts, messages, stories, portfolios, jobs, and live streaming.

**Authentication & Authorization**: JWT-based authentication with bcrypt password hashing. The `requireAuth` middleware validates tokens and attaches user context to requests. Role-based access control (RBAC) supports three user types: ARTIST, STUDIO, and ENTHUSIAST, enforced through the `requireRole` middleware.

**File Upload & Storage**: Multer handles multipart form data uploads, while Cloudinary manages media storage and delivery. Media is organized into folders (posts, stories, portfolio) with automatic transformations and CDN distribution.

**WebSocket Architecture**: Two separate WebSocket servers run on the same HTTP server:
- `/ws` path handles real-time messaging with typing indicators, read receipts, and message reactions
- `/ws/live` path manages live streaming events with viewer tracking and real-time comments
Both implement heartbeat mechanisms for connection health monitoring.

**Background Jobs**: A scheduler runs periodic cleanup tasks, such as removing expired 24-hour stories and their associated media from Cloudinary.

**API Design**: RESTful endpoints follow resource-based naming conventions with standard HTTP methods. Routes are organized by domain (auth, posts, messages, livestream, etc.) in the routes registry. The `/api/users/:id` endpoint intelligently handles both numeric IDs and string usernames, detecting the parameter type and routing to the appropriate storage method.

### Data Storage Solutions

**Primary Database**: PostgreSQL serves as the primary data store with Drizzle ORM providing type-safe queries. The schema uses UUIDs for primary keys, timestamps for audit trails, and soft deletes for data retention.

**Schema Organization**: The database is organized into logical domains:
- Core entities (users, profiles)
- Social features (posts, comments, likes, follows, hashtags)
- Messaging (conversations, messages, participants)
- Stories & highlights
- Professional features (portfolios, studio approval requests, jobs)
- Live streaming (events, participants, comments, reactions)
- Artist-Studio Connections (studio_approval_requests table with PENDING/APPROVED/REJECTED status)

**Indexes**: Composite indexes are applied to join tables (post_likes, follows, conversation_participants) for efficient querying of relationships. Individual indexes on foreign keys optimize lookups.

**JSON Fields**: JSONB columns store flexible data structures like media arrays (with publicId, url, type, dimensions), location data (city, country, coordinates), user links, and social handles.

### External Dependencies

**Cloudinary**: Media management service handling image and video uploads, storage, transformations, and CDN delivery. Configured with cloud_name, api_key, and api_secret. Media is organized in an "inktagram" folder structure.

**OpenAI API**: Powers the AI recommendation system for tattoo designs. Uses GPT models to generate personalized suggestions based on user preferences (style, placement, size, description). Returns structured recommendations including styles, placement options, colors, descriptions, and aftercare tips.

**Neon Database**: Serverless PostgreSQL provider with WebSocket support for serverless environments. Uses connection pooling via @neondatabase/serverless package with ws for WebSocket protocol.

**Authentication**: JWT (jsonwebtoken library) for stateless authentication with a configurable secret. Tokens include user ID and are verified on protected routes.

**Development Tools**: 
- Vite for frontend development with HMR and Replit-specific plugins (cartographer, dev-banner, runtime error overlay)
- tsx for TypeScript execution in development
- esbuild for server bundling in production

### Key Features

**Feed Interaction**: Home feed displays posts from followed users with interactive elements:
- **Clickable Author Info**: Post author avatars and usernames are clickable, navigating to their profile page via `/u/:username`
- Uses `PostCard` component with `Link` from wouter for navigation
- Each author link has unique data-testid for testing: `link-author-{postId}`
- Hover states provide visual feedback

**Artist-Studio Connection System**: Formal connection workflow allowing artists to request affiliation with tattoo studios:

*Artist Flow*:
1. Search for studios via StudioConnectionDialog component
2. Send connection request with optional introduction message
3. View connected studio on profile (Building2 icon + studio name)

*Studio Flow*:
1. View pending connection requests on profile page
2. Approve or reject requests with single-click actions
3. Display connected artists as circular highlights (Instagram-style)
4. Connected artists shown with gradient-bordered avatars

*API Endpoints*:
- `POST /api/studio-approvals` - Create request (ARTIST role required)
- `GET /api/studio-approvals` - List requests with filters (studioId, artistId, status)
- `PUT /api/studio-approvals/:id/approve` - Approve request (STUDIO role required)
- `PUT /api/studio-approvals/:id/reject` - Reject request (STUDIO role required)
- `GET /api/studios/:studioId/artists` - Get approved artists
- `GET /api/artists/:artistId/studio` - Get artist's studio connection

*Database*: `studio_approval_requests` table tracks all requests with status enum (PENDING, APPROVED, REJECTED), artist/studio IDs, optional notes, and timestamps.

**Profile Page Design**: Instagram-inspired layout with gradient-bordered avatars, stats row (posts/followers/following), bio section, and role-specific information:
- *Studios*: Display address (MapPin icon), website link (Globe icon), connected artists as circular highlights
- *Artists*: Display studio connection (Building2 icon) or "Connect to Studio" button
- Clean tabs interface (POSTS/SAVED) with 3-column posts grid
- **Verified Badge**: Approved users display yellow star icon next to username
- **Cross-Profile Navigation**: Users can view other profiles via `/u/:username` route
- **Dynamic Profile Loading**: Profile component fetches user data based on URL parameter
- **Action Button Privacy**: Action buttons (Connect to Studio, approval controls) only visible when viewing own profile

**Admin Verification System**: Platform requires admin approval for artists and studios before they can fully use the platform:

*User Roles*:
- **ENTHUSIAST**: No approval required, can use platform immediately
- **ARTIST**: Requires admin approval, account set to PENDING status upon registration
- **STUDIO**: Requires admin approval, account set to PENDING status upon registration
- **ADMIN**: Full access to admin dashboard for user verification

*Verification Workflow*:
1. Artist/Studio registers → Account status set to PENDING
2. Admin reviews pending users in Admin Dashboard (`/admin`)
3. Admin approves → User status set to APPROVED, isVerified = true, verified star appears on profile
4. Admin rejects → User status set to REJECTED

*Admin Dashboard* (`/admin`):
- Lists all pending users with registration details
- Approve/Reject buttons for each user
- Shows user role, email, bio, location, registration date
- Access via "Admin Access →" link on login page
- Route: `/admin` (requires ADMIN role)

*Admin Credentials* (for testing):
- Email: admin@inktagram.com
- Password: Admin1234!

*API Endpoints*:
- `GET /api/admin/pending-users` - List pending users (ADMIN only)
- `PUT /api/admin/users/:id/approve` - Approve user (ADMIN only)
- `PUT /api/admin/users/:id/reject` - Reject user (ADMIN only)

*Database Fields*:
- `users.verificationStatus`: PENDING | APPROVED | REJECTED
- `users.isVerified`: boolean (true when APPROVED)