// WS7 regression fence — no shipped module may contain a default operational
// `open-design.ai` / `*.open-design.ai` URL.
//
// CapyDesign is local-only: it has no website, CDN, marketplace host, or
// telemetry endpoint, and it must never read another vendor's production
// infrastructure by default. Upstream *attribution* (LICENSE/NOTICE, upstream
// issue references like `nexu-io/open-design#7410` in comments, historical
// changelogs) is deliberately kept and is not what this fence matches.
//
// Allowed residue, each with its owner:
// - tools/release preview-base + install-dsh landing URL → WS11 release
//   infrastructure (human-supplied origin); not reachable from the app.
// - comments quoting the historical catalogue origin or a removed AMR link.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../../..");

const SCAN_ROOTS = ["apps", "packages", "tools"];
const EXCLUDED_SEGMENTS = [
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  "tests",
  "test",
  "__fixtures__",
  "fixtures",
];

/** URL forms that are operational endpoints when hardcoded. */
const ENDPOINT_RE = /https:\/\/[a-z0-9.-]*open-design\.ai[^\s'"`)\]]*/gi;

/** Attribution-shaped lines are not endpoints: comments and doc links. */
function isCommentLine(line: string): boolean {
  const t = line.trim();
  return (
    t.startsWith("//") ||
    t.startsWith("*") ||
    t.startsWith("/*") ||
    t.startsWith("#") ||
    t.startsWith("<!--")
  );
}

function listFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_SEGMENTS.includes(entry.name)) continue;
      listFiles(full, out);
    } else if (/\.(ts|tsx|mjs|cjs|js)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("WS7 fence: no default operational open-design.ai endpoint in shipped source", () => {
  it("scans shipped source and finds only allow-listed residue", () => {
    const offenders: string[] = [];

    for (const root of SCAN_ROOTS) {
      const files = listFiles(join(repoRoot, root));
      for (const file of files) {
        const src = readFileSync(file, "utf8");
        const lines = src.split("\n");
        lines.forEach((line, index) => {
          if (isCommentLine(line)) return;
          const matches = line.match(ENDPOINT_RE);
          if (matches == null) return;
          for (const match of matches) {
            const isWs11ReleaseInfra =
              file.includes(`${join("tools", "release")}`) &&
              (match.includes("repo-assets.open-design.ai/plugin-previews") ||
                match.includes("open-design.ai/install-dsh.ps1"));
            if (isWs11ReleaseInfra) continue;
            offenders.push(`${file}:${index + 1}: ${match}`);
          }
        });
      }
    }

    expect(
      offenders,
      `operational open-design.ai endpoints remain in shipped source:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
