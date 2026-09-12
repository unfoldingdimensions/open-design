# CaptDesign rebrand & Cloud removal — master plan

Status: **proposed**, awaiting execution.
Scope: turn the `unfoldingdimensions/open-design` fork into **CaptDesign** — an
Apache-2.0 derivative that keeps upstream attribution and MIT/OFL/Remix notices,
stops shipping the proprietary JiduMono Pro font, carries none of nexu-io's
OpenDesign Cloud surface, and no longer points at nexu-io infrastructure.

Read this file first. Then hand one prompt from `prompts/` to one agent.

---

## 0. Decisions already taken (do not re-litigate inside a workstream)

| # | Decision | Value |
|---|----------|-------|
| D1 | Product name (display) | **CaptDesign** |
| D2 | Package scope | **`@captdesign/*`** — full rename from `@open-design/*` |
| D3 | Install / updater identity | **`io.captdesign.desktop`**, namespace **`captdesign`** |
| D4 | CLI binary | **`capt`** only — `od` is dropped, not aliased |
| D5 | Mono font | **Albert Sans** — the face the repo already ships. `JiduMonoPro-Regular.otf` (CoType Foundry, commercial) is deleted, no third family is added, and `--mono` becomes a system-monospace stack. **Accepted regression: Albert Sans has no tabular figures, so timings/paths/diff counts lose column alignment.** See F1. |
| D6 | Cloud cut depth | **Full removal — keep nothing.** Sign-in, wallet, billing, plans, telemetry, console handoff, hosted feeds, the `amr` model-provider runtime, **and the workspace/team identity layer they ride on**. No Tier A/B split. End state **(a)**: projects collapse to a single implicit local scope. See F2. |
| D7 | Upstream URLs | Rewritten to the fork, or removed where no fork equivalent exists |
| D8 | Attribution | Made *more* prominent, not less — a machine-checked `THIRD-PARTY-NOTICES.md` |

### Deliberately NOT renamed

