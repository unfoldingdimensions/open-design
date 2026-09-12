# WS12 — Test-suite rebaseline and residue audit

**Dependencies:** WS2, WS3, WS4, WS5, WS6 landed. WS7/WS8/WS9/WS10/WS11 should be
landed too — re-baselining before they are means doing it twice.
**You own:** the whole test suite's green-ness, plus a machine-checked residue
audit. You change tests and small code defects; you do **not** re-do other
workstreams' renames.

## Why this is a dedicated workstream

Several hundred tests across four suites assert the old product name, the old
package scope, the old CLI binary, the old appId, the old font, and the removed
Cloud surfaces. Each upstream workstream fixed the tests it touched. Nobody has
yet run the **whole** suite against the **whole** change, which is the only thing
that proves the rebrand is real.

You have one critical advantage: **WS0's baseline**. Before you "fix" a failure,
open `.captdesign-rebrand/baseline/failing-tests.md`. A test that was already
failing before this work started is **not yours to fix** — note it, leave it, and
keep it out of the pass/fail claim.

## Step 1 — establish the true post-rebrand state

```bash
pnpm install
pnpm guard
pnpm typecheck
pnpm --filter @captdesign/contracts test  2>&1 | tail -60
pnpm --filter @captdesign/daemon    test  2>&1 | tail -60
pnpm --filter @captdesign/web       test  2>&1 | tail -60
pnpm --filter @captdesign/e2e       test  2>&1 | tail -60
```

For every failure, classify it into exactly one bucket:

| Bucket | Meaning | Owner |
|---|---|---|
| `stale-expectation` | the test asserts the old name/scope/bin/appId/font and the new value is correct | **you fix it** |
| `real-regression` | product behaviour broke | **escalate** — name the workstream and the file |
| `pre-existing` | in WS0's baseline list | leave, note |
| `flaky` | passes on re-run, unrelated to the change | re-run twice, then note |

Write the result to `docs/plans/captdesign-rebrand/test-rebaseline.md` as a table.

**Do not launder a `real-regression` into `stale-expectation`.** The distinction is
the most valuable thing you produce. WS6 removed the Cloud identity layer in full,
so the capability tests are *expected* to be gone — but the tests covering the
**surfaces WS6 had to preserve** are not. If a project, run, library, plugin or
media test broke, that is a regression in WS6's workspace-gate removal and it must
be reported as one, not silenced by editing the test.

## Step 2 — fix `stale-expectation` failures properly

Rules:

- Update the asserted value. **Do not** weaken the assertion, add `.skip`, widen a
  `toMatch` into a truthy check, or delete the case.
- If the test's *name* references the old product, rename it too.
- If a test asserted a value that no longer exists because the capability was
  deliberately removed (e.g. an AMR balance test), deleting the test is correct —
  but list every deletion explicitly so the coverage loss is auditable.
- Where a test asserted an invariant that changed shape — WS2's mono `@font-face`
  weight-vs-baseline agreement is the worked example — rewrite it to assert the
  **new** invariant and say in a comment why it still matters. `apps/web/tests/components/chat/typography-baseline.test.ts`
  and `apps/web/tests/components/home-logo-assets.test.ts` are the two to read
  closely; both encode real contracts that the rebrand reshapes rather than
  removes.

## Step 3 — the residue audit

