---
name: Rename Inktagram → Tattoo Record
description: Scope and status of the brand rename; what changed and what to watch out for
---
## What changed
- All source files, seeds, docs, and test files: "Inktagram" → "Tattoo Record", emails → @tattoorecord.com
- index.html title, sidebar logo text, splash heading, admin header all updated
- Cloudinary service still writes `inktagram/` folder prefix for legacy assets — intentional, not a bug

## What to watch for
- If re-seeding the DB, use: admin@tattoorecord.com / Test1234!
- csp-violations.spec.ts test emails updated to @tattoorecord.com — must match seeded users
- `npm run check` has pre-existing TS errors in server/storage.ts (media width: unknown type mismatch) — unrelated to this rename

**Why:** Brand rename was requested; Cloudinary folder left as-is because existing uploaded assets live under inktagram/ and moving them would require a Cloudinary migration job.
