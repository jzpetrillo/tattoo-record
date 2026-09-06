import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, afterEach, before, describe, test } from "node:test";

import app from "../src/app";
import { pool } from "../src/db";
import { registerRoutes } from "../src/routes/routes";

type JsonRecord = Record<string, any>;
type TestUser = {
  id: string;
  username: string;
  token: string;
};

const password = "studio-feed-test-password";
const createdUserIds: string[] = [];
let baseUrl = "";
let server: Awaited<ReturnType<typeof registerRoutes>>;

async function jsonRequest(
  path: string,
  options: { method?: string; token?: string; body?: JsonRecord } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body = (await response.json()) as any;
  return { response, body };
}

async function registerTestUser(label: string, role: "ARTIST" | "STUDIO"): Promise<TestUser> {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const user = {
    email: `${label}-${suffix}@example.com`,
    username: `${label}${suffix}`,
    password,
  };
  const registered = await jsonRequest("/api/auth/register", { method: "POST", body: user });
  assert.equal(registered.response.status, 200, JSON.stringify(registered.body));
  createdUserIds.push(registered.body.user.id);
  await pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, registered.body.user.id]);
  return { id: registered.body.user.id, username: user.username, token: registered.body.token };
}

async function createPost(user: TestUser, type: "POST" | "REEL", label: string) {
  const created = await jsonRequest("/api/posts", {
    method: "POST",
    token: user.token,
    body: {
      type,
      caption: label,
      media: [{
        publicId: `${label}-${randomUUID()}`,
        url: `https://example.com/${label}.${type === "REEL" ? "mp4" : "jpg"}`,
        type: type === "REEL" ? "video" : "image",
      }],
    },
  });
  assert.equal(created.response.status, 200, JSON.stringify(created.body));
  return created.body;
}

async function connect(studio: TestUser, artist: TestUser) {
  const requested = await jsonRequest("/api/studio-approvals", {
    method: "POST",
    token: artist.token,
    body: { studioId: studio.id },
  });
  assert.equal(requested.response.status, 200, JSON.stringify(requested.body));
  const approved = await jsonRequest(`/api/studio-approvals/${requested.body.id}/approve`, {
    method: "PUT",
    token: studio.token,
  });
  assert.equal(approved.response.status, 200, JSON.stringify(approved.body));
  return requested.body.id as string;
}

before(async () => {
  server = await registerRoutes(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [createdUserIds]);
    createdUserIds.length = 0;
  }
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
});

describe("studio artist feed connection lifecycle", () => {
  test("adds every approved artist newest-first and removes revoked artists", async () => {
    const studio = await registerTestUser("studio", "STUDIO");
    const firstArtist = await registerTestUser("firstartist", "ARTIST");
    const secondArtist = await registerTestUser("secondartist", "ARTIST");
    const outsider = await registerTestUser("outsider", "ARTIST");

    const initiallyConnected = await jsonRequest(`/api/studios/${studio.id}/artists`);
    assert.deepEqual(initiallyConnected.body, []);

    await connect(studio, firstArtist);
    const afterFirstApproval = await jsonRequest(`/api/studios/${studio.id}/artists`);
    assert.equal(afterFirstApproval.body.length, 1);
    assert.equal(afterFirstApproval.body[0].artist.id, firstArtist.id);
    assert.equal(typeof afterFirstApproval.body[0].request.id, "string");

    const imagePost = await createPost(firstArtist, "POST", "older-image");
    await new Promise((resolve) => setTimeout(resolve, 10));
    const reelPost = await createPost(secondArtist, "REEL", "newer-reel");
    await createPost(outsider, "POST", "excluded-outsider");
    await connect(studio, secondArtist);

    const feed = await jsonRequest(`/api/studios/${studio.id}/feed`, { token: studio.token });
    assert.equal(feed.response.status, 200);
    assert.deepEqual(feed.body.map((item: any) => item.post.id), [reelPost.id, imagePost.id]);
    assert.deepEqual(feed.body.map((item: any) => item.author.username), [
      secondArtist.username,
      firstArtist.username,
    ]);
    assert.deepEqual(feed.body.map((item: any) => item.post.type), ["REEL", "POST"]);

    const approvedArtists = await jsonRequest(`/api/studios/${studio.id}/artists`);
    const connectionIdByArtist = new Map(
      approvedArtists.body.map((item: any) => [item.artist.id, item.request.id]),
    );
    assert.equal(typeof connectionIdByArtist.get(firstArtist.id), "string");
    assert.equal(typeof connectionIdByArtist.get(secondArtist.id), "string");

    const removedFirst = await jsonRequest(`/api/studio-approvals/${connectionIdByArtist.get(firstArtist.id)}`, {
      method: "DELETE",
      token: studio.token,
    });
    assert.equal(removedFirst.response.status, 200, JSON.stringify(removedFirst.body));
    const afterFirstRemoval = await jsonRequest(`/api/studios/${studio.id}/feed`, { token: studio.token });
    assert.deepEqual(afterFirstRemoval.body.map((item: any) => item.post.id), [reelPost.id]);

    const removedLast = await jsonRequest(`/api/studio-approvals/${connectionIdByArtist.get(secondArtist.id)}`, {
      method: "DELETE",
      token: secondArtist.token,
    });
    assert.equal(removedLast.response.status, 200, JSON.stringify(removedLast.body));
    const afterLastRemoval = await jsonRequest(`/api/studios/${studio.id}/artists`);
    const emptyFeed = await jsonRequest(`/api/studios/${studio.id}/feed`, { token: studio.token });
    assert.deepEqual(afterLastRemoval.body, []);
    assert.deepEqual(emptyFeed.body, []);
  });
});