# WS1 — Attribution ledger and third-party notices

**Dependencies:** WS0.
**You own:** `THIRD-PARTY-NOTICES.md`, `NOTICE`, `scripts/check-attribution-notices.ts`,
`docs/plans/captdesign-rebrand/attribution-inventory.md`, and the root `LICENSE`
header. Nothing else.

## Why this workstream exists

The user's explicit priority: *"really important we give credit to the person
where it matters."* This repository ships **87 license files** across 85
directories plus the root, and most of the interesting credit is currently only
discoverable by opening a `LICENSE` file inside a nested folder. Apache-2.0 §4
requires retaining attribution notices on redistribution; several bundled
components are **CC-BY-4.0**, where attribution is *mandatory and visible*, not
merely retained.

Do not treat this as paperwork. Treat the notices file as a shipped product
surface that a recipient can read to learn who made what.

## Facts you must work from (measured — verify, do not trust blindly)

- Root `LICENSE` is **Apache-2.0**, `Copyright 2026 Open Design contributors`.
  Upstream `nexu-io/open-design` is Apache-2.0.
- **84 of 87** bundled license files are **MIT**; **3** are Apache-2.0
  (`./LICENSE`, `skills/frontend-design/LICENSE.txt`, `skills/hatch-pet/LICENSE.txt`).
- The 87 break down as roughly: 35 `design-templates/`, 32 `skills/`,
  15 `plugins/`, 2 vendored (`apps/desktop/vendor/dom-to-pptx`), 1 root,
  1 `design-templates/last30days/scripts/lib/vendor/bird-search`.
- Distinct copyright holders include, non-exhaustively:
  - `Zara Zhang` (35 `design-templates/html-ppt-zhangzara-*` + 7 `plugins/_official/examples/fs-*` + `frontend-slides`)
  - `alchaincyf (花叔 · 花生)` (11 `plugins/_official/examples/huashu-*`)
  - `lewis <sudolewis@gmail.com>` (6 `plugins/_official/examples/hps-*` + `design-templates/html-ppt`)
  - `Leonxlnx` (13 `skills/*`)
  - `op7418 (歸藏)` (`design-templates/guizang-ppt`)
  - `Matt Pocock` (`skills/emil-design-eng`, `skills/review-animations`)
  - `Vercel Labs` (`skills/web-design-guidelines`, `skills/writing-guidelines`)
  - `Jane (@xiaoerzhan / 小耳)` (`skills/web-clone`)
  - `nicobailon (visual-explainer)` / `Nico Bailon` (`plugins/_official/examples/ve-*`)
  - `Atharva Dharmendra Jagtap and dom-to-pptx contributors` (`apps/desktop/vendor/dom-to-pptx`)
  - `Matt Van Horn` (`design-templates/last30days`), `Peter Steinberger` (its vendored `bird-search`)
  - Codrops effect authors, ported into `plugins/_official/examples/webgl-*`:
    `Houmahani Kane`, `Jan Kohlbach`, `David Faure`, `J0SUKE` — each carrying
    **two** copyright lines (author + port).
  - `Hallmark contributors` (`plugins/community/hallmark`),
    `LearnPrompt` (`plugins/community/humanize-ppt`)
- **`prompt-templates/`** carries per-file `source` blocks: 106 JSON files,
  licenses `CC-BY-4.0` ×72, `Apache-2.0` ×31, `MIT` ×1, and **`"Original X post"` ×2**
  (no grant, unclear terms). Sources include `YouMind-OpenLab/awesome-gpt-image-2`,
  `YouMind-OpenLab/awesome-seedance-2-prompts`, `heygen-com/hyperframes`,
  `nexu-io/open-design`, `joeylee12629-star/open-design`,
  `xiaoTN/zelda-style-image-prompt`, and `x.com` posts. Preview images are
  **hotlinked** from `cms-assets.youmind.com`, not bundled.
