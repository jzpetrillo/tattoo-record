import { pool } from "./db";
import bcrypt from "bcrypt";

const SEED_ADMIN_EMAIL = "SEED_ADMIN_EMAIL";
const SEED_ADMIN_USERNAME = "SEED_ADMIN_USERNAME";
const SEED_ADMIN_PASSWORD = "SEED_ADMIN_PASSWORD";

function getSeedAdminConfig() {
  if (process.env.NODE_ENV !== "production") return null;

  const missing = [SEED_ADMIN_EMAIL, SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD]
    .filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Production seed admin is not configured. Missing secret(s): ${missing.join(", ")}`,
    );
  }

  const email = process.env[SEED_ADMIN_EMAIL]!.trim().toLowerCase();
  const username = process.env[SEED_ADMIN_USERNAME]!.trim();
  const password = process.env[SEED_ADMIN_PASSWORD]!;

  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Production seed admin email is invalid.");
  }
  if (username.length < 3 || username.length > 50) {
    throw new Error("Production seed admin username must be between 3 and 50 characters.");
  }
  if (password.length < 8) {
    throw new Error("Production seed admin password must be at least 8 characters.");
  }

  return { email, username, password };
}

async function seedProductionAdmin() {
  const config = getSeedAdminConfig();
  if (!config) return;

  const existingByEmail = await pool.query<{
    id: string;
    username: string;
    role: string;
  }>(
    "SELECT id, username, role FROM users WHERE email = $1 LIMIT 1",
    [config.email],
  );

  if (existingByEmail.rows[0]) {
    if (existingByEmail.rows[0].role !== "ADMIN") {
      throw new Error("Production seed admin email already belongs to a non-admin user.");
    }
    console.log("[db-init] Seed admin already exists");
    return;
  }

  const existingByUsername = await pool.query<{ id: string }>(
    "SELECT id FROM users WHERE username = $1 LIMIT 1",
    [config.username],
  );
  if (existingByUsername.rows[0]) {
    throw new Error("Production seed admin username is already in use.");
  }

  const hashedPassword = await bcrypt.hash(config.password, 12);
  const inserted = await pool.query(
    `INSERT INTO users (
       email,
       username,
       hashed_password,
       role,
       is_verified
     )
     VALUES ($1, $2, $3, 'ADMIN', TRUE)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [config.email, config.username, hashedPassword],
  );

  if (inserted.rowCount === 0) {
    const conflictingUser = await pool.query<{ role: string }>(
      "SELECT role FROM users WHERE email = $1 OR username = $2 LIMIT 1",
      [config.email, config.username],
    );
    if (conflictingUser.rows[0]?.role !== "ADMIN") {
      throw new Error("Production seed admin could not be created because its identity is already in use.");
    }
    console.log("[db-init] Seed admin already exists");
    return;
  }

  console.log("[db-init] Seed admin created");
}

export async function initDatabase() {
  // Create csp_violations table for persisting browser CSP reports
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS csp_violations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        blocked_uri TEXT,
        violated_directive TEXT,
        document_uri TEXT,
        referrer TEXT,
        original_policy TEXT,
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS csp_violations_created_at_idx
        ON csp_violations (created_at DESC)
    `);
    if (process.env.NODE_ENV !== 'production') console.log("[db-init] csp_violations table ready");
  } catch (err) {
    console.warn("[db-init] csp_violations setup skipped:", err instanceof Error ? err.message : String(err));
  }

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

  // Add cancellation_requested column to bookings table
  try {
    await pool.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_requested BOOLEAN NOT NULL DEFAULT FALSE
    `);
    if (process.env.NODE_ENV !== 'production') console.log("[db-init] bookings.cancellation_requested column ready");
  } catch (err) {
    console.warn("[db-init] bookings.cancellation_requested migration skipped:", err instanceof Error ? err.message : String(err));
  }

  // Add new notification type enum values
  try {
    await pool.query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'CANCELLATION_REQUEST'`);
    await pool.query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'CANCELLATION_APPROVED'`);
    await pool.query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'CANCELLATION_REJECTED'`);
    if (process.env.NODE_ENV !== 'production') console.log("[db-init] notification_type cancellation values ready");
  } catch (err) {
    console.warn("[db-init] notification_type cancellation values skipped:", err instanceof Error ? err.message : String(err));
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

  await seedProductionAdmin();
}
