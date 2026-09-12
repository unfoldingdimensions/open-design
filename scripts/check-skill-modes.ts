// Guard: every authored `od.mode` must be one of the values the registry knows.
//
// `normalizeMode` stays tolerant at load time — an unrecognized value falls back
// to inferring a mode from the skill body so a half-finished workspace skill
// still loads — but that tolerance is exactly what let six bundled skills author
// `mode: utility`, a value the authoring guide taught, and quietly resolve to the
// Media rail off incidental body vocabulary. This check is the loud half: it
// fails `pnpm guard` so the drift cannot land unnoticed again.
//
// Scope mirrors the registry, not the whole repository. `skills/` and
// `design-templates/` are the roots `listSkills()` scans, and the two example
// roots carry the same manifests that ship through plugins. Plugin atoms and
// scenarios declare a *different* `od.mode` vocabulary (`scenario`, `planning`,
// `extract`, …) that never passes through `normalizeMode`, so they are excluded
// here rather than misreported as invalid.
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { SKILL_MODES, SKILL_MODE_SET } from "../apps/daemon/src/skills.ts";
import { parseFrontmatter } from "../packages/plugin-runtime/src/parsers/frontmatter.ts";

const repoRoot = path.resolve(import.meta.dirname, "..");

// Roots whose `od.mode` reaches `normalizeMode`. Kept in step with
// `skillManifestRoots` in `lint-craft-references.ts`.
const skillManifestRoots = [
  "skills",
  "design-templates",
  "plugins/_official/examples",
  "docs/examples",
];

export type SkillModeViolation = {
  manifestPath: string;
  mode: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAbsenceError(error: unknown): boolean {
  return isRecord(error) && (error["code"] === "ENOENT" || error["code"] === "ENOTDIR");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (isAbsenceError(error)) return false;
    throw error;
  }
}

async function collectNamedManifests(directory: string, fileName: string): Promise<string[]> {
  if (!(await pathExists(directory))) return [];

  const entries = await readdir(directory, { withFileTypes: true });
  const manifests: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      manifests.push(...(await collectNamedManifests(fullPath, fileName)));
    } else if (entry.isFile() && entry.name === fileName) {
      manifests.push(fullPath);
    }
  }

  return manifests;
}

export function extractDeclaredMode(source: string): string | null {
  let data: unknown;
  try {
    ({ data } = parseFrontmatter(source) as { data: unknown });
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;

  const od = data["od"];
  if (!isRecord(od)) return null;

  const mode = od["mode"];
  return typeof mode === "string" ? mode : null;
}

export function findSkillModeViolations(
  manifests: ReadonlyArray<{ manifestPath: string; source: string }>,
): SkillModeViolation[] {
  const violations: SkillModeViolation[] = [];

  for (const manifest of manifests) {
    const mode = extractDeclaredMode(manifest.source);
    // Absent `od.mode` is legitimate: inference is the documented default path.
    if (mode === null) continue;
    if (!SKILL_MODE_SET.has(mode.trim().toLowerCase())) {
      violations.push({ manifestPath: manifest.manifestPath, mode });
    }
  }

  return violations;
}

async function collectManifestSources(
  repoRootPath: string,
): Promise<Array<{ manifestPath: string; source: string }>> {
  const manifests = (
    await Promise.all(
      skillManifestRoots.map((manifestRoot) =>
        collectNamedManifests(path.join(repoRootPath, manifestRoot), "SKILL.md"),
      ),
    )
  ).flat();

  return Promise.all(
    manifests.map(async (manifestPath) => ({
      manifestPath,
      source: await readFile(manifestPath, "utf8"),
    })),
  );
}

export async function checkSkillModes(context: { repoRoot: string }): Promise<boolean> {
  const sources = await collectManifestSources(context.repoRoot);
  const violations = findSkillModeViolations(sources);

  if (violations.length > 0) {
    console.error("Unrecognized od.mode values found:");
    for (const violation of violations) {
      const relative = path.relative(context.repoRoot, violation.manifestPath);
      console.error(`- ${relative.split(path.sep).join("/")}: ${violation.mode}`);
    }
    console.error(
      `od.mode must be one of: ${SKILL_MODES.join(", ")}. ` +
        "Use `utility` for a functional workflow with no artifact surface of its own.",
    );
    return false;
  }

  console.log(
    `Skill mode check passed: ${sources.length} manifests under ${skillManifestRoots.length} roots declare a recognized od.mode.`,
  );
  return true;
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain && !(await checkSkillModes({ repoRoot }))) {
  process.exitCode = 1;
}
