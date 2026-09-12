# WS3 — Product identity: OpenDesign / Open Design → CaptDesign

**Dependencies:** WS2 (font) landed, so this rebase is on a stable tree.
**You own:** every user-visible and identity-bearing **string** in shipped code
and metadata. You do **not** rename package scopes (WS4), the CLI bin (WS5),
Cloud code (WS6), upstream URLs (WS7), or `docs/`/`specs/`/content packs (WS8).

## The rule that governs almost every decision here

Two different strings are in play and they must not be conflated:

- **`OpenDesign` / `Open Design`** — the product's own name. → **CaptDesign**.
- **`Open Design contributors`** and the upstream project reference
  (`nexu-io/open-design`, `github.com/nexu-io/open-design`) — **a real other
  party who wrote this code.** → **never renamed.** Attribution is the whole
  point of WS1.

Before you change a string, ask: *is this the product speaking about itself, or
is this the code crediting its origin?* When it is the latter, leave it and add
it to your report.

## Measured surface (verify, don't trust)

| Area | Files with a hit |
|------|------------------|
| `apps/daemon` | 202 |
| `apps/web` | 273 |
| `apps/desktop` | 17 |
| `apps/packaged` | 19 |
| `packages/contracts` | 33 |
| `packages/release` | 3 |
| `packages/sidecar-proto` | 1 |
| `tools/pack` | 41 |
| `tools/release` | 20 |
| `scripts` | 7 |
| `e2e` | 63 |

`apps/web/src/i18n/locales/` has **19 locale files** and the product name appears
in **all 19**. `apps/web/src/i18n/types.ts` is the typed `Dict`; every key must
exist in all 19. You are only changing **values**, never keys.

## Do this, in this order

### 1. Identity constants first — one place, then every consumer

These are the authoritative product-name sources. Change them and let the
consumers follow:

- `packages/release/src/index.ts:56` — `const PRODUCT_NAME = "Open Design";`
  This one constant feeds `releaseInstallIdentity`, which names the app bundle,
  the executable and the installer title.
- `tools/pack/src/mac/constants.ts:1` and `tools/pack/src/win/constants.ts:1` —
  `export const PRODUCT_NAME = "Open Design";`
- `tools/pack/src/linux.ts:40` — `const PRODUCT_NAME = "Open Design";`
  (also `author: "Open Design Team"` at :542, `synopsis`, `maintainer` at :636-637)
