# Inktagram - Application Structure Map

## User Roles & Permissions

### 1. GUEST (Not Logged In)
- **Access**: Public routes only
- **Permissions**: View-only for public content
- **Available Routes**: `/auth`

### 2. ENTHUSIAST (Default Role)
- **Access**: Full social features
- **Permissions**: 
  - Create/view/like/comment on posts
  - Follow users
  - Send messages
  - View live streams
  - No approval required for account activation
- **Restrictions**: Cannot create portfolio items, cannot post jobs, cannot apply to jobs

### 3. ARTIST
- **Access**: All Enthusiast features + professional tools
- **Permissions**:
  - All Enthusiast permissions
  - Create portfolio items
  - Apply to studio jobs
  - Request connection to studios
- **Approval Required**: YES - Account starts as PENDING, must be approved by ADMIN
- **Verified Badge**: Displayed when approved

### 4. STUDIO
- **Access**: All Enthusiast features + hiring tools
- **Permissions**:
  - All Enthusiast permissions
  - Create job postings
  - Approve/reject artist connection requests
  - View connected artists
- **Approval Required**: YES - Account starts as PENDING, must be approved by ADMIN
- **Verified Badge**: Displayed when approved

### 5. ADMIN
- **Access**: All routes + admin dashboard
- **Permissions**:
  - All platform permissions
  - Approve/reject pending artists and studios
  - Manage users
- **Test Credentials**: admin@inktagram.com / Admin1234!

---

## Frontend Routes

### Public Routes (No Auth Required)
| Route | Component | Description |
|-------|-----------|-------------|
| `/auth` | Auth | Login/Register page |

### Protected Routes (Auth Required)
| Route | Component | Description | Role Restrictions |
|-------|-----------|-------------|-------------------|
| `/` | Home | Feed of posts from followed users | All authenticated |
| `/search` | Search | Search users, posts, hashtags | All authenticated |
| `/explore` | Explore | Discover trending posts/reels | All authenticated |
| `/reels` | Explore | Same as explore (alias) | All authenticated |
| `/messages` | Messages | Real-time messaging system | All authenticated |
| `/notifications` | Notifications | Activity notifications | All authenticated |
| `/profile` | Profile | Current user's profile | All authenticated |
| `/profile/:username` | Profile | Other user's profile | All authenticated |
| `/u/:username` | Profile | Other user's profile (alias) | All authenticated |
| `/live-events` | LiveEvents | Live streaming events | All authenticated |
| `/live` | LiveEvents | Live streaming (alias) | All authenticated |
| `/jobs` | Jobs | Job board (view/post/apply) | All authenticated |
| `/create` | Create | Create new post/reel/story | All authenticated |
| `/admin` | AdminDashboard | User approval management | ADMIN only |

---

## API Endpoints

### Authentication
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login user |
| POST | `/api/auth/logout` | Auth Required | Logout user |

### Users
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Public | List users (with filters) |
| GET | `/api/users/me` | Auth Required | Get current user |
| GET | `/api/users/:id` | Public | Get user by ID or username |
| PUT | `/api/users/me` | Auth Required | Update current user |
| POST | `/api/users/:id/follow` | Auth Required | Follow a user |
| POST | `/api/users/:id/unfollow` | Auth Required | Unfollow a user |
| GET | `/api/users/:id/stats` | Public | Get user stats (posts/followers/following) |

### Posts
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/posts` | Auth Required | Get feed posts |
| GET | `/api/posts/:id` | Public | Get single post |
| POST | `/api/posts` | Auth Required | Create post |
| DELETE | `/api/posts/:id` | Auth Required | Delete post (own only) |
| POST | `/api/posts/:id/like` | Auth Required | Like a post |
| DELETE | `/api/posts/:id/like` | Auth Required | Unlike a post |

### Comments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/posts/:postId/comments` | Public | Get post comments |
| POST | `/api/posts/:postId/comments` | Auth Required | Add comment |
| DELETE | `/api/posts/:postId/comments/:commentId` | Auth Required | Delete comment (own only) |