- **Fonts:** `apps/web/public/fonts/AlbertSans-VariableFont_wght.ttf` and its
  italic are **SIL OFL 1.1** (`Copyright 2021 The Albert Sans Project Authors`,
  `https://github.com/usted/Albert-Sans`). The embedded name table carries the
  OFL notice in nameID 13 and `https://scripts.sil.org/OFL` in nameID 14: retain
  both. `JiduMonoPro-Regular.otf` is **WS2's problem** — do not inventory it as
  shippable; reference it as removed.
- **Icons:** `apps/web/public/remixicon.ttf` / `.woff2` +
  `apps/web/src/styles/remixicon/remixicon.css` are **Remix Icon License v1.0**
  (`Copyright 2017–2026 Remix Design`). The CSS header at
  `apps/web/src/styles/remixicon/remixicon.css:1-9` carries the notice: retain
  it. Note the license's §3.3 (no use as a logo/brand mark) and §4.2 (brand
  icons carry their owners' trademarks) in the notices file, because CaptDesign's
  new icon must not be derived from an icon in that set.

## Deliverables

### 1. `docs/plans/captdesign-rebrand/attribution-inventory.md`

The machine-generated, complete inventory. Regenerate it, do not hand-write it:

```bash
cd "$(git rev-parse --show-toplevel)"
{
  echo "# Bundled license inventory"
  echo
  echo "Generated $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "| Path | License | Copyright holder |"
  echo "|------|---------|------------------|"
  find . -name 'LICENSE*' -not -path '*/node_modules/*' -not -path './.git/*' -print0 \
    | sort -z \
    | while IFS= read -r -d '' f; do
        lic=$(head -6 "$f" | tr -d '\r' | grep -m1 -iE 'Apache License|MIT License|SIL Open Font|Remix Icon License|CC-BY|Creative Commons' | sed 's/^[[:space:]]*//')
        holder=$(grep -m1 -i 'copyright' "$f" | tr -d '\r' | sed 's/^[[:space:]]*//')
        printf '| `%s` | %s | %s |\n' "$f" "${lic:-—}" "${holder:-—}"
      done
} > docs/plans/captdesign-rebrand/attribution-inventory.md
```

Then hand-audit it: every row whose License or holder cell is `—` needs you to
open the file and fill it in correctly. Do not ship a table with unknowns in it.

### 2. `THIRD-PARTY-NOTICES.md` (repository root)

The recipient-facing document. Structure:

```
# Third-Party Notices

CaptDesign is a derivative work of Open Design
(https://github.com/nexu-io/open-design), Copyright 2026 Open Design
contributors, licensed under the Apache License 2.0. See NOTICE.

CaptDesign's own source is licensed under Apache-2.0 (see LICENSE).
The components below are bundled with CaptDesign and remain under their own
licenses; the copyright in each belongs to the holder named.

## Fonts
## Icons
## Design templates
## Skills
## Plugins
## Vendored code
## Prompt templates
## Design system references          <- see the caveat below
```

Requirements per entry: component name, `path/` in this repository, the license
by name and version, the copyright holder **as written in their own file**, and
the upstream URL where one exists.

Two entries need care:

- **Fonts.** Albert Sans: OFL 1.1, The Albert Sans Project Authors, and state
  that a copy of the OFL must accompany the font if the font file itself is
  redistributed. State plainly that **JiduMono Pro (CoType Foundry) has been
  removed** and is not distributed by CaptDesign.
- **Design system references.** `design-systems/` contains 152 packages, 19 of
  them explicitly real third-party brands (`airbnb`, `apple`, `nike`, `tesla`,
  `meta`, `ferrari`, `starbucks`, `mastercard`, `playstation`, `bmw`, `binance`,
  `coinbase`, `ibm`, `pinterest`, `renault`, `spotify`, `uber`, `bugatti`,
  `bmw-m`). The `DESIGN.md` documents are original analysis and are CaptDesign's
  under Apache-2.0 — **but the brand names, logos and trade dress they describe
  are their owners' trademarks**, and `design-systems/airbnb/components.html`
  renders an `airbnb` wordmark. Write an explicit paragraph: these packages are
  design *references* for internal use as a starting point, they do not grant
  any trademark right, and CaptDesign is not affiliated with or endorsed by any
  of the named brands. Also note the two design-system docs that name
  proprietary typefaces (`design-systems/airbnb/DESIGN.md` — Airbnb Cereal VF;
  `design-systems/ferrari/DESIGN.md` — FerrariSans) and explicitly recommend open
  substitutes rather than shipping the font.

