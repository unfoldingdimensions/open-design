# WS6 — Remove the Open Design Cloud surface entirely

**Dependencies:** WS3 (product strings) landed. **Serial with WS7** — WS7 runs
**after** you; both touch `apps/daemon/src/server.ts`,
`apps/web/src/components/HomeHero.tsx` and the prompt files.
**You own:** everything Cloud. This is the largest workstream in the rebrand and
the one with real breakage risk.

## The instruction

> *"Remove everything related to cloud then, keep nothing."*

Tier A / Tier B is gone. There is no partial cut. Sign-in, wallet, billing, plans,
telemetry, console handoff, the hosted feeds, the model provider runtime, **and the
workspace/team identity layer they all ride on** come out.

## Read this before you plan the work — the coupling is worse than it looks

Open Design Cloud (internally **AMR**, shipped by the **Vela** CLI) is not a
feature bolted onto this app. It is the **identity and access layer**, and four
separate things are built on it:

1. **Sign-in** — the device-auth flow and session.
2. **Wallet / billing / plans** — balance, upgrade, top-up, auto-recharge.
3. **A model provider** — the `amr` runtime def runs agent turns on the Cloud
   endpoint.
4. **Workspace and team identity** — and this is the one that will bite.

### Why (4) is the hard part

Measured in this tree:

- Projects are **auto-bound to the signed-in user's personal workspace**:
  `bindUnboundProjectsToPersonalWorkspace` at
  `apps/daemon/src/routes/project/index.ts:2916`, called at `:3287`.
- Project, run and collab access is **gated on an explicit workspace context**.
  `WORKSPACE_CONTEXT_REQUIRED` is returned as **400** and **401** from
  `apps/daemon/src/collab/workspace-resource-mutation.ts:272,733,851,961,967`,
  `apps/daemon/src/collab/request-workspace-context.ts:14,42`, and
  `apps/daemon/src/collab/project-request-authority.ts:144`.
- Callers must send `x-od-workspace-id`, `x-od-workspace-member-id` (and
  optionally `x-od-workspace-type`, `-role`, `-lifecycle-state`,
  `-member-status`, `-can-share-projects`, `-can-write-synced-files`) —
  `apps/daemon/src/cli.ts:1203-1204, 7721-7744`.
- The MCP bridge resolves the daemon's signed-in workspace once and sends those
  headers on **every** project/run call
  (`apps/daemon/src/mcp-workspace-context.ts:1-25`). It notes that
  "the NO-SCOPE catalog (`GET /api/projects`) returns empty to a headerless
  caller".
- `apps/daemon/src/automations/workspace-scope.ts` persists a workspace billing
  address on every automation's project.
- **396 files** under `apps/daemon/src`, `apps/web/src` and
  `packages/contracts/src` mention `workspace`.

**The consequence you must design for:** with sign-in gone there is no workspace
identity. If you delete the identity layer and leave the gate, **the daemon locks
its own user out of their own projects** — `GET /api/projects` returns empty and
project/run calls 400. If you delete the gate without unwinding the binder, you get
a schema that writes workspace rows nobody produces.

So there are exactly three coherent end states. **Pick one, silently implementing
neither is not acceptable:**

- **(a) Collapse to a single implicit local scope.** Remove sign-in and the
  workspace gate together; projects become local-only with no scoping;
  `x-od-workspace-*` headers stop being required. **This is what "keep nothing"
  implies and what you should implement unless the human says otherwise.**
- **(b) Keep the gate, supply an always-present local workspace.** A synthetic
  local workspace with no Cloud, no sign-in, no sync. Less code deleted, but you
  are keeping the concept the human asked you to remove.
- **(c) Keep the gate, delete only the UI.** **You must not do this.** It leaves
  a daemon that cannot be used.

Implement **(a)**, and state in your report that you did, with the evidence in
Step 4. If (a) turns out to be infeasible without a schema migration the human
should approve, **stop and say so** rather than doing (c) by accident.

