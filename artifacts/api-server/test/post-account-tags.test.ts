import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../src/db";
import * as schema from "@workspace/db";
import { generateToken } from "../src/middleware/auth";
import { storage } from "../src/storage";
import app from "../src/app";
import { registerRoutes } from "../src/routes/routes";

// Like the other integration suites, this owns an isolated HTTP test server.
// Only records created by this suite are removed in cleanup.
let base = "";
let server: Awaited<ReturnType<typeof registerRoutes>>;
const suffix = randomUUID().slice(0, 8);
const accounts: schema.User[] = [];
let author: schema.User, artist: schema.User, studio: schema.User, viewer: schema.User;
let publicPost: schema.Post, privatePost: schema.Post;

async function request(path: string, user?: schema.User, method = "GET", body?: unknown) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      ...(user ? { Authorization: `Bearer ${generateToken(user.id)}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

before(async () => {
  server = await registerRoutes(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  for (const [name, role] of [
    ["author", "ENTHUSIAST"], ["artist", "ARTIST"], ["studio", "STUDIO"], ["viewer", "ENTHUSIAST"],
  ] as const) {
    const account = await storage.createUser({
      email: `tag-spec-${name}-${suffix}@example.test`,
      username: `tag_spec_${name}_${suffix}`,
      hashedPassword: "unused-integration-test-hash",
      firstName: `TagSpec${suffix}`, lastName: name, role,
    });
    accounts.push(account);
  }
  [author, artist, studio, viewer] = accounts;
});

after(async () => {
  if (accounts.length) await db.delete(schema.users).where(inArray(schema.users.id, accounts.map((u) => u.id)));
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await pool.end();
});

describe("Tattoo artist and studio attribution", { concurrency: false }, () => {
  it("searches names and usernames, offering artists/studios but not enthusiasts", async () => {
    const independentArtist = await request(`/api/artists/${artist.id}/studio`);
    assert.equal(independentArtist.status, 200);
    assert.deepEqual(await independentArtist.json(), {});
    const response = await request(`/api/taggable-accounts?q=TagSpec${suffix}`, author);
    assert.equal(response.status, 200);
    const rows = await response.json() as schema.User[];
    assert.deepEqual(rows.map((row) => row.id).sort(), [artist.id, studio.id].sort());
    assert.ok(rows.every((row) => !("hashedPassword" in row) && !("email" in row)));
    const fullName = await request(`/api/taggable-accounts?q=${encodeURIComponent(`TagSpec${suffix} artist`)}`, author);
    assert.deepEqual((await fullName.json()).map((row: { id: string }) => row.id), [artist.id]);
    const username = await request(`/api/taggable-accounts?q=${artist.username}`, author);
    assert.deepEqual((await username.json()).map((row: { id: string }) => row.id), [artist.id]);
  });

  it("rejects enthusiasts, duplicate tags, and more than ten tags without creating a post", async () => {
    for (const taggedAccountIds of [[viewer.id], [artist.id, artist.id], Array.from({ length: 11 }, () => randomUUID())]) {
      const response = await request("/api/posts", author, "POST", { caption: `invalid-tags-${suffix}`, taggedAccountIds });
      assert.equal(response.status, 400, await response.text());
    }
    const rows = await db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.caption, `invalid-tags-${suffix}`));
    assert.equal(rows.length, 0);
  });

  it("creates artist/studio tags and post-linked notifications with the new notification type", async () => {
    const response = await request("/api/posts", author, "POST", {
      caption: `public-tag-spec-${suffix}`, taggedAccountIds: [artist.id, studio.id],
    });
    assert.equal(response.status, 200);
    publicPost = await response.json() as schema.Post;
    const tags = await db.select().from(schema.postAccountTags).where(eq(schema.postAccountTags.postId, publicPost.id));
    assert.equal(tags.length, 2);
    assert.ok(tags.every((tag) => tag.taggedById === author.id && !tag.removedFromProfile));
    const notifications = await db.select().from(schema.notifications).where(and(
      inArray(schema.notifications.userId, [artist.id, studio.id]), eq(schema.notifications.type, "POST_TAG"),
    ));
    assert.equal(notifications.length, 2);
    assert.ok(notifications.every((n) => n.payload.actorId === author.id && n.payload.postId === publicPost.id));
    const postTags = await request(`/api/posts/${publicPost.id}/tags`);
    assert.equal(postTags.status, 200);
    assert.deepEqual((await postTags.json()).map((row: { id: string }) => row.id).sort(), [artist.id, studio.id].sort());
  });

  it("enforces public/own/followed-author visibility even for the tagged studio itself", async () => {
    const response = await request("/api/posts", author, "POST", {
      caption: `private-tag-spec-${suffix}`, visibility: "FOLLOWERS", taggedAccountIds: [studio.id],
    });
    assert.equal(response.status, 200);
    privatePost = await response.json() as schema.Post;
    for (const account of [undefined, viewer, studio]) {
      const list = await request(`/api/users/${studio.id}/tagged-posts`, account);
      const rows = await list.json() as { post: schema.Post }[];
      assert.ok(rows.some((row) => row.post.id === publicPost.id));
      assert.ok(!rows.some((row) => row.post.id === privatePost.id));
      assert.equal((await request(`/api/posts/${privatePost.id}/tags`, account)).status, 404);
    }
    const ownRows = await (await request(`/api/users/${studio.id}/tagged-posts`, author)).json();
    assert.ok(ownRows.some((row: { post: schema.Post }) => row.post.id === privatePost.id));
    await storage.followUser(viewer.id, author.id);
    const followerRows = await (await request(`/api/users/${studio.id}/tagged-posts`, viewer)).json();
    assert.ok(followerRows.some((row: { post: schema.Post }) => row.post.id === privatePost.id));
    assert.equal((await request(`/api/posts/${privatePost.id}/tags`, viewer)).status, 200);
  });

  it("lists newest first and paginates only after applying visibility", async () => {
    await db.update(schema.posts).set({ createdAt: new Date("2026-01-01") }).where(eq(schema.posts.id, publicPost.id));
    await db.update(schema.posts).set({ createdAt: new Date("2026-01-02") }).where(eq(schema.posts.id, privatePost.id));
    const first = await (await request(`/api/users/${studio.id}/tagged-posts?limit=1&offset=0`, author)).json();
    const second = await (await request(`/api/users/${studio.id}/tagged-posts?limit=1&offset=1`, author)).json();
    assert.equal(first[0].post.id, privatePost.id);
    assert.equal(second[0].post.id, publicPost.id);
    const anonymous = await (await request(`/api/users/${studio.id}/tagged-posts?limit=1&offset=0`)).json();
    assert.equal(anonymous[0].post.id, publicPost.id);
    assert.equal(anonymous[0].isLiked, false);
    assert.equal(anonymous[0].isSaved, false);
    await storage.likePost(publicPost.id, viewer.id);
    await db.insert(schema.savedPosts).values({ userId: viewer.id, postId: publicPost.id });
    const likedRows = await (await request(`/api/users/${studio.id}/tagged-posts`, viewer)).json();
    const likedPost = likedRows.find((row: { post: schema.Post }) => row.post.id === publicPost.id);
    assert.equal(likedPost.isLiked, true);
    assert.equal(likedPost.isSaved, true);
    assert.equal((await request(`/api/users/${viewer.id}/tagged-posts`, author)).status, 404);
  });

  it("only lets the tagged account hide work, retaining the post and its discovery tags permanently", async () => {
    const path = `/api/posts/${publicPost.id}/tags/${studio.id}`;
    assert.equal((await request(path, author, "DELETE")).status, 403);
    assert.equal((await request(path, artist, "DELETE")).status, 403);
    assert.equal((await request(path, undefined, "DELETE")).status, 401);
    assert.equal((await request(path, studio, "DELETE")).status, 200);
    assert.equal((await request(path, studio, "DELETE")).status, 200);
    const rows = await (await request(`/api/users/${studio.id}/tagged-posts`, author)).json();
    assert.ok(!rows.some((row: { post: schema.Post }) => row.post.id === publicPost.id));
    const tags = await (await request(`/api/posts/${publicPost.id}/tags`)).json();
    assert.ok(tags.some((tag: { id: string }) => tag.id === studio.id));
    const original = await storage.getPost(publicPost.id);
    assert.equal(original.post.caption, `public-tag-spec-${suffix}`);
    assert.equal(original.post.deletedAt, null);
    const [tag] = await db.select().from(schema.postAccountTags).where(and(
      eq(schema.postAccountTags.postId, publicPost.id), eq(schema.postAccountTags.taggedAccountId, studio.id),
    ));
    assert.equal(tag.removedFromProfile, true);
    assert.equal((await request(`/api/posts/${publicPost.id}/tags/${viewer.id}`, viewer, "DELETE")).status, 404);
  });

  it("never lists deleted posts, even when their attribution rows remain", async () => {
    await storage.deletePost(privatePost.id);
    const rows = await (await request(`/api/users/${studio.id}/tagged-posts`, author)).json();
    assert.equal(rows.length, 0);
    assert.equal((await request(`/api/posts/${privatePost.id}/tags`, author)).status, 404);
  });
});
