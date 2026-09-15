import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  EXCLUDE_FILES,
  findStaleExclusions,
} from "../check-csp-domains.js";

test("reports an exclusion after its file is renamed", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "csp-exclusions-"));
  const original = path.join(root, "config.json");
  const renamed = path.join(root, "renamed-config.json");

  try {
    fs.writeFileSync(original, "{}");
    assert.deepEqual(findStaleExclusions(root, ["config.json"]), []);

    fs.renameSync(original, renamed);
    assert.deepEqual(findStaleExclusions(root, ["config.json"]), [
      "config.json",
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the current exclusion list passes through the scanner startup", () => {
  const root = path.resolve(import.meta.dirname, "../..");
  assert.deepEqual(findStaleExclusions(root, EXCLUDE_FILES), []);
});