Build one script that fails on any leftover. Put it where the repo's layout
expects (`scripts/` is likely test-free per `scripts/guard.ts:1529`; put the
runnable logic in `scripts/lib/guard/`, test it from wherever the existing
guard-check tests live, and register it in `scripts/guard.ts`'s `checks` array
alongside WS1's attribution check). It must fail on:

1. `OpenDesign` / `Open Design` in shipped code (`apps/`, `packages/`, `tools/`,
   `e2e/`, `scripts/`) **except** the allow-list:
   - the exact string `Open Design contributors`;
   - attribution references to `nexu-io/open-design` and the upstream project;
   - `LICENSE` / `NOTICE` / `THIRD-PARTY-NOTICES.md`;
   - changelogs and archived specs (excluded from the scan entirely).
2. `@open-design/` in any `package.json` or import specifier.
3. `io.open-design.desktop` anywhere.
4. `od ` as a CLI invocation in shipped code, docs, skills and plugins **except**
   `OD_`-prefixed identifiers, `od-focus` / `od-done` / `od-next` markers, and the
   English word.
5. `JiduMono` outside the notices/removal references.
6. An operational `*.open-design.ai` endpoint (WS7's fail-closed rule, restated as
   a permanent guard). Coordinate with WS7 so this is one check, not two.

Allow-list entries must carry a one-line justification **in the source**, so the
next person can tell a deliberate exception from a missed sweep.

## Step 4 — prove the two hard requirements

Two things matter more than a green suite. Verify them for real and paste the
evidence:

1. **The daemon still works with no Cloud identity — the removal did not lock the
   user out of their own machine.** This is the single highest-risk outcome of the
   whole rebrand, because the workspace identity layer was an *access gate*, not a
   feature. WS6 was required to prove it with a headerless `GET /api/projects`
   test; run that test and, independently, drive the real daemon with no
   `VELA_*` / `AMR_*` env and no `x-od-workspace-*` headers and confirm:
   - `GET /api/projects` returns the real project list — not `[]`, not 400;
   - creating a project, starting a run, and reading it back all succeed;
   - **no** route returns `WORKSPACE_CONTEXT_REQUIRED` anywhere in the flow.

   If the workspace gate survived anywhere, this is a **release blocker**, not a
   test failure. Say so loudly and do not sign off.
2. **No distribution of the proprietary font.** Prove the artifact does not carry
   it:

   ```bash
   pnpm tools-pack mac build --to <host-appropriate>
   find <artifact-root> -iname "*Jidu*"; find <artifact-root> -iname "*.otf" -o -iname "*.ttf"
   ```

   Empty output is the proof. Also re-run `node scripts/check-attribution-notices.ts`.

## Step 5 — hand-verification staging

Green specs are not acceptance for a rebrand. Per root `AGENTS.md`'s bug-follow-up
guidance, stage a comparison the human can drive: two namespaced runtimes, one on
the pre-rebrand commit and one on the rebrand, both seeded through production
HTTP APIs only (no source-level backdoors). Give the human the exact commands.

## Verification

```bash
pnpm guard
pnpm typecheck
pnpm --filter @captdesign/contracts test
pnpm --filter @captdesign/daemon test
pnpm --filter @captdesign/web test
pnpm --filter @captdesign/e2e test
```

All green, or every non-green explained against WS0's baseline.

## Report back

- The rebaseline table: counts per bucket, with paths for `real-regression` and
  `pre-existing`.
- **Every** test deleted, with the capability it covered — the coverage-loss list.
- Every invariant you rewrote, and the new invariant it now asserts.
- The residue-audit script path, its registry entry in `guard.ts`, and its output.
- The two hard-requirement results, with raw evidence. If the headerless
  `GET /api/projects` check did not run and pass on the real daemon, say so in
  those words — it is a release blocker, not a caveat.
- The staged comparison commands for the human.
- One paragraph: **is this rebrand actually done, and what is still not true?**

## Do not

- Do not skip, weaken, or delete a test to reach green. Fix the value, or escalate.
- Do not fix a `pre-existing` failure from WS0's baseline.
- Do not re-do other workstreams' renames — if you find residue, the owner missed
  it; fix it only if it is a one-line value in a test, and list anything larger.
- Do not sign off without proving the daemon works with no Cloud identity. With the
  workspace gate removed, "the suite is green" and "the user can open their
  projects" are different claims.
- Do not claim an artifact is clean without inspecting the artifact.
- Do not re-litigate decision D5 (Albert Sans) or D6 (full Cloud removal). Both are
  settled; report consequences, not objections.
