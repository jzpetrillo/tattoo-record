import { pool } from "./db";

export async function initDatabase() {
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
    console.log("[db-init] pgvector extension enabled");
  } catch {
    console.warn("[db-init] pgvector not available — semantic search disabled");
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
