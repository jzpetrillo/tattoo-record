#!/usr/bin/env tsx
/**
 * Scans authored source files for external URLs and verifies that their
 * hostnames appear in the application's Content-Security-Policy source.
 */
import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";

const ROOT = path.resolve(import.meta.dirname, "..");
const CSP_FILE = path.join(ROOT, "artifacts", "tattoo-record", "index.html");

const SCAN_GLOBS = [
  "artifacts/tattoo-record/src/**/*.{ts,tsx}",
  "artifacts/tattoo-record/public/**/*.{json,html}",
  "artifacts/tattoo-record/*.{json,html}",
];

export const EXCLUDE_FILES = [
  // The CSP source itself also contains allowed external resource URLs.
  "artifacts/tattoo-record/index.html",
  // Tool metadata URLs are not loaded by the browser application.
  "artifacts/tattoo-record/components.json",
  // Repository metadata URLs are not loaded by the browser application.
  "artifacts/tattoo-record/package.json",
  // Scanner examples and diagnostics are not browser application URLs.
  "scripts/check-csp-domains.ts",
];

const EXCLUDE_DIRS = [
  "dist/**",
  "node_modules/**",
  "build/**",
  ".cache/**",
  "migrations/**",
];

const URL_RE = /https?:\/\/([a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;

export function findStaleExclusions(
  root: string,
  exclusions: readonly string[],
): string[] {
  return exclusions.filter(
    (file) => !fs.existsSync(path.join(root, file)),
  );
}

function validateExcludedFiles(): void {
  const staleExclusions = findStaleExclusions(ROOT, EXCLUDE_FILES);
  if (staleExclusions.length === 0) return;

  console.error(
    "[check-csp-domains] ERROR: EXCLUDE_FILES contains paths that do not exist:",
  );
  for (const file of staleExclusions) {
    console.error(`  ✗ ${file}`);
  }
  console.error(
    "Remove stale entries or update them to the renamed files before running the scan.",
  );
  process.exit(1);
}

function parseDomains(source: string): Set<string> {
  return new Set(
    [...source.matchAll(URL_RE)].map((match) => match[1].toLowerCase()),
  );
}

function isCovered(hostname: string, cspDomains: Set<string>): boolean {
  if (cspDomains.has(hostname)) return true;
  const parts = hostname.split(".");
  for (let index = 1; index < parts.length - 1; index += 1) {
    if (cspDomains.has(`*.${parts.slice(index).join(".")}`)) return true;
  }
  return false;
}

async function main(): Promise<void> {
  validateExcludedFiles();

  if (!fs.existsSync(CSP_FILE)) {
    console.error(`[check-csp-domains] ERROR: CSP file not found: ${CSP_FILE}`);
    process.exit(1);
  }

  const cspDomains = parseDomains(
    await fs.promises.readFile(CSP_FILE, "utf8"),
  );
  if (cspDomains.size === 0) {
    console.error(
      "[check-csp-domains] ERROR: No domains extracted from CSP file. Check the parser.",
    );
    process.exit(1);
  }

  const sourceFiles = SCAN_GLOBS.flatMap((pattern) =>
    globSync(pattern, {
      cwd: ROOT,
      absolute: true,
      ignore: EXCLUDE_DIRS,
    }),
  ).filter((file) => !EXCLUDE_FILES.includes(path.relative(ROOT, file)));

  const uncovered = new Map<string, Set<string>>();
  await Promise.all(
    sourceFiles.map(async (file) => {
      const domains = parseDomains(await fs.promises.readFile(file, "utf8"));
      for (const domain of domains) {
        if (!isCovered(domain, cspDomains)) {
          const files = uncovered.get(domain) ?? new Set<string>();
          files.add(path.relative(ROOT, file));
          uncovered.set(domain, files);
        }
      }
    }),
  );

  if (uncovered.size === 0) {
    console.log(
      "[check-csp-domains] PASS — all external domains are covered by the CSP.",
    );
    return;
  }

  console.error(
    `[check-csp-domains] FAIL — ${uncovered.size} domain(s) are not in the CSP allowlist:`,
  );
  for (const [domain, files] of uncovered) {
    console.error(`  ✗ ${domain}`);
    for (const file of files) console.error(`      ${file}`);
  }
  process.exit(1);
}

const invokedPath = process.argv[1] && path.resolve(process.argv[1]);
if (invokedPath === path.resolve(import.meta.filename)) {
  void main();
}
