// Rebrand residue audit (WS12) — one permanent guard for every class of
// upstream leftover the CapyDesign rebrand removed. Fails on:
//
//   1. `OpenDesign` / `Open Design` product tokens in shipped code
//   2. `@open-design/` package-scope references
//   3. `io.open-design.desktop` appId remnants
//   4. `od <subcommand>` CLI invocations in docs, skills, and plugins
//   5. `JiduMono` outside the license checker that documents its removal
//   6. operational `*.open-design.ai` endpoints (WS7's fail-closed rule)
//
// Attribution is not residue: upstream issue references, license/notice
// mentions, and changelog history are allowed by rule below and by the
// path exclusions. Test directories are out of scope — tests may quote the
// old strings as fixtures (WS12 rebaseline owns those values).
//
// This check subsumes the WS7 workstream fence
// (`apps/web/tests/ws7-no-hosted-endpoints.test.ts`, removed when this landed)
// so there is exactly one endpoint rule, not two.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { GuardContext } from "./core.ts";

const SCAN_ROOTS = ["apps", "packages", "tools", "e2e", "scripts"] as const;

const NAME_TOKEN_EXTENSIONS = /\.(ts|tsx|mjs|cjs|js|json|css|html)$/;
const DOC_EXTENSIONS = /\.(md|mdx)$/;

const EXCLUDED_SEGMENTS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".tmp",
  "coverage",
  "tests",
  "test",
  "__fixtures__",
  "fixtures",
]);

/** URL forms that are operational endpoints when hardcoded (rule 6). */
const ENDPOINT_RE = /https:\/\/[a-z0-9.-]*open-design\.ai[^\s'"`)\]]*/gi;

/** `od ` followed by a known CLI subcommand (rule 4). */
const OD_COMMAND_RE =
  /(^|[^\w-])od (run|plugin|mcp|media|project|daemon|research|automation|skills|files|ui|resource|config|login|logout|status|export)\b/;

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

function isAttributionLine(line: string): boolean {
  // Upstream issue references, provenance notes, and the copyright line are
  // deliberate attribution, not missed renames.
  return line.includes("nexu-io") || line.includes("Open Design contributors");
}

/** Test files are out of scope wherever they live; tests quote old strings as fixtures. */
function isTestFile(file: string): boolean {
  return /\.test\.[cm]?[jt]sx?$/.test(file) || /\.spec\.[cm]?[jt]sx?$/.test(file);
}

/**
 * Per-file allow-list. Every entry carries a one-line justification so the
 * next person can tell a deliberate exception from a missed sweep.
 */
const FILE_ALLOW_LIST: ReadonlyArray<{ file: string; reason: string; match: RegExp }> = [
  {
    // This check's own pattern definitions quote every residue class it
    // fails on; without the entry the guard could never pass itself.
    file: join("scripts", "lib", "guard", "check-rebrand-residue.ts"),
    reason: "self-referential: the check quotes the patterns it matches",
    match: /.*/,
  },
  {
    // WS1's checker quotes the removed font name in its license allow-list.
    file: "scripts/check-attribution-notices.ts",
    reason: "license checker documents the removed JiduMono font",
    match: /JiduMono/,
  },
  {
    // WS11 release infrastructure is human-supplied; the lane identities and
    // origins are the recorded WS7/WS10 deferral and stay until WS11 lands.
    file: join("tools", "release"),
    reason: "WS11-deferred release lane identities and origins",
    match: /Open Design|repo-assets\.open-design\.ai\/plugin-previews|open-design\.ai\/install-dsh\.ps1|s3\.nexu\.space/,
  },
  {
    // The syntax-acceptance evidence lane pins the telemetry canary contract
    // as it was recorded; the relay infrastructure itself was removed by WS6.
    file: join("e2e", "scripts", "syntax-acceptance.ts"),
    reason: "dated syntax-acceptance telemetry canary contract (WS6-removed relay)",
    match: /telemetry(-test)?\.open-design\.ai/,
  },
];

function listFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_SEGMENTS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function allowed(file: string, line: string): boolean {
  return FILE_ALLOW_LIST.some(
    (entry) => (file.includes(entry.file) || entry.file === file) && entry.match.test(line),
  );
}

export async function checkRebrandResidue({ repoRoot }: GuardContext): Promise<boolean> {
  const offenders: string[] = [];

  for (const root of SCAN_ROOTS) {
    let files: string[];
    try {
      files = listFiles(join(repoRoot, root));
    } catch {
      continue;
    }
    for (const file of files) {
      if (isTestFile(file)) continue;
      const isDoc = DOC_EXTENSIONS.test(file);
      const isCode = NAME_TOKEN_EXTENSIONS.test(file);
      if (!isDoc && !isCode) continue;

      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (isCommentLine(line)) return;
        if (isAttributionLine(line)) return;
        if (allowed(file, line)) return;
        const rel = file.slice(repoRoot.length + 1);

        if (isCode && /OpenDesign|Open Design/.test(line)) {
          offenders.push(`[product-name] ${rel}:${index + 1}`);
        }
        if (isCode && /@open-design\//.test(line)) {
          offenders.push(`[package-scope] ${rel}:${index + 1}`);
        }
        if (isCode && /io\.open-design\.desktop/.test(line)) {
          offenders.push(`[appId] ${rel}:${index + 1}`);
        }
        if (isDoc && OD_COMMAND_RE.test(line)) {
          offenders.push(`[od-command] ${rel}:${index + 1}`);
        }
        if (/JiduMono/.test(line)) {
          offenders.push(`[font] ${rel}:${index + 1}`);
        }
        if (isCode) {
          for (const match of line.matchAll(ENDPOINT_RE)) {
            offenders.push(`[endpoint] ${rel}:${index + 1}: ${match[0]}`);
          }
        }
      });
    }
  }

  if (offenders.length > 0) {
    console.error("Rebrand residue found in shipped source:");
    for (const offender of offenders) console.error(`- ${offender}`);
    console.error(
      "Attribution references (nexu-io / Open Design contributors) and the " +
        "justified entries in FILE_ALLOW_LIST are the only allowed forms. " +
        "Test directories are out of scope; docs/CHANGELOG is history.",
    );
    return false;
  }

  console.log(
    "Rebrand residue check passed: no product-name tokens, old package scope, " +
      "old appId, od CLI invocations, JiduMono, or operational open-design.ai " +
      "endpoints in shipped source.",
  );
  return true;
}
