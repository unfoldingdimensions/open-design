# WS10 — Local packaged-build hotfix: identity in the actual app bundle

**Dependencies:** WS4 (appId/scope/namespace) landed. Runs before WS11.
**You own:** the remaining places where "Open Design" appears in a **built
artifact** rather than in source constants. Local `pnpm tools-pack` builds must
produce CaptDesign-identified output.

## Why this is a separate workstream

WS4 changes the constants. But the value a user actually sees when they install a
build comes from a chain of places that a constants change does not automatically
reach:

1. **Electron's own product metadata.** `apps/desktop/package.json` has `name:
   "@open-design/desktop"` (WS4) but **no `productName`**. Without one, Electron
   derives the display name from `name`, producing a packaged app called
   something like `@captdesign/desktop` — visibly wrong in the dock, the
   taskbar, the Windows "Apps & features" list and the installer title.
   **Add an explicit `productName: "CaptDesign"`.**
2. **The app-bundle and executable names**, which are derived by
   `tools/pack/src/mac/identity.ts` from `PRODUCT_NAME` and, when a channel is
   set, from `releaseInstallIdentity`. Verify rather than assume: build and read
   the output path.
3. **The Windows uninstall registry key**, derived from the appId +
   `tools/pack/src/win/custom-installer.ts:423,483,991-996` (`registryKey`,
   `DisplayName`, `DisplayVersion`, `InstallLocation`, `UninstallString`,
   `QuietUninstallString`, `DisplayIcon`).

## The Windows trap — read `tools/pack/AGENTS.md` first

Root `AGENTS.md` says, verbatim:

> Windows beta updater validation must use the real beta namespace
> `release-beta-win`; otherwise a local beta-like namespace can create a separate
> uninstall registry key while looking like the same `Open Design Beta` app.

The same failure mode applies to CaptDesign: a local namespace that *looks* like
the real channel but is not produces **two** uninstall entries for what a user
believes is one app. Before editing anything under `tools/pack/src/win/`, read
`tools/pack/AGENTS.md` §"Packaged auto-update architecture and harness" and the
build-cache contract in `tools/pack/CACHE.md`. Do not work it out from first
principles; do not change a build-cache node key.

## Do this

1. Add `productName: "CaptDesign"` to `apps/desktop/package.json`. Check whether
   `apps/packaged/package.json` needs the same — inspect how the packaged entry
   is launched and named before deciding.
2. Sweep the built-artifact naming chain:

   ```bash
   grep -rn "Open Design\|OpenDesign" --include='*.ts' tools/pack/src/ apps/packaged/src/ apps/desktop/src/ | grep -v dist
   ```

   For each hit, decide whether it is a **display string** (fix here) or a
   **constant consumer** (already fixed by WS4 — verify it resolves correctly and
   report if it does not).
3. Fix the hardcoded `"Open Design.exe"` coupling:
   `tools/pack/src/win/payload.ts:127` copies `"Open Design.exe"` into the
   overlay payload root. It must derive from the identity constant, not repeat the
   literal — otherwise a future rename silently produces a payload with no
   executable.
4. Check the launcher/headless naming:
   `tools/pack/src/linux.ts:1213` (`# Open Design headless launcher — namespace:`),
   the `.desktop` file generation, and `apps/packaged/src/headless*.ts`.
5. **Windows: expect the packaging path to need a real Windows host or the
   containerized path.** Per root `AGENTS.md`, Node 24 on Windows compiles
   `better-sqlite3` from source via node-gyp (~2 min, needs VS Build Tools 2022)
   and `electron-builder`/NSIS work is platform-native. If you cannot build on
   this machine, say so and produce the **mac** (or Linux) artifact instead plus a
   written Windows checklist — do not claim a Windows build you did not run.
6. **Actually build and inspect.** This is the deliverable:

   ```bash
   pnpm tools-pack mac build --to appimage   # or the correct --to for this host
   pnpm tools-pack mac install
   pnpm tools-pack mac cleanup
   ```

   Then verify the identity **in the artifact**, not in the source:
   - macOS: read `Contents/Info.plist` from the built (and installed) `.app` —
     assert `CFBundleIdentifier == io.captdesign.desktop`, `CFBundleName` /
     `CFBundleDisplayName` read CaptDesign, and the executable name matches.
   - Linux: read the generated `.desktop` file and the AppImage's embedded
     metadata.
   - Windows (if reachable): read the NSIS-generated registry writes and the
     installed `DisplayName`.

   Paste the actual extracted values into your report. "The constants are right"
   is not evidence that the artifact is right — that gap is the entire reason this
   workstream exists.

7. **Add a test that catches drift.** Where does the repo keep its packaged
   identity tests? `tools/pack/tests/` (e.g. `mac-identity.test.ts`) and
   `e2e/tests/packaged-win-identity.test.ts`. Extend the appropriate one to assert
   the full display chain, so a future rename that misses `productName` fails a
   test instead of shipping a broken installer.

## Verification

```bash
pnpm --filter @captdesign/tools-pack build
pnpm --filter @captdesign/tools-pack test
pnpm guard
pnpm typecheck
```

Plus the artifact inspection above with pasted output.

## Report back

- The `productName` decision and where you set it.
- The built artifact path, and the extracted `CFBundleIdentifier` /
  `CFBundleDisplayName` / executable name (or the platform equivalent) quoted from
  the artifact.
- Whether you could build for each platform, and honestly which you could not.
- The Windows namespace decision you made, citing `tools/pack/AGENTS.md`.
- The test you added or extended, and what it now fails on.
- Every place the display name still leaks — with proof you checked the artifact,
  not the source.

## Do not

- Do not change a build-cache node key (`tools/pack/CACHE.md` governs those).
- Do not invent a namespace that mimics a real release channel.
- Do not claim a platform build you did not run.
- Do not use a source-value assertion as evidence the artifact is correct.
- Do not touch release-pipeline naming (WS11).
