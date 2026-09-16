# WS6 — Cloud surface map (Step 0 hard gate)

Status: **gate drafted, deletions not started.** This file must be completed and
reviewed before any `git rm` in WS6. It classifies every hit from the Step 0
scan into **cloud** (remove), **local-only** (keep), or **shared** (surgery), and
records the inbound references that make the cascade safe or dangerous.

Repo root: `E:\New-Personal-Projects\open-design` (checkout of
`unfoldingdimensions/open-design`), branch `main`, HEAD `eb706207a`.
WS0–WS5 have landed (see `git log --oneline`); WS6's dependency on WS3 is
satisfied.

## 0. Baseline state at map time (measured, not assumed)

| Gate | Result | Notes |
|------|--------|-------|
| `pnpm typecheck` | **green** (exit 0) | Node v22.22.0 against a `~24` engine pin emits `WARN Unsupported engine` only; no type errors. |
| `pnpm guard` | **red** before WS6 | Two causes, both pre-existing and **both outside WS6**. |

Guard cause 1 — *TypeScript-only check* scanned untracked agent scratch:
`.openclaw/tmp/*.mjs` and a vendored packaged-app tree under `odtp-bench/`.
Fixed by adding `.openclaw` and `odtp-bench` to `scripts/guard.ts`
`residualSkippedDirectories` (the set already carries `.agents`, `.claude`,
`.codex`, `.slim` for the same reason) and to `.gitignore`.

Guard cause 2 — *Attribution notice check* (added by WS1) fails on two **tracked**
upstream prompt templates whose `source.license` is `"Original X post"`, outside
the allow-list `Apache-2.0 | MIT | CC-BY-4.0`:

- `prompt-templates/image/profile-avatar-seedream-high-fashion-dreamy-portrait.json`
- `prompt-templates/image/social-media-post-seedream-squishcraft-kids-clay-ad.json`

Both were added upstream in `4280c862b Add Seedream 5.0 Pro community prompt
templates (#5421)`. **This is a real redistribution blocker and it belongs to
WS1 (attribution ledger) / WS8 (shipped content), not WS6.** WS6 leaves it red
and reports it; it is not masked or worked around.

> WS6 verification therefore uses *"guard is no worse than this baseline"* —
> the only permitted remaining guard failure is the two attribution entries.

## 1. Raw scans (reproducible)

```bash
# File set that mentions any target term (source + tests).
git grep -l -i -E 'amr|vela|open-design\.ai|langfuse|posthog|workspace' \
  -- 'apps/**/*.ts' 'apps/**/*.tsx' 'packages/**/*.ts' 'packages/**/*.tsx' \
     'tools/**/*.ts' 'tools/**/*.tsx' 'e2e/**/*.ts'      # -> 1682 files

# Occurrence counts (substring, case-insensitive)
vela  6600   amr 12277   AMR_ 1369   langfuse 1833
posthog 999  open-design\.ai 359    workspace 42117   WORKSPACE_CONTEXT_REQUIRED 56
```

File distribution (files, not occurrences):

| Root | files | class bias |
|------|------:|-----------|
| `apps/web/tests` | 458 | test |
| `apps/daemon/tests` | 385 | test |
| `apps/web/src` | 283 | mixed (cloud + shared) |
| `apps/daemon/src` | 252 | mixed (cloud + shared) |
| `packages/contracts/src` | 53 | cloud + shared |
| `tools/pack/src` | 25 | shared (identity strings) |
| `apps/desktop/src` | 12 | shared |
| `apps/packaged/src` | 9 | cloud (telemetry/attribution) |
| `e2e` | 102 | test |

> `workspace` (42 117 hits) is dominated by a **generic English word**, not the
> Cloud identity layer. It is the single biggest false-positive source and the
> reason this map classifies per-file rather than per-term.

## 2. Classification key

- **cloud** — implements or serves the Open Design Cloud / AMR / Vela / workspace
  identity / telemetry / hosted-feed surface. `git rm` (or delete the block).
  Default for this map.
