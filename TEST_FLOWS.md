# Tattoo Record - Test Flows by User Role

**Generated**: November 20, 2025  
**Purpose**: Complete user flow documentation for end-to-end testing

---

## Legend

- ✅ **Critical Flow** - Business-critical functionality
- ⚠️ **Important Flow** - High-value feature
- 📋 **Standard Flow** - Regular functionality
- 🔍 **Edge Case** - Error handling / validation

---

## GUEST (Unauthenticated) Flows

### ✅ GU-1: First-Time Visitor Flow
**Path**: Landing → View Auth Page
1. Navigate to root URL (`/`)
2. **Expected**: Auto-redirect to `/auth`
3. **Expected**: See login and registration forms
4. **Expected**: No access to protected routes
5. **Status**: ✅ Tested and working

### ✅ GU-2: User Login Flow
**Path**: Auth Page → Login → Dashboard
1. Navigate to `/auth`
2. Click "Login" tab (if applicable)
3. Enter valid credentials
4. Click "Login" button
5. **Expected**: Redirect to `/` (home feed)
6. **Expected**: See personalized feed
7. **Expected**: Sidebar navigation available
8. **Status**: ✅ Tested and working

### ✅ GU-3: User Registration Flow
**Path**: Auth Page → Register → Dashboard
1. Navigate to `/auth`
2. Click "Register" tab (if applicable)
3. Fill registration form:
   - Email
   - Username
   - Password
   - Role (Enthusiast/Artist/Studio)
   - Bio (optional)
   - Location (optional)
4. Click "Register" button
5. **Expected**:
   - If Enthusiast: Immediate login → home feed
   - If Artist/Studio: Account created → pending approval message
6. **Status**: ⚠️ Form has Playwright automation issues (API works)

### 🔍 GU-4: Invalid Login Flow
**Path**: Auth Page → Invalid Credentials → Error
1. Navigate to `/auth`
2. Enter invalid credentials:
   - Wrong password
   - Invalid email format
   - Empty fields
3. Click "Login"
4. **Expected**: Error message displayed
5. **Expected**: No crash, stays on `/auth`
6. **Status**: ✅ Tested and working

### 📋 GU-5: Direct Protected Route Access
**Path**: Attempt Protected Route → Redirect to Auth
1. Direct URL to `/profile`, `/messages`, etc.
2. **Expected**: Redirect to `/auth`
3. **Expected**: Cannot access without authentication
4. **Status**: ✅ Tested and working

---

## ENTHUSIAST Flows

### ✅ EN-1: Browse Home Feed Flow
**Path**: Login → View Feed → Interact with Posts
1. Login as Enthusiast
2. Land on `/` (home feed)
3. See posts from followed users
4. **Actions Available**:
   - Like post (heart icon)
   - Comment on post (comment icon)
   - Share post (share icon, if implemented)
   - Click author to view profile
5. **Status**: ✅ Tested and working (likes, comments)

### ✅ EN-2: Like/Unlike Post Flow
**Path**: Feed → Like Post → Unlike Post
1. View post in feed
2. Click heart icon (like)
3. **Expected**: Heart fills, count increments immediately (optimistic update)
4. Click heart again (unlike)
5. **Expected**: Heart empties, count decrements immediately
6. Refresh page
7. **Expected**: Final state matches last action (server authoritative)
8. **Status**: ✅ Tested and working (optimistic updates fixed)

### ✅ EN-3: Comment on Post Flow
**Path**: Feed → Open Comments → Add Comment → Submit
1. View post in feed
2. Click comment icon
3. **Expected**: Comment dialog opens
4. Type comment text
5. Click "Post" button
6. **Expected**: Comment appears in list immediately
7. **Expected**: Comment count increments
8. **Status**: ✅ Tested and working

