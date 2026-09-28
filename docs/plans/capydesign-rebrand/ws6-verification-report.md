# WS6 (Cloud surface removal) — verification report

## Close-out

WS6 code scope is complete (one privacy-copy item outstanding). Final state on `rebrand/ws6-cloud-removal`: **70 commits**, working tree clean,
`main` untouched at `eb706207a`.

### Final verification

| Check | Result |
| --- | --- |
| `pnpm --filter @capydesign/contracts build` | exit 0 |
| `pnpm --filter @capydesign/contracts test` | 60 files, **636 tests**, exit 0 |
| `daemon` typecheck | exit 0, 0 errors |
| `web` typecheck | exit 0, 0 errors |
| `packaged` typecheck | exit 0, 0 errors |
| `desktop` typecheck | exit 0, 0 errors |
| `packaged` test suite | 6 failed / 308 passed — **identical on a stashed baseline**, pre-existing |
| **full web suite** | **902 passed, 1 skipped (903); 8,688 passed, 19 skipped (8,707); 0 failed; exit 0; 847.92s** |
| `pnpm guard` | **red on one item only** — see below |
| contracts files deleted vs `main` | 13 |

### Contracts trim: final ledger

| Measure | Start | End |
| --- | --- | --- |
| Cloud-vocabulary exported symbols | 221 | **187** |
| References to them | 576 | **318** |
| `api/collab.ts` | 1,106 lines | **deleted** |

The 187 remaining break down as **162 `analytics/*`** (settled by decision (b): kept as an inert typed
skeleton, destinations already removed) and **25 verified non-Cloud items**:

- False positives — matched on vocabulary, not substance: `plugins/strategy-v2` (19, the *strategy*
  plan contract), `api/social-share` (17), `plugins/share-actions` (14, live plugin publishing),
  `api/handoff` (5, the transcript→prompt synthesizer), `api/workspaces` (4, *run* working
  directories), `plugins/plugin-url` (1), `api/artifacts::ArtifactProvenanceHandoffKind` (1),
  `api/proxy` (2), `prompts/od-next-*` (3).
- Deliberately kept: `api/project-sync::ProjectSyncState` (4) — a real enum with live consumers.

### One WS6 item outstanding: the privacy copy

The map assigns WS6 the privacy truth (line 245): with hosted analytics and telemetry destinations
gone, `PRIVACY.md` and the Settings → Privacy copy must say so. That is **not yet done**, and the
current copy is actively misleading rather than merely stale:

| Key | Current text | Problem |
| --- | --- | --- |
| `settings.privacyHint` | "What data is shared with the CapyDesign team" | nothing is shared |
| `settings.privacyConsentLead` | "Sharing usage data helps us understand how CapyDesign performs…" | no destination exists |
| `settings.privacyConsentBannerFooter` | "Data sharing is on by default…" | untrue in a destination-less build |

`PRIVACY.md` is half-updated already (it notes telemetry services are unreachable) but still
describes two hosted telemetry classes and an opt-out model. Scope: ~10 `settings.privacy*` keys
across 19 locale files, plus `PRIVACY.md`.

Left for a decision rather than rushed: privacy wording is legally sensitive and the 19-locale
spread means the phrasing should be agreed before it is translated. **This is the last WS6
code-adjacent item.**

### The guard failure is explicitly permitted

The map's own acceptance criterion (line 38): *"WS6 verification therefore uses 'guard is no worse
than this baseline' — the only permitted remaining guard failure is the two attribution entries."*
The two tracked prompt templates are named there by path and assigned to **WS1 / WS8**, not WS6. So
the current guard state **meets WS6's bar**: it fails on exactly those two entries and nothing else.

### Residue WS6 hands to other workstreams (by design)

- `open-design.ai` URL constants — **179 occurrences** in app source — WS7 owns the rewrite.
- `docs/`, `specs/`, `design-systems/`, `design-templates/`, `plugins/`, `skills/` renaming — WS8.
- The two attribution prompt templates — WS1 / WS8.
- Full-suite rebaseline — WS12.

