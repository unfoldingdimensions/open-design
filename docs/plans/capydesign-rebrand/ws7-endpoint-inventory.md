# WS7 — Upstream URL / feed / infrastructure inventory

Status: **in progress**. Branch `rebrand/ws7-upstream-links-and-infra`, cut from
`rebrand/ws6-cloud-removal` (WS6 not yet landed — see "Dependency note").

This file is the WS7 "Step 0" surface map: every `open-design.ai` / `nexu-io`
occurrence in the tree, classified **attribution** (keep, provenance) or
**endpoint** (remove / repoint / fail-closed). It is the work order for the rest
of the sweep.

## Dependency note (read first)

`PLAN.md`/`prompts/README.md` require WS6 to land **before** WS7, because both
edit `apps/daemon/src/server.ts`, `apps/web/src/components/HomeHero.tsx` and the
prompt files. At the time WS7 started, WS6 was **still WIP** on
`rebrand/ws6-cloud-removal`:

- WS6 daemon side is largely done (vela / langfuse / collab / attribution route
  modules deleted).
- WS6 **web** side is **not** done: `apps/web/src/collab/`,
  `apps/web/src/runtime/amr-guidance.ts`, `apps/web/src/campaigns/go-plan.ts`,
  `GoPlanSunsetDialog.tsx` still exist and still carry `open-design.ai` URLs.

WS7 therefore runs **serially after WS6's landed commits** but **before WS6
finishes**. The WS6-owned files listed below must **not** be edited by WS7; they
will be deleted by WS6 rather than renamed.

## Classification legend

- **attribution** — provenance of the upstream project. **Keep.**
  LICENSE / NOTICE / THIRD-PARTY-NOTICES, `docs/CHANGELOG/**`, upstream
  `nexu-io/open-design#NNNN` issue references in comments.
- **endpoint** — an operational reference to nexu-io infrastructure (a fetch
  target or a shipped link surface). **Remove, repoint to the fork, or make
  opt-in / fail-closed.** Never leave a live default aimed at another company.

## Done in this pass

| path:line | value | disposition |
|---|---|---|
| `apps/desktop/src/main/updater/config.ts:41,117-118,222` | `https://releases.open-design.ai/<channel>/latest/metadata.json` default feed | **fail closed** — default removed; `metadataUrl` now only from `OD_UPDATE_METADATA_URL`; no feed ⇒ explicit `update-not-configured`, `shouldAutoCheck()` false, **no fetch**. Test added: `apps/desktop/tests/main/updater.test.ts` "fails closed: no network fetch when no update feed is configured". |
| `apps/desktop/src/main/updater.ts` | feed resolution / check / status | gated on a configured feed (see commit `9a90e19e3`) |

Verified: `pnpm --filter @capydesign/desktop typecheck` clean; updater suite
95 passed / 2 skipped; fail-closed test green.

## Remaining endpoint work (NOT yet done)

### Daemon — runtime fetch / link targets (`apps/daemon/src`)

| path:line | value | disposition |
|---|---|---|
| `plugins/marketplaces.ts:77` | `DEFAULT_MARKETPLACE_REPO = 'nexu-io/open-design'` | repoint default to the fork (`unfoldingdimensions/open-design`); registry base is `raw.githubusercontent.com/<repo>/main/plugins/registry` |
| `plugins/marketplaces.ts:80,81` (+ uses `:123,:142`) | `https://open-design.ai/marketplace`, `.../plugins` public link bases | **no CapyDesign site exists** ⇒ make env-only (no hardcoded default), or disable the public marketplace with an explicit `OD_MARKETPLACE_*` override. Ripples to `apps/daemon/tests/plugins-marketplaces.test.ts` (12 refs) |
| `plugins/plugin-preview-bakes.ts:23` | `DEFAULT_PUBLIC_BASE = 'https://repo-assets.open-design.ai/plugin-previews'` | **disable the default; opt-in env only** (`OD_PLUGIN_PREVIEWS_BASE_URL`). Ripples to `plugin-preview-bakes.test.ts:14` |
| `plugins/export.ts:179`, `plugins/scaffold.ts:102`, `plugins/skill-candidates.ts:359` | `$schema: 'https://open-design.ai/schemas/plugin.v1.json'` written into **generated** manifests | drop the `$schema` key (no CapyDesign schema host exists) — or host it and bump the schema version |
| `plugins/publish.ts:155,158` | issue target/label `nexu-io/open-design` | repoint to the fork |
| `plugins/publish.ts:285` | generated doc link `https://open-design.ai/docs/plugins-spec.md` | point at the in-repo doc |
| `plugins/marketplace-seed.ts:6` | `OFFICIAL_PLUGIN_SOURCE_REPO = 'github:nexu-io/open-design@main'` | repoint to the fork |
| `prompts/system.ts:1664` | Ask-mode paragraph: GitHub + website + **Discord invite** | **read `docs/prompt-composition.md` first.** Remove the links (keep the sentence) or use CapyDesign's own. Mirror `packages/contracts/src/prompts/system.ts:641` + `plugins/_official/scenarios/od-next-strategy/assets/*`; update `packages/contracts/tests/system-prompt.test.ts` |
| `runtimes/metadata.ts:11` | `installUrl: 'https://open-design.ai/amr'` | remove **with the AMR runtime** (WS6) |
| `runtimes/metadata.ts:12,31,59` | `github.com/nexu-io/open-design/blob/main/docs/...` | repoint to the fork |
| `server.ts:3587` | `publisher: { id:'open-design', url:'https://open-design.ai' }` | repoint to the fork or drop `url` |
| `cli.ts:5324,5379,5411,5723,6194` | `capt plugin fork/contribute` targets `nexu-io/open-design`; issue/PR forms | repoint to the fork (product behaviour, not just a link) |
| `design-systems/index.ts:1995` | prints `https://github.com/nexu-io/open-design` | repoint to the fork |

