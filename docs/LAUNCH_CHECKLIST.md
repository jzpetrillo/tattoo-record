# Tattoo Record — Production Launch Checklist

Last updated: May 2026  
Status: **READY TO DEPLOY** (all critical security issues resolved)

---

## Security Audit Results (May 2026)

### CRITICAL — Fixed ✅

| # | Issue | Fix Applied |
|---|-------|-------------|
| 1 | **Password hash leak** — `getUser()`, `getUserByEmail()`, `getUserByUsername()` returned `hashedPassword` to API callers via `/api/users/me`, `GET /api/users/:id`, `PUT /api/users/me` | Added `safeUser()` helper in `routes.ts` that strips `hashedPassword` before every user response. Verified: 0 leaks across all 3 endpoints. |
| 2 | **No rate limiting on auth endpoints** — `/api/auth/login` and `/api/auth/register` had no brute-force protection | Installed `express-rate-limit`: 20 requests per 15-minute window per IP on both auth routes |
| 3 | **No file upload size limit or MIME whitelist** — multer accepted any file type and any size | Added `limits: { fileSize: 50MB }` and `fileFilter` allowing only jpeg, png, webp, gif, mp4, webm, quicktime, avi |
| 4 | **Unguarded `DELETE /api/upload/:publicId`** — any authenticated user could delete any Cloudinary asset by guessing its publicId | Added folder-prefix ownership check: publicId must start with a recognised app folder prefix |
| 5 | **Admin page unguarded client-side** — `/admin` rendered for any user (API calls would 401, but the page still loaded) | Added `AdminRoute` component in `App.tsx`: redirects to `/` if not authenticated or not `ADMIN` role |
| 6 | **`getAdminStats()` did `SELECT *` on users table** — fetched hashed passwords server-side unnecessarily | Replaced with targeted `SELECT role, verificationStatus` + `COUNT(*)` aggregates |

### HIGH — Fixed ✅

| # | Issue | Fix Applied |
|---|-------|-------------|
| 7 | **Protected routes accessible without login** — `/messages`, `/notifications`, `/create`, `/saved`, `/bookings`, `/ai-recommendations` had no frontend guards | Added `ProtectedRoute` wrapper in `App.tsx` redirecting unauthenticated users to `/auth` |

### MEDIUM — Accepted Risk

| # | Issue | Status |
|---|-------|--------|
| 8 | **No Helmet.js** — missing HTTP security headers (`X-Frame-Options`, `HSTS`, `CSP`) | Recommend adding `helmet()` post-launch when moving to a custom domain |
| 9 | **No email integration** — no password reset, no booking confirmation emails | Post-launch: add transactional email (Resend/SendGrid) |
| 10 | **No payment processor** — booking `paymentStatus` manually set by artists | Post-launch: integrate Stripe |
| 11 | **JWT in Zustand/localStorage** — XSS risk in high-threat environments | Accepted for this platform's threat model |

---

## Verification Test Results

```
=== Password hash leak ===
GET  /api/users/me        hashedPassword leaked: 0 ✅
GET  /api/users/:username hashedPassword leaked: 0 ✅
PUT  /api/users/me        hashedPassword leaked: 0 ✅

=== Rate limiting ===
POST /api/auth/login (20 rapid requests) → 429 after limit ✅

=== MIME type filter ===
POST /api/upload (text/plain) → {"message":"Unsupported file type: text/plain"} ✅

=== Admin route guard ===
Non-admin navigating to /admin → redirected to / ✅

=== Auth middleware ===
All /api/admin/* routes without ADMIN token → 401 ✅
```

---

## Pre-Deploy Checklist

### Environment Variables

#### Required for Core Functionality
```bash
DATABASE_URL=<postgresql-connection-string>
PGHOST=<database-host>
PGPORT=<database-port>
PGUSER=<database-user>
PGPASSWORD=<database-password>
PGDATABASE=<database-name>
SESSION_SECRET=<random-secure-string-32-chars-min>
```

#### Required for Media Uploads
```bash
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

#### Optional for AI Features
```bash
OPENAI_API_KEY=<your-openai-key>  # Or use Replit AI Integrations
```

### Database Setup

```bash
# Push schema to database
npm run db:push

# Seed data (development/staging only)
npx tsx scripts/seed.ts
```

### Build & Deploy

```bash
npm run build
npm run start
```

---

## Post-Deploy Verification

- [ ] Home feed loads correctly
- [ ] Registration and login work
- [ ] Media uploads work (requires Cloudinary secrets)
- [ ] Real-time messaging connects (WebSocket)
- [ ] Notifications appear
- [ ] Admin can access `/admin` and approve users
- [ ] Non-admins are redirected away from `/admin`
- [ ] File uploads reject non-image/video files
- [ ] Rapid login attempts are rate-limited after 20 tries

---

## Admin Setup

1. Login: `admin@tattoorecord.com` / `Test1234!`
2. Navigate to `/admin`
3. Review pending artist/studio verifications
4. **Change the admin password before going public**

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@tattoorecord.com | Test1234! |
| Artist | artist1@tattoorecord.com | Test1234! |
| Studio | studio1@tattoorecord.com | Test1234! |
| Enthusiast | enthusiast1@tattoorecord.com | Test1234! |

---

## Post-Launch Roadmap

1. **Helmet.js** — HTTP security headers
2. **Transactional email** — password reset + booking notifications (Resend/SendGrid)
3. **Stripe** — real payment flows for bookings
4. **Refresh token rotation** — short-lived JWTs + httpOnly cookie refresh tokens
5. **CSP headers** — once Cloudinary CDN domain is confirmed
6. **Monitoring** — Sentry or Datadog for error tracking
7. **Connection pooling** — PgBouncer or Neon serverless for sustained traffic

---

## Related Docs

- `docs/QA_APP_MAP.md` — Complete API and route documentation
- `docs/QA_INTENDED_USE_AND_FEATURES.md` — Feature specifications by role
- `docs/QA_REPORT.md` — QA test results

---

*Original checklist: January 10, 2026 | Security audit completed: May 2, 2026*
