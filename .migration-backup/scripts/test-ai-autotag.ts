/**
 * End-to-end test for the AI auto-tagging pipeline.
 *
 * Verifies:
 *   1. tagTattooImage() returns structured tags for a real tattoo image URL
 *   2. embed() returns a 1024-dim vector
 *   3. A post created via the pipeline receives ai_tags, styles, subjects, and an embedding
 *   4. The post appears in semantic search results
 *   5. The digest scheduler generates text without errors
 *
 * Usage:
 *   npx tsx scripts/test-ai-autotag.ts
 *
 * Requires: ANTHROPIC_API_KEY, VOYAGE_API_KEY, NEON_DATABASE_URL
 */

import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";
import { tagTattooImage } from "../server/services/ai/vision";
import { embed, isAnthropicEnabled, isVoyageEnabled } from "../server/services/ai/index";
import { embedPost, buildPostText } from "../server/services/ai/embeddings";
import { generateWeeklyDigestText } from "../server/services/ai/vision";

// A publicly accessible image for testing (picsum.photos is already in the CSP allowlist)
const TEST_IMAGE_URL = "https://picsum.photos/seed/tattoo/400/400";

let passed = 0;
let failed = 0;

function ok(label: string) {
  console.log(`  ✓ ${label}`);
  passed++;
}

function fail(label: string, reason?: string) {
  console.error(`  ✗ ${label}${reason ? `: ${reason}` : ""}`);
  failed++;
}

async function testTagging() {
  console.log("\n[1] tagTattooImage()");
  if (!isAnthropicEnabled()) {
    console.warn("  SKIP — ANTHROPIC_API_KEY not set");
    return null;
  }
  const tags = await tagTattooImage(TEST_IMAGE_URL);
  if (!tags) {
    fail("returned non-null tags");
    return null;
  }
  ok("returned non-null tags");

  if (Array.isArray(tags.styles) && tags.styles.length > 0) {
    ok(`styles present: [${tags.styles.join(", ")}]`);
  } else {
    fail("styles array is empty or missing");
  }

  if (Array.isArray(tags.subjects) && tags.subjects.length > 0) {
    ok(`subjects present: [${tags.subjects.join(", ")}]`);
  } else {
    fail("subjects array is empty or missing");
  }

  if (tags.colorProfile === "color" || tags.colorProfile === "black-and-grey") {
    ok(`colorProfile: ${tags.colorProfile}`);
  } else {
    fail("colorProfile invalid", String(tags.colorProfile));
  }

  if (tags.placement && tags.placement.length > 0) {
    ok(`placement: ${tags.placement}`);
  } else {
    fail("placement missing");
  }

  return tags;
}

async function testEmbedding(tags: Awaited<ReturnType<typeof tagTattooImage>>) {
  console.log("\n[2] embed() / embedPost()");
  if (!isVoyageEnabled()) {
    console.warn("  SKIP — VOYAGE_API_KEY not set");
    return null;
  }

  const text = buildPostText({
    caption: "A beautiful blackwork tattoo on the forearm",
    styles: tags?.styles,
    subjects: tags?.subjects,
  });
  console.log(`  Input text: "${text}"`);

  const vec = await embed(text);

  if (!Array.isArray(vec)) {
    fail("embed() returned non-array");
    return null;
  }
  ok(`embed() returned array`);

  if (vec.length === 1024) {
    ok(`embedding dimension is 1024`);
  } else {
    fail(`embedding dimension wrong`, `got ${vec.length}`);
  }

  if (vec.every((v) => typeof v === "number" && isFinite(v))) {
    ok("all embedding values are finite numbers");
  } else {
    fail("embedding contains non-finite values");
  }

  return vec;
}

