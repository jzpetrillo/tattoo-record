import { pool } from "./db";

export async function initDatabase() {
  // Migrate bookings.status from approval_status enum to booking_status enum
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
          CREATE TYPE booking_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');
        END IF;
      END$$
    `);
    // Add COMPLETED and CANCELLED to the type if they're missing (idempotent)
    BEGIN: {
      try {
        await pool.query(`ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'COMPLETED'`);
        await pool.query(`ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'CANCELLED'`);
      } catch { /* ignore */ }
    }
    // Cast the column if it's still using approval_status
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'bookings'
            AND column_name = 'status'
            AND udt_name = 'approval_status'
        ) THEN
          ALTER TABLE bookings ALTER COLUMN status DROP DEFAULT;
          ALTER TABLE bookings
            ALTER COLUMN status TYPE booking_status
            USING status::text::booking_status;
          ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'PENDING';
        END IF;
      END$$
    `);
    if (process.env.NODE_ENV !== 'production') console.log("[db-init] bookings.status migrated to booking_status enum");
  } catch (err) {
    console.warn("[db-init] bookings status migration skipped:", err instanceof Error ? err.message : String(err));
  }

  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
    if (process.env.NODE_ENV !== 'production') console.log("[db-init] pgvector extension enabled");
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
    if (process.env.NODE_ENV !== 'production') console.log("[db-init] Job applications unique constraint ready");
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
    if (process.env.NODE_ENV !== 'production') console.log("[db-init] Posts embedding column ready");
  } catch (err) {
    console.warn("[db-init] Embedding column setup skipped:", err instanceof Error ? err.message : String(err));
  }
}