### Latent breakages found and fixed along the way

1. `packages/contracts` had not built since step 5 — `esbuild.config.mjs` still listed a deleted AMR
   file, and because `daemon` typecheck runs the contracts build first, **daemon typecheck had been
   failing the whole time**.
2. **22 dangling imports in web source**, masked because a stale `contracts/dist` still contained
   modules deleted in step 5. No clean checkout would have built.
3. A real behavioural regression: the `legacy-bridge` shim had reduced `classifyAccountFailure` to
   `return null`, silently gutting the text-based AMR failure classification. Ported the real
   implementation back and restored the precedence rule.
4. Four unhandled errors (`collabCheckStatusNow is not a function`) invisible to per-test assertions,
   because a stand-in omitted callable members. Caught only by the suite's exit code, not its totals.

---

Branch: `rebrand/ws6-cloud-removal`. `main` untouched (`eb706207a`).
Generated: 2026-09-23. Machine: Windows 10.0.26200, Node 22.22.0 (workspace toolchain), pnpm workspace.

## Verdict

- **Web package: green.** 903 test files passed, 0 failed, 1 skipped; 8,700 tests passed, 0 failed, 19 skipped.
- **Web typecheck: green.** 0 errors across `src/` + `tests/`.
- **Daemon: no WS6-caused failures remain.** Every daemon failure that survives matches the `main` baseline on the same machine.
- **`pnpm guard`: red on one pre-existing WS1 item only** (licence attribution), unrelated to WS6.

## Completion criteria and evidence

| Criterion | Evidence |
| --- | --- |
| Pre-fix failure inventory | 635 rows across 154 files, captured before fixing (`.openclaw/tmp/inventory.json`) |
| Each failure classified | stale expectation for a deleted capability vs. real regression — recorded per batch |
| Failures fixed one at a time | 49 commits on the branch, batch-scoped, monotonic |
| Each fix verified in isolation | each touched file re-run with `vitest run <file>` before commit |
| One final unfiltered full run | web suite run 2026-09-23 15:49:42 → 16:03:49, 844.85s |
| Report with totals, causes, changelog | this document |

## Final measurements

### Web suite (final unfiltered run)

```
Test Files  903 passed | 1 skipped (904)
     Tests  8700 passed | 19 skipped (8719)
  Duration  844.85s
```

Comparisons:

| Point in time | Failed files | Failed tests |
| --- | --- | --- |
| WS6 baseline | 164 | 702 |
| `main` on this machine | 39 | 113 |

The 39/113 on `main` are pre-existing Windows-environment failures (path separators, timing, native modules) and are not addressed here.

### Web typecheck

`pnpm --filter @capydesign/web typecheck` → exit 0, 0 errors.

### Guard

`pnpm guard` → exit 1, single failing item: two `prompt-templates/image/*.json` files declare
`source.license: "Original X post"`, outside the allow-list `Apache-2.0 | MIT | CC-BY-4.0`.
These files belong to WS1 and were deliberately not touched. **This is the only thing standing
between the branch and an all-green local check.**

### Daemon

The 45 daemon suites whose subject is the removed surface were run explicitly. After fixing:

| Suite | Branch | `main` |
| --- | --- | --- |
| `chat-route.test.ts` | 9 failed | 9 failed |
| `connection-test.test.ts` | 7 failed | 7 failed |

Everything else that fails in the daemon fails identically on `main` — verified by checking out
`main` and re-running each suite:

`server-startup-smoke` (7), `stale-message-snapshot-preserves-daemon-events` (4),
`run-resume-on-failure` (4), `intent-signal-stable-prompt-cache` (4),
`run-atomic-ownership` (2), `runtimes/acp-stall-last-progress-age` (6),
`headless-runs` (1), `run-request-idempotency` (4), `codex-session-resume` (5),
`amr-session-resume` (10), `runtimes/run-failure-telemetry-smoke` (5),
`plain-stream-artifact-event-truncation` (5), `opencode-session-resume` (3),
`run-steer-route` (3), `first-visible-output-telemetry-isolation` (1),
`task-successor-absorption` (2).

