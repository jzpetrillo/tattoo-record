---
name: publicUserColumns pattern
description: How to safely return user data to clients without leaking password hashes or email
---

Export `publicUserColumns` from `server/storage.ts` and import it in every file that joins against the users table.

**Rule:** Never use `schema.users` (full row) in a select that returns data to clients. Always use `publicUserColumns` or an explicit subset.

**How to apply:**
- Drizzle joins: `{ author: publicUserColumns }` or `{ studio: publicUserColumns }`
- `getConversations`: use `json_build_object('id', users.id, 'username', users.username, ...)` inside `json_agg(...)` — do NOT `json_agg(users)`
- `feed-algorithm.ts`: import publicUserColumns from `../storage`; use `db.select({ user: publicUserColumns }).from(users)` when building suggested-user lists

**Why:** Full user row includes `hashedPassword` and `email`; these must never reach API responses.
