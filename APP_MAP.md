# Tattoo Record - Application Structure Map

**Generated**: November 20, 2025  
**Purpose**: Complete application structure, user roles, features, and routes

---

## Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: Wouter (client-side routing)
- **State Management**: Zustand (auth), TanStack Query (server state)
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod validation

### Backend
- **Framework**: Express.js (TypeScript)
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: JWT + bcrypt
- **File Storage**: Cloudinary
- **Real-time**: WebSocket (ws library)

---

## User Roles & Permissions

### 1. Guest (Unauthenticated)
**Capabilities:**
- View landing/auth page
- Register for new account
- Login to existing account

**Restrictions:**
- Cannot access any application features
- All routes redirect to /auth

### 2. Enthusiast
**Capabilities:**
- Browse feed, explore content
- View profiles of artists and studios
- Follow users, like posts, comment
- Send messages
- Create posts (limited)
- View jobs board
- Watch live events

**Restrictions:**
- Cannot create studio or artist-specific content
- No admin access
- No verification badge

**Verification**: No approval required (APPROVED status on registration)

### 3. Artist
**Capabilities:**
- All Enthusiast capabilities PLUS:
- Create professional portfolio
- Connect to studios (send connection requests)
- Apply for jobs
- Create reels and stories
- Get AI tattoo design recommendations
- Display studio affiliation on profile

**Restrictions:**
- Must be admin-approved (PENDING → APPROVED)
- Cannot approve other artists
- Cannot manage studio connections (studios approve)

**Verification**: Requires admin approval, gets verified badge when APPROVED

### 4. Studio
**Capabilities:**
- All Enthusiast capabilities PLUS:
- Post job listings
- Approve/reject artist connection requests
- Display connected artists on profile
- Manage studio information (address, website)
- Create studio-specific content

**Restrictions:**
- Must be admin-approved (PENDING → APPROVED)
- Cannot create AI recommendations
- No admin access

**Verification**: Requires admin approval, gets verified badge when APPROVED

### 5. Admin
**Capabilities:**
- All application access PLUS:
- Access admin dashboard (`/admin`)
- Approve/reject pending artists and studios
- View all users (Pending, Approved, Rejected tabs)
- Manage platform-wide settings
- Full CRUD on all entities

**Restrictions:**
- None

**Verification**: Pre-approved (APPROVED status)

---

## Core Domain Entities

### 1. User
- **Fields**: id, username, email, password, role, verificationStatus, isVerified, profilePicture, bannerImage, bio, location, links
- **Relationships**: posts, followers, following, conversations, portfolios, jobs
- **CRUD**: Create (register), Read (profile), Update (settings), Delete (soft delete)

### 2. Post
- **Types**: POST, REEL, STORY
- **Fields**: id, authorId, caption, media[], type, visibility, likeCount, commentCount
- **Relationships**: author (User), likes, comments, hashtags
- **CRUD**: Create, Read (feed/profile), Update (edit caption), Delete

### 3. Comment
- **Fields**: id, postId, userId, body, parentId (for replies)
- **Relationships**: post, user, replies
- **CRUD**: Create, Read, Delete

### 4. Message
- **Fields**: id, conversationId, senderId, body, media, isRead, sentAt
- **Relationships**: conversation, sender
- **CRUD**: Create (send), Read (conversation thread), Update (mark read), No delete

### 5. Conversation
- **Fields**: id, participants[], isGroup, title
- **Relationships**: messages, participants (Users)
- **CRUD**: Create (new conversation), Read (list/detail), Update (mark read), No delete

### 6. Job
- **Fields**: id, studioId, title, description, compensation, location, requirements, status
- **Relationships**: studio (User), applications
- **CRUD**: Create (studio), Read (all users), Update (studio), Delete (studio)

### 7. Portfolio
- **Fields**: id, artistId, media[], description, styles, placements
- **Relationships**: artist (User)
- **CRUD**: Create (artist), Read (profile), Update (artist), Delete (artist)

### 8. LiveEvent
- **Fields**: id, hostId, title, description, status, viewerCount, startedAt
- **Relationships**: host (User), participants, comments
- **CRUD**: Create (host), Read (list/detail), Update (status), Delete (host)

### 9. StudioApprovalRequest
- **Fields**: id, artistId, studioId, status (PENDING/APPROVED/REJECTED), notes
- **Relationships**: artist (User), studio (User)
- **CRUD**: Create (artist), Read (both), Update (studio approves/rejects), No delete

### 10. Follow
- **Fields**: followerId, followingId
- **Relationships**: follower (User), following (User)
- **CRUD**: Create (follow), Read (lists), Delete (unfollow)

### 11. Like
- **Fields**: postId, userId
- **Relationships**: post, user
- **CRUD**: Create (like), Read (count), Delete (unlike)

---

## Major Feature Areas

### 1. Authentication / Onboarding
**Routes**: `/auth`
**Features**:
- Login form
- Registration form (with role selection)
- Auto-redirect if already authenticated
- JWT token management
- Password validation

