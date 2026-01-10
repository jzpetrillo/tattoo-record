# Inktagram - Application Map

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Neon serverless) + Drizzle ORM
- **Auth**: JWT-based with bcrypt hashing
- **State Management**: Zustand (auth) + TanStack Query (server state)
- **UI Framework**: shadcn/ui + Radix UI + Tailwind CSS
- **File Storage**: Cloudinary (media uploads)
- **Real-time**: WebSockets (messaging + live streaming)
- **AI**: OpenAI API (tattoo recommendations)

---

## User Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| ADMIN | Platform administrator | Approve/reject artists & studios, manage users |
| ARTIST | Tattoo artist | Create posts/reels/stories, portfolio, jobs applications, flash sales, bookings, go live |
| STUDIO | Tattoo studio | Create posts/stories, jobs, manage artist affiliations, portfolio |
| ENTHUSIAST | Tattoo fan | Create posts/stories, save posts, book artists, follow users |

---

## Frontend Routes

| Route | Component | Auth Required | Roles | Purpose |
|-------|-----------|---------------|-------|---------|
| `/` | Home | Yes | All | Main feed with stories, featured carousel, For You rail |
| `/auth` | Auth | No | - | Login/Register |
| `/search` | Search | Yes | All | Global search (users, posts, hashtags) |
| `/explore` | Explore | Yes | All | Discover users with filters (role, style, location) |
| `/messages` | Messages | Yes | All | Direct messaging |
| `/notifications` | Notifications | Yes | All | Notification feed with day grouping |
| `/profile` | Profile | Yes | All | User's own profile |
| `/profile/:username` | Profile | Yes | All | View any user's profile |
| `/u/:username` | Profile | Yes | All | Alternative profile route |
| `/live-events` | LiveEvents | Yes | All | Live streaming page |
| `/live` | LiveEvents | Yes | All | Alternative live route |
| `/jobs` | Jobs | Yes | All | Job listings |
| `/jobs/:id` | JobDetail | Yes | All | Job details + apply |
| `/create` | Create | Yes | All | Create post page |
| `/reels` | Reels | Yes | All | Short video content |
| `/saved` | SavedPosts | Yes | All | Saved/bookmarked posts |
| `/flash-sales` | FlashSales | Yes | All | Flash tattoo sales |
| `/bookings` | Bookings | Yes | All | Appointment management |
| `/ai-recommendations` | AIRecommendations | Yes | All | AI tattoo design suggestions |
| `/admin` | AdminDashboard | Yes | ADMIN | Admin panel |

---

## API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login user |
| POST | `/api/auth/logout` | Yes | Logout user |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | No | List users (with filters) |
| GET | `/api/users/me` | Yes | Get current user |
| GET | `/api/users/:id` | No | Get user by ID or username |
| PUT | `/api/users/me` | Yes | Update current user |
| GET | `/api/users/:id/stats` | No | Get user stats (followers/following) |
| POST | `/api/users/:id/follow` | Yes | Follow user |
| POST | `/api/users/:id/unfollow` | Yes | Unfollow user |
| GET | `/api/users/:id/is-following` | Yes | Check follow status |

### Posts & Feed
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/posts` | Yes | Get feed (personalized or by author) |
| GET | `/api/posts/:id` | No | Get single post |
| POST | `/api/posts` | Yes | Create post |
| DELETE | `/api/posts/:id` | Yes | Delete post |
| POST | `/api/posts/:id/like` | Yes | Like post |
| DELETE | `/api/posts/:id/like` | Yes | Unlike post |
| GET | `/api/for-you` | Yes | Get For You recommendations |
| GET | `/api/discovery/trending` | No | Get trending posts |

### Comments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/posts/:postId/comments` | No | Get post comments |
| POST | `/api/posts/:postId/comments` | Yes | Create comment |
| DELETE | `/api/posts/:postId/comments/:commentId` | Yes | Delete comment |

### Saved Posts
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/saved-posts` | Yes | Get saved posts |
| POST | `/api/saved-posts` | Yes | Save a post |
| DELETE | `/api/saved-posts/:postId` | Yes | Unsave a post |
| GET | `/api/saved-posts/check/:postId` | Yes | Check if post is saved |
| GET | `/api/saved-posts/collections` | Yes | Get collections |

### Stories
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/stories` | Yes | Get active stories |
| GET | `/api/stories/:userId` | No | Get user's stories |
| POST | `/api/stories` | Yes | Create story |

### Messages
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/conversations` | Yes | Get conversations |
| POST | `/api/conversations` | Yes | Create conversation |
| GET | `/api/conversations/:id/messages` | Yes | Get messages |
| POST | `/api/conversations/:id/messages` | Yes | Send message |
| PUT | `/api/conversations/:id/read` | Yes | Mark as read |
| GET | `/api/messages` | Yes | Get/create conversation with user |

### Portfolio
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/api/portfolio/:artistId` | No | - | Get portfolio items |
| POST | `/api/portfolio` | Yes | ARTIST | Create portfolio item |
| PUT | `/api/portfolio/:id` | Yes | ARTIST | Update portfolio item |
| DELETE | `/api/portfolio/:id` | Yes | ARTIST | Delete portfolio item |