- **local-only** — the term is a plain grouping word with no Cloud dependency
  (e.g. `FileWorkspace` = the local file tree; `workspace` in a CSS/token name;
  a comment). **Keep.**
- **shared** — file must survive but contains Cloud wiring that has to be
  unwound surgically. Deleting it would break local functionality. **Surgery.**

## 3. Daemon — Cloud modules (cloud → delete)

Module inventory (all under `apps/daemon/src/`), with the WS6 prompt's LOC
estimates; each is verified present in this tree:

| Module | ~LOC | Inbound references to unwind |
|--------|-----:|------------------------------|
| `integrations/vela.ts` | 1908 | `server.ts:1044`, `routes/vela.ts`, many `collab/vela-*` |
| `integrations/vela-billing.ts` | 553 | `collab/workspace-billing-runtime.ts`, `routes/vela.ts` |
| `integrations/vela-command.ts` | 376 | `integrations/vela*, *` |
| `integrations/vela-errors.ts` | 314 | `routes/vela.ts` |
| `integrations/vela-wallet.ts` | 304 | `routes/vela.ts`, billing |
| `integrations/vela-profile.ts` | 23 | profile env |
| `integrations/vela-console-origin.ts` | 77 | console handoff |
| `integrations/vela-team-projects.ts` | 78 | `server.ts:294` (`projectResourceIdFor`) |
| `integrations/collab-cloud.ts` | — | `server.ts:1085` |
| `integrations/telemetry-relay.ts` | 23 | telemetry |
| `langfuse-trace.ts` | 3292 | `langfuse-bridge.ts:616` |
| `routes/vela.ts` | 848 | `server.ts:913`, `route-context-contract.ts:21,50` |
| `routes/telemetry.ts` | — | `server.ts:1117,7739` |
| `routes/attribution.ts` | — | `server.ts:882,7990` |
| `analytics.ts` | — | `server.ts:634` |
| `routes/whats-new.ts` + `services/whats-new.ts` | — | `server.ts:927,1190,8114` |
| `routes/open-design-public-metadata.ts` + `services/open-design-public-metadata.ts` | — | `server.ts:926,1189` |
| `services/plugin-share-tasks.ts` | — | `server.ts:1132` |
| `media/vela.ts` (`renderVelaImage`/`renderVelaVideo`) | — | `server.ts` media deps |
| `runtimes/amr-model-cache.ts`, `runtimes/amr-model-probe.ts` | — | `server.ts:307,1130` |
| `runtimes/vela-child-evidence.ts` | — | runtime evidence |
| `media/amr-image-staging.ts` | — | `server.ts:478` (`stageAmrImagePaths`) |
| `amr-stderr-filter.ts` | — | `server.ts:536` (`createAgentStderrVisibilityFilter`) |
| `runtimes/defs/amr.ts` | — | `runtimes/registry.ts:1,43`, `runtimes/executables.ts:17,285,314,326` |
| `apps/daemon/scripts/verify-amr-real-vela.mjs` | — | **in `scripts/guard.ts` allowlist line 119 — remove the entry with the file** |
| `apps/daemon/tests/fixtures/fake-vela.mjs` | — | **guard allowlist line 123 — remove entry with the file** |

`server.ts` wiring sites to remove (line numbers at HEAD):

```
 294 projectResourceIdFor (vela-team-projects)
 478 stageAmrImagePaths        536 createAgentStderrVisibilityFilter
 616 reportRunCompletedFromDaemon (langfuse-bridge)
 634 analytics                 882 registerAttributionRoutes import
 910 chatArtifacts telemetry   913 registerVelaRoutes import
 926 public-metadata route     927 whats-new route
1117 registerTelemetryRoutes   1130 resolveAmrModelProbe
1132 createPluginShareTaskStore 1189 public-metadata service
1190 whats-new service
7739 registerTelemetryRoutes()  7990 registerAttributionRoutes()
8114 registerWhatsNewRoutes()   9105 registerVelaRoutes()
route-context-contract.ts:21 import RegisterVelaRoutesDeps ; :50 & RegisterVelaRoutesDeps
```

