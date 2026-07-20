import { pool } from "./db";

export async function initDatabase() {
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
    console.log("[db-init] pgvector extension enabled");
  } catch {
    console.warn("[db-init] pgvector not available — semantic search disabled");
  }

  try {
    // De-duplicate job applications before adding the unique constraint
    await pool.query(`
      DELETE FROM job_applications
      WHERE id NOT IN (
        SELECT DISTINCT ON (job_id, artist_id) id
        FROM job_applications
        ORDER BY job_id, artist_id, created_at ASC
      )
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_job_application
        ON job_applications (job_id, artist_id)
    `);
    console.log("[db-init] Job applications unique constraint ready");
  } catch (err) {
    console.warn("[db-init] Job applications unique index skipped:", err instanceof Error ? err.message : String(err));
  }

  try {
    await pool.query(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS embedding vector(1024)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS posts_embedding_idx ON posts
        USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
    `);
    console.log("[db-init] Posts embedding column ready");
  } catch (err) {
    console.warn("[db-init] Embedding column setup skipped:", err instanceof Error ? err.message : String(err));
  }
}
