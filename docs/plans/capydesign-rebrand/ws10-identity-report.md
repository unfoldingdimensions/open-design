# WS10 — packaged-build identity report

Status: **complete** (Windows artifact built and inspected on this host; mac/linux
covered by constant-level verification + the drift test, honestly not built).
Branch: `rebrand/ws10-pack-hotfix-identity` off post-WS8 `main`.

## productName decision

- `apps/desktop/package.json`: added `"productName": "CapyDesign"`. Without it
  Electron derives the display name from `name` (`@capydesign/desktop`) in any
  path that does not go through tools-pack's builder config (dev mode, bare
  electron runs).
- `apps/packaged/package.json`: **no productName added, deliberately.** The
  packaged outer is not an electron-builder project root — `tools/pack`
  prebundles `apps/packaged/dist/index.mjs` into the app built from the
  desktop project (builders pass `productName: PRODUCT_NAME` programmatically),
  and `apps/packaged/src/window-title.ts` already derives the visible title
  from `releaseInstallIdentity(channel).productName`. There is no second
  packing path that would read its package.json name.

## Identity chain audit (source)

The prompt's sweep grep returns **zero** `Open Design|OpenDesign` hits in
`tools/pack/src/`, `apps/packaged/src/`, `apps/desktop/src/` — the chain is
fully constant-driven:

- `PRODUCT_NAME = "CapyDesign"` in `tools/pack/src/{win,mac}/constants.ts` and
  `linux.ts`; `OPEN_DESIGN_PRODUCT_NAME = "CapyDesign"` in sidecar-proto
  (registry keys); `packages/release` channel identities → "CapyDesign",
  "CapyDesign Beta/Prerelease/Preview".
- The prompt's `payload.ts:127` hardcode is already gone — the payload copies
  `WIN_EXECUTABLE_NAME` from constants.
- `linux.ts` headless launcher comment and `apps/packaged/src/headless-runtime.ts`
  output already read CapyDesign.

## Artifact evidence (Windows NSIS, built here)

`pnpm tools-pack win build --to nsis` (namespace `capydesign`), ~21 min all
phases green. Extracted from the artifacts, not the source:

- Unpacked executable: `.tmp/tools-pack/out/win/namespaces/capydesign/builder/win-unpacked/CapyDesign.exe`
- Installer: `builder/CapyDesign-capydesign-setup.exe` (+ `latest.yml` url)
- Rendered `installer/installer.nsi`:
  - `Name "CapyDesign"`
  - `WriteRegStr HKCU "Software\...\Uninstall\CapyDesign-capydesign" "DisplayName" "CapyDesign"`
  - `DisplayIcon "$INSTDIR\CapyDesign.exe,0"`, `UninstallString '"$INSTDIR\Uninstall CapyDesign.exe" …'`
  - App Paths: `...\App Paths\CapyDesign.exe`
  - invite protocol key `Software\Classes\opendesign` — the kept `od://`
    contract namespace, unchanged by design.

Not built: macOS and Linux artifacts (this host is Windows). Their identity
chains resolve through the same `PRODUCT_NAME` constants
(`mac/identity.ts` → `io.capydesign.desktop` + `CapyDesign.app`;
`linux.ts` → `CapyDesign` / `CapyDesign-<namespace>.AppImage`), covered by the
existing `tools/pack/tests/mac-identity.test.ts` and the new drift pin, but no
mac/linux artifact was produced here — per the prompt, stated rather than
claimed.

## Drift test added

`e2e/tests/packaged-win-identity.test.ts` — new pin: `apps/desktop/package.json`
`productName` must equal `"CapyDesign"`, must equal the resolver's canonical
`default`-namespace displayName, and must appear as `PRODUCT_NAME` in both
`tools/pack/src/{win,mac}/constants.ts`. A future rename that updates the
builders but misses the app-level field now fails this test. File passes
5/5 (`vitest run tests/packaged-win-identity.test.ts`).

## Windows namespace decision

No release-channel namespace was used. The build used the local default
namespace `capydesign` → registry key `CapyDesign-capydesign`, which per
`tools/pack/AGENTS.md` §"Channel identity rules" is a developer
multi-instance validation convention, distinct from `release-*-win` channel
keys. No install was performed; all evidence is read from the build output.

## Collateral residue fixed in this pass

`tools/pack/AGENTS.md` (never in a WS8 slice's file list): product tokens,
uninstall-key examples, and the `%APPDATA%\Open Design` path renamed; the
updater-feed line rewritten to the WS7 fail-closed reality; the whats-new line
rewritten to the opt-in reality; the release-origin curl examples placeholdered
(`releases.open-design.ai`, `s3.nexu.space` — WS11 supplies real origins).
Root `AGENTS.md` L240-241: two-word `Open Design` channel-identity forms missed
by slice 1's single-token sweep. Nested `AGENTS.md` files swept clean
(`apps/closure`, `apps/daemon` — the daemon file's Vela bullet describes files
WS6 deleted; token renamed, section flagged). Translated CONTRIBUTING/MAINTAINERS
docs got the URL/slug passes their English files received in WS7 (`nexu-io` →
fork, ghcr image, bare backticked slugs); `docs/deployment/workspace-team-rollout.md`
and `docs/whats-new.md` repo refs repointed, hosted origins placeholdered (WS11);
`docs/deepseek-harness-one-click-install.zh-CN.md` DSH bootstrap URLs classified
WS11-deferred (same allowlist class as the WS7 fence).

## Verification

- `pnpm --filter @capydesign/tools-pack build` — fresh dist (freshness guard
  had refused the first build attempt; this build satisfies it).
- `pnpm --filter @capydesign/tools-pack test` — 300 passed / 9 failed / 5
  skipped; **stash-baseline proven identical without my diff** (4 files:
  `node-pty-runtime` macOS-prebuild on Windows env, `release-workflows` ×4
  asserting pre-WS6/WS7 workflow content — WS11/WS12 scope, NSIS-in-test env
  failures).
- `pnpm guard` — exit 1, documented seedream notices only.
- e2e `tsc` — exactly the seven documented pre-WS12 errors; my test adds none.
- Artifact inspection quoted above.
