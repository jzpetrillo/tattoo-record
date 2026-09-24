import { pool } from "../artifacts/api-server/src/db";
import { isAnthropicEnabled } from "../artifacts/api-server/src/services/ai";
import { tagTattooImage } from "../artifacts/api-server/src/services/ai/vision";

async function main() {
  if (!isAnthropicEnabled()) throw new Error("ANTHROPIC_API_KEY is not configured");

  let cursor = "";
  let tagged = 0;
  let failed = 0;
  while (true) {
    const { rows } = await pool.query<{
      id: string;
      media: Array<{ type: string; url: string }>;
    }>(
      `SELECT id, media FROM posts
       WHERE deleted_at IS NULL AND ai_tagged_at IS NULL
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(media) AS item
           WHERE lower(item->>'type') = 'image' AND nullif(item->>'url', '') IS NOT NULL
         )
         AND id > $1::uuid
       ORDER BY id LIMIT 100`,
      [cursor || "00000000-0000-0000-0000-000000000000"],
    );
    if (!rows.length) break;

    for (const post of rows) {
      cursor = post.id;
      const imageUrl = post.media.find((item) => item.type?.toLowerCase() === "image" && item.url)?.url;
      try {
        const tags = await tagTattooImage(imageUrl!);
        if (!tags || !Array.isArray(tags.styles) || !Array.isArray(tags.subjects)) {
          throw new Error("Image tagging returned no valid tags");
        }
        const result = await pool.query(
          `UPDATE posts SET ai_tags = $1::jsonb, styles = $2::jsonb,
             subjects = $3::jsonb, ai_tagged_at = NOW(), updated_at = NOW()
           WHERE id = $4 AND deleted_at IS NULL AND ai_tagged_at IS NULL`,
          [JSON.stringify(tags), JSON.stringify(tags.styles), JSON.stringify(tags.subjects), post.id],
        );
        tagged += result.rowCount ?? 0;
      } catch (error) {
        failed++;
        console.error(`Tagging failed for post ${post.id}:`, error);
      }
    }
    console.log(`Tagged ${tagged} posts; ${failed} failures`);
  }

  console.log(`Tag backfill complete: ${tagged} updated, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Tag backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());