## Step 0 — the surface map (hard gate, before any deletion)

Write `docs/plans/captdesign-rebrand/cloud-surface-map.md`: for every symbol you
intend to remove, `path:line`, what it is, **every inbound reference**, and a
one-line reason it is safe to remove.

```bash
grep -rln -i 'amr\|vela\|open-design\.ai\|langfuse\|posthog\|workspace' \
  --include='*.ts' --include='*.tsx' apps/ packages/ tools/ e2e/ \
  | grep -v node_modules | grep -v '/dist/' | sort
```

Then classify each hit: **cloud** (remove), **local-only** (`workspace` used as a
plain grouping word, keep), **shared** (needs surgery — the dangerous ones).
The map is what stops the cascade from taking `project`/`run` access with it.
Measured scale: ~6,100 `amr`/`vela` occurrences, 86 files under `apps/web/src`
alone, 184 daemon tests, 162 web tests.

## Step 1 — daemon: delete the Cloud modules

Verify each against the map, then `git rm`:

| Module | ~LOC | What it is |
|--------|------|------------|
| `apps/daemon/src/integrations/vela.ts` | 1,908 | sign-in supervisor, session, model catalog, attribution table |
| `apps/daemon/src/integrations/vela-billing.ts` | 553 | plan catalog, checkout, workspace billing |
| `apps/daemon/src/integrations/vela-command.ts` | 376 | the vela CLI invocation wrapper |
| `apps/daemon/src/integrations/vela-errors.ts` | 314 | recharge/upgrade error URLs |
| `apps/daemon/src/integrations/vela-wallet.ts` | 304 | balance, auto-recharge |
| `apps/daemon/src/integrations/vela-profile.ts` | 23 | `OPEN_DESIGN_AMR_PROFILE` |
| `apps/daemon/src/integrations/vela-console-origin.ts` | 77 | `open-design.ai/cloud` origin |
| `apps/daemon/src/integrations/vela-team-projects.ts` | 78 | team project catalog |
| `apps/daemon/src/integrations/collab-cloud.ts` | — | Cloud collab client |
| `apps/daemon/src/integrations/telemetry-relay.ts` | 23 | `telemetry.open-design.ai` |
| `apps/daemon/src/langfuse-trace.ts` | 3,292 | trace exporter to the relay |
| `apps/daemon/src/routes/vela.ts` | 848 | every `/api/integrations/vela/*` route |
| `apps/daemon/src/routes/telemetry.ts` | — | telemetry route |
| `apps/daemon/src/analytics.ts` | — | daemon-side PostHog |
| `apps/daemon/src/routes/attribution.ts` | — | `download.open-design.ai/api/attribution` + host allowlist at `:334` |
| `apps/daemon/src/routes/whats-new.ts` + `services/whats-new.ts` | — | hosted `whats-new.json` |
| `apps/daemon/src/routes/open-design-public-metadata.ts` + `services/open-design-public-metadata.ts` | — | hosted metadata fetch |
| `apps/daemon/src/services/plugin-share-tasks.ts` | — | hosted share tasks |
| `apps/daemon/src/services/workspace-billing*` (if separate) | — | billing |
| `apps/daemon/src/media/vela.ts` | — | `renderVelaImage` / `renderVelaVideo` |
| `apps/daemon/src/runtimes/amr-model-cache.ts`, `amr-model-probe.ts` | — | Cloud model discovery |
| `apps/daemon/src/runtimes/vela-child-evidence.ts` | — | Cloud child evidence |

For each: remove its `import` in `apps/daemon/src/server.ts`, its
`register*Routes(...)` call (`registerVelaRoutes` at `:9105`,
`registerAttributionRoutes` at `:7990`), the startup kick at `:8366-8367`, its
deps object, and its entry in `apps/daemon/src/route-context-contract.ts`
(`RegisterVelaRoutesDeps` at `:21` — missing this produces a typecheck failure
that looks unrelated to your change).

