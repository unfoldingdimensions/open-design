# WS4 — Package scope, install identity, and local namespaces

**Dependencies:** WS3 (identity strings). Both edit
`tools/pack/src/mac/constants.ts`; WS3 goes first.
**You own:** the `@open-design/*` workspace scope, the install/updater identity
(`appId`), the release namespace (`captdesign`), the CLI/data directory default
(`.od` → `.captdesign`), and the tests that assert any of it.

## Decisions already taken

- Scope: **`@captdesign/*`** (full rename). 28 `package.json` files, 90 refs.
- `appId`: **`io.captdesign.desktop`** (+ channel suffixes).
- Namespace: **`captdesign`**.
- Default local data dir: **`.captdesign`**.
- **Not renamed:** `OD_*` env vars, `--od-stamp-*` sidecar flags, `od-focus` /
  `od-done` / `od-next` artifact markers, CHANGELOG.

## 1. Workspace package scope — `@open-design/*` → `@captdesign/*`

Files that declare it (28):

```
./package.json                        ./apps/closure/package.json
./apps/daemon/package.json            ./apps/desktop/package.json
./apps/packaged/package.json          ./apps/web/package.json
./e2e/package.json                    ./packages/agui-adapter/package.json
./packages/components/package.json    ./packages/contracts/package.json
./packages/diagnostics/package.json   ./packages/download/package.json
./packages/dsh-runtime/package.json   ./packages/host/package.json
./packages/launcher-proto/package.json ./packages/metatype/package.json
./packages/platform/package.json      ./packages/plugin-runtime/package.json
./packages/registry-protocol/package.json ./packages/release/package.json
./packages/sidecar/package.json       ./packages/sidecar-proto/package.json
./packages/standalone/package.json    ./shells/terminal/package.json
./tools/dev/package.json              ./tools/pack/package.json
./tools/release/package.json          ./tools/serve/package.json
```

Procedure:

1. Change each `name` field **and** every internal `dependencies` /
   `devDependencies` / `peerDependencies` entry that references a sibling
   workspace package (they use `"workspace:*"` versions, so only the key changes).
2. Sweep **every import specifier** across the tree:

   ```bash
   grep -rn "@open-design/" --include='*.ts' --include='*.tsx' --include='*.mjs' --include='*.json' \
     apps/ packages/ tools/ shells/ e2e/ scripts/ | grep -v node_modules | wc -l
   ```

   Expect thousands. Use a scripted, reviewable pass — not a blind
   `sed` over the repo — and then read `git diff --stat` to confirm the blast
   radius is what you expect. **Exclude `node_modules/`, `dist/`, `.next/`,
   `out/`, and any `CHANGELOG*`** from the sweep.
3. Keep `pnpm-workspace.yaml` untouched unless it names the scope (check it).
4. `pnpmfile`/catalog references, `tsconfig.json` `paths` mappings, and any
   `exports` map keys all need the same pass. Grep for the literal string
   `open-design` in root config files and decide each hit.
5. **Then, and only then:**

   ```bash
   pnpm install
   pnpm --filter @captdesign/web typecheck
   ```

   `pnpm install` is mandatory — this is a workspace-link change, and a stale
   link set produces confusing resolution errors that look like code bugs.

## 2. Install / updater identity

- `packages/release/src/index.ts` — `appId` values in the channel descriptors:
  `io.open-design.desktop`, `io.open-design.desktop.prerelease`, and the
  data-defined `io.open-design.desktop.${channel}` template. Also
  `DEFAULT_NAMESPACE = "open-design"` → `"captdesign"`.
- `tools/pack/src/mac/identity.ts:29` — the no-channel default
  `{ appId: "io.open-design.desktop", productName: PRODUCT_NAME }`.
- `tools/pack/src/mac/builder.ts:98`, `tools/pack/src/win/builder.ts:179`,
  `tools/pack/src/linux.ts:591` (`appId: "io.open-design.desktop"`).
- `tools/pack/tests/mac-identity.test.ts:49,61,75,93` — expected identities
  including channel suffixes. Update to the new appId set.
- `apps/packaged/src/config.ts` — namespace resolution and
  `SIDECAR_DEFAULTS.namespace`.
- `packages/sidecar-proto/src/index.ts` — the stamp defaults (`"default"`); the
  `--od-stamp-*` **flag names stay**.

**Consequence you must state in your report:** changing `appId` and the namespace
means an existing CaptDesign-less local install will not be recognised as the
same app. The beta Windows namespace must not become a separate uninstall
registry key while looking like the same product — see `tools/pack/AGENTS.md`
("Packaged auto-update architecture and harness") before you touch
`tools/pack/src/win/`. **Read that section; do not work it out from first
principles.**