### ✅ EN-4: View User Profile Flow
**Path**: Feed → Click Author → View Profile
1. View post in feed
2. Click author avatar or username
3. **Expected**: Navigate to `/u/:username`
4. **Expected**: See user profile with:
   - Avatar, username, verified badge (if approved)
   - Bio, location, stats
   - Content tabs (Posts, Reels, Stories)
   - Follow button
5. **Status**: ✅ Tested and working

### ⚠️ EN-5: Follow/Unfollow User Flow
**Path**: Profile → Follow → Unfollow
1. Navigate to user profile
2. Click "Follow" button
3. **Expected**: Button changes to "Following"
4. **Expected**: Follower count increments
5. Click "Following" button (unfollow)
6. **Expected**: Button changes to "Follow"
7. **Expected**: Follower count decrements
8. **Status**: ⏸️ Not tested

### ⚠️ EN-6: Search for Users/Content Flow
**Path**: Sidebar → Search → View Results
1. Click "Search" in sidebar
2. Navigate to `/search`
3. Enter search query (username, hashtag, content)
4. **Expected**: See search results
5. Click result to navigate
6. **Status**: ⏸️ Not tested

### ⚠️ EN-7: Explore Trending Content Flow
**Path**: Sidebar → Explore → Browse Content
1. Click "Explore" in sidebar
2. Navigate to `/explore` or `/reels`
3. **Expected**: See trending/recommended content
4. Browse and interact with content
5. **Status**: ⏸️ Not tested

### ⚠️ EN-8: Send Message Flow
**Path**: Messages → Select Conversation → Send Message
1. Click "Messages" in sidebar
2. Navigate to `/messages`
3. Select existing conversation OR start new conversation
4. Type message in input
5. Click send button
6. **Expected**: Message appears in thread immediately
7. **Expected**: Input clears
8. **Status**: ❌ Broken - send button doesn't trigger POST

### ⚠️ EN-9: View Notifications Flow
**Path**: Sidebar → Notifications → View/Mark Read
1. Click "Notifications" in sidebar
2. Navigate to `/notifications`
3. **Expected**: See list of notifications
4. Click notification to navigate to source
5. Mark as read
6. **Status**: ⚠️ API returns 500 errors

### 📋 EN-10: Update Own Profile Flow
**Path**: Profile → Edit → Save Changes
1. Navigate to `/profile` (own profile)
2. Click "Edit Profile" button (if available)
3. Update bio, location, links, avatar
4. Click "Save"
5. **Expected**: Changes persist
6. **Expected**: Profile displays updated info
7. **Status**: ⏸️ Not tested

### 📋 EN-11: Create Post Flow
**Path**: Sidebar → Create → Upload → Publish
1. Click "Create" in sidebar
2. Navigate to `/create`
3. Upload media (image or video)
4. Add caption
5. Select post type (POST/REEL/STORY)
6. Click "Publish"
7. **Expected**: Post appears in feed
8. **Expected**: Navigate to feed showing new post
9. **Status**: ⏸️ Not tested

### 📋 EN-12: Logout Flow
**Path**: Sidebar → More → Logout
1. Click "More" in sidebar
2. Click "Logout" option
3. **Expected**: Redirect to `/auth`
4. **Expected**: Session cleared
5. **Expected**: Cannot access protected routes
6. **Status**: ✅ Tested and working

---

## ARTIST Flows

All Enthusiast flows PLUS:

### ✅ AR-1: Pending Approval Wait Flow
**Path**: Register as Artist → Wait for Admin Approval
1. Register account with role "Artist"
2. **Expected**: Account status = PENDING
3. **Expected**: Cannot access full features until approved (if enforced)
4. Admin approves account
5. **Expected**: Account status = APPROVED, isVerified = true
6. **Expected**: Verified badge appears on profile
7. **Status**: ✅ Tested and working (admin dashboard)

### ⚠️ AR-2: Connect to Studio Flow
**Path**: Profile → Connect to Studio → Send Request
1. Navigate to own profile `/profile`
2. Click "Connect to Studio" button
3. Search for studio by name
4. Select studio
5. Add optional introduction message
6. Click "Send Request"
7. **Expected**: Request sent, status = PENDING
8. **Expected**: Button changes to "Pending" or "Connected" after approval
9. **Status**: 📋 Documented, not E2E tested