- `apps/packaged/src/window-title.ts:6` — `const DEFAULT_WINDOW_TITLE = "Open Design";`
- `apps/web/app/layout.tsx:10` — `title: 'OpenDesign'`
- `apps/web/src/components/home-hero/PixelScanLogo.tsx:16` —
  `label = 'OpenDesign'` (the wordmark's accessible name)

Prefer **one exported constant consumed everywhere** over ten literals. If a
sensible shared location already exists for the web app's product name, use it;
if not, do not invent a new package for it — a constant in the app it serves is
fine. Say in your report which you chose and why.

### 2. Packaging identity strings

- `tools/pack/src/mac/identity.ts` — derives `installerTitle`, `productName`,
  `publicAppBundleName`, `systemAppBundleName`. The `appId` here is WS4's.
- `tools/pack/src/linux.ts` — `author`, `synopsis`, `maintainer`, and the
  headless-launcher header comment at :1213.
- `tools/pack/src/mac/app.ts:354` and `tools/pack/src/win/app.ts:247` —
  `description: "Open Design packaged runtime"`.
- `tools/pack/src/win/payload.ts:127` — copies `"Open Design.exe"`. **Derive this
  from the identity constant; do not hardcode a second copy of the name.**
- `tools/release/src/metadata/prepare-beta.ts:363`,
  `prepare-stable.ts:592,634` — release names.
- `tools/release/src/notifications/*.ts` — release card and Feishu titles.
- `tools/release/src/storage/dogfood.ts:54` — a comment about a filename
  containing a space. Keep the reasoning, update the example.
- `apps/daemon/src/installation.ts:26-28` — the documented installed-app data
  directories ("Open Design Prerelease"). These are **paths** and they move with
  WS4's namespace; coordinate, do not guess.

### 3. Runtime / CLI / prompt strings

- `apps/daemon/src/cli.ts:450` — `--daemon-url <url>   Override the Open Design daemon HTTP base.`
  and every other help string carrying the product name. There are many; sweep
  the file. The binary *name* is WS5's.
- `apps/daemon/src/prompts/system.ts` (10 occurrences) and
  `packages/contracts/src/prompts/system.ts` (7) — these two are **independent
  prompt implementations behind a rollout switch**.
  **Read `docs/prompt-composition.md` before editing either.**
  `apps/daemon/src/prompts/system.ts:1664` is the Ask-mode paragraph that names
  the product *and* points at `github.com/nexu-io/open-design`,
  `https://open-design.ai/`, and the Discord invite. The product name is yours to
  change here; the URLs are WS7's — change the name, leave the URLs, and list the
  line in your report.
- `packages/contracts/src/prompts/od-next-strategy.ts` and
  `plugins/_official/scenarios/od-next-strategy/assets/*.md` — the OD Next side
  of that switch. **`assets/` files are sent to the model verbatim**; per
  `AGENTS.md`, never write repository-maintenance notes into them. Name
  substitutions only. (`plugins/**` is WS8's for *content* renames, but these
  four asset files are prompt text that must not drift from the TypeScript side —
  fix them here and list them so WS8 skips them.)
- `apps/daemon/src/runtimes/metadata.ts:11` — `installUrl` (a URL, so WS7's — but
  the surrounding label text is yours).

### 4. Web UI strings and i18n

- `apps/web/src/i18n/locales/*.ts` — all 19 files. Change **values only**, and
  only where the value names the product.
- `apps/web/src/i18n/types.ts` — do not add, remove or rename keys. If you think
  a key needs renaming, that is a different change: stop and report it.
- `apps/web/src/components/HomeHero.tsx:2327` — `'open-design.ai': '/logo.svg'`
  is a host→asset map, not a name. Leave the URL (WS7) and check the surrounding
  copy separately.
- `apps/web/src/components/**` — sweep for user-visible copy. Watch for strings
  in comments that explain *why* something is shaped a certain way; update only
  the name inside them, never rewrite the reasoning.
- `apps/web/src/observability/resource-error.ts` — asset basenames used for
  resource-error attribution. If a renamed asset changes there, WS9 must agree;
  coordinate rather than renaming an asset here.

### 5. Comments and docblocks in shipped code

Many of the 6066 hits are comments. Update them, but **preserve the reasoning**.
A comment like:

```
// OpenDesign ships light-only (product removed the theme setting)
```

becomes CaptDesign, and the *why* stays intact. Never delete an explanation to
make a rename easier. If a comment explains a historical decision by upstream,
keep upstream named in it — that is attribution.

## Verification

```bash
pnpm guard
pnpm typecheck
pnpm --filter @open-design/web test
pnpm --filter @open-design/daemon test
```

Then produce the residue report — this is a deliverable, not a formality:

```bash
grep -rn "OpenDesign\|Open Design" --include='*.ts' --include='*.tsx' \
  apps/ packages/ tools/ scripts/ e2e/ | grep -v node_modules | grep -v '/dist/' \
  | grep -v 'Open Design contributors'
```

Every remaining hit must be one of:
(a) an upstream attribution reference you deliberately kept,
(b) a `docs/`/`specs/`/content-pack file owned by WS8,
(c) the exact string `Open Design contributors`,
(d) a historical quote inside a comment that documents upstream behaviour.
Classify each into a/b/c/d in your report with a one-line reason. **A hit you
cannot classify is a bug.**

## Watch out for

- **`scripts/guard.ts` product neutrality** (`scripts/guard.ts:655-730`): it
  blocks *named-orchestrator examples* (naming a specific third-party product as an
  "orchestrator") and terms in
  `OD_PRODUCT_NEUTRALITY_FORBIDDEN_TERMS`, across `apps/daemon/src/`,
  `apps/web/src/`, `docs/`, `craft/`, `design-systems/`, `design-templates/`,
  `skills/`, `packages/contracts/src/`, and every `README|AGENTS|CLAUDE|
  CONTRIBUTING|QUICKSTART`. CaptDesign is the product, not an orchestrator
  example, so it should not fire — but if it does, read that block before
  changing anything and explain what tripped.
- `scripts/guard.ts:1270-1363` refuses hardcoded colors and Tailwind palette
  classes in favour of OpenDesign tokens. Naming, not behaviour — but the error
  text mentions the product name and is worth updating in the same pass.
- Do not let a find/replace touch `CHANGELOG.md` or `docs/CHANGELOG/**`. Ever.

## Report back

- Which authoritative constant you settled on and every consumer you pointed at it.
- The residue report, classified a/b/c/d, with per-class counts.
- The 19-locale check: state that key sets are unchanged and only values moved.
- `pnpm guard` and `pnpm typecheck` output.
- Every WS4/WS5/WS6/WS7/WS8-owned thing you found and left alone, listed by
  `path:line`, so the owner can pick it up without re-discovery.

## Do not

- Do not rename package scopes, the CLI bin, the appId, the namespace, or any URL.
- Do not touch `docs/`, `specs/`, `design-systems/`, `design-templates/`,
  `plugins/` (except the four OD Next asset files named above), `skills/`, `craft/`.
- Do not rename `OD_*` environment variables or `.od` paths.
- Do not rename the `od-focus` / `od-done` / `od-next` artifact marker tags.
- Do not rewrite the CHANGELOG.
- Do not delete a comment to avoid updating it.
