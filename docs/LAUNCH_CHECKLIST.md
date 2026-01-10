# Inktagram - Launch Checklist

## Pre-Launch Requirements

### 1. Environment Variables

#### Required for Core Functionality
```bash
DATABASE_URL=<postgresql-connection-string>
PGHOST=<database-host>
PGPORT=<database-port>
PGUSER=<database-user>
PGPASSWORD=<database-password>
PGDATABASE=<database-name>
SESSION_SECRET=<random-secure-string>
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

---

### 2. Database Setup

```bash
# Push schema to database
npm run db:push

# Seed data (if needed)
npx tsx scripts/seed.ts
```

---

### 3. Build & Deploy

```bash
# Build the application
npm run build

# Start production server
npm run start
```

---

### 4. Verify Admin Account

1. Login with admin credentials:
   - Email: `admin@inktagram.com`
   - Password: `Test1234!`

2. Access admin dashboard at `/admin`

3. Review any pending artist/studio verifications

---

### 5. Post-Launch Verification

- [ ] Home feed loads correctly
- [ ] Users can register and login
- [ ] Media uploads work (Cloudinary)
- [ ] Real-time messaging connects
- [ ] Notifications appear
- [ ] Admin can approve users

---

## Rollback Procedure

If issues occur after launch:

1. Use Replit's checkpoint system to rollback code
2. Database can be restored from Neon console
3. Keep previous build artifacts for quick rollback

---

## Monitoring

### Key Metrics to Watch
- Server response times
- Database query performance
- WebSocket connection stability
- Cloudinary API usage
- Error rates in server logs

### Health Check Endpoint
The application serves on port 5000. Monitor the root endpoint for availability.

---

## Support

### Test Accounts Available
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@inktagram.com | Test1234! |
| Artist | artist1@inktagram.com | Test1234! |
| Studio | studio1@inktagram.com | Test1234! |
| Enthusiast | enthusiast1@inktagram.com | Test1234! |

---

## Feature Documentation

See related docs:
- `docs/QA_APP_MAP.md` - Complete API and route documentation
- `docs/QA_INTENDED_USE_AND_FEATURES.md` - Feature specifications
- `docs/QA_REPORT.md` - QA test results

---

*Launch Checklist created: January 10, 2026*