## Step 2 — daemon: delete the collab / workspace / team layer

This is the step the earlier version of this prompt only did partially. It is now
in scope in full:

- `apps/daemon/src/collab/**` — the whole directory: `vela-workspace-context.ts`,
  `vela-cli-collab-client.ts`, `vela-cli-resource-adapter.ts`,
  `vela-cli-resource-pull-batcher.ts`, `vela-cli-team-projects.ts`,
  `workspace-context.ts`, `workspace-resource-mutation.ts`,
  `project-request-authority.ts`, `request-workspace-context.ts`,
  `project-workspace-scope.ts`, `created-project-workspace.ts`,
  `invite-continue.ts`, `team-projects.ts`, `team-resource-share.ts`, `runtime.ts`.
- `apps/daemon/src/routes/collab-context.ts`, `collab-presence.ts`,
  `collab-sync.ts`, `team-resources.ts`, `team-resource-share.ts` — and their
  registrations at `apps/daemon/src/server.ts:4884, 5128, 5709`.
- `apps/daemon/src/mcp-workspace-context.ts` — or, if MCP survives, strip it to a
  no-scope resolver (see Step 3).
- `apps/daemon/src/automations/workspace-scope.ts` and the workspace fields on
  persisted automations.
- `apps/daemon/src/import-export-routes.ts:49`, `routes/library.ts:56`,
  `routes/plugins/index.ts:29`, `routes/project/index.ts:134-136,115,159` — all
  import `WorkspaceDirectoryFetchResult` / `workspaceResource*`. **Unwind the
  workspace-scoping out of project, library and plugin routes; do not delete
  those routes.** They serve local functionality that must survive.

### The project/run access gate — do this deliberately

`bindUnboundProjectsToPersonalWorkspace` (`routes/project/index.ts:2916`, called
`:3287`) and the `WORKSPACE_CONTEXT_REQUIRED` returns are the lock. Removing them
is the difference between a working build and a locked-out one:

- Remove the binder call and the function.
- Remove every `WORKSPACE_CONTEXT_REQUIRED` branch and make the project/run/collab
  read paths work **without** a workspace context.
- Remove `x-od-workspace-*` from what callers must send. Keep accepting and
  ignoring the headers if that is cheaper than a CLI+CLI-parser rewrite — but say
  which you chose and why.
- Delete the workspace/member columns and tables **only if** the local SQLite
  schema can drop them cleanly. Read `apps/daemon/src/db.ts` and follow the
  repo's existing migration/versioning pattern. If no migration path exists,
  leave the columns unused and report it — a broken local DB is worse than an
  unused column.

## Step 3 — daemon: the small survivors

- `apps/daemon/src/runtimes/defs/amr.ts` — delete; remove the import and entry in
  `runtimes/registry.ts:1,43`, the `['amr','VELA_BIN']` map entry and every
  `def.id !== 'amr'` branch in `runtimes/executables.ts:17,285,314,326`, and the
  now-orphaned model normalizers (`normalizeVelaModelId`, `parseVelaModels`,
  `isVelaChatModelId`) in the same file. Remove the model-picker row.
- `apps/daemon/src/app-config.ts:219-225` — the `agentCliEnv.amr` allowlist group
  (`VELA_BIN`, `VELA_API_URL`, `VELA_LINK_URL`, `VELA_RUNTIME_KEY`,
  `VELA_OPENCODE_BIN`, `OPEN_DESIGN_AMR_PROFILE`, `OPENCODE_TEST_HOME`). Delete
  the group.
- `apps/daemon/src/connectionTest.ts`, `mcp.ts`, `db.ts`,
  `run-analytics-observability.ts`, `run-failure-classification.ts`,
  `diagnostics-export.ts`, `artifacts/text-suppression.ts`,
  `agent-protocol/acp/**`, `agent-session-resume.ts`, `amr-stderr-filter.ts` —
  each has AMR/workspace references. Audit and trim per the map. Delete
  `amr-stderr-filter.ts` with the runtime.