## 4. Daemon — collab / workspace / team identity layer (cloud → delete)

`apps/daemon/src/collab/**` — **62 files**, the whole directory. Named in the
prompt plus the full listing: `vela-workspace-context.ts`,
`vela-cli-collab-client.ts`, `vela-cli-resource-adapter.ts`,
`vela-cli-resource-pull-batcher.ts`, `vela-cli-team-projects.ts`,
`workspace-context.ts`, `workspace-resource-mutation.ts`,
`project-request-authority.ts`, `request-workspace-context.ts`,
`project-workspace-scope.ts`, `created-project-workspace.ts`, `invite-continue.ts`,
`team-projects.ts`, `team-resource-share.ts`, `runtime.ts`, and all remaining
`workspace-*`, `team-*`, `*-sync*`, `collab-*`, `publish-*`, `presence-*` files.

Routes to delete: `routes/collab-context.ts`, `routes/collab-presence.ts`,
`routes/collab-sync.ts`, `routes/team-resources.ts`, `routes/team-resource-share.ts`
— registrations at `server.ts:4884, 5128, 5709, 6562, 7241, 7283, 7323`.
`server.ts` imports at `:944,945,958,964,979,1018,1023,1029,1030,1039,1052–1062,
1080,1086,1091,1092,1110,1116`.

Automations: `automations/workspace-scope.ts` + workspace fields on persisted
automations.

### The access gate — the critical path (do this deliberately)

The binder and the gate are the difference between a working build and a locked-out
one. End state **(a)**: remove sign-in **and** the gate together; projects collapse
to a single implicit local scope.

- `bindUnboundProjectsToPersonalWorkspace` — `routes/project/index.ts:2916`,
  called at `:3287`. Remove the call and the function.
- `WORKSPACE_CONTEXT_REQUIRED` — 56 occurrences; returned as **400/401** from
  `collab/workspace-resource-mutation.ts` (:272,733,851,961,967),
  `collab/request-workspace-context.ts` (:14,42), and
  `collab/project-request-authority.ts` (:144). Remove every branch.
- `x-od-workspace-*` header assembly — `cli.ts:7721-7744`; `cli.ts:1203-1204`.
  Decision to record: **accept-and-ignore** (cheaper, keeps external callers
  working) vs fully remove. WS6 will accept-and-ignore and say so.
- MCP: `mcp-workspace-context.ts:1-25` resolves the signed-in workspace so the
  MCP bridge can send headers on every call. If MCP survives, strip to a no-scope
  resolver; otherwise delete.

## 5. Daemon — shared files needing surgery (do NOT delete)

| File | Cloud refs | What to unwind |
|------|-----------|----------------|
| `routes/project/index.ts` | imports `WorkspaceDirectoryFetchResult`/`workspaceResource*` at `:115,134-136,159`; binder `:2916/:3287` | remove binder + workspace scoping, **keep the route** |
| `import-export-routes.ts` | `:49` | workspace fetch result type |
| `routes/library.ts` | `:56` | workspace scoping |
| `routes/plugins/index.ts` | `:29` | workspace scoping |
| `runtimes/defs/amr.ts` / `runtimes/registry.ts` / `runtimes/executables.ts` | `:17,285,314,326` | delete `amr` def, `['amr','VELA_BIN']` map entry, `def.id !== 'amr'` branches, orphaned `normalizeVelaModelId`/`parseVelaModels`/`isVelaChatModelId` |
| `app-config.ts` | `:219-225` | delete `agentCliEnv.amr` allowlist group (`VELA_*`, `OPEN_DESIGN_AMR_PROFILE`, `OPENCODE_TEST_HOME`) |
| `connectionTest.ts`, `mcp.ts`, `db.ts`, `run-analytics-observability.ts`, `run-failure-classification.ts`, `diagnostics-export.ts`, `artifacts/text-suppression.ts`, `agent-protocol/acp/**`, `agent-session-resume.ts` | each has AMR/workspace refs | audit and trim per this map |
| `cli.ts` | `:394,1077+`, `:1203-1204`, `:7721-7744` | remove `amr` subcommand (`runAmr`, `AMR_*_FLAGS`, help, `SUBCOMMAND_MAP`), `collab`/`workspace`/`message-center` subcommands, header assembly |

