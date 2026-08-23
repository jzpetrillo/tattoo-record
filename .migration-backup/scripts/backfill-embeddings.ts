/**
 * Backfill embeddings for existing posts that have captions or AI tags.
 * Usage: npx tsx scripts/backfill-embeddings.ts [--limit=50] [--dry-run]
 *
 * Skips rows where embedding IS NOT NULL (already processed).
 * Throttles to avoid rate limits (500 ms pause every 10 posts).
 */
import "dotenv/config";
import { db } from "../server/db";
import { pool } from "../server/db";
import { sql } from "drizzle-orm";
import { embed } from "../server/services/ai/index";
import { isVoyageEnabled } from "../server/services/ai/index";

const args = process.argv.slice(2);
const limit = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "100");
const dryRun = args.includes("--dry-run");

async function main() {
  if (!isVoyageEnabled()) {
    console.error("VOYAGE_API_KEY is not set. Exiting.");
    process.exit(1);
  }

  console.log(`[backfill-embeddings] Starting (limit=${limit}, dryRun=${dryRun})`);

  const rows = await db.execute(sql`
    SELECT id, caption, styles, subjects
    FROM posts
    WHERE deleted_at IS NULL
      AND embedding IS NULL
      AND (caption IS NOT NULL OR jsonb_array_length(subjects) > 0)
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

  console.log(`[backfill-embeddings] Found ${rows.length} posts without embeddings`);

  let embedded = 0;
  let skipped = 0;

  for (const row of rows as any[]) {
    const stylesArr: string[] = row.styles ?? [];
    const subjectsArr: string[] = row.subjects ?? [];
    const text = [
      row.caption,
      stylesArr.length ? `Styles: ${stylesArr.join(", ")}` : null,
      subjectsArr.length ? `Subjects: ${subjectsArr.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join(". ")
      .trim();

    if (!text) {
      skipped++;
      continue;
    }

    if (!dryRun) {
      try {
        const vec = await embed(text);
        const vecStr = `[${vec.join(",")}]`;
        await pool.query("UPDATE posts SET embedding = $1::vector WHERE id = $2", [vecStr, row.id]);
        embedded++;
      } catch (err: any) {
        console.error(`[backfill-embeddings] Failed post ${row.id}: ${err.message}`);
        skipped++;
        continue;
      }
    } else {
      console.log(`[dry-run] Post ${row.id}: would embed "${text.slice(0, 60)}..."`);
      embedded++;
    }

    if (embedded % 10 === 0) {
      console.log(`[backfill-embeddings] Progress: ${embedded} embedded, ${skipped} skipped`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`[backfill-embeddings] Done. Embedded: ${embedded}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