### ⚠️ AR-3: View Connected Studio Flow
**Path**: Profile → See Studio Connection
1. Navigate to own profile (after studio approves)
2. **Expected**: See Building2 icon + studio name
3. Click studio name
4. **Expected**: Navigate to studio profile
5. **Status**: 📋 Documented, not E2E tested

### ⚠️ AR-4: Apply for Job Flow
**Path**: Jobs → View Job → Apply
1. Navigate to `/jobs`
2. Browse available jobs
3. Click job to view details
4. Click "Apply" button
5. Fill application form (cover letter, portfolio links)
6. Submit application
7. **Expected**: Application submitted
8. **Expected**: Can view application status
9. **Status**: ⏸️ Not tested

### ⚠️ AR-5: Create Portfolio Flow
**Path**: Profile → Portfolio → Add Work
1. Navigate to own profile
2. Click "Portfolio" tab or "Add Portfolio Item"
3. Upload images of tattoo work
4. Add description, style tags, placement info
5. Save portfolio item
6. **Expected**: Portfolio item appears on profile
7. **Status**: ⏸️ Not tested

### 📋 AR-6: Get AI Tattoo Recommendations Flow
**Path**: Feature Access → Input Preferences → View Recommendations
1. Access AI recommendations feature (button/page location TBD)
2. Fill preferences:
   - Tattoo style (traditional, realistic, etc.)
   - Placement (arm, back, etc.)
   - Size
   - Description/theme
3. Submit request
4. **Expected**: AI generates structured recommendations
5. **Expected**: See suggested styles, placements, colors, aftercare tips
6. **Status**: ⏸️ Not tested

---

## STUDIO Flows

All Enthusiast flows PLUS:

### ✅ ST-1: Pending Approval Wait Flow
**Path**: Register as Studio → Wait for Admin Approval
1. Register account with role "Studio"
2. **Expected**: Account status = PENDING
3. Admin approves account
4. **Expected**: Account status = APPROVED, isVerified = true
5. **Expected**: Verified badge appears on profile
6. **Status**: ✅ Tested and working (admin dashboard)

### ⚠️ ST-2: Approve Artist Connection Request Flow
**Path**: Profile → View Requests → Approve/Reject
1. Navigate to own profile
2. **Expected**: See pending connection requests section
3. Click "View Requests" or see list directly
4. Review artist request (name, bio, optional message)
5. Click "Approve" OR "Reject"
6. **Expected**: Artist moves to "Connected Artists" section
7. **Expected**: Artist's profile shows studio connection
8. **Status**: 📋 Documented, not E2E tested

### ⚠️ ST-3: View Connected Artists Flow
**Path**: Profile → Connected Artists Section
1. Navigate to own profile
2. **Expected**: See "Connected Artists" section
3. **Expected**: Artists displayed as circular highlights (Instagram-style)
4. Click artist avatar
5. **Expected**: Navigate to artist profile
6. **Status**: 📋 Documented, not E2E tested

### ⚠️ ST-4: Post Job Listing Flow
**Path**: Jobs → Create New Job → Publish
1. Navigate to `/jobs`
2. Click "Post New Job" button
3. Fill job form:
   - Title
   - Description
   - Compensation
   - Location
   - Requirements
4. Click "Publish"
5. **Expected**: Job appears in jobs board
6. **Expected**: Can manage applications
7. **Status**: ⏸️ Not tested

### ⚠️ ST-5: Manage Job Applications Flow
**Path**: Jobs → My Jobs → View Applications
1. Navigate to own job listings
2. Click job to view details
3. See list of applicants
4. Review applications (cover letters, portfolios)
5. Accept or decline applications
6. **Expected**: Applicant notified of decision
7. **Status**: ⏸️ Not tested

