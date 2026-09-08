import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, afterEach, before, describe, test } from "node:test";

import app from "../src/app";
import { pool } from "../src/db";
import { registerRoutes } from "../src/routes/routes";

type TestUser = {
  id: string;
  token: string;
};

const createdUserIds: string[] = [];
let baseUrl = "";
let server: Awaited<ReturnType<typeof registerRoutes>>;

async function jsonRequest(path: string, options: { method?: string; token?: string; body?: object } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return { response, body: await response.json() as any };
}

async function registerTestUser(label: string): Promise<TestUser> {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const registered = await jsonRequest("/api/auth/register", {
    method: "POST",
    body: {
      email: `${label}-${suffix}@example.com`,
      username: `${label}${suffix}`,
      password: "admin-bookings-filter-test-password",
    },
  });
  assert.equal(registered.response.status, 200, JSON.stringify(registered.body));
  createdUserIds.push(registered.body.user.id);
  return { id: registered.body.user.id, token: registered.body.token };
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

describe("GET /api/admin/bookings status filtering", () => {
  test("returns only the selected Completed and Cancelled bookings", async () => {
    const admin = await registerTestUser("bookingsadmin");
    const artist = await registerTestUser("bookingsartist");
    const client = await registerTestUser("bookingsclient");
    await pool.query("UPDATE users SET role = 'ADMIN' WHERE id = $1", [admin.id]);
    await pool.query("UPDATE users SET role = 'ARTIST' WHERE id = $1", [artist.id]);

    for (const status of ["COMPLETED", "CANCELLED", "PENDING"]) {
      await pool.query(
        `INSERT INTO bookings (artist_id, client_id, title, scheduled_at, status)
         VALUES ($1, $2, $3, NOW() + INTERVAL '1 day', $4)`,
        [artist.id, client.id, `${status} filter fixture`, status],
      );
    }

    for (const status of ["COMPLETED", "CANCELLED"]) {
      const filtered = await jsonRequest(`/api/admin/bookings?status=${status}`, { token: admin.token });
      assert.equal(filtered.response.status, 200, JSON.stringify(filtered.body));
      assert.ok(filtered.body.length >= 1);
      assert.ok(filtered.body.every((booking: any) => booking.status === status));
      assert.ok(filtered.body.some((booking: any) => booking.title === `${status} filter fixture`));
    }
  });
});