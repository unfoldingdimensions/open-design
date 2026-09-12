# WS7 — Upstream URLs, feeds, and infrastructure

**Dependencies:** WS3 landed. **Serial with WS6** — WS6 runs first; both touch
`apps/daemon/src/server.ts`, `apps/web/src/components/HomeHero.tsx` and the
prompt files.
**You own:** every URL that points at nexu-io's operational infrastructure, the
updater feed, the release origin, hosted content endpoints, `.github`
automation, and shipped link surfaces.

## The distinction that governs everything here

Two kinds of upstream reference exist and they go opposite ways:

- **Operational endpoints** — `releases.open-design.ai`,
  `whatsnew.open-design.ai`, `amr-api.open-design.ai`, `repo-assets.open-design.ai`,
  `download.open-design.ai`, `open-design.ai/marketplace`, `open-design.ai/schemas/*`,
  the Discord invite, download links, hero images, star charts, and every
  `.github` workflow that posts to nexu-io's infrastructure.
  → **remove, or point at CaptDesign.** Never leave a live CaptDesign endpoint
  aimed at another company's production infrastructure.
- **Attribution references to the original project** — the Apache-2.0 `LICENSE`,
  `NOTICE`, `THIRD-PARTY-NOTICES.md`, "derivative work of Open Design
  (github.com/nexu-io/open-design)", upstream PR/issue numbers in code comments,
  `docs/CHANGELOG/**`, historical specs. → **keep, and keep prominent.**

If you cannot tell which one a URL is, stop and ask. Getting this backwards
means either a fork that depends on someone else's servers, or a fork that
erased its own provenance.

## The one hazard you must fix first

`apps/desktop/src/main/updater/config.ts:41`

```ts
const DEFAULT_RELEASE_ORIGIN = "https://releases.open-design.ai";
// :118
function defaultMetadataUrl(channel) {
  return `${DEFAULT_RELEASE_ORIGIN}/${channel}/latest/metadata.json`;
}
```

A CaptDesign build that still reads this feed will happily **fetch and install
nexu-io's OpenDesign over a CaptDesign install**. With WS4's `appId` change this
becomes a worse failure (identity mismatch mid-update), not a safe one.

**Fix it to fail closed.** There must be no default remote feed at all unless the
operator configures one: a CaptDesign build with no configured release origin
must **not check for updates** and must say so clearly (a log line and, if the
UI surfaces it, an explicit "updates not configured" state). Do not repoint it at
a guessed CaptDesign URL — a guessed host that does not exist produces a
different silent failure.

Add a test asserting the no-configuration case performs **no network fetch**.
That test is the fence: it is the difference between "no updates" and "updates
from a stranger".

## Inventory and disposition

### Updater, release and hosted content

| `path:line` | Value | Disposition |
|---|---|---|
| `apps/desktop/src/main/updater/config.ts:41,118` | `releases.open-design.ai` | **fail closed** (above) |
| `packages/release/src/index.ts` + `tools/release/**` | release naming/feeds | WS11 for naming; you own any URL |
| `apps/daemon/src/services/whats-new.ts:31` | `DEFAULT_WHATS_NEW_URL = https://whatsnew.open-design.ai/whats-new.json` | remove the default; the card becomes opt-in via `OD_WHATS_NEW_URL` |
| `apps/daemon/src/routes/whats-new.ts` | hosted doc route | WS6 may delete the module — coordinate; if the route survives, it must have no default URL |
| `apps/daemon/src/routes/attribution.ts:16` | `DEFAULT_ATTRIBUTION_LEDGER_URL = https://download.open-design.ai/api/attribution` | remove |
| `apps/daemon/src/routes/attribution.ts:334` | host allowlist `['open-design.ai','www.open-design.ai','staging.open-design.ai']` | remove the whole allowlist with the feature |
| `apps/packaged/src/download-attribution.ts` | download-attribution observation | WS6 owns the module; you own any URL inside |
| `apps/daemon/src/runtimes/metadata.ts:11` | `installUrl: 'https://open-design.ai/amr'` | remove with the AMR runtime (WS6) |

### Plugin ecosystem endpoints

| `path:line` | Value | Disposition |
|---|---|---|
| `apps/daemon/src/plugins/marketplaces.ts:80,81` | `open-design.ai/marketplace`, `open-design.ai/plugins` | repoint to CaptDesign, or disable the public marketplace with an explicit env override |
| `apps/daemon/src/plugins/plugin-preview-bakes.ts:23` | `repo-assets.open-design.ai/plugin-previews` | disable the default; opt-in env only |
| `apps/daemon/src/plugins/export.ts:179`, `scaffold.ts:102`, `skill-candidates.ts:359` | `$schema: https://open-design.ai/schemas/plugin.v1.json` | **careful**: this is written into generated plugin manifests. Either host the schema under CaptDesign and bump a schema version, or drop the `$schema` key — do not point generated files at a third party's schema without saying so |
| `apps/daemon/src/plugins/publish.ts:285` | generated doc link to `open-design.ai/docs/plugins-spec.md` | point at the in-repo doc |
| `packages/contracts/src/plugins/plugin-url.ts` | `OPEN_DESIGN_SITE_ORIGIN = 'https://open-design.ai'` | this is the single source of truth for shareable plugin links. Repoint to CaptDesign, or make it required-config, and update `apps/web/src/components/plugin-details/PluginShareMenu.tsx` |
| `packages/contracts/tests/plugin-url.test.ts` | expectations | update with the constant |

### Web surfaces