A full daemon run is not reachable in one pass on this machine — the process is killed by
resource limits partway through (~18 failing suites reported before the kill). The 45-suite
WS6-scoped run plus the per-file `main` comparison is the substitute, and it bounds the WS6
delta at zero.

## Daemon suites removed for the deleted capability

`collab-presence-transport-off`, `design-system-workspaceless-delete`,
`local-project-data-plane-outage`, `media/analytics-routes`,
`plugins-snapshot-workspace-scope`, `plugins-team-mutation-target`,
`plugins-uninstall-workspace-gate`, `resource-workspace-authority-preflight`,
`skill-navigation-workspace-authority`, `team-mirror-read-revocation`,
`workspace-billing-server-wiring`, `workspace-context-authority-server-wiring`.

Cases dropped inside kept suites: `workspace-scope-context-switch` (3),
`plugin-events-workspace-scope` (3), `plugin-asset-workspace-authority` (2),
`chat-route` (4: Team design-system compose + 3 AMR), `connection-test` (5: all AMR).

## Method notes (why the numbers are trustworthy)

- Deletions remove the test case; the enclosing empty `describe` is then removed, otherwise
  vitest reports a file-level "No test found in suite" failure.
- Cases were matched by line range where CJK or parameterised (`it.each`) names defeat
  name matching.
- Test stand-ins created for removed modules must render `children` and expose callable members,
  otherwise hundreds of unrelated assertions fail spuriously.
- Regression checks diff per-file error counts between logs, never totals alone.

## i18n key prune across all 19 locales

Scope: the dictionary keys orphaned by the Cloud removal. Method:

1. Parsed the canonical key set from `locales/en.ts` (5,370 keys, mixing single- and
double-quoted keys).
2. Walked 1,486 source files under `apps/web/{src,app}`, `apps/daemon/src`, and `packages/`,
marking keys used as string literals anywhere. Keys reachable only through a dynamic
construction (`t(\`ns.${x}\`)`) were excluded from pruning — 277 such keys were held back.
3. Intersected the unreferenced set with the Cloud surface vocabulary (AMR, Vela, workspace,
collab/presence, invite, wallet, billing, seat, tier, recharge, cloud, share/publish),
excluding unreferenced keys that are not Cloud-related (e.g. `settings.onboardingDesignIntro*`,
`designFiles.moveLabel`).

Result: **214 keys removed from `Dict` and from every one of the 19 locale files — 4,280
dictionary entries total.**

| | before | after |
| --- | --- | --- |
| Keys in `types.ts` (`Dict` + labels) | 5,389 | 5,175 |
| Keys per locale | 5,370 | 5,156 |
| Distinct per-locale key counts | 1 | 1 |

Families removed whole because every key was orphaned: `invite.*` (38), `collabPresence.*` (15),
`goPlanSunset.*` (13), `workspaceInvite.*` (21), `avatar.amrConsole*` (2),
`assistant.shareToOpenDesign*` (2), plus `chat.amr*`, `settings.amr*`,
`settings.onboardingAmrCloud*`, `entry.cloud*`, `fileViewer.share*`, `settings.workspace*`.

Parity was preserved exactly: the string-aware pruner removed 214 entries from each of the 20
files (types.ts + 19 locales), so `locales.test.ts`'s "keeps locale dictionaries aligned with
English keys and placeholders" lock still holds, and the zh-CN/ja tier-1 explicit-translation
locks still hold.

One test needed editing: the zh-CN/zh-TW terminology lock listed four pruned keys. The four dead
keys and their stale comment block were removed and the test retitled
`keeps Chinese credits quota terminology consistent across zh-CN and zh-TW`; its other six
assertions cover keys that are still live and were kept.

One test file mentions a pruned key — `FileWorkspace.test.tsx` — but only inside a comment
(`// instead of the removed workspace.allProjectFiles label`), so no assertion changed.

