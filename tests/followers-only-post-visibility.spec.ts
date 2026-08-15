/**
 * FOLLOWERS-only post visibility tests for GET /api/posts/:id.
 *
 * Verifies that visibility enforcement on the post detail endpoint works
 * correctly across all caller types:
 *
 *  1. Unauthenticated request → 401
 *  2. Authenticated non-follower → 403
 *  3. Post author → 200 (always sees own post)
 *  4. Follower → 200 after following the author
 *  5. PUBLIC post → 200 for everyone, including unauthenticated callers
 *
 * Relevant server code:
 *   - server/routes.ts  (GET /api/posts/:id — visibility gate)
 *   - server/storage.ts (isFollowing)
 */

import { test, expect, type APIRequestContext } from "@playwright/test";

const BASE = "http://127.0.0.1:5000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueSuffix(): string {
  return `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

async function register(
  request: APIRequestContext,
  suffix: string,
  role: "ARTIST" | "ENTHUSIAST"
) {
  const email = `fv-${role.toLowerCase()}-${suffix}@example.com`;
  const username = `fv${role.toLowerCase()}${suffix}`;
  const res = await request.post(`${BASE}/api/auth/register`, {
    data: {
      email,
      username,
      password: "TestPass123!",
      role,
      firstName: "FV",
      lastName: "Test",
    },
  });
  expect(res.ok(), `register ${role} failed: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  return {
    token: body.token as string,
    userId: body.user.id as string,
  };
}

function authed(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function createPost(
  request: APIRequestContext,
  token: string,
  visibility: "PUBLIC" | "FOLLOWERS"
): Promise<string> {
  const res = await request.post(`${BASE}/api/posts`, {
    data: {
      caption: `Test post — visibility=${visibility}`,
      type: "POST",
      visibility,
      media: [],
    },
    ...authed(token),
  });
  expect(
    res.ok(),
    `createPost (${visibility}) failed: ${await res.text()}`
  ).toBeTruthy();
  const body = await res.json();
  return body.id as string;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("FOLLOWERS-only post visibility", () => {
  let authorToken: string;
  let authorId: string;
  let followerToken: string;
  let followerId: string;
  let nonFollowerToken: string;
  let followersPostId: string;
  let publicPostId: string;

  test.beforeAll(async ({ request }) => {
    const suffix = uniqueSuffix();

    // Author — creates the FOLLOWERS-only post
    const author = await register(request, `aut${suffix}`, "ARTIST");
    authorToken = author.token;
    authorId = author.userId;

    // Follower — will follow the author before the visibility test
    const follower = await register(request, `fol${suffix}`, "ENTHUSIAST");
    followerToken = follower.token;
    followerId = follower.userId;

    // Non-follower — never follows the author
    const nonFollower = await register(request, `nfl${suffix}`, "ENTHUSIAST");
    nonFollowerToken = nonFollower.token;

    // Create a FOLLOWERS-only post and a PUBLIC post
    followersPostId = await createPost(request, authorToken, "FOLLOWERS");
    publicPostId = await createPost(request, authorToken, "PUBLIC");

    // Follower follows the author
    const followRes = await request.post(
      `${BASE}/api/users/${authorId}/follow`,
      { ...authed(followerToken) }
    );
    expect(
      followRes.ok(),
      `follow request failed: ${await followRes.text()}`
    ).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Unauthenticated caller
  // -------------------------------------------------------------------------

  test("unauthenticated request to a FOLLOWERS post returns 401", async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/api/posts/${followersPostId}`);
    expect(
      res.status(),
      `expected 401 for unauthenticated caller, got ${res.status()}: ${await res.text()}`
    ).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Non-follower
  // -------------------------------------------------------------------------

  test("authenticated non-follower gets 403 on a FOLLOWERS post", async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/api/posts/${followersPostId}`, {
      ...authed(nonFollowerToken),
    });
    expect(
      res.status(),
      `expected 403 for non-follower, got ${res.status()}: ${await res.text()}`
    ).toBe(403);
  });

  // -------------------------------------------------------------------------
  // Post author
  // -------------------------------------------------------------------------

  test("post author always sees their own FOLLOWERS post (200)", async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/api/posts/${followersPostId}`, {
      ...authed(authorToken),
    });
    expect(
      res.status(),
      `expected 200 for author, got ${res.status()}: ${await res.text()}`
    ).toBe(200);
    const body = await res.json();
    expect(body.post.id).toBe(followersPostId);
  });

  // -------------------------------------------------------------------------
  // Follower
  // -------------------------------------------------------------------------

  test("a follower gets 200 on a FOLLOWERS post", async ({ request }) => {
    const res = await request.get(`${BASE}/api/posts/${followersPostId}`, {
      ...authed(followerToken),
    });
    expect(
      res.status(),
      `expected 200 for follower, got ${res.status()}: ${await res.text()}`
    ).toBe(200);
    const body = await res.json();
    expect(body.post.id).toBe(followersPostId);
  });

  // -------------------------------------------------------------------------
  // PUBLIC posts are unaffected
  // -------------------------------------------------------------------------

  test("unauthenticated request to a PUBLIC post returns 200", async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/api/posts/${publicPostId}`);
    expect(
      res.status(),
      `expected 200 for PUBLIC post (unauthenticated), got ${res.status()}: ${await res.text()}`
    ).toBe(200);
    const body = await res.json();
    expect(body.post.id).toBe(publicPostId);
  });

  test("non-follower can read a PUBLIC post (200)", async ({ request }) => {
    const res = await request.get(`${BASE}/api/posts/${publicPostId}`, {
      ...authed(nonFollowerToken),
    });
    expect(
      res.status(),
      `expected 200 for non-follower on PUBLIC post, got ${res.status()}: ${await res.text()}`
    ).toBe(200);
    const body = await res.json();
    expect(body.post.id).toBe(publicPostId);
  });
});
