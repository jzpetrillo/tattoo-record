import assert from "node:assert/strict";
import test from "node:test";

import { getSeedAdminConfig } from "../src/db-init";

const seedKeys = [
  "NODE_ENV",
  "PRODUCTION_SEED",
  "SEED_ADMIN_EMAIL",
  "SEED_ADMIN_USERNAME",
  "SEED_ADMIN_PASSWORD",
] as const;

function withSeedEnvironment(
  values: Partial<Record<(typeof seedKeys)[number], string>>,
  run: () => void,
) {
  const previous = Object.fromEntries(seedKeys.map((key) => [key, process.env[key]]));
  try {
    for (const key of seedKeys) delete process.env[key];
    Object.assign(process.env, values);
    run();
  } finally {
    for (const key of seedKeys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("PRODUCTION_SEED requires an explicit admin password without NODE_ENV", () => {
  withSeedEnvironment({ PRODUCTION_SEED: "1" }, () => {
    assert.throws(
      () => getSeedAdminConfig(),
      /Missing secret\(s\): SEED_ADMIN_EMAIL, SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD/,
    );
  });
});

test("PRODUCTION_SEED accepts complete explicit admin credentials", () => {
  withSeedEnvironment(
    {
      PRODUCTION_SEED: "1",
      SEED_ADMIN_EMAIL: "ADMIN@EXAMPLE.COM",
      SEED_ADMIN_USERNAME: "seed-admin",
      SEED_ADMIN_PASSWORD: "long-password",
    },
    () => {
      assert.deepEqual(getSeedAdminConfig(), {
        email: "admin@example.com",
        username: "seed-admin",
        password: "long-password",
      });
    },
  );
});

test("non-production startup does not seed an admin unless explicitly requested", () => {
  withSeedEnvironment({ NODE_ENV: "development" }, () => {
    assert.equal(getSeedAdminConfig(), null);
  });
});