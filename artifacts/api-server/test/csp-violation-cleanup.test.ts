import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { pool } from "../src/db";
import {
  cleanupOldCspViolations,
  startCspViolationCleanupScheduler,
} from "../src/db-init";

test("cleanup uses the configured retention window in its expiry query", async () => {
  const previous = process.env.CSP_VIOLATION_RETENTION_DAYS;
  process.env.CSP_VIOLATION_RETENTION_DAYS = "7";
  const queries: { sql: unknown; params: unknown }[] = [];
  const query = mock.method(pool, "query", async (sql: unknown, params: unknown) => {
    queries.push({ sql, params });
    return { rows: [], rowCount: 0 };
  });
  try {
    await cleanupOldCspViolations();
    assert.equal(queries.length, 1);
    assert.match(String(queries[0].sql), /DELETE FROM csp_violations WHERE created_at < NOW\(\)/);
    assert.deepEqual(queries[0].params, [7]);
  } finally {
    query.mock.restore();
    if (previous === undefined) delete process.env.CSP_VIOLATION_RETENTION_DAYS;
    else process.env.CSP_VIOLATION_RETENTION_DAYS = previous;
  }
});

test("failed initial cleanup does not stop the scheduler from starting", async () => {
  const query = mock.method(pool, "query", async () => {
    throw new Error("CSP table unavailable");
  });
  try {
    await assert.doesNotReject(startCspViolationCleanupScheduler());
    assert.equal(query.mock.callCount(), 1);
  } finally {
    query.mock.restore();
  }
});