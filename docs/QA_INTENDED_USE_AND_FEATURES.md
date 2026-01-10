# Inktagram - Intended Use & Features

## Product Vision
Inktagram is a production-ready social community platform for the tattoo industry, connecting artists, studios, and enthusiasts. It combines social media features (feeds, stories, messaging) with professional tools (portfolios, bookings, job boards).

---

## User Roles & Intended Workflows

### 1. ADMIN
**Purpose**: Platform moderation and user verification

**Workflows**:
- [ ] Login to admin dashboard
- [ ] View pending artist/studio verifications
- [ ] Approve or reject verification requests
- [ ] View all verified and rejected users
- [ ] Filter users by status and role

**Permissions**:
- Access admin dashboard
- Approve/reject user verifications
- View all users regardless of verification status

---

### 2. ARTIST
**Purpose**: Showcase tattoo work, get booked, find jobs

**Workflows**:
- [ ] Register as artist (requires admin approval)
- [ ] Create and manage profile (bio, avatar, banner, social links)
- [ ] Build portfolio (add/edit/delete work with images, descriptions, categories)
- [ ] Create posts, reels, and stories to showcase work
- [ ] Receive and manage bookings from clients
- [ ] Create flash sales with special pricing
- [ ] Go live for real-time engagement
- [ ] Browse and apply to studio job postings
- [ ] Request affiliation with studios
- [ ] Get AI-powered tattoo design recommendations
- [ ] Engage with community (like, comment, follow)
- [ ] Direct message clients and other users
- [ ] View notifications

**Permissions**:
- Full content creation (posts/reels/stories/portfolio)
- Manage own bookings
- Create flash sales
- Apply to jobs
- Request studio affiliations

---

### 3. STUDIO
**Purpose**: Manage studio presence, hire artists, promote services

**Workflows**:
- [ ] Register as studio (requires admin approval)
- [ ] Create and manage studio profile
- [ ] Build studio portfolio
- [ ] Create posts and stories
- [ ] Post job openings
- [ ] Review and manage artist affiliation requests
- [ ] View affiliated artists
- [ ] Engage with community
- [ ] Direct message users

**Permissions**:
- Content creation (posts/stories)
- Create/manage job postings
- Approve/reject artist affiliations
- Portfolio management

---

### 4. ENTHUSIAST
**Purpose**: Discover tattoo inspiration, book artists, engage with community

**Workflows**:
- [ ] Register as enthusiast (no approval needed)
- [ ] Browse and discover artists/studios
- [ ] View portfolios and posts
- [ ] Save favorite posts to collections
- [ ] Book appointments with artists
- [ ] Get AI tattoo recommendations
- [ ] View flash sales and special offers
- [ ] Create posts and stories
- [ ] Follow favorite artists and studios
- [ ] Direct message users
- [ ] Watch live streams
- [ ] Search for artists by style/location

**Permissions**:
- Content creation (posts/stories)
- Book artists
- Save posts
- Full discovery access

---

## Feature Acceptance Criteria

### Authentication & Registration
| Feature | Criteria |
|---------|----------|
| Register | Email, username, password, role selection; validation; unique checks |
| Login | Email + password; JWT token returned |
| Logout | Token invalidation |
| Role-based access | Routes protected by role; admin approval for ARTIST/STUDIO |

### Profile
| Feature | Criteria |
|---------|----------|
| View profile | Avatar, banner, bio, stats (followers/following/posts) |
| Edit profile | Update all fields; avatar/banner upload |
| Profile tabs | Posts, Videos, Portfolio sections |
| Follow/unfollow | Toggle button with state sync |

### Feed & Posts
| Feature | Criteria |
|---------|----------|
| Home feed | Personalized feed from followed users |
| Featured carousel | Admin-curated featured posts |
| For You rail | AI-powered recommendations |
| Create post | Text + optional media; type selection (post/reel/story) |
| Like/unlike | Toggle with count update |
| Comment | Add/delete comments |
| Save/bookmark | Add to collections |

### Stories
| Feature | Criteria |
|---------|----------|
| Create story | Upload media; 24hr expiry |
| View stories | Story circles at feed top; fullscreen viewer |
| Auto-cleanup | Expired stories removed automatically |

### Discovery
| Feature | Criteria |
|---------|----------|
| Explore page | Grid of users with role filter |
| Style filter | Filter artists by tattoo style |
| Location filter | Case-insensitive location search |
| URL persistence | Filters persist in URL query params |

### Messaging
| Feature | Criteria |
|---------|----------|
| Conversation list | Show all threads with last message |
| Chat | Real-time messaging via WebSocket |
| Media messages | Send images in chat |

### Portfolio
| Feature | Criteria |
|---------|----------|
| View portfolio | Grid of work with images, titles, categories |
| Add item | Title, description, image, category |
| Edit/delete | Modify or remove items |

### Bookings
| Feature | Criteria |
|---------|----------|
| Create booking | Select artist, date, description |
| Manage bookings | Approve/reject/complete status flow |
| Payment tracking | Deposit and full payment status |
| Reminders | Automated reminder notifications |

### Jobs
| Feature | Criteria |
|---------|----------|
| View listings | List of active jobs |
| Job details | Full description, salary, studio info |
| Apply | Submit application (artists only) |
| Create job | Studios create postings |

### Flash Sales
| Feature | Criteria |
|---------|----------|
| View sales | Grid with countdown timers |
| Urgency indicators | "Ending Soon" / "Just Added" badges |
| Pricing display | Original vs flash price |

### Live Streaming
| Feature | Criteria |
|---------|----------|
| Schedule stream | Create event with title, scheduled time |
| Go live | Start/stop stream controls |
| View streams | List of live/scheduled events |

### Notifications
| Feature | Criteria |
|---------|----------|
| View notifications | Grouped by day (Today, Yesterday, etc.) |
| Inline actions | Follow back, view post buttons |
| Mark as read | Individual and bulk read marking |

### AI Recommendations
| Feature | Criteria |
|---------|----------|
| Get recommendations | Input preferences, receive AI suggestions |
| Display results | Styles, placements, colors, aftercare tips |

### Admin Dashboard
| Feature | Criteria |
|---------|----------|
| View pending users | List users awaiting verification |
| Approve/reject | Update verification status |
| Filter users | By status (pending/approved/rejected) and role |

---

## Non-Functional Requirements

### Performance
- [ ] Feed loads within 2 seconds
- [ ] Images optimized with proper sizing
- [ ] Pagination on large lists
- [ ] No N+1 query issues

### Security
- [ ] JWT authentication on protected routes
- [ ] Password hashing with bcrypt
- [ ] Input validation on all forms
- [ ] Role-based access control
- [ ] SQL injection prevention

### UX/Accessibility
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Loading states on all async operations
- [ ] Error handling with user feedback
- [ ] Keyboard navigation support
- [ ] Proper focus management

### Design
- [ ] Clean, minimalist black-and-white aesthetic
- [ ] Consistent typography and spacing
- [ ] Large, bold imagery
- [ ] Editorial magazine-style layout