### 📋 ST-6: Update Studio Info Flow
**Path**: Profile → Edit → Update Studio Details
1. Navigate to own profile
2. Click "Edit Profile"
3. Update:
   - Address (location with MapPin icon)
   - Website (with Globe icon)
   - Social media links
   - Studio description
4. Save changes
5. **Expected**: Info displays on profile with proper icons
6. **Status**: ⏸️ Not tested

---

## ADMIN Flows

All application access PLUS:

### ✅ AD-1: Login to Admin Dashboard Flow
**Path**: Auth → Admin Login → Dashboard
1. Navigate to `/auth`
2. Click "Admin Access →" link
3. Login with admin credentials
4. **Expected**: Redirect to `/admin`
5. **Expected**: See admin dashboard with tabs
6. **Status**: ✅ Tested and working

### ✅ AD-2: View Pending Users Flow
**Path**: Admin Dashboard → Pending Tab
1. Navigate to `/admin`
2. Click "Pending" tab
3. **Expected**: See list of pending artists and studios
4. **Expected**: Each user shows:
   - Username, email, role
   - Bio, location
   - Registration date
   - Approve/Reject buttons
5. **Status**: ✅ Tested and working (112 pending users displayed)

### ✅ AD-3: Approve User Flow
**Path**: Admin Dashboard → Pending User → Approve
1. Navigate to `/admin` → Pending tab
2. Find user to approve
3. Click "Approve" button
4. **Expected**: User moves to "Approved" tab
5. **Expected**: User status = APPROVED, isVerified = true
6. **Expected**: User gets verified badge on profile
7. **Expected**: User can access full platform features
8. **Status**: ✅ Tested and working

### ✅ AD-4: Reject User Flow
**Path**: Admin Dashboard → Pending User → Reject
1. Navigate to `/admin` → Pending tab
2. Find user to reject
3. Click "Reject" button
4. **Expected**: User moves to "Rejected" tab
5. **Expected**: User status = REJECTED
6. **Expected**: User cannot access platform features (if enforced)
7. **Status**: ✅ Tested and working

### ⚠️ AD-5: Filter Users by Status Flow
**Path**: Admin Dashboard → Switch Tabs
1. Navigate to `/admin`
2. Click "All" tab → See all artists and studios
3. Click "Approved" tab → See only approved users
4. Click "Rejected" tab → See only rejected users
5. Click "Pending" tab → See only pending users
6. **Expected**: Filtering works correctly
7. **Status**: ✅ Tested and working

### ⚠️ AD-6: Filter Users by Role Flow
**Path**: Admin Dashboard → Role Dropdown
1. Navigate to `/admin`
2. Select "Artists" in role filter dropdown
3. **Expected**: See only artists
4. Select "Studios" in role filter
5. **Expected**: See only studios
6. Select "All" to reset
7. **Status**: ⏸️ Not tested (UI may not exist)

### 📋 AD-7: Manage All Content Flow
**Path**: Admin Access → Global Entity Management
1. Access admin-level entity views (if available)
2. View all posts, comments, messages (if admin can access)
3. Moderate content (delete inappropriate content)
4. Ban users (if available)
5. **Status**: ⏸️ Not tested (feature may not exist)

---

## LIVE STREAMING Flows (All Roles)

### ⚠️ LV-1: Create Live Event Flow
**Path**: Live → Create Event → Go Live
1. Navigate to `/live-events`
2. Click "Go Live" or "Create Event"
3. Fill event details:
   - Title
   - Description
4. Click "Start Streaming"
5. **Expected**: Live event starts
6. **Expected**: Event appears in live events list
7. **Expected**: WebSocket connection established
8. **Status**: ⏸️ Not tested

### ⚠️ LV-2: Join Live Event Flow
**Path**: Live Events → Browse → Join Stream
1. Navigate to `/live-events`
2. See list of active live events
3. Click event to join
4. **Expected**: Stream video loads
5. **Expected**: Viewer count increments
6. **Expected**: Can send real-time comments
7. **Status**: ⏸️ Not tested