### Contracts (`packages/contracts/src`)

| path:line | value | disposition |
|---|---|---|
| `plugins/plugin-url.ts:19` | `OPEN_DESIGN_SITE_ORIGIN = 'https://open-design.ai'` | **make required-config**: drop the default, make `origin` a required argument, and pass it in from `apps/web/src/components/plugin-details/PluginShareMenu.tsx:100`. Update `packages/contracts/tests/plugin-url.test.ts` and `apps/web/tests/components/PluginShareMenu.test.tsx` |
| `prompts/system.ts:641` | Ask-mode links (mirror of daemon prompt) | same as daemon `prompts/system.ts` |
| `api/social-share.ts:1` | `OPEN_DESIGN_GITHUB_REPO_URL = 'https://github.com/nexu-io/open-design'` | repoint to the fork |
| `analytics/events/ui-click.ts:938`, `runtime/html-injection-points.ts:11,196` | comments | **keep** (attribution) |

### Web (`apps/web/src`)

| path:line | value | disposition |
|---|---|---|
| `first-party-external-link.ts:1` | `FIRST_PARTY_HOSTS = open-design.ai, www…, staging…` | **decide explicitly.** No CapyDesign host exists ⇒ make the set empty and let the browser handle links. Update `apps/web/tests/first-party-external-link.test.ts` |
| `providers/registry.ts:1414` | same host allow-list | align with the above |
| `components/HomeHero.tsx:2327` | favicon host map `'open-design.ai': '/logo.svg'` | repoint or remove |
| `components/HomeHero.tsx:4259,4394` | "Website URL to clone: https://open-design.ai" example (en + zh) | **WS8** (prose), flagged here |
| `components/enterpriseUrl.ts:7` | `ENTERPRISE_BASE = 'https://open-design.ai'` | no CapyDesign marketing site ⇒ needs a human decision (remove the Enterprise link or repoint) |
| `components/sketch-model.ts:70` | `OPEN_DESIGN_EXCALIDRAW_SOURCE = 'https://open-design.ai/sketch'` | repoint / opt-in env |
| `runtime/visual-style-catalog.ts:118` | `STYLE_CATALOG_ASSET_ORIGIN = 'https://repo-assets.open-design.ai'` | **disable default / opt-in env.** Large test ripple: `AssistantMessage.test.tsx` (13), `QuestionForm.test.tsx` (6) |
| `components/LibrarySection.tsx:1146` | `https://open-design.ai/clipper` | repoint / remove |
| `SettingsDialog.tsx:297`, `UpdateDialog.tsx:30`, `WhatsNewPopup.tsx:33`, `useGithubStars.ts:12`, `EntryNavRail.tsx:107,112`, `DesignFilesPanel.tsx:348`, `runtime/plugin-source.ts:52,53`, `design-files/pluginFolderActions.ts:40`, `home-hero/plugin-authoring.ts:51`, `share-to-community/shareToCommunityPrompt.ts:31` | repo / releases / issues / contact links | repoint to the fork |
| `plugin-details/PluginShareMenu.tsx:80,206` | public detail-page comments/uses | follow `plugin-url.ts` |
| **WS6-owned (do NOT edit)** | `campaigns/go-plan.ts:12`, `GoPlanSunsetDialog.tsx:15`, `runtime/amr-guidance.ts:25`, `PrivacyConsentModal.tsx:11` | WS6 deletes these; privacy truth is WS6→WS8 |
| comments (`exports.ts:1560`, `srcdoc.ts:117,1407`, `file-viewer-render-mode.ts:127,279`, `FileViewer.tsx:9999`, `mention-home.css:849`, `design-files/pluginFolderActions.ts:27`, `QuestionForm.tsx:768`) | upstream issue refs | **keep** (attribution) |

### Desktop (`apps/desktop/src`)