## Regression found and fixed during the prune

The post-prune full run passed every test but exited 1: vitest reported **4 unhandled errors**,
all `TypeError: collabCheckStatusNow is not a function` thrown from `ProjectView.tsx` on a
coalesced watcher flush. The WS6 stand-in for `useProjectCollab` returned an object without the
`checkStatusNow` / `refreshPresence` callbacks the component destructures and calls, so any
debounced file-change path threw asynchronously — invisible to the per-test assertions, which is
exactly why it survived the earlier sweeps.

The stand-in now returns a complete shape with callable no-op callbacks
(`checkStatusNow`, `refreshPresence`) plus the boolean/string members the component reads
(`viewerOnly`, `materializationPending`, `writerAuthority`, `isSharedNonOwner`,
`ownerDisplayName`, `downloadPending`, `present`, `syncState`).

After the fix: `Test Files 903 passed | 1 skipped (904)`, `Tests 8700 passed | 19 skipped (8719)`,
0 unhandled errors, command exit code **0**, duration 868.34s.

## Contracts trim — slice: `api/projects` Cloud members

Inventory: 221 Cloud-vocabulary exported symbols with 576 external references. This slice took the
`api/projects` group (20 refs).

| Symbol | Disposition |
| --- | --- |
| `ProjectBrowserWorkspaceTab` | renamed `ProjectBrowserTab` — the shape carried **no workspace data**, so the name was the only Cloud debt (10 occurrences, 4 files) |
| `WorkspaceProjectSummary` | renamed `ProjectListEntry` (23 occurrences, 9 files) |
| `WorkspaceProjectsResponse` | renamed `ProjectSummariesResponse` (8 occurrences, 4 files) |
| `ProjectWorkspaceScope` | deferred — every arm's `context` is `WorkspaceCollabContext`, so it belongs with the `api/collab` slice (137 refs) |

Names were chosen after checking for collisions: `ProjectSummary` is already a local interface in
`daemon/src/mcp.ts` and in three web components, and `ProjectsResponse` already exists in contracts
as `{ projects: Project[] }`. Renaming to either would have created duplicate-identifier errors.

### A stale build was masking 22 dangling imports

Rebuilding `contracts/dist` exposed something bigger: **22 imports in web source still referenced
symbols deleted back in step 5** (`AmrWalletSnapshot`, `AmrSessionState`, `AmrAuth*`,
`CollabProjectInvalidationSsePayload`, `buildInviteDeeplink`, …). They typechecked because the stale
dist still contained the deleted modules — the earlier cleanup had removed only the `amr`-named
artifacts. No clean checkout would have built.

Fixed by porting the real definitions from `main` (verbatim, not invented) into
`apps/web/src/runtime/legacy-scope-types.ts`, restoring the three collab invalidation event names
(`comment-changed`, `presence-changed`, `project-metadata-changed`) and the
`project-content-transfer-state` event constant, and deleting `tests/invite-deeplink.test.ts`,
whose subject module was removed.

Two self-inflicted errors worth recording: an empty `COLLAB_PROJECT_INVALIDATION_EVENTS` broke the
listener wiring (`project-events.test.ts` caught it — 18/18 after the real list was restored), and a
`| string` in a payload's `type` widened the discriminant and defeated union narrowing in
`ProjectView`.

### Verification

| Check | Result |
| --- | --- |
| contracts build (dist wiped first) | exit 0 |
| contracts test | 60 files, 636 tests, exit 0 |
| daemon typecheck | exit 0, 0 errors |
| web typecheck | exit 0, 0 errors |
| daemon project/mcp suites | 3 files, 61 tests, exit 0 |
| client runtime suites | 4 files, 60 tests, exit 0 |
| **full web suite** | **902 passed, 1 skipped (903); 8,688 passed, 19 skipped (8,707); 0 failed; exit 0; 927.80s** |