## 6. contracts (cloud → delete, shared → trim)

Cloud-only files to delete:
`api/amr-auth.ts`, `api/amrWallet.ts`, `api/workspaces.ts`,
`api/workspace-invites.ts`, `api/team-resources.ts`, `api/attribution.ts`,
`api/whats-new.ts`, `sse/collab.ts`, `analytics/events/amr-auth.ts`,
`analytics/events/workspace.ts` — each verified Cloud-only before deletion.

Then trim AMR/workspace members and the removed events' exports from:
`api/chat.ts`, `api/collab.ts`, `api/media.ts`, `api/registry.ts`,
`api/run-completeness.ts`, `errors.ts`, `sse/chat.ts`,
`analytics/events/{event-names,event-payload,mappers,result-events,shared-enums,surface-view,ui-click}.ts`,
`analytics/public-params.ts`.

Constraint: `packages/contracts` stays pure TypeScript — no Node fs/process, no
browser globals, no daemon internals.

## 7. Web UI (cloud → delete, shared → surgery)

**Delete** (all under `apps/web/src/`): `runtime/amr-guidance.ts`,
`runtime/amr-artifact-upgrade.ts`, `runtime/amr-auth-retry-continuation.ts`,
`runtime/amr-balance-branch.ts`, `runtime/amr-balance-gate.ts`,
`runtime/amr-low-balance-plan.ts`, `runtime/amr-unlimited-models.ts`,
`runtime/chat/plan-pill.ts`, `components/AmrLoginPill.tsx`,
`components/amrLoginPolling.ts`, `components/AmrBalanceDialog.*`,
`components/AmrArtifactUpgradeGate.tsx`, `components/AmrArtifactUpgradeDialog.*`,
`components/AmrArtifactUpgradeHomeCard.*`, `components/CloudSignInTip.tsx`,
`components/PlanWordmark.tsx`, `components/PlanBadge.tsx`,
`components/GoPlanSunsetDialog.*`, `components/chat/AmrOwnerTopUpDialog.*`,
`components/chat/PlanPill.*`, `components/WorkbenchCampaignBadge.tsx`,
`components/SettingsWorkspaceSection.*`, `components/WorkspaceTabsBar.tsx`,
`components/workspaceChromeActions.ts`, `components/workspaceTabsDock.ts`,
`components/workspace-context.ts`, `components/ProjectWorkspaceRecoveryTip.*`,
`components/useDiscordPresence.ts`, `campaigns/go-plan*.ts`,
`campaigns/use-go-plan-campaign.ts`, `styles/plan-badge.css`,
`analytics/{provider.tsx,client.ts,events.ts,identity.ts,error-tracking.ts,scrub.ts,app-version.ts}`,
`analytics/amr-*.ts`, `analytics/workspace.ts`,
`components/entry-rail-account-state.ts` (if cloud-only),
and the **whole `apps/web/src/collab/**` directory (33 files)** — collab does not
survive the identity removal.

**Surgery** (do not delete): `components/ProjectView.tsx` (15 440 LOC, 254 refs —
`AmrBalanceDialog` :13777, workspace hooks :2859,:2926), `components/SettingsDialog.tsx`
(9 282 LOC, 285 refs — sign-in callout :4516-4544, agent card :5042),
`components/ChatPane.tsx` (7 776 LOC, 197 refs — `AmrLoginPill` :141/:4716,
`AMR_PROFILE_ENV_KEY` :983), `App.tsx` (5 711 LOC, 250 refs — `AmrArtifactUpgradeGate`
:5607, `AMR_PROFILE_ENV_KEY` :296, `resolvedAmrPlan`), `components/EntryShell.tsx`
(4 782 LOC, 295 refs), `components/EntryNavRail.tsx` (`PlanWordmark`,
`workspaceUpgradeUrl`/`workspaceAutoRechargeUrl` :417-442),
`components/{InlineModelSwitcher,AvatarMenu}.tsx` (`:871`/`:257`),
`hooks/**`, `providers/registry.ts`, `first-party-external-link.ts`.