### Jobs
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/api/jobs` | No | - | List jobs |
| GET | `/api/jobs/:id` | No | - | Get job details |
| POST | `/api/jobs` | Yes | STUDIO | Create job |
| PUT | `/api/jobs/:id` | Yes | STUDIO | Update job |
| DELETE | `/api/jobs/:id` | Yes | STUDIO | Delete job |
| POST | `/api/jobs/:jobId/apply` | Yes | ARTIST | Apply to job |

### Flash Sales
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/api/flash-sales` | No | - | List flash sales |
| GET | `/api/flash-sales/:id` | No | - | Get flash sale |
| POST | `/api/flash-sales` | Yes | ARTIST | Create flash sale |
| PUT | `/api/flash-sales/:id` | Yes | ARTIST | Update flash sale |

### Bookings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bookings` | Yes | Get bookings |
| GET | `/api/bookings/:id` | Yes | Get booking details |
| POST | `/api/bookings` | Yes | Create booking |
| PUT | `/api/bookings/:id` | Yes | Update booking |
| DELETE | `/api/bookings/:id` | Yes | Delete booking |
| POST | `/api/bookings/:id/mark-deposit-paid` | Yes | Mark deposit paid |
| POST | `/api/bookings/:id/mark-fully-paid` | Yes | Mark fully paid |
| POST | `/api/bookings/process-reminders` | No | Process booking reminders |

### Live Streaming
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/livestream-events` | No | List events |
| POST | `/api/livestream-events` | Yes | Create event |
| PUT | `/api/livestream-events/:id` | Yes | Update event |
| POST | `/api/live-events/:eventId/start` | Yes | Start stream |
| POST | `/api/live-events/:eventId/end` | Yes | End stream |

### Search & Discovery
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/search` | No | Global search |
| GET | `/api/hashtags/trending` | No | Trending hashtags |

### Notifications
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | Yes | Get notifications |
| POST | `/api/notifications/:id/read` | Yes | Mark as read |
| POST | `/api/notifications/read-all` | Yes | Mark all as read |

### Upload
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/upload` | Yes | Upload media file |
| DELETE | `/api/upload/:publicId` | Yes | Delete media |

### AI
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/tattoo-recommendations` | Yes | Get AI tattoo recommendations |

### Studio Approvals
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/api/studio-approvals` | Yes | ARTIST | Request studio affiliation |
| GET | `/api/studio-approvals` | Yes | - | Get approval requests |
| PUT | `/api/studio-approvals/:id/approve` | Yes | STUDIO | Approve request |
| PUT | `/api/studio-approvals/:id/reject` | Yes | STUDIO | Reject request |
| GET | `/api/studios/:studioId/artists` | No | - | Get studio's artists |
| GET | `/api/artists/:artistId/studio` | No | - | Get artist's studio |

### Admin
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/api/admin/users` | Yes | ADMIN | Get users for admin |
| GET | `/api/admin/pending-users` | Yes | ADMIN | Get pending verifications |
| PUT | `/api/admin/users/:id/approve` | Yes | ADMIN | Approve user |
| PUT | `/api/admin/users/:id/reject` | Yes | ADMIN | Reject user |

---

## Database Schema (22+ tables)

### Core Tables
- `users` - User accounts with roles, profiles, social handles
- `studio_profiles` - Studio-specific profile data
- `artist_profiles` - Artist-specific profile data (styles, rates)

### Content Tables
- `posts` - Posts, reels, stories (with media JSONB)
- `post_likes` - Like tracking
- `comments` - Post comments
- `stories` - Ephemeral stories (24hr expiry)
- `story_highlights` - Saved story collections
- `highlight_stories` - M2M for highlights

### Social Tables
- `follows` - Follow relationships
- `notifications` - User notifications
- `post_shares` - Share tracking
- `saved_posts` - Bookmarks

### Messaging Tables
- `conversations` - Chat threads
- `conversation_participants` - Thread members
- `messages` - Chat messages

### Professional Tables
- `portfolio_items` - Artist portfolio
- `job_postings` - Studio job listings
- `job_applications` - Job applications
- `flash_sales` - Limited-time offers
- `bookings` - Appointments

### Live Streaming Tables
- `livestream_events` - Stream events
- `livestream_participants` - Viewers
- `live_comments` - Chat messages
- `live_reactions` - Emoji reactions

### Discovery Tables
- `hashtags` - Tag definitions
- `post_hashtags` - M2M for posts
- `consultation_requests` - Artist consultations

### Other Tables
- `studio_approval_requests` - Artist-studio affiliations

---

## Key UI Components

### Layout
- `SidebarNav` - Main navigation (desktop)
- `MobileNav` - Bottom navigation (mobile)
- `Marquee` - Scrolling text
- `SuggestedUsers` - User recommendations

### Content
- `PostCard` - Post display with actions
- `PostFeed` - Feed container
- `CreatePostModal` - Post/reel/story creation
- `StoriesBar` - Story circles
- `StoryViewer` - Story display modal
- `ForYouRail` - Personalized recommendations

### Messaging
- `ConversationList` - Chat threads
- `ChatWindow` - Message display

### Live
- `LiveStreamCard` - Stream preview

---

## External Integrations
1. **Cloudinary** - Image/video storage and CDN
2. **OpenAI** - AI tattoo recommendations (optional)
3. **WebSockets** - Real-time messaging and live streaming