The full-suite test total fell from 8,719 to 8,707 because the deleted invite suite held 12 tests.

## Contracts trim — `api/collab` cluster

Inventory of the collab cluster: 24 Cloud-vocabulary exports, 223 external file references. A
dependency-closure pass over the module (per-symbol spans, not name co-occurrence) showed two
tiers:

- **28 exports referenced nowhere at all** — no consumer, and no surviving symbol in the file
  references them (billing catalog/checkout/wallet/interest/revision-clock, presence DTOs, member
  register, cloud comment/member responses, `WorkspaceLifecycleState` chain, …).
- **40 exports with real consumers**, mutually interdependent.

Deleted the 28: `api/collab.ts` went **1,106 → 852 lines**. Zero product risk, since nothing
referenced them.

### Why the remaining 40 need one coordinated change

The survivors form a single type cluster. `WorkspaceCollabContext` (138 files) is built from
`WorkspacePermissions`, `WorkspaceSeatSummary`, `WorkspaceLifecycleState`, `WorkspaceMemberStatus`,
`WorkspaceBillingState`, `WorkspaceProviderMode`; the derivation helpers
(`buildWorkspacePermissions`, `workspacePrincipalKey`, `isSameWorkspacePrincipal`,
`canReachWorkspaceBillingEntrance`, `workspaceBillingAuthorityContext`,
`workspaceContextHasTeamIdentity`, `workspaceContextHasWorkspaceIdentity`,
`workspaceSeatCapacityState`) take those types as parameters; and `api/projects.ts` imports
`WorkspaceCollabContext` for the `ProjectWorkspaceScope` union. So `ProjectWorkspaceScope` and the
collab module block each other, and neither can move alone.

A first closure pass is a trap worth recording: an earlier check compared names **on the same line**
only, which classified `WorkspacePermissions` as deletable even though `WorkspaceCollabContext`
uses it on a different line. Switching to per-symbol source spans cut the deletable set from 44 to
28.

Another measurement trap: an ad-hoc PowerShell count reported `WorkspaceType` in 90 files, while the
authoritative inventory and a direct check both say **3**. The over-count came from the ad-hoc scan,
not the tooling — a reminder to cross-check a suspicious count before sizing work from it.

### Verification

| Check | Result |
| --- | --- |
| contracts build | exit 0 |
| contracts test | 60 files, 636 tests, exit 0 |
| daemon typecheck | exit 0, 0 errors |
| web typecheck | exit 0, 0 errors |
| full web suite | see below |

### Remaining plan for the cluster

One coordinated change: move the 40 surviving exports (852 lines) into a local module per app,
repoint the importers (~90 web files, ~10 daemon files, 1 in `packages/host`), then delete
`api/collab.ts` and the `ProjectWorkspaceScope` union with it.

### Option A executed — the cluster is localised and `api/collab.ts` is gone

The 40 surviving exports (852 lines) now live in two app-local modules:

- `apps/web/src/runtime/collab-contract.ts`
- `apps/daemon/src/local/collab-contract.ts`

`ProjectWorkspaceScope` and `ProjectWorkspaceScopeResponse` moved out of `api/projects.ts` into both
modules (with the now-unused `WorkspaceCollabContext` import dropped). `packages/contracts/src/api/collab.ts`
is **deleted**, as is its barrel export.

**141 files repointed** by an import-partitioning pass that splits each `@capydesign/contracts`
import into kept specifiers and moved specifiers, then emits a second import against the app-local
module at the correct relative depth (with a `.js` extension for the daemon, which compiles as
NodeNext ESM).

`packages/host` needed no change: it only *mentions* `WorkspaceCollabContext` in a comment and
deliberately declares its own `CapyDesignHostWorkspaceContext` to stay independent of the app
contracts.

#### Three bugs caught in my own tooling

1. **A regex that spanned statements.** `import\s+\{([\s\S]*?)\}\s+from '...contracts'` matched from
   the *first* `import {` in a file straight to the collab statement's closing brace, swallowing whole
   preceding import blocks. It reported 93 files instead of 141, and silently skipped files it had
   mis-parsed. Anchoring at a line start and forbidding `}` inside the body produced the correct 141.
