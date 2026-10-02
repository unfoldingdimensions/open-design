# WS7 — Upstream URL / feed / infrastructure inventory

Status: **complete** (app source clean; residual release-infra URLs belong to WS11).
Branch: `rebrand/ws7-upstream-links-and-infra`, rebased onto `main` after WS6
merged (`8c9b8da2d`).

Baseline note: WS6's own close-out measured **179 `open-design.ai` URL occurrences
in app source** and handed them to WS7. This file classifies them.

## Classification legend

- **attribution** — provenance of the upstream project. **Keep.**
  LICENSE / NOTICE / THIRD-PARTY-NOTICES, `docs/CHANGELOG/**`, and upstream
  `nexu-io/open-design#NNNN` issue references in code comments (including
  "See nexu-io/open-design#7410"-style notes).
- **endpoint** — an operational reference to nexu-io infrastructure (a fetch
  target, a shipped link, or a prompt/email address surfaced to users).
  **Remove, repoint to the fork, or make opt-in / fail-closed.**

## Two standing decisions applied in this sweep

1. **GitHub operational links → the fork.** Anything user-facing that pointed at
   `github.com/nexu-io/open-design` for *navigation* (repo, releases, issues/new,
   readme, fork/PR targets) now points at
   `github.com/unfoldingdimensions/open-design`. Issue references in comments are
   left untouched as attribution.
2. **No CapyDesign web domain exists** (WS9 visual assets and WS11 release infra
   are both human-blocked), so `open-design.ai` operational endpoints are
   **removed or made opt-in with no default**, never repointed at a guessed host.
   A build must not fetch from — or advertise — another vendor's production
   infrastructure.

## Landed in this sweep

### Fail-closed updater (the WS7 hazard)

| path | change |
|---|---|
| `apps/desktop/src/main/updater/config.ts` | hardcoded default feed `https://releases.open-design.ai/<channel>/latest/metadata.json` **removed**; `metadataUrl` only from `OD_UPDATE_METADATA_URL` |
| `apps/desktop/src/main/updater.ts` | check/status/auto-check gated on a configured feed; explicit `update-not-configured` state; **no fetch** without config |
| `apps/desktop/tests/main/updater*.test.ts` | new test: "fails closed: no network fetch when no update feed is configured" (quoted in the commit) |

### Daemon — runtime fetch / link targets

| path:line | value | disposition |
|---|---|---|
| `plugins/plugin-preview-bakes.ts:23` | `https://repo-assets.open-design.ai/plugin-previews` default | **removed** — opt-in via `OD_PLUGIN_PREVIEWS_BASE_URL`; with no base and no on-disk clips the bake is disabled (fail closed) |
| `plugins/marketplaces.ts:77,80,81` | `DEFAULT_MARKETPLACE_REPO='nexu-io/open-design'`, public `open-design.ai/marketplace|plugins` bases | repo **repointed to the fork**; public-site bases **removed** (foreign-host URLs are no longer special-cased) |
| `plugins/marketplace-seed.ts:6` | `github:nexu-io/open-design@main` | repointed to the fork |
| `plugins/export.ts:179`, `scaffold.ts:102`, `skill-candidates.ts:359` | `$schema: https://open-design.ai/schemas/plugin.v1.json` written into generated manifests | **key dropped** (no CapyDesign schema host; the version stays in `specVersion`) |
| `plugins/publish.ts:155,158,285` | issue target/label; `open-design.ai/docs/plugins-spec.md` | repointed to the fork; doc link now repo-relative (`docs/plugins-spec.md`) |
| `runtimes/metadata.ts:10-12` | orphaned `amr` install entry (`open-design.ai/amr`, upstream docs) | **entry removed** (the AMR runtime was deleted by WS6); `hermes`/`pi` doc links repointed to the fork |
| `server.ts:3277` | `publisher: { id:'open-design', url:'https://open-design.ai' }` | `url` **removed** |
| `design-systems/index.ts:1995` | generated guide credits `github.com/nexu-io/open-design` | repointed to the fork |
| `cli.ts:5321,5376,5408,5720,6191` | `plugin fork/contribute` + issue/PR forms target `nexu-io/open-design` | repointed to the fork |

### Contracts