**i18n**: `apps/web/src/i18n/types.ts` is the `Dict`; every key must exist in all
**19** locales. Removing UI orphans keys. Cloud families: `settings.onboardingAmr*`,
`settings.onboardingCloud*`, `settings.cloudCallout*`, `settings.amrCloud`,
`settings.workspaceAutoRecharge*`, `entry.credits*`, plus collab/workspace/team
families. Remove each from `types.ts` **and** all 19 locales in the same commit.

**Privacy**: with hosted analytics/telemetry destinations gone, `PRIVACY.md` and
Settings → Privacy (`settings.privacy*`) must state the new truth — a CapyDesign
build has no telemetry destination. Hand this paragraph to WS8.

## 8. Packaging (`apps/packaged/src/`)

Delete and unwire: `startup-telemetry.ts`, `download-attribution.ts` (+ the
`download-attribution.json` observation files). Audit `headless.ts`,
`headless-runtime.ts`, `prewarm.ts`, `windows-lifecycle.ts` for Cloud/workspace
session assumptions.

## 9. Tests (cloud → delete; kept-surface → must stay green)

Delete: `e2e/tests/amr/` (all 5), `e2e/tests/collab/`, `e2e/tests/collab-cluster.test.ts`,
`e2e/lib/playwright/amr.ts`, `e2e/lib/playwright/collab-cluster.ts`,
`e2e/ui/amr-onboarding.test.ts`, `e2e/ui/amr-logout-requires-relogin.test.ts`,
`apps/daemon/tests/fixtures/fake-vela.mjs`; plus the in-scope AMR/workspace tests
under `apps/daemon/tests` (~385 files touch the terms) and `apps/web/tests`
(~458 files).

Rules: a test for a deleted capability is **deleted**, not skipped. A test for a
kept surface must keep passing. Never weaken an assertion to reach green. The new
Step 4 no-Cloud-identity test is mandatory.

## 10. Local-only (keep) — representative false positives

- `apps/web/src/components/FileWorkspace.tsx` and other `File*` local file-tree
  chrome — "workspace" is the local file surface, not team identity (verify
  individually; some may still import `collab/`).
- `workspace` inside CSS class names, design-token names, and comments.
- `Documentation`/comment prose using "workspace" generically.
- Anything the term-scan catches only because `amr`/`workspace` is a substring of
  an unrelated identifier.

Every such file must be re-checked against the inbound graph before it is
declared local-only. A hit nobody can classify is a bug.

## 11. Residue WS6 leaves for other workstreams

- `open-design.ai` URL constants — **WS7** owns the rewrite; WS6 hands over the
  residue rather than inventing fork URLs.
- `docs/`, `specs/`, `design-systems/`, `design-templates/`, `plugins/`,
  `skills/` — **WS8** owns all renaming. WS6 does not edit them.
- The two attribution prompt templates — **WS1/WS8** (see §0).
- Full-suite rebaseline — **WS12**.

## 12. Execution order for the cascade (dependency-safe)

Consumers before producers, so each package can be typechecked independently:

1. **daemon** — delete §3 modules + §4 collab/workspace layer, rewire `server.ts`
   + `route-context-contract.ts`, unwind §5 shared files, remove `amr` runtime def.
   → `pnpm --filter @capydesign/daemon typecheck`
2. **web** — delete §7 components/collab, unwind shared, prune i18n across 19
   locales. → `pnpm --filter @capydesign/web typecheck`
3. **contracts** — delete §6 files, trim members (nothing imports them now).
4. **packaged / desktop / tools** — §8.
5. **tests / e2e** — §9 + the mandatory Step 4 test.
6. `pnpm guard`, `pnpm typecheck` (expect only the WS1 attribution residue).