- **`OD_*` environment variables** (418 distinct names, e.g. `OD_DATA_DIR`,
  `OD_PORT`, `OD_WEB_PORT`) and the `--od-stamp-*` sidecar flags. `AGENTS.md`
  and `packages/sidecar-proto` define these as a public contract that external
  agents and shells consume. Renaming them breaks every out-of-tree consumer
  for no user-visible gain. The `.od` *default data directory* **is** renamed to
  `.captdesign` (see WS4) — that is a path, not an env var.
  *(Distinct from `VELA_*` / `OPEN_DESIGN_AMR_*` / `AMR_*`, which are removed
  entirely with the Cloud layer by WS6 — they are not a contract to preserve,
  they are the deleted feature's configuration.)*
- **`od-focus` / `od-done` / `od-next` artifact marker tags**
  (`packages/contracts/src/api/*-marker.ts`). These are wire-protocol tokens
  embedded in generated artifact HTML; renaming them invalidates artifacts and
  the parsers that read them, for zero branding value.
- **`docs/CHANGELOG/**`** and **`CHANGELOG.md`**: historical record of upstream
  releases. Never rewrite history in a changelog.

---

## 1. The two findings that shaped this plan

**F1 — Albert Sans has no tabular figures.** The decision to collapse the mono
slot onto Albert Sans is implemented, but it carries a measured cost that must be
stated up front. From the shipped variable font (`unitsPerEm 1000`, `numGlyphs
405`): `GSUB` exposes only `aalt, ccmp, frac, liga, locl, ordn, ss01-ss05, sups`
— **no `tnum`**. Digit advances span `1` = 306 to `4` = 655 units, a 2.1× spread,
so `font-variant-numeric: tabular-nums` is a no-op. Everywhere the old face
aligned timings, file paths, hex values and diff counts, the text will now
jitter, and a live-updating number shifts the content around it.

This is **accepted** (D5), not solved. WS2 keeps `--mono` as a semantic seam
pointing at a system-monospace stack so the slots degrade to a real monospace
rather than to a proportional face, and flipping them to Albert Sans later is a
one-line change. The jitter is reported to the human as a known regression;
reintroducing alignment requires a monospace or tabular-figure face, which this
decision declines.

**F2 — the Cloud layer is the identity and access layer, not a feature.** This is
the finding that reshaped WS6 after the "remove everything" instruction. Open
Design Cloud (internal name **AMR**, shipped by the **Vela** CLI) provides:

1. sign-in, 2. wallet/billing/plans, 3. the `amr` model-provider runtime, and
4. **workspace and team identity — which everything else is gated on.**

Point 4 is load-bearing. Projects are auto-bound to the signed-in user's personal
workspace (`bindUnboundProjectsToPersonalWorkspace`,
`apps/daemon/src/routes/project/index.ts:2916`, called at `:3287`), and project,
run and collab access returns **`WORKSPACE_CONTEXT_REQUIRED` (400/401)** without an
explicit workspace context (`apps/daemon/src/collab/workspace-resource-mutation.ts:272,733,851,961,967`,
`collab/request-workspace-context.ts:14,42`,
`collab/project-request-authority.ts:144`). Callers must send
`x-od-workspace-*` headers on every call, and the MCP bridge resolves the signed-in
workspace just to keep working (`apps/daemon/src/mcp-workspace-context.ts:1-25`).

So "remove the Cloud" and "the app still opens my projects" pull against each
other. Three coherent end states exist; **end state (c) — delete the UI, leave the
gate — produces a daemon that returns an empty project list to its own user.**
WS6 implements **(a)**: sign-in and the gate are removed together and projects
collapse to a single implicit local scope. That is what "keep nothing" implies,
and WS6 must prove it with a headerless `GET /api/projects` test before it touches
the web app.

---

## 2. Workstreams, dependency graph, and the prompt that owns each

```
WS0 baseline            (no deps)                  prompts/00-baseline-freeze.md
 └─> WS1 attribution ledger                        prompts/01-attribution-ledger.md
 └─> WS2 font swap                                 prompts/02-font-license-swap.md
 └─> WS3 product identity (text + constants)       prompts/03-product-identity-captdesign.md
      └─> WS4 package scope + install namespaces   prompts/04-package-scope-and-namespaces.md
      └─> WS9 visual assets (needs human design)   prompts/09-logo-and-visual-assets.md
 └─> WS5 CLI bin rename  (AFTER WS3+WS4)           prompts/05-cli-bin-rename.md
 └─> WS6 Cloud + identity-layer removal (AFTER WS3) prompts/06-cloud-surface-removal.md
 └─> WS7 upstream links + infra (AFTER WS3)        prompts/07-upstream-links-and-infra.md
      └─> WS10 pack hotfix identity                prompts/10-local-pack-hotfix-identity.md
      └─> WS11 release pipeline identity           prompts/11-release-pipeline-identity.md
 └─> WS8 docs + shipped content                    prompts/08-docs-and-content-rename.md
 └─> WS12 test-suite rebaseline (AFTER 2,3,4,5,6)  prompts/12-test-suite-rebaseline.md
      └─> WS13 final verification + legal pack      prompts/13-final-verification.md
```

`docs/`, `specs/`, `design-systems/`, `design-templates/`, `plugins/`, `skills/`
are owned by **WS8**. Do not edit them from any other workstream — the
counts are large (`design-systems/` alone has 1,813 name occurrences across 152
`DESIGN.md` files and 19 locale variants each) and a second writer guarantees
conflicts.

### Why this order

1. WS1–WS2 are self-contained and land first so the legal position is clean
   before anything is redistributed under a new name.
2. WS3 rewrites the *strings*; WS4 rewrites the *identifiers*. Doing them in
   either order works only if they do not both edit the same files — they do
   (`tools/pack/src/mac/constants.ts` holds both). WS3 therefore goes first and
   WS4 rebases on it.
3. WS5 depends on WS3 (help text) and WS4 (workspace package scope).
4. WS6 and WS7 both touch `apps/daemon/src/server.ts`,
   `apps/web/src/components/HomeHero.tsx` and `packages/contracts/src/prompts/`.
   Run them **serially**, WS6 before WS7. Never in parallel.
5. WS9 (visual assets) is **blocked on human artwork** and WS11 is **blocked on
   human-supplied release infrastructure**. Both are designed to produce a plan
   and stop, not to improvise. Do not schedule them as if they will finish.
6. WS12 last: the full suite must be re-baselined once, against everything, and
   not four times against four half-renamed trees.

---

## 3. Global rules every prompt inherits

Restated inside each prompt so a subagent that sees only one file still obeys
them:

- Repo root is the checkout of `unfoldingdimensions/open-design`. Read
  `AGENTS.md` at the repo root and in the directory being edited before editing.
- **TypeScript only.** New `.js`/`.mjs`/`.cjs` needs an explicit
  generated/vendor/compatibility reason and must pass `pnpm guard`. The one
  sanctioned exception in this plan is `apps/daemon/bin/capt.mjs` (a `bin`
  shim, matching the existing `bin/od.mjs` shape).
- Tests live in a package-level `tests/` sibling to `src/` — never
  `src/*.test.ts`. Every behavioural change ships **with** tests, including the
  red spec that reproduces the defect being fixed.
- Run at minimum `pnpm guard` and `pnpm typecheck` before declaring done, plus
  the package-scoped tests for everything touched.
- No root `pnpm build` / `pnpm test` aliases. Package-scoped or tool-scoped only
  (`pnpm --filter <pkg> …`, `pnpm tools-pack …`).
- **Commits carry no `Co-authored-by` trailer or any other co-author metadata.**
- Stay inside your workstream's file list. If you find work another workstream
  owns, **list it in your report and leave it**. Do not "while I'm here" it.
- Never rewrite `CHANGELOG.md` or `docs/CHANGELOG/**`.
- Do not commit `.od/`, `.tmp/`, `node_modules/`, build output, or anything the
  workstream did not intend to change. Verify with `git status` before handing
  back.
- Report honestly: name what you could not finish, with the exact failing
  command. A partial, accurately-reported result is worth more than a green
  claim that does not survive `pnpm guard`.

---

## 4. Definition of done for the whole effort

1. `pnpm guard` and `pnpm typecheck` pass from a clean checkout.
2. `pnpm --filter @captdesign/web test`, `@captdesign/daemon test`,
   `@captdesign/contracts test`, `e2e test` pass (WS12 owns the rebaseline).
3. All four acceptance greps from WS13 return zero unexpected hits.
4. A `pnpm tools-pack <platform> build` produces a locally installable app whose
   macOS bundle id is `io.captdesign.desktop`, whose Windows uninstall registry
   key is CaptDesign's, and whose window title reads CaptDesign.
5. `THIRD-PARTY-NOTICES.md` exists, enumerates every third-party component by
   holder and license, and passes `node scripts/check-attribution-notices.ts`.
6. No file in the tree is licensed incompatibly with Apache-2.0 redistribution
   (`JiduMonoPro-Regular.otf` gone; every remaining bundled component has a
   license file next to it or an entry in the notices).
7. Upstream attribution is present and correct: Apache-2.0 `LICENSE` retained,
   the derivative stated in `NOTICE`, and the original project credited by name.

---

## 5. Known risks (carry these into the relevant prompt)

| Risk | Where | Mitigation |
|------|-------|------------|
| Rebasing on upstream gets harder — 137 files already diverge, and every rename deepens it | WS3/WS4/WS5 | Do the renames in as few, as mechanical, passes as possible; keep `git mv` where only the name changes so upstream merges line up |
| `.od` → `.captdesign` strands existing local data | WS4 | Read-from-both / write-to-new, with a documented one-time import; never delete `.od` |
| `od` → `capt` breaks external shell tooling (902 documented `od` invocations) | WS5 | Land the rename with a full-tree sweep in one commit; call the break out in the PR body — it is a deliberate, accepted break |
| product-neutrality guard fires on the new name | WS3 onward | The guard only blocks *named-orchestrator examples* and `OD_PRODUCT_NEUTRALITY_FORBIDDEN_TERMS`; CaptDesign is the product, not an orchestrator example. Re-read `scripts/guard.ts:655-730` if it fires |
| `@open-design/*` scope rename silently breaks workspace resolution | WS4 | `pnpm install` is mandatory after, then `pnpm --filter @captdesign/web typecheck` as the canary |
| **Removing the workspace identity layer locks the daemon out of its own projects** — `GET /api/projects` returns `[]` and project/run calls 400 with `WORKSPACE_CONTEXT_REQUIRED` | WS6 | Implement end state (a): remove the sign-in gate and `bindUnboundProjectsToPersonalWorkspace` together. Prove it with a headerless `GET /api/projects` test before touching the web app. Never implement end state (c) |
| Dropping workspace columns breaks the local SQLite DB | WS6 | Drop cleanly only if `apps/daemon/src/db.ts`'s migration pattern supports it; otherwise leave the columns unused and report it |
| Deleting the AMR runtime def orphans model-picker rows | WS6 | WS6 owns the picker cleanup; WS12 owns the test rebaseline |
| **Accepted visual regression: losing tabular alignment** in timings, paths, hex and diff counts (F1) | WS2 | Not mitigated — accepted by decision D5. WS2 keeps `--mono` as a semantic seam over a system-monospace stack; reported in the PR body as a known regression |
| Visual assets and release infrastructure are unbounded human dependencies | WS9, WS11 | Both prompts produce a plan/decision register and stop. Do not let an agent improvise a logo or a domain |
| Legal exposure assumed without counsel | all | This plan encodes engineering controls, not legal advice. The JiduMono question in particular deserves a lawyer's read before a paid distribution ships — note that removal is prospective and does not retract an already-published build |
