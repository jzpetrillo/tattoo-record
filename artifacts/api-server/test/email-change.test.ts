import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { after, afterEach, before, describe, test } from "node:test";
import type { AddressInfo } from "node:net";

import app from "../src/app";
import { pool } from "../src/db";
import { registerRoutes } from "../src/routes/routes";
import { setEmailChangeDeliveryOverride } from "../src/services/password-reset-email";

type JsonRecord = Record<string, any>;
type TestUser = {
  id: string;
  email: string;
  password: string;
  token: string;
};
type DeliveredEmail = {
  to: string;
  verificationUrl: string;
};

const password = "email-change-test-password";
const deliveredEmails: DeliveredEmail[] = [];
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
  const body = (await response.json()) as JsonRecord;
  return { response, body };
}

async function registerTestUser(label: string): Promise<TestUser> {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const user = {
    email: `${label}-${suffix}@example.com`,
    username: `${label}${suffix}`,
    password,
  };
  const { response, body } = await jsonRequest("/api/auth/register", {
    method: "POST",
    body: user,
  });
  assert.equal(response.status, 200, JSON.stringify(body));
  createdUserIds.push(body.user.id);
  return { ...user, id: body.user.id, token: body.token };
}

async function requestEmailChange(user: TestUser, email: string) {
  return jsonRequest("/api/auth/request-email-change", {
    method: "POST",
    token: user.token,
    body: { email },
  });
}