**User Types**: Guest → All Roles

### 2. Home Feed
**Routes**: `/` (home)
**Features**:
- Personalized feed from followed users
- Post cards with likes, comments, share
- Infinite scroll / pagination
- Author profile navigation
- Post type filtering

**User Types**: All authenticated

### 3. Search & Discovery
**Routes**: `/search`, `/explore`, `/reels`
**Features**:
- Search users, posts, hashtags
- Trending content
- Filter by type (posts, reels, stories)
- Recommended content

**User Types**: All authenticated

### 4. User Profiles
**Routes**: `/profile` (own), `/u/:username` (others)
**Features**:
- Profile info (avatar, bio, stats)
- Content tabs (Posts, Reels, Stories)
- Stats (posts count, followers, following)
- Follow/unfollow buttons
- Role-specific displays:
  - Artists: Studio connection
  - Studios: Connected artists, address, website
- Verified badge for approved users
- Banner image with grid overlay

**User Types**: All authenticated

### 5. Messaging
**Routes**: `/messages`
**Features**:
- Conversation list
- Real-time messaging via WebSocket
- Message composer
- Typing indicators (intended)
- Read receipts (intended)
- Message history

**User Types**: All authenticated
**Status**: ⚠️ Send button broken (under investigation)

### 6. Live Streaming
**Routes**: `/live-events`, `/live`
**Features**:
- Create live events
- View active streams
- Real-time comments
- Viewer tracking
- Host controls

**User Types**: All authenticated (create: Artist/Studio)
**Status**: ⏸️ Not tested

### 7. Jobs Board
**Routes**: `/jobs`
**Features**:
- Job listings (studios post)
- Job search and filters
- Job applications (artists apply)
- Application management

**User Types**: Create (Studio), Apply (Artist), View (All)
**Status**: ⏸️ Not tested

### 8. Portfolio Management
**Routes**: Embedded in `/profile`
**Features**:
- Upload portfolio pieces
- Organize by style/placement
- Display on profile

**User Types**: Artist only
**Status**: ⏸️ Not tested

### 9. Studio-Artist Connections
**Routes**: Integrated in `/profile`
**Features**:
- Artists send connection requests to studios
- Studios approve/reject requests
- Connected artists displayed on studio profile
- Studio affiliation shown on artist profile

**User Types**: Artist (request), Studio (approve)
**Status**: ✅ Documented in replit.md

### 10. Admin Dashboard
**Routes**: `/admin`
**Features**:
- View pending users (artists, studios)
- Approve/reject user accounts
- Filter by status (Pending, Approved, Rejected, All)
- Filter by role (Artist, Studio)
- User verification management

**User Types**: Admin only
**Status**: ✅ Tested and working

### 11. Notifications
**Routes**: `/notifications`
**Features**:
- View notifications
- Mark as read
- Notification types (likes, comments, follows, messages)

**User Types**: All authenticated
**Status**: ⚠️ API returns 500 errors intermittently

### 12. AI Recommendations
**Routes**: Integrated feature (not standalone route)
**Features**:
- AI-powered tattoo design suggestions
- Based on user preferences (style, placement, size)
- Uses OpenAI API
- Returns structured recommendations

**User Types**: Artist (primary use case)
**Status**: ⏸️ Not tested

### 13. Post Creation
**Routes**: `/create`
**Features**:
- Upload media (images, videos)
- Add caption
- Select post type (POST, REEL, STORY)
- Set visibility (PUBLIC, FOLLOWERS)
- Add location
- Tag users (if implemented)

**User Types**: All authenticated
**Status**: ⏸️ Not tested

### 14. Settings / Account
**Routes**: Embedded in `/profile` or separate (not confirmed)
**Features**:
- Update profile info
- Change password
- Manage privacy settings
- Delete account

**User Types**: All authenticated
**Status**: ⏸️ Not tested

---

## All Routes & Subroutes

| Route | Component | Protected | Roles | Status | Reachable From UI |
|-------|-----------|-----------|-------|--------|-------------------|
| `/auth` | Auth | No | Guest | ✅ Working | Direct URL, auto-redirect |
| `/` | Home | Yes | All | ✅ Working | Sidebar, logo click |
| `/search` | Search | Yes | All | ✅ Working | Sidebar |
| `/explore` | Explore | Yes | All | ✅ Working | Sidebar |
| `/reels` | Explore (alias) | Yes | All | ✅ Working | Sidebar |
| `/messages` | Messages | Yes | All | ⚠️ UI broken | Sidebar |
| `/notifications` | Notifications | Yes | All | ⚠️ API 500 | Sidebar |
| `/profile` | Profile (own) | Yes | All | ✅ Working | Sidebar |
| `/u/:username` | Profile (other) | Yes | All | ✅ Working | Post author links, search results |
| `/live-events` | LiveEvents | Yes | All | ⏸️ Not tested | Sidebar |
| `/live` | LiveEvents (alias) | Yes | All | ⏸️ Not tested | Sidebar |
| `/jobs` | Jobs | Yes | All | ⏸️ Not tested | Sidebar |
| `/create` | Create | Yes | All | ⏸️ Not tested | Sidebar |
| `/admin` | Admin | Yes | Admin only | ✅ Working | Auth page (admin link) |
| `*` (404) | NotFound | No | All | ✅ Working | Invalid URLs |