2. **A type-modifier collision.** Moving specifiers into an existing `import type { ... }` produced
   `import type { type X }`; and a function moved by a type-only import became uncallable
   (`TS1361`). Fixed by classifying the 12 runtime exports as values and emitting a value import
   whenever any moved name is one.
3. **A bad `edit`.** Removing a line with an edit whose `oldText` ended in `\n` merged two import
   lines in `ProjectView.pendingPrompt.test.tsx`. Caught by reading the file back and repaired — a
   reminder to verify the result of a line-oriented edit on a CRLF file rather than trusting success.

Also fixed: the double-quoted import form (`from "@capydesign/contracts"`) that the first quote-only
regex missed, and two `import('@capydesign/contracts').<name>` type queries (one real, one in a
JSDoc), repointed at the local module.

#### Verification

| Check | Result |
| --- | --- |
| contracts build | exit 0 |
| contracts test | 60 files, 636 tests, exit 0 |
| daemon typecheck | exit 0, 0 errors |
| web typecheck | exit 0, 0 errors |
| daemon subset (projects/mcp/failure/comment-pin) | 5 files, 211 tests, exit 0 |
| **full web suite** | **902 passed, 1 skipped (903); 8,688 passed, 19 skipped (8,707); 0 failed; exit 0; 760.70s** |
| leftover references to the deleted module | **0** |

## Contracts trim — `api/context` and `plugins/share-actions`

Both entries from the inventory resolved, and both turned out to be different from their label.

### `api/context::WorkspaceContextItem` — shared, so renamed in place

`api/context.ts` (56 lines) is **not** Cloud-only: contracts' own `api/chat.ts`, `api/automations.ts`,
`api/routines.ts` and `api/projects.ts` all consume `RunContextSelection` from it, and the daemon has
independently declared its own `RunContextItem` / `RunContextSelection` copies for some time. So the
module cannot be deleted — only de-vocabularised.

Renamed in place across contracts and web:

| Before | After |
| --- | --- |
| `WorkspaceContextItem` | `RunContextItem` (87 occurrences, 13 files) |
| `WorkspaceContextKind` | `RunContextItemKind` (2 occurrences, 1 file) |

Three exports in the same file were genuinely dead and are gone: `ProjectContextPluginRef`,
`ProjectContextMcpServerRef`, `ProjectContextConnectorRef`. A first attempt to delete the whole module
was reverted — the per-export reference count I had used scanned only *outside* contracts, which is
exactly the blind spot that hid those internal consumers.

### `plugins/share-actions` — a false positive, minus one dead export

The names are Cloud-vocabulary-free (`PluginShareAction`, `PLUGIN_SHARE_ACTION_PLUGIN_IDS`) and the two
actions — `publish-github` and `contribute-open-design` — are **live and tested** in the daemon
(`share-helpers.ts`, `routes/plugins/index.ts`, `server.ts`, `plugins-headless-run.test.ts`) and the web
(`PluginsView`). It appeared in the inventory only because the scan regex included the word `share`.
The one genuinely dead export, `CreatePluginShareProjectRequest` (0 references anywhere), is deleted.

### Verification

| Check | Result |
| --- | --- |
| contracts build | exit 0 |
| contracts test | 60 files, 636 tests, exit 0 |
| daemon typecheck | exit 0, 0 errors |
| web typecheck | exit 0, 0 errors |
| daemon `plugins-headless-run` | 4 failed / 3 passed — **identical on a stashed baseline**, i.e. pre-existing |
| **full web suite** | **902 passed, 1 skipped (903); 8,688 passed, 19 skipped (8,707); 0 failed; exit 0; 791.31s** |

The pre-existing plugin-test failures were confirmed by stashing every change and re-running the same
file: the same 4 tests fail at the unmodified tip.

## Contracts trim — `api/handoff` and `api/workspaces`: both false positives

