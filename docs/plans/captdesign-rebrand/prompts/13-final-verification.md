# WS13 — Final verification and the legal pack

**Dependencies:** everything. Run this last, on the merged result.
**You own:** the verification report, the release-blocking checklist, and the
human-readable legal pack. You change no product code — if you find a defect, you
report it (or fix it only if it is a one-line value clearly owned by a named
workstream, and then you say which).

## This is an adversarial review, not a victory lap

Your job is to try to falsify the claim "CaptDesign is a properly rebranded,
properly licensed Apache-2.0 derivative with no Cloud surface and no upstream
dependencies." A verification pass that confirms everything is worthless. Look
for the lie.

## 1. Run the gates, cold

From a **clean checkout** (fresh clone, or `git clean -xdf` on a scratch copy —
not the working tree you have been developing in), so that no stale `dist/`,
`.next/`, `out/`, `node_modules` or build cache can mask a problem:

```bash
pnpm install
pnpm guard
pnpm typecheck
pnpm --filter @captdesign/contracts test
pnpm --filter @captdesign/daemon test
pnpm --filter @captdesign/web test
pnpm --filter @captdesign/e2e test
```

Paste the real output. If a suite is red, this is the headline of your report, not
a footnote.

## 2. The acceptance greps

These are the plan's definition-of-done, restated as commands. Every one must come
back empty or fully classified.

```bash
# a) product name in shipped code, allowing only the attribution exceptions
grep -rn "OpenDesign\|Open Design" --include='*.ts' --include='*.tsx' \
  apps/ packages/ tools/ e2e/ scripts/ | grep -v node_modules | grep -v '/dist/'

# b) the old package scope
grep -rn "@open-design/" --include='package.json' --include='*.ts' --include='*.tsx' \
  apps/ packages/ tools/ shells/ e2e/ | grep -v node_modules | grep -v '/dist/'

# c) the old install identity
grep -rn "io\.open-design\.desktop" --include='*.ts' --include='*.json' . \
  | grep -v node_modules | grep -v '/dist/'

# d) the proprietary font
find . -iname "*Jidu*" -not -path '*/node_modules/*' -not -path './.git/*'

# e) operational upstream endpoints
grep -rn "open-design\.ai" --include='*.ts' --include='*.tsx' --include='*.json' \
  --include='*.yml' apps/ packages/ tools/ e2e/ .github/ | grep -v node_modules | grep -v '/dist/'

# f) the old CLI binary as an invocation
grep -rn "\bod \b" --include='*.md' --include='*.ts' --include='*.tsx' \
  apps/ packages/ tools/ e2e/ docs/ skills/ plugins/ specs/ \
  | grep -v node_modules | grep -v CHANGELOG
```

For each: state the expected residue, the actual residue, and classify every line.
**An unexplained hit is a blocking finding.**

## 3. Verify the artifact, not the source

Build and inspect what a user would actually install:

```bash
pnpm tools-pack <platform> build --to <target>
pnpm tools-pack <platform> install
```

Then extract from the artifact:

- macOS: `Contents/Info.plist` → `CFBundleIdentifier`, `CFBundleName`,
  `CFBundleDisplayName`, `CFBundleExecutable`.
- Windows: the uninstall registry key and `DisplayName`.
- Linux: the `.desktop` file and AppImage metadata.

Assert, with the extracted values quoted:

- identifier is `io.captdesign.desktop` (or the correct channel suffix);
- the display name reads CaptDesign, **not** `@captdesign/desktop` and not
  anything containing `open-design`;
- the window title reads CaptDesign;
- the artifact contains **no** file matching `*Jidu*` and no `.otf` file at all
  (the only shipped fonts are the two Albert Sans `.ttf` files);
- no packaged file references a live `*.open-design.ai` operational endpoint.

The `.otf` check is the specific proof that WS2's license fix reached the shipped
artifact rather than only the source tree.

## 4. Verify the updater fails closed

The single highest-consequence code change in this effort. Prove it:

1. With no release origin configured, confirm the app performs **no** network
   fetch for update metadata. Show the test, and if practical, run it under a
   network-blocked condition and paste the result.
2. Confirm there is no code path that defaults to `releases.open-design.ai`.

A CaptDesign install that silently accepts nexu-io's OpenDesign update is the
worst outcome this project can produce. If you cannot prove this, say so loudly.

## 5. The legal pack

Produce `docs/plans/captdesign-rebrand/LEGAL-READINESS.md`. Contents:

1. **Provenance statement** — CaptDesign is a derivative of Open Design
   (`nexu-io/open-design`), Apache-2.0, Copyright 2026 Open Design contributors,
   with the fork's own modifications stated. Point at `LICENSE` and `NOTICE`.