**Total Routes**: 16 (including aliases)
**Tested**: 9/16
**Working**: 8/9 tested
**Broken/Partial**: 1/9 tested (messages)
**Not Tested**: 7/16

---

## Potential Unused or Orphaned Features

### Components Potentially Unused
(Requires deeper scan - to be documented in Step 9)

### Routes with No Navigation Entry
- None identified (all routes have sidebar links)

### Features Referenced but Incomplete
1. **Messaging Send Functionality**: UI exists, button doesn't trigger POST
2. **WebSocket Real-time**: Connection fails with 400 errors (messaging, live streaming)
3. **Typing Indicators**: Code exists but may not work due to WebSocket issues
4. **Read Receipts**: Code exists but may not work due to WebSocket issues

### Features in Code but Not Visible in UI
(To be documented in Step 9 codebase scan)

---

## Navigation Structure

### Sidebar Navigation (Desktop)
- Home (`/`)
- Search (`/search`)
- Explore (`/explore`)
- Reels (`/reels`)
- Messages (`/messages`)
- Notifications (`/notifications`)
- Live (`/live-events`)
- Jobs (`/jobs`)
- Create (`/create`)
- Profile (`/profile`)
- More (expandable)

### Mobile Navigation (Bottom Bar)
- Home
- Search
- Create
- Messages (or Notifications)
- Profile

### Special Navigation
- Logo → Home
- Post author avatar/username → User profile (`/u/:username`)
- Admin dashboard link on `/auth` page (admin users only)

---

## Backend API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/:id` - Get user by ID or username
- `GET /api/users/:id/stats` - Get user stats (followers, following)
- `PUT /api/users/me` - Update own profile
- `POST /api/users/:id/follow` - Follow user
- `POST /api/users/:id/unfollow` - Unfollow user

### Posts
- `GET /api/posts` - Get personalized feed or user posts
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like post
- `DELETE /api/posts/:id/like` - Unlike post

### Comments
- `GET /api/posts/:id/comments` - Get post comments
- `POST /api/posts/:id/comments` - Create comment
- `DELETE /api/comments/:id` - Delete comment

### Messages
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Send message
- `PUT /api/conversations/:id/read` - Mark conversation as read

### Jobs
- `GET /api/jobs` - List jobs
- `POST /api/jobs` - Create job (studio)
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Live Events
- `GET /api/live-events` - List live events
- `POST /api/live-events` - Create event
- `POST /api/live-events/:id/join` - Join event
- `POST /api/live-events/:id/leave` - Leave event

### Admin
- `GET /api/admin/users` - List users (filtered)
- `GET /api/admin/pending-users` - List pending users
- `PUT /api/admin/users/:id/approve` - Approve user
- `PUT /api/admin/users/:id/reject` - Reject user

### Studio-Artist Connections
- `POST /api/studio-approvals` - Create connection request
- `GET /api/studio-approvals` - List requests
- `PUT /api/studio-approvals/:id/approve` - Approve request
- `PUT /api/studio-approvals/:id/reject` - Reject request
- `GET /api/studios/:id/artists` - Get studio's artists
- `GET /api/artists/:id/studio` - Get artist's studio

### AI Recommendations
- `POST /api/ai/recommendations` - Get tattoo design recommendations

---

## Database Schema Summary

**Total Tables**: 22+

**Core Tables**:
- users, profiles
- posts, comments, likes, post_likes
- follows
- conversations, messages, conversation_participants
- jobs, job_applications
- portfolio_items
- live_events, live_event_participants, live_event_comments
- studio_approval_requests
- stories, story_highlights
- hashtags, post_hashtags
- notifications

**Indexes**: Composite indexes on join tables, foreign key indexes for performance

---

## External Dependencies

1. **Cloudinary**: Media storage and CDN
2. **OpenAI API**: AI tattoo design recommendations
3. **Neon PostgreSQL**: Serverless database provider
4. **JWT**: Authentication tokens
5. **WebSocket (ws)**: Real-time messaging and live streaming

---

## Known Issues & Technical Debt

### Critical
1. **Messaging send button**: Not triggering POST request
2. **WebSocket connections**: Failing with 400 errors

### High
1. **Notifications API**: Intermittent 500 errors
2. **TypeScript LSP**: 59 diagnostics in profile.tsx

### Medium
1. **Registration form**: Playwright automation issues (testing-only)

### Low
1. **Debug logging**: Still present in chat-window.tsx

---

**Document Version**: 1.0  
**Last Updated**: November 20, 2025  
**Next Update**: After Steps 3-9 completion