### Stories
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/stories` | Auth Required | Create story (24h expiry) |
| GET | `/api/stories` | Auth Required | Get stories from followed users |
| GET | `/api/stories/:userId` | Public | Get user's stories |

### Messaging
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/conversations` | Auth Required | Get user's conversations |
| POST | `/api/conversations` | Auth Required | Create conversation |
| GET | `/api/conversations/:id/messages` | Auth Required | Get conversation messages |
| POST | `/api/conversations/:id/messages` | Auth Required | Send message |
| PUT | `/api/conversations/:id/read` | Auth Required | Mark conversation as read |
| GET | `/api/messages` | Auth Required | Get recent messages |

### Portfolio (Artist Only)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/portfolio/:artistId` | Public | Get artist portfolio |
| POST | `/api/portfolio` | ARTIST | Add portfolio item |
| PUT | `/api/portfolio/:id` | ARTIST | Update portfolio item |
| DELETE | `/api/portfolio/:id` | ARTIST | Delete portfolio item |

### Jobs
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/jobs` | Public | List job postings |
| POST | `/api/jobs` | STUDIO | Create job posting |
| POST | `/api/jobs/:jobId/apply` | ARTIST | Apply to job |

### Live Streaming
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/livestream-events` | Public | List live events |
| POST | `/api/livestream-events` | Auth Required | Create live event |
| PUT | `/api/livestream-events/:id` | Auth Required | Update live event |
| POST | `/api/live-events/:eventId/start` | Auth Required | Start live stream |
| POST | `/api/live-events/:eventId/end` | Auth Required | End live stream |

### Search & Discovery
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/search` | Public | Search users/posts/hashtags |
| GET | `/api/hashtags/trending` | Public | Get trending hashtags |
| GET | `/api/discovery/trending` | Public | Get trending posts |

### Notifications
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/notifications` | Auth Required | Get user notifications |
| POST | `/api/notifications/:id/read` | Auth Required | Mark notification as read |
| POST | `/api/notifications/read-all` | Auth Required | Mark all as read |

### Media Upload
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/upload` | Auth Required | Upload image/video to Cloudinary |
| DELETE | `/api/upload/:publicId` | Auth Required | Delete media from Cloudinary |

### AI Features
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/ai/tattoo-recommendations` | Auth Required | Get AI tattoo design suggestions |

### Artist-Studio Connections
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/studio-approvals` | ARTIST | Request studio connection |
| GET | `/api/studio-approvals` | Auth Required | Get approval requests |
| PUT | `/api/studio-approvals/:id/approve` | STUDIO | Approve artist request |
| PUT | `/api/studio-approvals/:id/reject` | STUDIO | Reject artist request |
| GET | `/api/studios/:studioId/artists` | Public | Get studio's connected artists |
| GET | `/api/artists/:artistId/studio` | Public | Get artist's studio connection |

### Admin (ADMIN Only)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/admin/users?status=X` | ADMIN | List users by verification status |
| GET | `/api/admin/pending-users` | ADMIN | Get pending users (legacy endpoint) |
| PUT | `/api/admin/users/:id/approve` | ADMIN | Approve pending user |
| PUT | `/api/admin/users/:id/reject` | ADMIN | Reject pending user |

---

## WebSocket Endpoints

### Real-time Messaging
- **Path**: `/ws`
- **Features**: 
  - Message send/receive
  - Typing indicators
  - Read receipts
  - Message reactions
- **Heartbeat**: Every 30s

### Live Streaming
- **Path**: `/ws/live`
- **Features**:
  - Join/leave events
  - Real-time comments
  - Viewer tracking
  - Reactions
- **Heartbeat**: Every 30s

---

## Database Entities

### Core Entities
1. **users** - User accounts with authentication
2. **profiles** - Extended user information
3. **posts** - Content posts (POST, REEL, STORY types)
4. **comments** - Post comments
5. **post_likes** - Post like tracking
6. **follows** - User following relationships
7. **hashtags** - Hashtag definitions
8. **post_hashtags** - Post-hashtag relationships