| path | change |
|---|---|
| `api/social-share.ts:1` | `OPEN_DESIGN_GITHUB_REPO_URL` repointed to the fork |
| `prompts/system.ts:641` | Ask-mode paragraph: **"Official links: …" sentence removed** (GitHub/website/Discord). Mirrored in `apps/daemon/src/prompts/system.ts:1664`; `packages/contracts/tests/system-prompt.test.ts` updated to assert no upstream links are composed |

### Web / desktop / tools

| path | change |
|---|---|
| `first-party-external-link.ts:1` | `FIRST_PARTY_HOSTS` **emptied** — no host is treated as first-party; the click bridge is inert until an origin is listed. Test updated to assert non-interception |
| `providers/registry.ts:1360,1387-1399` | `bridgeFirstPartyUrl` **deleted** — it POSTed to `/api/attribution/bridge-url`, a route WS6 removed (dead caller) |
| `components/HomeHero.tsx:2125` | favicon host map entry `'open-design.ai'` **removed** |
| `DesignFilesPanel`, `EntryNavRail` (repo), `SettingsDialog`, `UpdateDialog`, `WhatsNewPopup`, `useGithubStars`, `runtime/plugin-source`, `design-files/pluginFolderActions`, `home-hero/plugin-authoring`, `share-to-community/shareToCommunityPrompt`, `PrivacyConsentModal` | repo/releases/issues links **repointed to the fork** |
| `apps/desktop/src/main/index.ts:580,593`, `runtime.ts:1098` | readme/issues/crash-report links repointed to the fork |
| `tools/pack/src/linux.ts:545`, `tools/release/src/catalog/export.ts:33,34`, `validate.ts:37,38` | packaging/release repo links and the catalog `sourceUrl` check repointed to the fork |

### Test updates shipped with the sweep

`plugins-marketplaces`, `plugin-preview-bakes`, `plugins-publish`,
`design-system-archive`, `runtimes/env-and-detection` (daemon);
`plugin-source`, `pluginFolderActions`, `PrivacyConsentModal`, `UpdateDialog`,
`WhatsNewPopup`, `SettingsDialog.execution`, `first-party-external-link` (web);
`system-prompt` (contracts).

### Verification evidence

| Check | Result |
|---|---|
| `contracts` / `daemon` / `web` / `desktop` / `packaged` typecheck | **exit 0** each |
| contracts suite | **636 passed** |
| desktop updater suite | **95 passed / 2 skipped** |
| daemon `plugins-` suite vs a stashed baseline | **32 failed / 550 passed on both** — zero new failures |
| daemon `env-and-detection` vs baseline | **9 failed** vs baseline **10** — one improved (removed the dead `amr` metadata assertion), none introduced |
| web batch (38 files, 605 tests) | **0 failed** |

## Residue — still open (endpoint class)

| path:line | value | why it is still open |
|---|---|---|
| `apps/daemon/src/local/legacy-bridge.ts:113,120,232,296` | `DEFAULT_AMR_RECHARGE_URL = https://open-design.ai/amr/dashboard…` | WS6 kept it deliberately "so the recharge action link keeps its historical shape". The AMR service is gone, so this is a dead link in failure cards — needs a product call (remove the link vs. keep a dead one) |
| `apps/web/src/components/enterpriseUrl.ts:7` | `ENTERPRISE_BASE='https://open-design.ai'` | needs a CapyDesign marketing site (WS9/WS11 human-blocked); caller `EntrySettingsMenu:275` should hide the link when unset |
| `apps/web/src/runtime/visual-style-catalog.ts:118` | `STYLE_CATALOG_ASSET_ORIGIN='https://repo-assets.open-design.ai'` | needs a CapyDesign asset CDN; make opt-in env. Ripples to `AssistantMessage.test.tsx` (13) and `QuestionForm.test.tsx` (6) |
| `apps/web/src/components/sketch-model.ts:70` | `OPEN_DESIGN_EXCALIDRAW_SOURCE='https://open-design.ai/sketch'` | no fork equivalent; make opt-in env or drop the source field |
| `apps/web/src/components/LibrarySection.tsx:1138` | clipper download link `open-design.ai/clipper` | no CapyDesign clipper host; needs a call (remove the link vs. host one) |
| `packages/contracts/src/plugins/plugin-url.ts:19` | `OPEN_DESIGN_SITE_ORIGIN='https://open-design.ai'` + `PluginShareMenu.tsx:80,206` | prompt asks for **required-config**: drop the default, make `origin` required, plumb it from `PluginShareMenu`. Ripples to `plugin-url.test.ts` + `PluginShareMenu.test.tsx` (10) |
| `apps/web/src/components/EntryNavRail.tsx:65` | `mailto:support@open-design.ai` | no CapyDesign support address exists |
| `apps/desktop/src/main/runtime.ts:1099,1109-1110` | `SUPPORT_EMAIL='support@open-design.ai'` + its mailto-hardening comment | same; ripples to `mailto-open.test.ts` |
| `tools/release/src/catalog/export.ts:35`, `tools/release/src/storage/dsh-bootstrap-bundle.ts:13` | previews base + `open-design.ai/install-dsh.ps1` | WS11 release infrastructure (human-blocked) |
| `apps/web/src/components/HomeHero.tsx:4057,4192` | "Website URL to clone: https://open-design.ai" example (en + zh) | UI copy — WS8 owns prose |
| `packages/contracts/src/analytics/events/ui-click.ts:938`, `apps/packaged/src/sidecars.ts:291`, web comments (`exports.ts`, `srcdoc.ts`, `file-viewer-render-mode.ts`, `FileViewer.tsx`, `mention-home.css`, `pluginFolderActions.ts:27`, `QuestionForm.tsx:768`) | upstream issue refs | **attribution — keep** |

