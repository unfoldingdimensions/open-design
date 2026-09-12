// Guard: every bundled third-party component stays attributed.
//
// `THIRD-PARTY-NOTICES.md` is the recipient-facing ledger (who made what,
// under which license). This check fails `pnpm guard` when the ledger drifts
// from the tree: a bundled LICENSE directory nobody names, a shipped font
// with no OFL notice, the proprietary JiduMono face reappearing, the Remix
// Icon CSS without its license mention, or a prompt template whose
// `source.license` is outside the allow-list (unresolved provenance must be
// visible, not silently shipped).
//
// Logic lives in this file (not `scripts/lib/guard/`) on purpose: the
// scripts-library architecture check forbids `scripts/*.ts` from importing
// `scripts/lib/guard/*`. Tests live in `e2e/tests/scripts/` per the
// scripts test-free policy.
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "..");

// Content roots whose bundled LICENSE files must each be named in the ledger.
const bundledLicenseRoots = [
  "design-templates",
  "skills",
  "plugins",
  "apps/desktop/vendor",
  "tools/pack/resources/win/7zip",
];

const promptLicenseAllowList = new Set(["Apache-2.0", "MIT", "CC-BY-4.0"]);

const noticesFileName = "THIRD-PARTY-NOTICES.md";
const noticeFileName = "NOTICE";
const fontsDirectory = "apps/web/public/fonts";
const remixIconCss = "apps/web/src/styles/remixicon/remixicon.css";
const promptTemplatesDirectory = "prompt-templates";

export type AttributionViolation = {
  path: string;
  reason: string;
};

function toPosix(repositoryPath: string): string {
  return repositoryPath.split(path.sep).join("/");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code: unknown }).code;
      if (code === "ENOENT" || code === "ENOTDIR") return false;
    }
    throw error;
  }
}

async function collectLicenseFiles(directory: string): Promise<string[]> {
  if (!(await pathExists(directory))) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await collectLicenseFiles(fullPath)));
    } else if (entry.isFile() && /^LICENSE[^/]*$/i.test(entry.name)) {
      found.push(fullPath);
    }
  }
  return found;
}

async function collectJsonFiles(directory: string): Promise<string[]> {
  if (!(await pathExists(directory))) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await collectJsonFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      found.push(fullPath);
    }
  }
  return found;
}

function findUnreferencedLicenseDirs(
  licenseFiles: readonly string[],
  context: { repoRoot: string; noticesText: string },
): AttributionViolation[] {
  const violations: AttributionViolation[] = [];
  for (const file of licenseFiles) {
    const relative = toPosix(path.relative(context.repoRoot, file));
    const directory = relative.includes("/") ? relative.slice(0, relative.lastIndexOf("/") + 1) : "";
    // The root LICENSE is CaptDesign's own Apache-2.0 text, covered by the
    // derivative-work statement — only bundled content needs per-directory names.
    if (directory === "") continue;
    if (!context.noticesText.includes(directory)) {
      violations.push({
        path: relative,
        reason: `bundled license directory '${directory}' is not named in ${noticesFileName}`,
      });
    }
  }
  return violations;
}

async function findFontViolations(
  repoRootPath: string,
  noticesText: string,
): Promise<AttributionViolation[]> {
  const violations: AttributionViolation[] = [];
  const fontsDir = path.join(repoRootPath, fontsDirectory);
  if (!(await pathExists(fontsDir))) return violations;
  const entries = await readdir(fontsDir);
  const fontFiles = entries.filter((name) => /\.(ttf|otf|woff2?)$/i.test(name));
  if (fontFiles.length === 0) return violations;

  for (const name of fontFiles) {
    if (/jidu/i.test(name)) {
      violations.push({
        path: `${fontsDirectory}/${name}`,
        reason: "proprietary CoType face must stay removed (WS2); its presence blocks redistribution",
      });
    }
  }
  if (!/albert sans/i.test(noticesText) || !/OFL/i.test(noticesText)) {
    violations.push({
      path: fontsDirectory,
      reason: `shipped fonts require an Albert Sans / SIL OFL notice in ${noticesFileName}`,
    });
  }
  return violations;
}

async function findRemixIconViolations(
  repoRootPath: string,
  noticesText: string,
): Promise<AttributionViolation[]> {
  if (!(await pathExists(path.join(repoRootPath, remixIconCss)))) return [];
  if (!/remix icon/i.test(noticesText)) {
    return [
      {
        path: remixIconCss,
        reason: `${remixIconCss} exists without a Remix Icon mention in ${noticesFileName}`,
      },
    ];
  }
  return [];
}

async function findPromptTemplateViolations(repoRootPath: string): Promise<AttributionViolation[]> {
  const violations: AttributionViolation[] = [];
  const files = await collectJsonFiles(path.join(repoRootPath, promptTemplatesDirectory));
  for (const file of files) {
    const relative = toPosix(path.relative(repoRootPath, file));
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(file, "utf8"));
    } catch {
      violations.push({ path: relative, reason: "unparseable JSON — provenance cannot be verified" });
      continue;
    }
    const license =
      typeof parsed === "object" && parsed !== null && "source" in parsed
        ? (parsed as { source?: { license?: unknown } }).source?.license
        : undefined;
    if (typeof license !== "string" || !promptLicenseAllowList.has(license)) {
      violations.push({
        path: relative,
        reason: `source.license '${typeof license === "string" ? license : "missing"}' is outside the allow-list (Apache-2.0, MIT, CC-BY-4.0)`,
      });
    }
  }
  return violations;
}

export async function collectAttributionViolations(
  contextRepoRoot: string,
): Promise<AttributionViolation[]> {
  const violations: AttributionViolation[] = [];
  const noticesPath = path.join(contextRepoRoot, noticesFileName);
  const noticePath = path.join(contextRepoRoot, noticeFileName);

  if (!(await pathExists(noticesPath))) {
    violations.push({ path: noticesFileName, reason: `${noticesFileName} is missing from the repository root` });
  }
  if (!(await pathExists(noticePath))) {
    violations.push({ path: noticeFileName, reason: `${noticeFileName} is missing from the repository root` });
  }
  if (violations.length > 0) return violations;

  const noticesText = await readFile(noticesPath, "utf8");
  const licenseFiles = (
    await Promise.all(
      bundledLicenseRoots.map((root) => collectLicenseFiles(path.join(contextRepoRoot, root))),
    )
  ).flat();

  violations.push(
    ...findUnreferencedLicenseDirs(licenseFiles, { repoRoot: contextRepoRoot, noticesText }),
    ...(await findFontViolations(contextRepoRoot, noticesText)),
    ...(await findRemixIconViolations(contextRepoRoot, noticesText)),
    ...(await findPromptTemplateViolations(contextRepoRoot)),
  );
  return violations;
}

export async function checkAttributionNotices(context: { repoRoot: string }): Promise<boolean> {
  const violations = await collectAttributionViolations(context.repoRoot);
  if (violations.length > 0) {
    console.error("Attribution notice violations found:");
    for (const violation of violations) {
      console.error(`- ${violation.path}: ${violation.reason}`);
    }
    return false;
  }
  console.log(
    `Attribution notices check passed: ${noticesFileName} and ${noticeFileName} cover the bundled tree.`,
  );
  return true;
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain && !(await checkAttributionNotices({ repoRoot }))) {
  process.exitCode = 1;
}