2. **Distribution checklist** — the mechanical things a distributor must satisfy,
   each with the file that satisfies it:
   - Apache-2.0 `LICENSE` present and unmodified → `LICENSE`
   - `NOTICE` present and carried forward → `NOTICE`
   - modified files marked → state the fork's policy (the repo carries one; check
     `CONTRIBUTING.md` and root `AGENTS.md` for the pattern and describe what this
     fork actually does)
   - third-party notices complete → `THIRD-PARTY-NOTICES.md`, checked by
     `scripts/check-attribution-notices.ts`
   - bundled MIT / Apache-2.0 / OFL / CC-BY-4.0 / Remix Icon License notices
     retained in place → the 87 `LICENSE*` files
3. **`CC-BY-4.0` obligations** — attribution is *required and visible* for the
   prompt templates, not merely retained: **72 of 106** `prompt-templates/**/*.json`
   carry `source.license: "CC-BY-4.0"` (31 are Apache-2.0, 1 MIT, 2 unlisted),
   each with `source.repo` / `source.url` / `source.author`. State where a
   distributor must surface that attribution.
4. **Unresolved provenance** — the two `prompt-templates/**/*.json` files whose
   `source.license` is `"Original X post"`: no clear grant. Name them and state
   that their redistribution status is unresolved.
5. **Trademark position** — a plain paragraph:
   - Apache-2.0 §6 grants no trademark right in "Open Design".
   - CaptDesign is not affiliated with or endorsed by nexu-io or the Open Design
     project, and the notices/README must say so.
   - `design-systems/` contains 19 packages named after real brands
     (`airbnb`, `apple`, `nike`, `tesla`, `meta`, `ferrari`, `starbucks`,
     `mastercard`, `playstation`, `bmw`, `binance`, `coinbase`, `ibm`,
     `pinterest`, `renault`, `spotify`, `uber`, `bugatti`, `bmw-m`). The
     `DESIGN.md` text is original analysis, but the names, any rendered wordmark
     (`design-systems/airbnb/components.html` renders an `airbnb` wordmark) and the
     referenced trade dress belong to their owners. Recommend a stated
     non-affiliation note and no promotional use of those brands.
   - Remix Icon License v1.0 §3.3 / §4.2: no icon from that set may become
     CaptDesign's logo or brand mark. Confirm WS9 honoured it.
6. **Fonts** — Albert Sans is OFL 1.1 (keep the notice when redistributing the
   font file); the commercial JiduMono Pro is removed and not distributed;
   the two Albert Sans `.ttf` files are shipped under their OFL 1.1 terms.
7. **Open legal questions**, numbered, each with why it matters and what would
   close it. At minimum:
   - JiduMono Pro: upstream ships it with no license file. Does the fork's removal
     fully resolve the exposure for a **binary** distribution, including any copy
     already published from this fork? (Removing it going forward does not retract
     a build that already shipped with it.)
   - `"Original X post"` prompt templates: redistributable or not?
   - `design-systems/` brand packages: internal use as a reference vs promotional
     use — where is the line, and does any shipped surface cross it?
   - Rust/Node vendored dependencies: is `.github` — the repo's own build
     configuration — in scope for the "modified files must carry notices" rule, or
     is it tooling?
8. **A stated limitation.** End with this, unambiguously:

   > This document is an engineering inventory produced by reading the
   > repository. It is not legal advice. The JiduMono Pro provenance question and
   > any paid distribution should be reviewed by a qualified lawyer before
   > release.

   Do not soften it. Do not imply the checklist substitutes for counsel.

## 6. Honest completion statement

Close the report with one paragraph answering, plainly:

- Is the rebrand complete? Which parts are done and verified, which are done but
  unverified, and which are not done?
- What is still not true about this repository?
- What would a user of the previous name notice breaking?
- What remains blocked on the human (the visual assets from WS9, the release
  infrastructure values from WS11, the license decision on the unresolved prompt
  templates)?

No hedging, no "mostly complete". Name the gaps.

## Report back

- The cold-run gate output.
- The acceptance-grep table with every line classified.
- The artifact inspection with extracted values quoted.
- The updater fail-closed proof.
- `LEGAL-READINESS.md` path plus its open-questions list.
- The completion statement.

## Do not

- Do not verify in a dirty tree.
- Do not accept a source-level value as proof of an artifact-level fact.
- Do not soften the "not legal advice" limitation.
- Do not report a green suite while a residue grep is unexplained. Reconcile them
  and say which one you trust, and why.
- Do not fix other workstreams' defects beyond a clearly-labelled one-line value.
  Report them.