## Residue — outside app source

1. **`.github/`** — issue templates, `CODEOWNERS`, PR template, and ~20 workflows
   that post to nexu-io infrastructure (`metrics`, `release-*`, `whats-new-publish`,
   `bake-plugin-previews*`, `refresh-*`, `cut-release`, `finalize-release`,
   `notify-*-feishu`, `dsh-*`, `catalog-publish`, `ui-extended-main`, …). Read
   `.github/AGENTS.md` first; audit and repoint/remove, do not restructure.
   `.github/config/scopes.json` + `.github/scripts/scopes.py` may name upstream paths.
2. **Repo metadata & shipped docs (URLs only, prose is WS8)** — `package.json`
   (`repository`/`homepage`/`bugs`/`author`), `README.md` badges + hero `<img>` +
   star-history + download/Discord links and the same in 13 `docs/i18n/README.*.md`,
   `CONTRIBUTING.md`, `MAINTAINERS.md`, `deploy/README.md`,
   `tools/pack/helm/open-design/*`, `clipper/store/LISTING.md`, `figma-plugin/`,
   `clipper/`, `docs/windows-troubleshooting.md`, `docs/install-guide.md`.
3. **Test fixtures** — remaining `open-design.ai` expectations in
   `AssistantMessage.test.tsx` (style-catalog), `ProjectView.*` + `providers/sse`
   (AMR recharge URL), `packages/plugin-runtime`, `packages/sidecar-proto`,
   `tools/pack/tests`, `tools/release/tests`, `e2e/**`. WS12 re-baselines; the
   AMR-specific ones are WS6 residue.
4. **e2e typecheck is red** (pre-existing, WS6 residue):
   `e2e/lib/playwright/amr.ts` and `e2e/ui/entry-chrome-flows.test.ts` import
   `WorkspaceCollabContext` / `WorkspaceDirectoryItem` which no longer exist in
   `@capydesign/contracts`; `e2e/tests/tools-dev/release-channel.test.ts` and
   `scripts/check-whats-new-document.ts` import the deleted
   `apps/daemon/src/services/whats-new.ts`.
5. **The workstream-wide regression fence (TODO)** — no shipped module may contain
   a **default operational** `open-design.ai` / `*.open-design.ai` URL, with an
   explicit allow-list for attribution and changelogs. It cannot land green until
   the residue above is closed.

## Pre-existing failures observed (not WS7)

- `pnpm guard` — red on `scripts/check-attribution-notices.ts` only: two
  `prompt-templates/image/*seedream*.json` declare `source.license 'Original X
  post'`. WS6's close-out names these as WS1/WS8 items and explicitly permits the
  guard to stay red on exactly this.
- desktop `frame-capture` / `loopback-connection-limit` suites (Windows/env),
  daemon `env-and-detection` AMR + binary-resolution cases, daemon `plugins-`
  cluster (32) — all verified identical on a stashed baseline.