### Messaging Entities
9. **conversations** - Chat conversations
10. **conversation_participants** - Conversation membership
11. **messages** - Chat messages

### Stories & Highlights
12. **stories** - 24-hour temporary stories
13. **story_highlights** - Permanent story collections
14. **story_highlight_items** - Stories in highlights

### Professional Features
15. **portfolios** - Artist portfolio items
16. **studio_approval_requests** - Artist-studio connection requests
17. **jobs** - Job postings
18. **job_applications** - Job application tracking

### Live Streaming
19. **livestream_events** - Live stream event definitions
20. **livestream_participants** - Stream viewer tracking
21. **livestream_comments** - Stream chat messages
22. **livestream_reactions** - Stream reaction tracking

### Notifications
23. **notifications** - User activity notifications

---

## Key Features

### 1. Feed Interaction
- View posts from followed users
- Clickable author avatars/usernames navigate to `/u/:username`
- Like, comment, share functionality
- Filter by post type (POST/REEL/STORY)

### 2. Profile System
- Instagram-inspired layout with gradient-bordered avatars
- Three content tabs: Posts, Reels, Stories
- Real-time stats (posts count, followers, following)
- Role-specific information:
  - Studios: Address, website, connected artists
  - Artists: Studio connection or "Connect to Studio" button
- Verified badge for approved artists/studios
- Optional banner image with grid overlay

### 3. Artist-Studio Connection Workflow
- Artists search and request connection to studios
- Studios approve/reject requests
- Connected artists shown as circular highlights (Instagram-style)
- Database tracks all requests with PENDING/APPROVED/REJECTED status

### 4. Admin Verification System
- Four-tab dashboard: Pending / Approved / Rejected / All
- Artists and Studios require admin approval
- Enthusiasts activate immediately (no approval needed)
- Approved users receive verified star badge
- Admin credentials: admin@inktagram.com / Admin1234!

### 5. Real-time Messaging
- One-on-one and group conversations
- WebSocket-based instant delivery
- Typing indicators
- Read receipts
- Message reactions

### 6. Live Streaming
- Create and host live events
- Real-time viewer tracking
- Live chat comments
- Emoji reactions
- WebSocket-based streaming

### 7. Job Board
- Studios post job openings
- Artists apply to jobs
- Application tracking and management

### 8. AI Tattoo Recommendations
- OpenAI-powered design suggestions
- Based on style, placement, size preferences
- Includes aftercare tips and recommendations

### 9. Stories System
- 24-hour temporary stories
- Automatic cleanup via background scheduler
- Story highlights for permanent collections
- Cloudinary media management

---

## Design System

### Aesthetic
- Clean, minimalist black-and-white editorial style
- Inspired by nestmag.online
- Pure white backgrounds
- Black text with minimal borders
- Reduced border radius for sharper edges

### Navigation
- **Desktop**: SidebarNav (fixed left sidebar)
  - Uppercase logo
  - Minimal spacing
  - Small icons (5x5)
  - Clean hover states
- **Mobile**: MobileNav (bottom navigation)
  - Icon-only design
  - No labels for minimal footprint

### Components
- shadcn/ui with Radix UI primitives
- Tailwind CSS for styling
- Lucide React icons
- React Icons for company logos

---

## External Services

1. **PostgreSQL (Neon)** - Primary database
2. **Cloudinary** - Media storage and CDN
3. **OpenAI API** - AI tattoo recommendations
4. **JWT** - Authentication tokens

---

## Test Users

### Admin
- Email: admin@inktagram.com
- Password: Admin1234!

### Seed Users
- Pattern: seed_[type]_[number]@inktagram.com
- Password: Test1234!
- 20 PENDING artists
- 20 PENDING studios
- Various enthusiasts

---

## Verification Status Flow

```
Registration (ARTIST/STUDIO) → PENDING
                ↓
        Admin Dashboard
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
APPROVED              REJECTED
(isVerified=true)     (blocked)
(⭐ verified badge)
```

Registration (ENTHUSIAST) → Auto-approved, no verification needed
