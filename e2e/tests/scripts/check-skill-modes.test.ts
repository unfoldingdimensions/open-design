import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";

import {
  checkSkillModes,
  extractDeclaredMode,
  findSkillModeViolations,
} from "../../../scripts/check-skill-modes.ts";

test("declared mode parser reads only od.mode and tolerates absent od blocks", () => {
  assert.equal(extractDeclaredMode("---\nname: a\nod:\n  mode: utility\n---\nbody"), "utility");
  assert.equal(extractDeclaredMode("---\nname: a\nod:\n  mode: deck\n---\nbody"), "deck");
  // Absent `od.mode` is legitimate: inference is the documented default path.
  assert.equal(extractDeclaredMode("---\nname: a\nod:\n  surface: web\n---\nbody"), null);
  assert.equal(extractDeclaredMode("---\nname: a\n---\nbody"), null);
  // `mode` outside the `od:` block is not the registry's mode.
  assert.equal(extractDeclaredMode("---\nname: a\nmode: utility\n---\nbody"), null);
});

test("mode violations report only unrecognized values and keep valid ones silent", () => {
  const violations = findSkillModeViolations([
    { manifestPath: "skills/ok/SKILL.md", source: "---\nod:\n  mode: utility\n---\n" },
    { manifestPath: "skills/ok-deck/SKILL.md", source: "---\nod:\n  mode: deck\n---\n" },
    { manifestPath: "skills/no-mode/SKILL.md", source: "---\nod:\n  surface: web\n---\n" },
    // The historical bug: the authoring guide taught `utility`/`design`, and
    // `design` resolved to a guessed surface with nothing said.
    { manifestPath: "skills/bad/SKILL.md", source: "---\nod:\n  mode: design\n---\n" },
    { manifestPath: "skills/typo/SKILL.md", source: "---\nod:\n  mode: deckk\n---\n" },
  ]);

  assert.deepEqual(violations, [
    { manifestPath: "skills/bad/SKILL.md", mode: "design" },
    { manifestPath: "skills/typo/SKILL.md", mode: "deckk" },
  ]);
});

test("case and surrounding whitespace do not produce false violations", () => {
  const violations = findSkillModeViolations([
    { manifestPath: "skills/upper/SKILL.md", source: "---\nod:\n  mode: UTILITY\n---\n" },
    { manifestPath: "skills/padded/SKILL.md", source: '---\nod:\n  mode: " deck "\n---\n' },
  ]);

  assert.deepEqual(violations, []);
});

test("bad bundled skill mode manifests are reported against the fixture root", async () => {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "check-skill-modes-"));
  const goodPath = path.join(fixtureRoot, "skills/good/SKILL.md");
  const badPath = path.join(fixtureRoot, "skills/bad/SKILL.md");
  await mkdir(path.dirname(goodPath), { recursive: true });
  await mkdir(path.dirname(badPath), { recursive: true });
  await writeFile(goodPath, "---\nname: good\nod:\n  mode: utility\n---\n");
  await writeFile(badPath, "---\nname: bad\nod:\n  mode: scenario\n---\n");

  try {
    // The check returns false rather than throwing so `pnpm guard` reports it.
    assert.equal(await checkSkillModes({ repoRoot: fixtureRoot }), false);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("the repository's own skill manifests declare recognized modes", async () => {
  // Regression anchor for the drift this guard exists to catch: `pnpm guard`
  // must stay green on the checked-in tree.
  assert.equal(await checkSkillModes({ repoRoot: path.resolve(import.meta.dirname, "../../..") }), true);
});
