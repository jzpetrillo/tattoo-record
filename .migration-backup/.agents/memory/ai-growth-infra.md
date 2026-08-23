---
name: AI growth infrastructure
description: 4-phase AI layer — feature flags, provider wrapper, auto-tagging, weekly digest, pgvector semantic search
---

## Architecture

**Phase 0 — Provider + Flags**
- `server/config/flags.ts` — boolean flags from env: `AI_AUTOTAG`, `AI_DIGEST`, `AI_SEMANTIC_SEARCH` (default: enabled)
- `server/services/ai/index.ts` — Anthropic SDK (null-safe init like openai.ts) + Voyage REST embed; in-memory Map cache keyed by sha256 hash (max 2000 entries, prune-half eviction)
- Models: haiku=`claude-haiku-4-5-20251001`, sonnet=`claude-sonnet-4-5`

**Phase 1 — Auto-tagging**
- `server/services/ai/vision.ts` — `tagTattooImage(url)` returns `{ styles, subjects, colors, mood, confidence }`; skip if confidence < 0.3
- Posts table: added `subjects jsonb`, `aiTags jsonb`, `aiTaggedAt timestamp` via Drizzle schema + `db push`
- `scripts/backfill-tags.ts` — CLI script, `--limit=N`, `--dry-run`
- Route hook: POST /api/posts fires tagging + embedding after `res.json()` (fire-and-forget)

**Phase 2 — Notifications + Digest**
- `server/services/digest.ts` — weekly setInterval scheduler; gathers 7-day stats per user; Haiku generates digest text; stored as SYSTEM notification with `{ digestType: "WEEKLY" }` payload
- Follow notification was already wired in routes.ts; no change needed

**Phase 3 — Semantic Search**
- pgvector managed via `server/db-init.ts` NOT Drizzle schema (avoids customType complexity); runs `CREATE EXTENSION IF NOT EXISTS vector` + `ALTER TABLE posts ADD COLUMN IF NOT EXISTS embedding vector(1024)` on startup
- All embedding ops use `pool.query()` raw SQL, not Drizzle ORM
- `GET /api/search/semantic?q=...` — embeds query via Voyage, cosine similarity against posts; returns `{ posts, available: bool }`
- Search page has Text / AI Semantic toggle; shows similarity percentage badges

## Key decisions
**Why raw SQL for embeddings:** Drizzle has no native vector type; customType is possible but fragile. Raw pool.query() is simpler and reliable.
**Why SYSTEM notification for digest:** avoids ALTER TYPE migration; payload.digestType discriminates digest from other SYSTEM notifications.
**Why fire-and-forget after res.json():** keeps POST /api/posts p50 latency unchanged; AI enrichment happens async in background.
**CSP:** `api.voyageai.com` must be in `connectSrc` directive in `server/index.ts`.

## Required env vars
- `ANTHROPIC_API_KEY` — enables Phase 1 (vision tagging) and Phase 2 (digest text)
- `VOYAGE_API_KEY` — enables Phase 3 (semantic search embeddings)
- Without keys, features degrade gracefully (warn on startup, return empty results)
