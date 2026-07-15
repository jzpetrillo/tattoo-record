/**
 * Backfill AI tags for existing posts that have image media.
 * Usage: npx tsx scripts/backfill-tags.ts [--limit=50] [--dry-run]
 */
import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { tagTattooImage } from "../server/services/ai/vision";
import { isAnthropicEnabled } from "../server/services/ai/index";

const args = process.argv.slice(2);
const limit = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "50");
const dryRun = args.includes("--dry-run");

async function main() {
  if (!isAnthropicEnabled()) {
    console.error("ANTHROPIC_API_KEY is not set. Exiting.");
    process.exit(1);
  }

  console.log(`[backfill] Starting AI tag backfill (limit=${limit}, dryRun=${dryRun})`);

  const posts = await db.execute(sql`
    SELECT id, media, caption FROM posts
    WHERE deleted_at IS NULL
      AND ai_tagged_at IS NULL
      AND jsonb_array_length(media) > 0
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

  console.log(`[backfill] Found ${posts.length} untagged posts`);

  let tagged = 0;
  let skipped = 0;

  for (const row of posts as any[]) {
    const media: Array<{ url: string; type: string }> = row.media ?? [];
    const imageMedia = media.find((m) => m.type === "image");
    if (!imageMedia) { skipped++; continue; }

    const tags = await tagTattooImage(imageMedia.url);
    if (!tags) { skipped++; continue; }

    if (!dryRun) {
      await db.execute(sql`
        UPDATE posts
        SET
          styles   = ${JSON.stringify(tags.styles)}::jsonb,
          subjects = ${JSON.stringify(tags.subjects)}::jsonb,
          ai_tags  = ${JSON.stringify(tags)}::jsonb,
          ai_tagged_at = NOW()
        WHERE id = ${row.id}
      `);
    } else {
      console.log(`[dry-run] Post ${row.id}: styles=${tags.styles.join(",")}, subjects=${tags.subjects.join(",")}, colorProfile=${tags.colorProfile}, placement=${tags.placement}`);
    }

    tagged++;
    if (tagged % 10 === 0) {
      console.log(`[backfill] Progress: ${tagged} tagged, ${skipped} skipped`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`[backfill] Done. Tagged: ${tagged}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