| path:line | value | disposition |
|---|---|---|
| `main/runtime.ts:1098` | `CRASH_REPORT_ISSUES_URL = 'https://github.com/nexu-io/open-design/issues/new'` | repoint to the fork |
| `main/runtime.ts:1099,1109-1110` | `SUPPORT_EMAIL = 'support@open-design.ai'` (+ mailto-hardening comment) | remove the address or repoint; ripple in `apps/desktop/tests/main/mailto-open.test.ts` |
| `main/index.ts:580,593` | Readme / new-issue external links | repoint to the fork |
| `artifact-export.ts:290,304`, `deck-capture.ts:1997`, `pdf-export.ts:264,278,282` | comments | **keep** (attribution) |

### Tools (`tools/*/src`) — release infrastructure (WS11 owns naming; WS7 owns URLs)

| path:line | value | disposition |
|---|---|---|
| `tools/pack/src/linux.ts:545` | packaging git url `nexu-io/open-design.git` | repoint to the fork |
| `tools/release/src/catalog/export.ts:33,34,35` | `REPO_TREE` / `REPO_BLOB` / `PLUGIN_PREVIEWS_BASE_URL` | repoint repo links to the fork; previews base → opt-in (WS11) |
| `tools/release/src/catalog/validate.ts:37,38` | hardcoded `nexu-io/open-design/` sourceUrl check | repoint to the fork (or make the org configurable) |
| `tools/release/src/storage/dsh-bootstrap-bundle.ts:13` | `https://open-design.ai/install-dsh.ps1?version=1` | **WS11 / human-blocked** release infra |

### Repo metadata & shipped docs (URLs only — prose is WS8)

- `package.json` — `repository`, `homepage`, `bugs`, `author`.
- `README.md` — badges, hero `<img>` from `repo-assets.open-design.ai`, Website /
  Download / Cloud links, star-history chart, macOS/Windows download links,
  coding-agents image, Discord — plus the same in **13 `docs/i18n/README.*.md`**.
- `.github/ISSUE_TEMPLATE/*`, `.github/pull_request_template.md`,
  `.github/CODEOWNERS`, `CONTRIBUTING.md`, `MAINTAINERS.md`.
- `deploy/README.md`, `tools/pack/helm/open-design/README.md` (+ `Chart.yaml`,
  `values.yaml`), `clipper/store/LISTING.md`, `docs/windows-troubleshooting.md`,
  `docs/install-guide.md`, `figma-plugin/`, `clipper/` manifests.

### `.github` automation (read `.github/AGENTS.md` first — audit, don't restructure)

Workflows/scripts that reach nexu-io infra and need a per-item decision
(repoint / remove / keep with reason):

```
.github/workflows/{metrics,refresh-contributors-wall,refresh-plugin-popularity,
  release-beta,release-stable,release-prerelease,release-prerelease-card,
  whats-new-publish,bake-plugin-previews,bake-plugin-previews-release,
  e2e-coverage-reminder,cut-release,cut-patch-release,finalize-release,
  catalog-publish,discord-resolved,dsh-upstream-drift,dsh-bootstrap-publish,
  ui-extended-main}.yml
.github/scripts/{publish_whats_new.py,rerun_infra_cancel.py,handoff.py,
  agent-pr-explore-local.sh,agent-pr-explore-sandbox.sh,provision-agent-pr-explore-runner.sh,release/publish-platform.ps1}
.github/actions/bake-previews/action.yml
.github/config/scopes.json + .github/scripts/scopes.py (path rules)
```

### Regression fence (TODO, blocked on the sweep)

Add the WS7 workstream-wide test: no shipped module may contain a **default
operational** `open-design.ai` / `*.open-design.ai` URL, with an explicit
allow-list for attribution references and changelogs. It cannot land green until
the src sweep above is complete (daemon plugins, web link surfaces, contracts).

## Tests to update alongside the sweep (WS12 re-baselines the rest)

- `apps/daemon/tests/plugins-marketplaces.test.ts`, `plugin-preview-bakes.test.ts`
- `apps/web/tests/components/{PluginShareMenu,AssistantMessage,QuestionForm,PluginsView,ExtensionsMarketplace.plugin-detail-entry}.test.*`
- `apps/web/tests/first-party-external-link.test.ts`, `providers/registry.test.ts`,
  `components/enterprise-url.test.ts`, `components/sketch-model.test.ts`
- `packages/contracts/tests/plugin-url.test.ts`, `packages/contracts/tests/system-prompt.test.ts`

## Pre-existing failures observed on this branch (NOT caused by WS7)

- `pnpm guard` fails at `scripts/check-attribution-notices.ts`:
  two `prompt-templates/image/*seedream*.json` declare
  `source.license 'Original X post'`, outside the allow-list. Both files are
  byte-identical to `main` ⇒ **pre-existing**; belongs to WS1's ledger/allow-list.
- `apps/desktop` suite: `tests/main/frame-capture.test.ts` and
  `tests/main/loopback-connection-limit.test.ts` fail — both byte-identical to
  `main` ⇒ pre-existing (Windows/env), unrelated to WS7.