function tokenFromLatestEmail(): string {
  const verificationUrl = deliveredEmails.at(-1)?.verificationUrl;
  assert.ok(verificationUrl, "expected the email stub to receive a verification URL");
  const token = new URL(verificationUrl).searchParams.get("token");
  assert.ok(token);
  return token;
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

before(async () => {
  setEmailChangeDeliveryOverride(async (to, verificationUrl) => {
    deliveredEmails.push({ to, verificationUrl });
  });

  server = await registerRoutes(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  process.env.APP_URL = baseUrl;
});

afterEach(async () => {
  deliveredEmails.length = 0;
  if (createdUserIds.length > 0) {
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [createdUserIds]);
    createdUserIds.length = 0;
  }
});

after(async () => {
  setEmailChangeDeliveryOverride(undefined);
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
});

describe("email-change verification", () => {
  test("accepts a requested email after trimming and lowercasing it", async () => {
    const user = await registerTestUser("normalize");
    const newEmail = `  New.Address-${randomUUID()}@Example.COM  `;

    const sameEmail = await requestEmailChange(user, ` ${user.email.toUpperCase()} `);
    assert.equal(sameEmail.response.status, 400);

    const requested = await requestEmailChange(user, newEmail);
    assert.equal(requested.response.status, 200, JSON.stringify(requested.body));
    assert.equal(requested.body.email, newEmail.trim().toLowerCase());
    assert.equal(requested.body.expiresInMinutes, 30);
    assert.equal(deliveredEmails.length, 1);
    assert.equal(deliveredEmails[0].to, newEmail.trim().toLowerCase());

    const tokenRow = await pool.query<{ new_email: string }>(
      "SELECT new_email FROM email_change_tokens WHERE user_id = $1 AND used_at IS NULL",
      [user.id],
    );
    assert.equal(tokenRow.rows[0].new_email, newEmail.trim().toLowerCase());
  });

  test("rejects case-insensitive conflicts before creating a token", async () => {
    const owner = await registerTestUser("owner");
    const requester = await registerTestUser("requester");
    const targetEmail = owner.email.toUpperCase();

    const requested = await requestEmailChange(requester, ` ${targetEmail} `);

    assert.equal(requested.response.status, 409);
    assert.match(requested.body.message, /already in use/i);
    assert.equal(deliveredEmails.length, 0);

    const tokenRows = await pool.query(
      "SELECT 1 FROM email_change_tokens WHERE user_id = $1",
      [requester.id],
    );
    assert.equal(tokenRows.rowCount, 0);
  });

  test("invalidates the previous link when a new link is requested", async () => {
    const user = await registerTestUser("resend");
    const firstEmail = `first-${randomUUID()}@example.com`;
    const secondEmail = `second-${randomUUID()}@example.com`;

    assert.equal((await requestEmailChange(user, firstEmail)).response.status, 200);
    const firstToken = tokenFromLatestEmail();
    assert.equal((await requestEmailChange(user, secondEmail)).response.status, 200);
    const secondToken = tokenFromLatestEmail();

    const pending = await jsonRequest("/api/auth/email-change-status", { token: user.token });
    assert.equal(pending.response.status, 200);
    assert.equal(pending.body.pending.email, secondEmail);

    const staleConfirmation = await jsonRequest("/api/auth/confirm-email-change", {
      method: "POST",
      body: { token: firstToken },
    });
    assert.equal(staleConfirmation.response.status, 400);

    const currentConfirmation = await jsonRequest("/api/auth/confirm-email-change", {
      method: "POST",
      body: { token: secondToken },
    });
    assert.equal(currentConfirmation.response.status, 200);
    assert.equal(currentConfirmation.body.user.email, secondEmail);
  });

  test("rejects an expired link", async () => {
    const user = await registerTestUser("expiry");
    const newEmail = `expired-${randomUUID()}@example.com`;
    assert.equal((await requestEmailChange(user, newEmail)).response.status, 200);
    const token = tokenFromLatestEmail();

    await pool.query(
      "UPDATE email_change_tokens SET expires_at = NOW() - INTERVAL '1 minute' WHERE token_hash = $1",
      [tokenHash(token)],
    );

    const confirmation = await jsonRequest("/api/auth/confirm-email-change", {
      method: "POST",
      body: { token },
    });
    assert.equal(confirmation.response.status, 400);
    assert.match(confirmation.body.message, /invalid or has expired/i);
  });

  test("allows a valid link only once", async () => {
    const user = await registerTestUser("singleuse");
    const newEmail = `single-use-${randomUUID()}@example.com`;
    assert.equal((await requestEmailChange(user, newEmail)).response.status, 200);
    const token = tokenFromLatestEmail();

    const firstConfirmation = await jsonRequest("/api/auth/confirm-email-change", {
      method: "POST",
      body: { token },
    });
    assert.equal(firstConfirmation.response.status, 200);

    const secondConfirmation = await jsonRequest("/api/auth/confirm-email-change", {
      method: "POST",
      body: { token },
    });
    assert.equal(secondConfirmation.response.status, 400);

    const userRow = await pool.query<{ email: string }>(
      "SELECT email FROM users WHERE id = $1",
      [user.id],
    );
    assert.equal(userRow.rows[0].email, newEmail);
  });

  test("serializes concurrent confirmations and reports the losing conflict", async () => {
    const firstUser = await registerTestUser("racefirst");
    const secondUser = await registerTestUser("racesecond");
    const targetEmail = `race-target-${randomUUID()}@example.com`;

    assert.equal((await requestEmailChange(firstUser, targetEmail)).response.status, 200);
    const firstToken = tokenFromLatestEmail();
    assert.equal((await requestEmailChange(secondUser, targetEmail)).response.status, 200);
    const secondToken = tokenFromLatestEmail();

    const [firstConfirmation, secondConfirmation] = await Promise.all([
      jsonRequest("/api/auth/confirm-email-change", {
        method: "POST",
        body: { token: firstToken },
      }),
      jsonRequest("/api/auth/confirm-email-change", {
        method: "POST",
        body: { token: secondToken },
      }),
    ]);
    const statuses = [firstConfirmation.response.status, secondConfirmation.response.status].sort();
    assert.deepEqual(statuses, [200, 409]);

    const userRows = await pool.query<{ email: string }>(
      "SELECT email FROM users WHERE id = ANY($1::uuid[]) ORDER BY id",
      [[firstUser.id, secondUser.id]],
    );
    assert.equal(userRows.rows.filter((row) => row.email === targetEmail).length, 1);
    assert.equal(userRows.rows.filter((row) => row.email !== targetEmail).length, 1);
  });
});