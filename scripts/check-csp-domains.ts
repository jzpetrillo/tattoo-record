#!/usr/bin/env tsx
/**
 * check-csp-domains.ts
 *
 * Scans all TS/TSX source files for hard-coded external http(s):// URLs and
 * verifies that every hostname is explicitly listed in the Content-Security-
 * Policy directives defined in server/index.ts.
 *
 * Exit code 0  → all domains are covered by the CSP.
 * Exit code 1  → one or more domains are missing from the CSP (CI-blocking).
 *
 * Usage:
 *   npx tsx scripts/check-csp-domains.ts
 */

import fs from "fs";
import path from "path";
import { globSync } from "glob";

const ROOT = path.resolve(import.meta.dirname, "..");
const CSP_FILE = path.join(ROOT, "server", "index.ts");

const SCAN_GLOBS = [
  "client/src/**/*.{ts,tsx}",
  "server/**/*.ts",
  "scripts/**/*.ts",
  "shared/**/*.ts",
  "migrations/**/*.ts",
  // Non-TypeScript assets that may contain hard-coded external URLs
  "*.{json,html}",
  "client/**/*.{json,html}",
  "server/**/*.{json,html}",
  "public/**/*.html",
  ".env.example",
  "*.env.example",
];

const EXCLUDE_FILES = [
  "server/index.ts",
  "scripts/check-csp-domains.ts",
  // Generated / package-manager files — URLs in these are not browser-loaded
  "package-lock.json",
  "package.json",
  // shadcn component registry config — $schema URL is a CLI tool reference, not CSP-relevant
  "components.json",
];

// Directory patterns to exclude from globbing — generated output, vendor code,
// and auto-generated migration artefacts that are not authored by developers.
const EXCLUDE_DIRS = [
  "dist/**",
  "node_modules/**",
  "build/**",
  ".cache/**",
  "migrations/**",
];

const URL_RE = /https?:\/\/([a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;

function parseCspDomains(source: string): Set<string> {
  const domains = new Set<string>();
  for (const match of source.matchAll(URL_RE)) {
    domains.add(match[1].toLowerCase());
  }
  return domains;
}

async function scanSourceDomains(files: string[]): Promise<Map<string, string[]>> {
  const domainToFiles = new Map<string, string[]>();

  const results = await Promise.all(
    files.map((file) =>
      fs.promises.readFile(file, "utf8").then((source) => ({ file, source }))
    )
  );

  for (const { file, source } of results) {
    for (const match of source.matchAll(URL_RE)) {
      const hostname = match[1].toLowerCase();
      if (!domainToFiles.has(hostname)) {
        domainToFiles.set(hostname, []);
      }
      domainToFiles.get(hostname)!.push(path.relative(ROOT, file));
    }
  }

  return domainToFiles;
}

function isCovered(hostname: string, cspDomains: Set<string>): boolean {
  if (cspDomains.has(hostname)) return true;

  const parts = hostname.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const wildcard = "*." + parts.slice(i).join(".");
    if (cspDomains.has(wildcard)) return true;
  }

  return false;
}

async function main(): Promise<void> {
  if (!fs.existsSync(CSP_FILE)) {
    console.error(`[check-csp-domains] ERROR: CSP file not found: ${CSP_FILE}`);
    process.exit(1);
  }

  const cspSource = await fs.promises.readFile(CSP_FILE, "utf8");
  const cspDomains = parseCspDomains(cspSource);

  if (cspDomains.size === 0) {
    console.error("[check-csp-domains] ERROR: No domains extracted from CSP file. Check the parser.");
    process.exit(1);
  }

  const sourceFiles: string[] = [];
  for (const pattern of SCAN_GLOBS) {
    const matches = globSync(pattern, { cwd: ROOT, absolute: true, ignore: EXCLUDE_DIRS });
    for (const f of matches) {
      const rel = path.relative(ROOT, f);
      if (!EXCLUDE_FILES.some((ex) => rel === ex || rel.endsWith(ex))) {
        sourceFiles.push(f);
      }
    }
  }

  const domainToFiles = await scanSourceDomains(sourceFiles);

  const uncovered: Array<{ hostname: string; files: string[] }> = [];

  for (const [hostname, files] of domainToFiles.entries()) {
    if (!isCovered(hostname, cspDomains)) {
      uncovered.push({ hostname, files: [...new Set(files)] });
    }
  }

  const covered = [...domainToFiles.keys()].filter((h) => isCovered(h, cspDomains));

  console.log(`[check-csp-domains] CSP domains detected: ${cspDomains.size}`);
  console.log(`[check-csp-domains] Source files scanned: ${sourceFiles.length}`);
  console.log(`[check-csp-domains] External domains found in source: ${domainToFiles.size}`);

  if (covered.length > 0) {
    console.log(`\n  Covered domains (${covered.length}):`);
    for (const h of covered.sort()) {
      console.log(`    ✓ ${h}`);
    }
  }

  if (uncovered.length === 0) {
    console.log("\n[check-csp-domains] PASS — all external domains are covered by the CSP.");
    process.exit(0);
  }

  console.error(`\n[check-csp-domains] FAIL — ${uncovered.length} domain(s) used in source are NOT in the CSP allowlist:\n`);
  for (const { hostname, files } of uncovered) {
    console.error(`  ✗ ${hostname}`);
    for (const f of files) {
      console.error(`      ${f}`);
    }
  }
  console.error(
    "\nAdd the missing domain(s) to the appropriate CSP directive(s) in server/index.ts, " +
    "or remove the hard-coded URL from the source file."
  );
  process.exit(1);
}

main();