The user did **not** ask for backward-compatible installs, so a clean break is
acceptable — but it must be a *stated* break, not a surprise.

## 3. Local data directory `.od` → `.captdesign`

Measured references (treat as a starting list):

- `apps/daemon/src/app-config.ts:187` — falls back to `path.join(projectRoot, '.od')`
- `apps/daemon/src/daemon-paths.ts:135` — same fallback
- `apps/daemon/src/cli.ts:9188` — help text: "file path (under .od/ by default; OD_DATA_DIR overrides)"
- `apps/daemon/src/byok-tools.ts:407` — comment: `<projectRoot>/.od/projects/`
- `apps/daemon/src/connectors/composio-config.ts:14` and
  `apps/daemon/src/connectors/composio.ts:42` — `path.join(process.cwd(), '.od', 'connectors', …)`
- `apps/daemon/src/critique/__fixtures__/run-prerelease.ts:44,51`
- `.gitignore` — the `.od` ignore entry (and `.od-e2e`, `.tmp/`, `e2e/.od-data`)

**The rule that makes this safe:** read from both, write to the new one.

- Introduce one resolver that returns the data dir, and have it prefer
  `.captdesign` when it exists, else fall back to `.od` **read-only** when it
  exists, else default to `.captdesign`. Do not scatter that logic — one helper,
  every caller.
- **Never delete `.od`.** If an import/copy is needed, it must be additive and
  idempotent, and it must be possible to run the old and new dir side by side.
- The user's standing preference is explicit: *keep the existing default and add
  a parallel option — additive, non-destructive, reversible, not a migration.*
  Honour it. If you believe a destructive move is genuinely required, stop and ask
  instead of doing it.
- `OD_DATA_DIR` continues to win over everything and keeps its name.

E2E/test fixtures that hardcode `.od` paths need updating too
(`e2e/.od-data`, `.od-e2e`, `apps/daemon/tests/**`). Grep before you finish.

## 4. Tests

Own these:

- `tools/pack/tests/mac-identity.test.ts` — appId/productName/app-bundle names.
- `apps/daemon/tests/server-paths.test.ts:82` — `'Open Design Beta.app'`.
- `apps/daemon/tests/sidecar/payload-desktop-handoff.test.ts:26-37,228` —
  installed outer bundle and payload executable paths (`Open Design Beta.app`).
- `apps/daemon/tests/user-facing-agent-label.test.ts:10,19` — app-bundle-relative
  CLI paths (`/Applications/Open Design Beta.app/…`).
- `apps/desktop/tests/main/updater/feed.test.ts:31`,
  `apps/desktop/tests/main/updater.test.ts` (many) — `Open Design Beta.exe`,
  `C:\Program Files\Open Design Beta\…`.
- `e2e/lib/vitest/packaged-win-identity.ts` and any e2e identity assertion.

Add a test that asserts the new identity end to end: `releaseInstallIdentity`
produces `io.captdesign.desktop` for stable, the channel suffixes resolve, and
the Windows registry key derives from the new appId. If a helper already exists
that derives the registry key, extend its test rather than adding a parallel one.

## Verification

```bash
pnpm install
pnpm guard
pnpm typecheck
pnpm --filter @captdesign/contracts test
pnpm --filter @captdesign/daemon test
pnpm --filter @captdesign/desktop test
pnpm --filter @captdesign/tools-pack test
```

Plus:

```bash
grep -rn "io\.open-design\.desktop" --include='*.ts' --include='*.json' . | grep -v node_modules | grep -v '/dist/'
grep -rn "@open-design/" --include='package.json' . | grep -v node_modules
grep -rn "'\.od'\|\"\.od\"" --include='*.ts' apps/ packages/ e2e/ | grep -v node_modules | grep -v '/dist/'
```

All three must come back empty (or be explained line by line).

## Report back

- The exact `pnpm install` result and the first `pnpm --filter @captdesign/web typecheck`.
- Whether `pnpm guard` passes; if the product-neutrality check fires, what tripped it.
- Every place the scope sweep touched that surprised you (generated files,
  lockfiles, docs) and what you did about it.
- The `.od` story: the helper you introduced, its precedence order, and proof
  that `.od` is never deleted.
- The stated install-identity break, in one sentence a human can paste into a
  release note.
- What you left for WS5/WS6/WS7/WS8/WS10/WS11, by `path:line`.

## Do not

- Do not rename `OD_*` env vars or `--od-stamp-*` flags.
- Do not delete or migrate away `.od`.
- Do not rename the CLI bin (WS5) or touch Cloud code (WS6).
- Do not sweep `docs/`, `specs/`, content packs, or CHANGELOGs.
- Do not blind-`sed` the repository. Every pass must be reviewable in a diff.