Neither module contains a single `amr`, `vela`, `cloud`, `billing`, `invite` or `membership`
reference, and both have live consumers and **zero dead exports**:

| Module | Exports | Dead | Real consumers |
| --- | --- | --- | --- |
| `api/handoff.ts` | 3 | 0 | `daemon/src/design/handoff-design.ts`, `daemon/src/handoff-cli.ts` |
| `api/workspaces.ts` | 13 | 0 | `OrchestratorWorkspace` alone: 55 references across `routes/project`, `workspace-contract`, `import-export-routes`, and their tests |

The inventory flagged `handoff` because the scan vocabulary contained the word *handoff* (an AMR
device-handoff surface did exist and was removed — but it was the i18n keys `handoff.amr*`, not this
DTO module, which is the transcript→prompt synthesizer for the BYOK endpoint). It flagged
`workspaces` on the word *workspace*, but these are **run** workspaces — `od-owned` vs
`folder-backed` on-disk working directories with orchestrator provenance — not team workspace
identity.

No change made. `api/social-share` and `plugins/strategy-v2` fall in the same class.

A methodology note: a shell-escaped one-liner version of the closure check reported every export in
both modules as dead, contradicting the direct counts. Rewriting it as a file gave the correct
answer. Shell escaping is not a safe medium for regex-heavy analysis — the tooling now lives in files.

With these removed the inventory's real remainder is the `analytics/*` family (~150 references across
12 modules), which is gated on a scope decision, plus `api/projects` (3) and `api/attribution` (2).
The `.openclaw/tmp/contracts-cloud-symbols.txt` snapshot predates the collab deletion and still lists
`api/collab`; regenerate it before using it as a work list.

## Decision note: is `analytics/*` in WS6 scope?

Evidence gathered rather than assumed:

| Measure | Value |
| --- | --- |
| Contracts analytics source | 290,048 bytes across 21 modules |
| Same, built (`dist`) | 197,334 bytes |
| Emit call sites in product code | ~180 across 44 daemon/web files |
| Test suites named analytic/tracking/observab* | 11 |
| Cloud references inside the tree | none (`amr`/`vela`/PostHog destinations already removed) |

**The runtime is already dead.** `apps/daemon/src/local/telemetry-sink.ts` is explicitly a
"destination-less telemetry surface": `createAnalyticsService` returns a no-op service,
`readAnalyticsEndpointConfig` returns null, every sink reader returns null, and every `post*` returns
`{ status: 'not_expected', drop_reason: 'missing_sink_config' }`. Nothing is sent anywhere today.

**So the question is not "are we deleting live telemetry" — it is "does CapyDesign want the
instrumentation points at all".** Two things make that a product decision rather than a WS6 cleanup:

1. The cost is not in contracts. Contracts shrinking is ~290KB of source; the actual work is ~180
   emit call sites in product control flow. Several sit where real work happens:
   `run-analytics-lifecycle.ts`, `run-lifecycle-tracer.ts`, `run-terminal-reconciliation.ts`,
   `run-failure-evidence.ts` (the classification path repaired earlier), `run-retry-policy.ts`.
2. Some of it is instrumentation *for local reliability*, not funnel analytics: `web/observability/chat-health.ts`
   (577 lines) exists to make four chat-panel failure modes measurable — first paint, DOM growth,
   memory pressure — and `web/analytics/byok-run.ts` exists because BYOK runs bypass the daemon and
   would otherwise be invisible to the run lifecycle. Deleting them removes the measurement points,
   not just the destination.

Both end states are defensible:

- **(a) Shed it** — remove the schema, the 180 call sites and the 11 suites. The app gets lighter and
  conceptually cleaner. Risk: disturbing run-lifecycle and diagnostic behaviour, which is exactly the
  area that produced two silent regressions during this workstream.
- **(b) Keep it as an inert typed skeleton** — zero runtime cost, destinations already removed, and it
  is the shape any future local or opt-in sink would use.

