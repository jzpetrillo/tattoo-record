import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, afterEach, before, describe, test } from "node:test";

import app from "../src/app";
import { pool } from "../src/db";
import { registerRoutes } from "../src/routes/routes";

const warning =
  "This media URL is from an unlisted domain and may be blocked by the browser's security policy";

const createdUserIds: string[] = [];
let baseUrl = "";
let server: Awaited<ReturnType<typeof registerRoutes>>;

async function request(path: string, options: { method: string; token?: string; body: object }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: JSON.stringify(options.body),
  });
  return { response, body: await response.json() as { message?: string; id?: string } };
}

async function registerUser(label: string, role: "ARTIST" | "ENTHUSIAST") {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const result = await request("/api/auth/register", {
    method: "POST",
    body: {
      email: `${label}-${suffix}@example.com`,
      username: `${label}${suffix}`,
      password: "media-url-policy-test-password",
      role,
    },
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  const body = result.body as { user: { id: string }; token: string };
  createdUserIds.push(body.user.id);
  return { id: body.user.id, token: body.token };
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

describe("media URL policy routes", () => {
  test("portfolio creation preserves the web client's managed-media payload shape", async () => {
    const artist = await registerUser("portfolioartist", "ARTIST");
    const title = `Managed portfolio ${randomUUID()}`;
    const result = await request("/api/portfolio", {
      method: "POST",
      token: artist.token,
      body: {
        title,
        media: [{ url: "/api/media/portfolios/example.jpg", type: "IMAGE" }],
      },
    });

    assert.equal(result.response.status, 200, JSON.stringify(result.body));
    const saved = await pool.query(
      "SELECT media FROM portfolio_items WHERE id = $1",
      [result.body.id],
    );
    assert.equal(saved.rowCount, 1);
    assert.deepEqual(saved.rows[0]?.media, [
      {
        publicId: "/api/media/portfolios/example.jpg",
        url: "/api/media/portfolios/example.jpg",
        type: "IMAGE",
      },
    ]);
  });

  test("portfolio creation warns and does not persist the web payload with an unlisted domain", async () => {
    const artist = await registerUser("blockedportfolio", "ARTIST");
    const title = `Blocked portfolio ${randomUUID()}`;
    const result = await request("/api/portfolio", {
      method: "POST",
      token: artist.token,
      body: {
        title,
        media: [{ url: "https://example.imgix.net/portfolio.jpg", type: "IMAGE" }],
      },
    });

    assert.equal(result.response.status, 400);
    assert.equal(result.body.message, warning);
    const saved = await pool.query("SELECT id FROM portfolio_items WHERE title = $1", [title]);
    assert.equal(saved.rowCount, 0);
  });

  test("artist flash-sale creation warns and does not persist an unlisted media domain", async () => {
    const artist = await registerUser("mediaartist", "ARTIST");
    const title = `Blocked media ${randomUUID()}`;
    const result = await request("/api/flash-sales", {
      method: "POST",
      token: artist.token,
      body: {
        title,
        originalPriceCents: 20000,
        flashPriceCents: 10000,
        availableSlots: 1,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        media: [{
          publicId: "external",
          url: "https://imagedelivery.net/account/image/public",
          type: "image",
        }],
      },
    });

    assert.equal(result.response.status, 400);
    assert.equal(result.body.message, warning);
    const saved = await pool.query("SELECT id FROM flash_sales WHERE title = $1", [title]);
    assert.equal(saved.rowCount, 0);
  });

  test("admin flash-sale updates warn before persistence for an unlisted media domain", async () => {
    const admin = await registerUser("mediaadmin", "ENTHUSIAST");
    await pool.query("UPDATE users SET role = 'ADMIN' WHERE id = $1", [admin.id]);
    const result = await request(`/api/admin/flash-sales/${randomUUID()}`, {
      method: "PUT",
      token: admin.token,
      body: {
        media: [{
          publicId: "external",
          url: "https://example.b-cdn.net/flash.jpg",
          type: "image",
        }],
      },
    });

    assert.equal(result.response.status, 400);
    assert.equal(result.body.message, warning);
  });
});