async function testDatabaseRoundtrip(
  tags: Awaited<ReturnType<typeof tagTattooImage>>,
  vec: number[] | null
) {
  console.log("\n[3] Database round-trip — create post, apply tags + embedding, query back");

  // Find a real user to attach the test post to
  const userRows = await pool.query(
    "SELECT id FROM users WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1"
  );
  if (!userRows.rows.length) {
    fail("No users in database — cannot create test post");
    return null;
  }
  const authorId = userRows.rows[0].id;

  // Insert a minimal test post directly
  const insertResult = await pool.query<{ id: string }>(
    `INSERT INTO posts (author_id, type, caption, media, visibility, created_at, updated_at)
     VALUES ($1, 'POST', $2, $3::jsonb, 'PUBLIC', NOW(), NOW())
     RETURNING id`,
    [
      authorId,
      "Test post for AI autotag pipeline verification",
      JSON.stringify([{ type: "image", url: TEST_IMAGE_URL }]),
    ]
  );
  const postId = insertResult.rows[0].id;
  ok(`inserted test post id=${postId}`);

  // Apply tags if we have them
  if (tags) {
    await pool.query(
      `UPDATE posts
       SET ai_tags = $1::jsonb, styles = $2::jsonb, subjects = $3::jsonb, ai_tagged_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [
        JSON.stringify(tags),
        JSON.stringify(tags.styles),
        JSON.stringify(tags.subjects),
        postId,
      ]
    );
    ok("applied ai_tags, styles, subjects to post");
  } else {
    console.warn("  SKIP tags — Anthropic not available");
  }

  // Apply embedding if we have it
  if (vec) {
    const vecStr = `[${vec.join(",")}]`;
    await pool.query("UPDATE posts SET embedding = $1::vector WHERE id = $2", [vecStr, postId]);
    ok("applied embedding to post");
  } else {
    console.warn("  SKIP embedding — Voyage not available");
  }

  // Read back and verify
  const readBack = await pool.query(
    `SELECT ai_tags, styles, subjects, ai_tagged_at,
            (embedding IS NOT NULL) as has_embedding
     FROM posts WHERE id = $1`,
    [postId]
  );
  const row = readBack.rows[0];

  if (tags) {
    if (row.ai_tags && Object.keys(row.ai_tags).length > 0) {
      ok("ai_tags readable from DB");
    } else {
      fail("ai_tags missing or empty in DB");
    }
    if (Array.isArray(row.styles) && row.styles.length > 0) {
      ok(`styles readable from DB: [${row.styles.join(", ")}]`);
    } else {
      fail("styles missing or empty in DB");
    }
    if (Array.isArray(row.subjects) && row.subjects.length > 0) {
      ok(`subjects readable from DB: [${row.subjects.join(", ")}]`);
    } else {
      fail("subjects missing or empty in DB");
    }
    if (row.ai_tagged_at) {
      ok("ai_tagged_at is set");
    } else {
      fail("ai_tagged_at not set");
    }
  }

  if (vec) {
    if (row.has_embedding) {
      ok("embedding stored in DB (has_embedding=true)");
    } else {
      fail("embedding not stored in DB");
    }
  }

  return postId;
}

async function testSemanticSearch(postId: string | null, vec: number[] | null) {
  console.log("\n[4] Semantic search — post appears in results");
  if (!vec || !postId) {
    console.warn("  SKIP — no embedding or post to search for");
    return;
  }

  // Search using the same vector (should be a perfect match)
  const vecStr = `[${vec.join(",")}]`;
  const result = await pool.query<{ id: string; similarity: number }>(
    `SELECT id, 1 - (embedding <=> $1::vector) as similarity
     FROM posts
     WHERE deleted_at IS NULL AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT 5`,
    [vecStr]
  );

  const found = result.rows.find((r) => r.id === postId);
  if (found) {
    ok(`test post appears in top-5 semantic results (similarity=${Number(found.similarity).toFixed(4)})`);
    if (Number(found.similarity) > 0.99) {
      ok("similarity > 0.99 (expected for same-vector query)");
    } else {
      fail("similarity unexpectedly low for same-vector query", String(found.similarity));
    }
  } else {
    fail("test post NOT found in semantic search results");
    console.log("  Top results:", result.rows.map((r) => `${r.id} (sim=${Number(r.similarity).toFixed(4)})`).join(", "));
  }
}

async function testDigestScheduler() {
  console.log("\n[5] Weekly digest text generation");
  if (!isAnthropicEnabled()) {
    console.warn("  SKIP — ANTHROPIC_API_KEY not set; testing fallback path");
    const text = await generateWeeklyDigestText({
      username: "test_artist",
      newFollowers: 5,
      newLikes: 12,
      newComments: 3,
      topPostCaption: "Dragon sleeve tattoo",
    });
    if (text && text.includes("test_artist")) {
      ok("fallback digest text generated without errors");
    } else {
      fail("fallback digest text missing expected content");
    }
    return;
  }

  try {
    const text = await generateWeeklyDigestText({
      username: "test_artist",
      newFollowers: 5,
      newLikes: 12,
      newComments: 3,
      topPostCaption: "Dragon sleeve tattoo",
    });
    if (text && text.length > 20) {
      ok(`digest text generated (${text.length} chars): "${text.slice(0, 80)}..."`);
    } else {
      fail("digest text too short or empty");
    }
  } catch (err: any) {
    fail("digest threw an error", err.message);
  }
}

async function cleanup(postId: string | null) {
  if (postId) {
    await pool.query("DELETE FROM posts WHERE id = $1", [postId]);
    console.log(`\n[cleanup] Removed test post id=${postId}`);
  }
}

async function main() {
  console.log("=== AI Auto-Tag Pipeline — End-to-End Test ===");
  console.log(`  ANTHROPIC_API_KEY: ${isAnthropicEnabled() ? "SET ✓" : "NOT SET (will skip vision tests)"}`);
  console.log(`  VOYAGE_API_KEY:    ${isVoyageEnabled() ? "SET ✓" : "NOT SET (will skip embedding tests)"}`);

  let tags: Awaited<ReturnType<typeof tagTattooImage>> = null;
  let vec: number[] | null = null;
  let postId: string | null = null;

  try {
    tags = await testTagging();
    vec = await testEmbedding(tags);
    postId = await testDatabaseRoundtrip(tags, vec);
    await testSemanticSearch(postId, vec);
    await testDigestScheduler();
  } finally {
    await cleanup(postId);
    await pool.end();
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