- `apps/daemon/src/routes/collab-context.ts` also served the workspace billing
  catalog and checkout injectables — all gone with the layer.

## Step 4 — prove the lock is gone (this is the acceptance test)

Before touching the web app, prove the daemon is usable with no Cloud identity:

1. Start the daemon with no VELA_/AMR env at all.
2. `GET /api/projects` with **no** `x-od-workspace-*` headers → must return the
   real project list, not `[]` and not 400.
3. Create a project, start a run, read it back — all headerless.
4. Confirm no route returns `WORKSPACE_CONTEXT_REQUIRED`.

Add this as an **e2e/test-suite test** (at the daemon HTTP boundary — cheapest
layer that can see the symptom, per the repo's bug-follow-up guidance), not just a
manual check. A regression that re-introduces the gate must fail a test.

## Step 5 — contracts

18 files under `packages/contracts/src/` mention AMR; more mention workspace.

- Delete `api/amr-auth.ts`, `api/amrWallet.ts`, `analytics/events/amr-auth.ts`
  and the latter's exports from `analytics/events/{event-names,event-payload,
  mappers,result-events,shared-enums,surface-view,ui-click}.ts` and
  `analytics/public-params.ts`.
- Delete `api/workspaces.ts`, `api/workspace-invites.ts`, `api/team-resources.ts`,
  `api/amrWallet.ts` — verify each is Cloud-only first.
- Trim AMR/workspace members from `api/chat.ts`, `api/collab.ts`, `api/media.ts`,
  `api/registry.ts`, `api/run-completeness.ts`, `errors.ts`, `sse/chat.ts`.
- Keep `packages/contracts` pure TypeScript — no Node fs/process, no browser
  globals, no daemon internals. You will be tempted to import a daemon helper to
  fill a gap; do not.

## Step 6 — web UI

### Components to delete

| File | ~LOC |
|------|------|
| `apps/web/src/runtime/amr-guidance.ts` | 1,986 |
| `apps/web/src/components/AmrLoginPill.tsx` | 845 |
| `apps/web/src/runtime/amr-balance-gate.ts` | 463 |
| `apps/web/src/components/AmrBalanceDialog.tsx` | 329 |
| `apps/web/src/components/AmrArtifactUpgradeGate.tsx` | 289 |
| `apps/web/src/components/AmrArtifactUpgradeDialog.tsx` | 270 |
| `apps/web/src/components/CloudSignInTip.tsx` | 265 |
| `apps/web/src/runtime/amr-balance-branch.ts` | 163 |
| `apps/web/src/components/PlanWordmark.tsx` | 145 |
| `apps/web/src/components/AmrArtifactUpgradeHomeCard.tsx` | 108 |
| `apps/web/src/runtime/amr-auth-retry-continuation.ts` | 93 |
| `apps/web/src/runtime/amr-low-balance-plan.ts` | 46 |
| `apps/web/src/runtime/amr-unlimited-models.ts` | 38 |
| `apps/web/src/components/PlanBadge.tsx` | 36 |
| `apps/web/src/components/chat/AmrOwnerTopUpDialog.tsx` | — |
| `apps/web/src/components/GoPlanSunsetDialog.tsx` | — |
| `apps/web/src/components/workbench/` cloud cards (`WorkbenchCampaignBadge`, balance gates) | — |
| `apps/web/src/analytics/{provider.tsx,client.ts,events.ts,identity.ts,error-tracking.ts,scrub.ts,app-version.ts}` | — |
| `apps/web/src/analytics/amr-*.ts`, `workspace.ts`, `ds-create-entry.ts`, `publish-error-code.ts` (if cloud-only) | — |
| `apps/web/src/collab/**` | whole dir — **deleted by WS6**, collab goes with the Cloud identity layer |
| `apps/web/src/components/entry-rail-account-state.ts` | — |

### Files needing surgical unwinding (do not delete)

| File | Lines | Cloud refs | What to unwind |
|------|------:|-----------:|----------------|
| `apps/web/src/components/ProjectView.tsx` | 15,440 | 254 | `AmrBalanceDialog` at :13777, workspace scope hooks at :2859,:2926, `useProjectWorkspaceScope` |
| `apps/web/src/components/SettingsDialog.tsx` | 9,282 | 285 | the `settings-cloud-signin-callout` block (:4516-4544) and the agent card (:5042) |
| `apps/web/src/components/ChatPane.tsx` | 7,776 | 197 | `AmrLoginPill` import :141 and use :4716, `AMR_PROFILE_ENV_KEY` :983 |
| `apps/web/src/App.tsx` | 5,711 | 250 | `AmrArtifactUpgradeGate` :5607, `AMR_PROFILE_ENV_KEY` :296, `resolvedAmrPlan` |
| `apps/web/src/components/EntryShell.tsx` | 4,782 | 295 | `AmrBalanceDialog` :1759, `closeAmrActivationWindowBestEffort` :229, `requiresAmrReauthentication` :110,:677, workspace-tab gating :657,:712 |
| `apps/web/src/components/EntryNavRail.tsx` | — | — | `PlanWordmark`/`planBadgeTierForWorkspace` :57, `workspaceUpgradeUrl`/`workspaceAutoRechargeUrl` :417-442, account state |
| `apps/web/src/components/{InlineModelSwitcher,AvatarMenu}.tsx` | — | — | `:871` / `:257` AMR profile reads |
| `apps/web/src/components/WorkspaceMemberDirectoryPreloader.tsx`, `PresenceBar`, `FileSyncBadge`, `CommentDriftDemo` | — | — | delete with collab |
| `apps/web/src/hooks/**`, `providers/registry.ts` | — | — | workspace/session hooks |
| `apps/web/src/first-party-external-link.ts` | — | — | `FIRST_PARTY_HOSTS` — WS7 owns the URL, you own whether the feature survives |

The collab UI does **not** survive: with the workspace identity gone, presence,
comments, member directory and shared-file badges have no backing identity. Delete
them and their hooks.

### i18n

`apps/web/src/i18n/types.ts` is the `Dict`; every key must exist in **all 19**
locales. Removing UI orphans keys. Measured cloud-ish keys include
`settings.onboardingAmr*`, `settings.onboardingCloud*`, `settings.cloudCallout*`,
`settings.amrCloud`, `settings.workspaceAutoRecharge*`, `entry.credits*`, plus the
collab/workspace/team families. Remove each key from `types.ts` **and** all 19
locales in the same commit. Do not leave them out of sync, and do not leave dead
keys behind.

### Privacy

With the hosted analytics and safety telemetry destinations gone, `PRIVACY.md`
and Settings → Privacy (`settings.privacy*`) must tell the truth. **Do not leave a
consent UI governing nothing.** Tell WS8, in your report, exactly what the new
truth is (expected: no telemetry destination exists in a CaptDesign build), so it
can rewrite the doc.

## Step 7 — CLI

- Remove `od amr login|logout|status` — `runAmr` in
  `apps/daemon/src/cli.ts:1077+`, `AMR_STRING_FLAGS`/`AMR_BOOLEAN_FLAGS`, the help
  text, and the `amr: runAmr` entry in `SUBCOMMAND_MAP` (:394).
- Remove `collab`, `workspace`, `message-center` subcommands if they only exist to
  drive the Cloud layer — check each against the map. `message-center` is the
  hosted message feed: remove it.
- `apps/daemon/src/cli.ts:7721-7744` — the `x-od-workspace-*` header assembly for
  workspace/member subcommands goes with them.
- Root `AGENTS.md`'s **"Capability exposure (UI/CLI dual-track)"** contract: every
  capability you delete must be deleted from **both** surfaces, and the
  `SUBCOMMAND_MAP` must not keep a dead entry. Check `scripts/guard.ts` for a
  parity check.

## Step 8 — packaging

- `apps/packaged/src/startup-telemetry.ts` — delete, unwire from `index.ts`.
- `apps/packaged/src/download-attribution.ts` plus the
  `download-attribution.json` observation files — delete, unwire from the launcher.
- `apps/packaged/src/{headless,headless-runtime}.ts`, `prewarm.ts`,
  `windows-lifecycle.ts` — audit for workspace/Cloud session assumptions.

## Step 9 — tests

Delete or rewrite:

- `e2e/tests/amr/` — all 5 (`auth-error-convergence`, `insufficient-balance`,
  `logout-state-persistence`, `relogin-required`, `turn`).
- `e2e/tests/collab/`, `e2e/tests/collab-cluster.test.ts`,
  `e2e/lib/playwright/amr.ts`, `e2e/lib/playwright/collab-cluster.ts`.
- `e2e/ui/amr-onboarding.test.ts`, `e2e/ui/amr-logout-requires-relogin.test.ts`.
- `apps/daemon/tests/**` — ~184 files in scope; `apps/web/tests/**` — ~162.

Rules:

- A test for a deleted capability is **deleted**, not skipped. No `it.skip`, no
  `describe.skip`, no empty body.
- A test covering a **kept** surface (project CRUD, runs, library, plugins,
  media, artifacts) must keep passing. If it breaks, you broke the lock removal —
  fix the product code, not the test.
- Never weaken an assertion to reach green.
- **The new test from Step 4 is mandatory.** It is the fence that proves the
  daemon works without Cloud identity.
- WS12 re-baselines the full suite after you. Leave your suites green and
  **list every test you deleted**, so the coverage loss is auditable.

## Verification

```bash
pnpm install
pnpm guard
pnpm typecheck
pnpm --filter @captdesign/contracts test
pnpm --filter @captdesign/daemon test
pnpm --filter @captdesign/web test
```

Removal proof:

```bash
grep -rn "open-design\.ai\|amr\|vela\|langfuse\|POSTHOG\|AMR_" \
  --include='*.ts' --include='*.tsx' apps/ packages/ tools/ \
  | grep -v node_modules | grep -v '/dist/'
```

Expect **zero** hits, except URLs WS7 owns and the word "amr" appearing inside an
unrelated identifier (classify those). Any surviving Cloud endpoint is a failure.

## Report back

- The surface map path and its cloud/local/shared classification counts.
- **Which end state (a) you implemented for the workspace gate**, and the Step 4
  evidence — including the raw `GET /api/projects` response with no headers.
- Every file deleted with LOC; every route, CLI subcommand and UI entry removed.
- The SQLite decision: columns dropped cleanly, or left unused with the reason.
- Whether the `x-od-workspace-*` headers are still accepted-and-ignored or fully
  removed, and why.
- Every test deleted, by path, with its capability.
- The new no-Cloud-identity test, quoted.
- The new truth for `PRIVACY.md`, in one paragraph, for WS8.
- **Anything that did not fit end state (a)** — named, with what it would take.

## Do not

- Do not implement end state (c). A daemon that returns empty projects to its own
  user is a broken product, not a stripped one.
- Do not keep a feature flag that leaves Cloud code present but disabled.
- Do not delete `routes/project`, `routes/runs`, `routes/library`,
  `routes/plugins`, `routes/media` — unwind the scoping out of them.
- Do not break the local SQLite DB to drop a column.
- Do not touch `routes/` beyond the Cloud ones, or rename anything (WS3/4/5), or
  rewrite URLs (WS7 — hand it the residue).
- Do not edit `docs/`, `specs/`, `design-systems/`, `design-templates/`,
  `plugins/`, `skills/`.
- Do not leave dead i18n keys or an out-of-sync `types.ts`.
