import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";

import {
  checkAttributionNotices,
  collectAttributionViolations,
} from "../../../scripts/check-attribution-notices.ts";

const noticesFileName = "THIRD-PARTY-NOTICES.md";

async function makeFixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "check-attribution-"));
  await writeFile(path.join(root, noticesFileName), "# Third-Party Notices\n");
  await writeFile(path.join(root, "NOTICE"), "Fixture\n");
  return root;
}

test("a bundled license directory missing from the notices fails and names it", async () => {
  const root = await makeFixture();
  try {
    const skillDir = path.join(root, "skills", "example");
    await mkdir(skillDir, { recursive: true });
    await writeFile(path.join(skillDir, "LICENSE"), "MIT License\nCopyright (c) 2026 Example\n");
    // Reference an unrelated directory so the failure is scoped to the new one.
    await writeFile(
      path.join(root, noticesFileName),
      "# Third-Party Notices\n\n`plugins/_official/examples/hps-bauhaus/`\n",
    );

    const violations = await collectAttributionViolations(root);
    assert.equal(violations.length, 1);
    assert.match(violations[0]?.path ?? "", /skills\/example\/LICENSE/);
    assert.match(violations[0]?.reason ?? "", /skills\/example\//);
    assert.equal(await checkAttributionNotices({ repoRoot: root }), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a present JiduMono face fails the regression fence", async () => {
  const root = await makeFixture();
  try {
    const fontsDir = path.join(root, "apps", "web", "public", "fonts");
    await mkdir(fontsDir, { recursive: true });
    await writeFile(path.join(fontsDir, "JiduMonoPro-Regular.otf"), "fake-font");
    await writeFile(
      path.join(root, noticesFileName),
      "# Third-Party Notices\n\nAlbert Sans\nSIL OFL\n",
    );

    const violations = await collectAttributionViolations(root);
    assert.ok(violations.some((violation) => /JiduMonoPro-Regular\.otf/.test(violation.path)));
    assert.equal(await checkAttributionNotices({ repoRoot: root }), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a prompt template with an unlisted license fails", async () => {
  const root = await makeFixture();
  try {
    const templatesDir = path.join(root, "prompt-templates", "image");
    await mkdir(templatesDir, { recursive: true });
    await writeFile(
      path.join(templatesDir, "mystery.json"),
      JSON.stringify({ id: "mystery", source: { license: "Original X post" } }),
    );

    const violations = await collectAttributionViolations(root);
    assert.equal(violations.length, 1);
    assert.match(violations[0]?.path ?? "", /mystery\.json/);
    assert.match(violations[0]?.reason ?? "", /Original X post/);
    assert.equal(await checkAttributionNotices({ repoRoot: root }), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a clean fabricated tree passes", async () => {
  const root = await makeFixture();
  try {
    const skillDir = path.join(root, "skills", "example");
    await mkdir(skillDir, { recursive: true });
    await writeFile(path.join(skillDir, "LICENSE"), "MIT License\nCopyright (c) 2026 Example\n");
    await writeFile(
      path.join(root, noticesFileName),
      "# Third-Party Notices\n\nExample skill under `skills/example/`.\n\nAlbert Sans\nSIL OFL\nRemix Icon\n",
    );
    const fontsDir = path.join(root, "apps", "web", "public", "fonts");
    await mkdir(fontsDir, { recursive: true });
    await writeFile(path.join(fontsDir, "AlbertSans-VariableFont_wght.ttf"), "fake-font");

    assert.deepEqual(await collectAttributionViolations(root), []);
    assert.equal(await checkAttributionNotices({ repoRoot: root }), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the real repository fails only on the known pre-WS2 blockers", async () => {
  // WS2 (font swap) has not removed JiduMonoPro and no human has cleared the
  // two "Original X post" prompt templates, so the check is red on the real
  // tree by design. This test pins the failure set: any NEW violation means
  // the ledger drifted and the test must be updated with it, not weakened.
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const violations = await collectAttributionViolations(repoRoot);
  const paths = violations.map((violation) => violation.path).sort();
  assert.deepEqual(paths, [
    "apps/web/public/fonts/JiduMonoPro-Regular.otf",
    "prompt-templates/image/profile-avatar-seedream-high-fashion-dreamy-portrait.json",
    "prompt-templates/image/social-media-post-seedream-squishcraft-kids-clay-ad.json",
  ]);
});
