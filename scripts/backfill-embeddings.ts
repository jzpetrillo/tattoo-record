import { pool } from "../artifacts/api-server/src/db";
import { embedPost, isVoyageEnabled } from "../artifacts/api-server/src/services/ai/embeddings";

async function main() {
  if (!isVoyageEnabled()) throw new Error("VOYAGE_API_KEY is not configured");

  let cursor = "";
  let embedded = 0;
  let failed = 0;
  while (true) {
    const { rows } = await pool.query<{
      id: string;
      caption: string | null;
      styles: string[] | null;
      subjects: string[] | null;
    }>(
      `SELECT id, caption, styles, subjects FROM posts
       WHERE deleted_at IS NULL AND embedding IS NULL AND id > $1::uuid
       ORDER BY id LIMIT 100`,
      [cursor || "00000000-0000-0000-0000-000000000000"],
    );
    if (!rows.length) break;

    for (const post of rows) {
      cursor = post.id;
      try {
        const embedding = await embedPost(post);
        if (embedding.length !== 1024 || !embedding.every(Number.isFinite)) {
          throw new Error("Invalid Voyage embedding");
        }
        const result = await pool.query(
          `UPDATE posts SET embedding = $1::vector
           WHERE id = $2 AND deleted_at IS NULL AND embedding IS NULL`,
          [`[${embedding.join(",")}]`, post.id],
        );
        embedded += result.rowCount ?? 0;
      } catch (error) {
        failed++;
        console.error(`Embedding failed for post ${post.id}:`, error);
      }
    }
    console.log(`Embedded ${embedded} posts; ${failed} failures`);
  }

  console.log(`Embedding backfill complete: ${embedded} updated, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Embedding backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());