| `path:line` | Value | Disposition |
|---|---|---|
| `apps/web/src/first-party-external-link.ts:1` | `FIRST_PARTY_HOSTS = open-design.ai, www…, staging…` | this decides which links open in the OS browser. Repoint to CaptDesign's domain, or make it empty and let the browser handle links — decide explicitly |
| `apps/web/src/components/HomeHero.tsx:2327` | `'open-design.ai': '/logo.svg'` | favicon host map; repoint or remove |
| `apps/web/src/components/EnterpriseUrl.tsx` / `enterpriseUrl.ts` | enterprise host handling | audit for upstream hosts |
| `apps/web/src/campaigns/go-plan.ts` | campaign URLs | remove with the campaigns (WS6) |
| `apps/web/src/runtime/visual-style-catalog.ts`, `sketch-model.ts` | any `open-design.ai` asset refs | audit |
| `apps/daemon/src/prompts/system.ts:1664` and `packages/contracts/src/prompts/system.ts` | Ask-mode paragraph: GitHub, website, **Discord invite** | **read `docs/prompt-composition.md` first.** Replace with CaptDesign's own links, or remove the links and keep the sentence |
| `plugins/_official/scenarios/od-next-strategy/assets/*.md` | OD Next prompt text | same switch; keep both sides consistent |
| `apps/daemon/src/server.ts:3586` | `publisher: { id: 'open-design', url: 'https://open-design.ai' }` | repoint or remove |
| `apps/web/src/components/ConnectorLogo.tsx`, `support-brand-icons.tsx` | third-party brand icons (Discord/Feishu) | **not yours** — these are other companies' marks, used to link to them. Leave |

### Repository metadata and shipped docs (URLs only)

- `package.json` — `repository`, `homepage`, `bugs`, `author` fields.
- `README.md` — badges, hero `<img>` from `repo-assets.open-design.ai`, Website /
  Download / Cloud links, star-history chart, macOS/Windows download links,
  coding-agents image, Discord. Plus **13 `docs/i18n/README.*.md`** translations
  carrying the same links.
- `.github/ISSUE_TEMPLATE/*`, `.github/pull_request_template.md`,
  `CONTRIBUTING.md`, `MAINTAINERS.md`, `SECURITY`-type files if present — links to
  upstream Discussions/Discord/issue trackers.
- `deploy/README.md`, `tools/pack/helm/open-design/README.md`,
  `clipper/store/LISTING.md`, `docs/windows-troubleshooting.md`,
  `docs/install-guide.md`.
- `figma-plugin/`, `clipper/` — store listing URLs and manifest homepage fields.

Prose in these files is WS8's. **You own the URLs.** Where a file needs both, do
the URL pass and list the file so WS8 knows not to re-edit the URL.

### `.github` automation

Workflows that reach nexu-io infrastructure — audit each and either repoint,
remove, or leave with a stated reason:

```
.github/workflows/metrics.yml                    .github/workflows/refresh-contributors-wall.yml
.github/workflows/refresh-plugin-popularity.yml  .github/workflows/release-beta.yml
.github/workflows/release-stable.yml             .github/workflows/whats-new-publish.yml
.github/workflows/bake-plugin-previews.yml       .github/workflows/bake-plugin-previews-release.yml
.github/workflows/e2e-coverage-reminder.yml      .github/workflows/docker-image.yml
.github/scripts/publish_whats_new.py             .github/scripts/release/publish-platform.ps1
.github/scripts/agent-pr-explore-sandbox.sh
```

Read `.github/AGENTS.md` **before** editing anything under `.github/` — it owns
the two-layer workflow architecture and the handoff-artifact contract, and it
forbids adding business-named follow-on workflows. Do not restructure CI; only
remove or repoint upstream endpoints.

Also check `.github/config/scopes.json` and `.github/scripts/scopes.py` for path
rules naming upstream surfaces.

## Tests

- Add the fail-closed updater test described above.
- Add or extend a test asserting no shipped module contains a default URL pointing
  at `open-design.ai` / `*.open-design.ai` **as an operational endpoint**, with an
  explicit allow-list for attribution references and changelogs. This is the
  regression fence for the whole workstream.
- Update `packages/contracts/tests/plugin-url.test.ts`, and any test asserting the
  whats-new or attribution defaults.

## Verification

```bash
pnpm guard
pnpm typecheck
pnpm --filter @captdesign/contracts test
pnpm --filter @captdesign/daemon test
pnpm --filter @captdesign/desktop test

grep -rn "open-design\.ai\|nexu-io" --include='*.ts' --include='*.tsx' --include='*.json' \
  --include='*.yml' --include='*.yaml' apps/ packages/ tools/ e2e/ .github/ \
  | grep -v node_modules | grep -v '/dist/'
```

Classify **every** remaining hit as `attribution` (kept, correct) or `endpoint`
(must be zero).

## Report back

- The exact change to the updater default, and the test proving no fetch happens
  without configuration. Quote the test.
- Every endpoint repointed, disabled, or removed — with the decision you made where
  the prompt gave you a choice (marketplace, `$schema`, first-party hosts,
  `OPEN_DESIGN_SITE_ORIGIN`).
- Every attribution reference you **kept**, so the human can see provenance
  survived the sweep.
- The `.github` disposition list, with a stated reason per workflow.
- The final classification of the grep.

## Do not

- Do not repoint the updater at a host that does not exist. Fail closed.
- Do not delete the Apache-2.0 `LICENSE`, `NOTICE`, upstream credit, or
  `docs/CHANGELOG/**`.
- Do not edit prose beyond the URL in a file (WS8 owns naming).
- Do not restructure `.github` workflows. Read `.github/AGENTS.md` first.
- Do not change `OD_*` env var names.