### ⚠️ LV-3: Comment on Live Event Flow
**Path**: In Live Event → Send Comment
1. Join live event
2. Type comment in chat input
3. Press Enter or click Send
4. **Expected**: Comment appears in real-time chat
5. **Expected**: All viewers see comment (WebSocket broadcast)
6. **Status**: ⏸️ Not tested

### ⚠️ LV-4: Leave Live Event Flow
**Path**: In Live Event → Leave
1. Join live event
2. Click "Leave" or navigate away
3. **Expected**: Viewer count decrements
4. **Expected**: WebSocket connection closed
5. **Status**: ⏸️ Not tested

---

## EDGE CASES & ERROR FLOWS

### 🔍 EC-1: Form Validation Errors
**Path**: Any Form → Submit Invalid Data → See Errors
1. Navigate to any form (register, create post, send message)
2. Submit with:
   - Empty required fields
   - Invalid email format
   - Password too short
   - Invalid data types
3. **Expected**: Clear validation error messages
4. **Expected**: No crash
5. **Expected**: Can fix and resubmit
6. **Status**: ✅ Tested for login (works), ⏸️ Not tested for other forms

### 🔍 EC-2: 404 Not Found Flow
**Path**: Invalid URL → 404 Page
1. Navigate to non-existent route (e.g., `/invalid-route-xyz`)
2. **Expected**: 404 page displays
3. **Expected**: Matches app design
4. **Expected**: Has link to navigate back (home/dashboard)
5. **Status**: ✅ Tested and working

### 🔍 EC-3: Empty States
**Path**: Feature with No Data → Empty State Message
1. Navigate to:
   - Profile with no posts
   - Messages with no conversations
   - Notifications with no notifications
   - Jobs board with no jobs
2. **Expected**: Friendly empty state message
3. **Expected**: Clear call-to-action (e.g., "Create your first post")
4. **Status**: ⚠️ Partially tested (profile tabs show "No posts/reels/stories yet")

### 🔍 EC-4: Session Expiration
**Path**: Authenticated → Wait → Session Expires → Access Feature
1. Login successfully
2. Wait for JWT token expiration (or manually expire)
3. Try to access protected feature
4. **Expected**: Redirect to `/auth` with "Session expired" message
5. **Expected**: Can login again
6. **Status**: ⏸️ Not tested

### 🔍 EC-5: Network Error Handling
**Path**: Feature → Network Failure → Error Display
1. Perform action (like post, send message)
2. Simulate network failure (disconnect WiFi, use DevTools)
3. **Expected**: Clear error message
4. **Expected**: Option to retry
5. **Expected**: No data loss where possible
6. **Status**: ⏸️ Not tested

### 🔍 EC-6: Concurrent User Actions
**Path**: Multiple Tabs → Same Action → Sync
1. Open app in two tabs with same account
2. Perform action in Tab 1 (like post)
3. **Expected**: Tab 2 reflects change (via polling or real-time)
4. **Status**: ⏸️ Not tested

---

## FLOW TESTING STATUS SUMMARY

### Critical Flows
- ✅ 8 tested and working
- ❌ 1 tested and broken (messaging send)
- ⏸️ 6 not tested

### Important Flows
- ✅ 3 tested and working
- ⏸️ 15 not tested
- ⚠️ 1 partial (notifications API issues)

### Standard Flows
- ✅ 2 tested and working
- ⏸️ 8 not tested

### Edge Cases
- ✅ 2 tested and working
- ⚠️ 1 partial (empty states)
- ⏸️ 4 not tested

**Overall Coverage**: ~20% of flows tested (15/76 flows)  
**Next Priority**: Fix messaging send, test jobs board, test live streaming

---

**Document Version**: 1.0  
**Last Updated**: November 20, 2025  
**Next Update**: After completing remaining flow tests
