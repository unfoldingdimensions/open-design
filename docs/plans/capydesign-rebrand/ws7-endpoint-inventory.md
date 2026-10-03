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

## Residue — first-draft list, now fully dispositioned

The items below were listed as "still open" in the first draft of this file.
Later commits in this workstream closed every one of them; the disposition and
commit are recorded so the sweep is auditable.

| first-draft item | disposition | commit |
|---|---|---|
| `legacy-bridge.ts` `DEFAULT_AMR_RECHARGE_URL` | dead AMR link removed with the Cloud surface | `a2940f402` |
| `enterpriseUrl.ts` `ENTERPRISE_BASE` | module and enterprise link surface deleted | `a2940f402` |
| `visual-style-catalog.ts` `STYLE_CATALOG_ASSET_ORIGIN` | hosted asset origin removed; catalog is local-only | `a2940f402` |
| `sketch-model.ts` excalidraw `source` | provenance now names the fork repo (nothing fetches it) | `a2940f402` |
| `LibrarySection.tsx` clipper download link | removed (no CapyDesign clipper host) | `a2940f402` |
| `plugin-url.ts` `OPEN_DESIGN_SITE_ORIGIN` + `PluginShareMenu` plumbing | module and share-origin plumbing deleted | `a2940f402` |
| `EntryNavRail` / `runtime.ts` `support@open-design.ai` | support-address surface removed; `isFirstPartyMailtoUrl` rejects every mailto | `a2940f402` |
| HomeHero "Website URL to clone" example (en + zh) | example URL neutralized in both locales | `ea7d8ffcc` |
| stale `nexu-io/open-design` comments in `pluginFolderActions.ts` / `plugins/publish.ts` | corrected to the fork (code already targeted it) | this close-out |
| `tools/release` previews base + `install-dsh.ps1` | **stays for WS11** — release infrastructure, human-supplied origin | — |
| upstream issue refs (`ui-click.ts:938`, `sidecars.ts:291`, web comments) | **attribution — keep** | — |

## Final dispositions — outside app source

1. **`.github` repository metadata** (this close-out): issue-template
   discussion/issue links, `CODEOWNERS` (`@unfoldingdimensions` — no maintainer
   team exists on the fork yet), `CONTRIBUTING.md` (clone/issues/discussions →
   fork; upstream Discord invite removed), `MAINTAINERS.md` (repo refs → fork).
   The `open-design.ai/tutorials` promise was dropped from the tutorial
   template; its upstream-product checkbox label (line 58) is product naming —
   WS8.
2. **Deploy / helm / pack image defaults** (this close-out): every
   `ghcr.io/nexu-io/od` default — `deploy/docker-compose.yml`, `.env.example`,
   `Dockerfile.local`, `scripts/install.sh`, `scripts/publish-images.sh`
   (namespace), `azure/*`, `tools/pack/docker-compose.yml`, helm
   `values.yaml` — now points at `ghcr.io/unfoldingdimensions/od`, the origin
   this repository's own `docker-image.yml` publishes
   (`ghcr.io/${{ github.repository_owner }}/od`). Until the fork's first image
   is published the pull 404s cleanly; it can never silently install
   nexu-io's build. helm `Chart.yaml`: `sources`/`home` → the fork repo;
   `icon` and maintainer `url` removed (no fork site). The helm README
   installs from the checkout instead of the removed `open-design.ai/charts`
   repo.
3. **Docs URL pass** (this close-out): `docs/windows-troubleshooting.md`
   (single download source: fork releases), `docs/install-guide.md` (clone +
   image refs → fork), `clipper/store/LISTING.md` (homepage/source/
   issues/privacy → fork URLs). The Firefox `gecko` id
   `web-clipper@open-design.ai` (LISTING.md:178) deliberately stays — it is an
   extension publishing identity, not a fetched endpoint, and choosing a fork
   id belongs with the actual store submission.
4. **`.github` release-infra identities — deliberately left for WS11**, with
   the reasons recorded in `2eb9f4dbb`: `owner: nexu-io` R2 upload targets in
   the bake/refresh/metrics workflows, the `bot@open-design.ai` committer
   identity, the `nexu-io/core-maintainers` review team in
   `finalize-release`, and `WHATS_NEW_PUBLIC_URL` plus the whats-new publisher
   user-agent. These are the identities WS11 replaces when the human-supplied
   release infrastructure lands.
5. **Sample-data fixtures** quoting the old slug (`handoff.py`,
   `rerun_infra_cancel.py`, `tools/release/tests`, `tools/pack/tests`,
   `e2e/**`) are not live endpoints; WS12 re-baselines the suites. The e2e
   typecheck is red for pre-existing WS6 reasons (imports of deleted
   `WorkspaceCollabContext` / `WorkspaceDirectoryItem` / whats-new service) —
   WS12.
6. **Attribution kept**: `nexu-io/open-design#NNNN` issue references in
   comments, LICENSE / NOTICE / THIRD-PARTY-NOTICES, `docs/CHANGELOG/**`.

## Regression fence

Landed: `apps/web/tests/ws7-no-hosted-endpoints.test.ts` (`83fbb4827`) scans
`apps`/`packages`/`tools` shipped source (comment lines excluded, WS11's two
`tools/release` URLs allow-listed) and asserts zero operational
`*.open-design.ai` defaults.

## Pre-existing failures observed (not WS7)

- `pnpm guard` — red on `scripts/check-attribution-notices.ts` only: two
  `prompt-templates/image/*seedream*.json` declare `source.license 'Original X
  post'`. WS6's close-out names these as WS1/WS8 items and explicitly permits the
  guard to stay red on exactly this.
- desktop `frame-capture` / `loopback-connection-limit` suites (Windows/env),
  daemon `env-and-detection` AMR + binary-resolution cases, daemon `plugins-`
  cluster (32) — all verified identical on a stashed baseline.