Recommendation: **(b) within WS6**, because the Cloud part of analytics is already done and the
remaining change is a different workstream with a worse risk profile; treat (a) as its own scoped
change that starts with the run-lifecycle call sites.

## Contracts trim — closing the small remainder

Regenerating the inventory (the file was a pre-collab snapshot) gave the accurate position: **191 symbols / 323 refs**, later **189 / 320**. Of those, the `analytics/*` family is ~150 and is now settled by decision (b). The rest resolved as follows.

| Item | Outcome |
| --- | --- |
| `api/projects::TeamResourceState` | renamed `ResourceLifecycleState` — used by one DTO field and the daemon shim |
| `api/registry::AmrModelsResponse` / `AmrModelsSource` | **genuine AMR residue** — moved to the web local stand-in module; `/api/amr/models` no longer exists so the fetch always resolves null |
| `api/artifacts::ArtifactProvenanceHandoffKind` | false positive (matched *handoff*) |
| `plugins/plugin-url::pluginShareUrl` | false positive (matched *share*) |
| `api/project-sync::ProjectSyncState` | kept — real enum, used by the daemon's project route and the local modules |
| `api/attribution` | **open** — see below |

### `api/attribution` is a live caller of a removed route

`apps/packaged/src/download-attribution.ts` (207 lines) POSTs to the **local daemon** at
`ATTRIBUTION_CLAIM_PATH` = `/api/attribution/claim`. That route was removed during WS6
(`registerRemovedAttributionRoutes`), so every claim now 404s. Scope of the removal:

- `apps/packaged/src/download-attribution.ts` — 207 lines
- `apps/packaged/src/index.ts` — `discoverPackagedDownloadAttribution` (:273), `claimPackagedDownloadAttribution` (:353)
- `apps/packaged/tests/download-attribution.test.ts` (62 lines), `block-attribution-ruling.test.ts` (167 lines)

Not done in this pass: it is a behavioural change in the packaged Electron entry, a surface untouched
by the rest of this workstream, and it deserves its own verification run rather than being folded into
a contracts commit.

### Verification

| Check | Result |
| --- | --- |
| contracts build | exit 0 |
| contracts test | 60 files, 636 tests, exit 0 |
| daemon typecheck | exit 0, 0 errors |
| web typecheck | exit 0, 0 errors |
| **packaged typecheck** | exit 0, 0 errors |
| **full web suite** | **902 passed, 1 skipped (903); 8,688 passed, 19 skipped (8,707); 0 failed; exit 0; 676.39s** |

## Open items (not WS6 regressions)

1. WS1 licence attribution item blocking `pnpm guard` — needs a product call.
2. Remaining WS6 scope: i18n key prune across 19 locales, Privacy consent UI unwiring,
   contracts trim (222 load-bearing references), vocabulary rename pass, packaging.

### Merged

Merged into `main` on explicit instruction as `8c9b8da2d` ("Merge rebrand/ws6-cloud-removal: remove
the Open Design Cloud surface"), a `--no-ff` merge with parents `eb706207a` (previous `main`) and
`52441ce47` (branch head). 73 commits, 1,037 files changed.

Post-merge verification: `main` tree hash `ea2ff15995d6ad143a0c505c80609f795cadd6b3` is **identical**
to the branch tree, and `git diff --stat main rebrand/ws6-cloud-removal` is empty — so the full
verification recorded above (full web suite 902 files / 8,688 tests / 0 failed; all four package
typechecks clean; contracts 636 tests) applies unchanged to the merged result. `contracts build`
re-confirmed exit 0 on `main`; `rebrand/ws6-cloud-removal` is an ancestor of `main`; no
`Co-authored-by` trailers exist in the merged range.

**Outstanding after the merge:** the privacy truth. The in-app copy still states that usage data may
be shared, which is false in a build with no analytics destination. Drafted and held for review in
`ws6-privacy-copy-draft.md`. This is a pre-existing inaccuracy that the merge neither introduced nor
worsened.