### 3. `NOTICE` (repository root)

Apache-2.0 §4(d) makes this the file a redistributor must carry forward. Keep it
short and factual:

```
CaptDesign
Copyright 2026 CaptDesign contributors

This product is a derivative work of Open Design, Copyright 2026 Open Design
contributors (https://github.com/nexu-io/open-design), and includes
contributions from the Open Design community.

It is licensed under the Apache License, Version 2.0 (LICENSE).

Bundled third-party components remain under their own licenses. See
THIRD-PARTY-NOTICES.md for the complete list, including all MIT, SIL OFL 1.1,
CC-BY-4.0 and Remix Icon License v1.0 components.
```

Adjust the copyright line to the holder the user actually wants on record; if
that is unclear, use `CaptDesign contributors` and flag it in your report.

### 4. `scripts/check-attribution-notices.ts` — the guard that keeps this true

A repo-first TypeScript script, runnable as
`node --experimental-strip-types scripts/check-attribution-notices.ts` (or via
the existing `tsx` dev dependency — match what neighbouring scripts in
`scripts/` do). It must fail with a non-zero exit code when:

- any `LICENSE*` / `LICENSE.txt` file exists under a bundled content directory
  (`design-templates/`, `skills/`, `plugins/`, `apps/desktop/vendor/`) **and**
  is not referenced in `THIRD-PARTY-NOTICES.md`;
- `apps/web/public/fonts/` contains a font file with no OFL notice in the
  notices file (proves the shipped font is licensed);
- `apps/web/public/fonts/JiduMonoPro-Regular.otf` exists at all (the font WS2
  removes must stay removed — this is the regression fence);
- `apps/web/src/styles/remixicon/remixicon.css` exists without a Remix Icon
  mention in the notices;
- a `prompt-templates/**/*.json` file has a `source.license` of
  `"Original X post"` or any value not in an explicit allow-list
  (`Apache-2.0`, `MIT`, `CC-BY-4.0`) — unresolved provenance must be visible,
  not silently shipped;
- `THIRD-PARTY-NOTICES.md` or `NOTICE` is missing from the repository root.

Print one line per failure naming the path and the reason. Print a single
success line and exit 0 when clean.

**Register it in the guard registry.** In `scripts/guard.ts`, add an import and
a `{ name: "attribution notices", run: ... }` entry to the `checks` array
(around `scripts/guard.ts:1521-1554`), matching the shape of the neighbouring
entries. Do not invent a new mechanism — reuse `runGuardChecks`.

### 5. Tests

Add `scripts/`-adjacent tests where the repo's layout expects them (read the
`scripts test-free` guard check at `scripts/guard.ts:1529` first — `scripts/`
may be test-free by policy; if so, put the test in the package that owns the
behaviour, or make the check's logic importable from
`scripts/lib/guard/attribution.ts` and test that from
`packages/contracts/tests/` or an existing guard-test location). Cover:

- a fabricated notices file missing one entry → check fails, names that entry;
- a fabricated tree with `JiduMonoPro-Regular.otf` present → check fails;
- a prompt template with an unlisted license → check fails;
- the real repository → check passes.

## Report back

- The row count of the inventory table and how many `—` rows you had to resolve
  by hand (should be 0 at the end).
- The exact list of components whose license you could **not** determine —
  these are blockers for redistribution and must be named, not buried.
- The command that runs the new check and its real output on this tree.
- Whether `pnpm guard` now includes it (paste the registry line).

## Do not

- Do not modify any bundled content's own `LICENSE` file. Not one byte.
- Do not remove or "clean up" a holder whose name looks redundant.
- Do not touch `apps/web/public/fonts/` — WS2 owns the files; you only write the
  notices that describe them.
- Do not write legal conclusions about whether redistribution is *permitted*.
  You are recording what is there and who owns it. Where a component's terms are
  unclear (the two `"Original X post"` prompt templates are the live example),
  say so plainly and let the human decide.
