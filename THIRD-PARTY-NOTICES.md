# Third-Party Notices

CaptDesign is a derivative work of Open Design
(https://github.com/nexu-io/open-design), Copyright 2026 Open Design
contributors, licensed under the Apache License 2.0. See NOTICE.

CaptDesign's own source is licensed under Apache-2.0 (see LICENSE).
The components below are bundled with CaptDesign and remain under their own
licenses; the copyright in each belongs to the holder named. Where a bundled
`LICENSE` file states the holder, it is quoted verbatim. The machine-readable
inventory of every bundled license file is
`docs/plans/captdesign-rebrand/attribution-inventory.md`; the check
`scripts/check-attribution-notices.ts` (wired into `pnpm guard`) fails if any
bundled license directory below stops being named here.

## Fonts

- **Albert Sans** — `apps/web/public/fonts/AlbertSans-VariableFont_wght.ttf`,
  `apps/web/public/fonts/AlbertSans-Italic-VariableFont_wght.ttf`. SIL Open
  Font License 1.1, Copyright 2021 The Albert Sans Project Authors
  (https://github.com/usted/Albert-Sans). The OFL notice is embedded in the
  fonts' own name tables. A copy of the OFL-1.1 text must accompany the font
  files if they are redistributed on their own; no standalone OFL text file is
  currently bundled in this repository (see
  `docs/plans/captdesign-rebrand/attribution-inventory.md`).
- **JiduMono Pro (CoType Foundry) is not licensed for redistribution.**
  `apps/web/public/fonts/JiduMonoPro-Regular.otf` is a commercial CoType
  Foundry face (Copyright (c) 2020 CoType Foundry. All Rights Reserved) that is
  still present in the working tree and is scheduled for removal (workstream
  WS2). It must not ship in any CaptDesign distribution. The guard check fails
  while the file exists, so its removal cannot regress silently.

## Icons

- **Remix Icon v4.9.1** — `apps/web/public/remixicon.ttf`,
  `apps/web/public/remixicon.woff2`,
  `apps/web/src/styles/remixicon/remixicon.css`. Remix Icon License v1.0,
  Copyright 2017–2026 Remix Design (https://github.com/Remix-Design/RemixIcon;
  https://remixicon.com). The license notice is retained in the CSS header at
  `apps/web/src/styles/remixicon/remixicon.css:1-9`. Note the license's §3.3
  (icons must not be used as a logo or brand mark) and §4.2 (brand icons carry
  their owners' trademarks): CaptDesign's own icon and brand marks must not be
  derived from this set.

## Design templates (MIT unless noted)

- **Zara Zhang**, MIT, Copyright (c) 2026 Zara Zhang,
  upstream https://github.com/zarazhangrui/beautiful-html-templates:
  `design-templates/html-ppt-zhangzara-8-bit-orbit/`,
  `design-templates/html-ppt-zhangzara-biennale-yellow/`,
  `design-templates/html-ppt-zhangzara-block-frame/`,
  `design-templates/html-ppt-zhangzara-blue-professional/`,
  `design-templates/html-ppt-zhangzara-bold-poster/`,
  `design-templates/html-ppt-zhangzara-broadside/`,
  `design-templates/html-ppt-zhangzara-capsule/`,
  `design-templates/html-ppt-zhangzara-cartesian/`,
  `design-templates/html-ppt-zhangzara-cobalt-grid/`,
  `design-templates/html-ppt-zhangzara-coral/`,
  `design-templates/html-ppt-zhangzara-creative-mode/`,
  `design-templates/html-ppt-zhangzara-daisy-days/`,
  `design-templates/html-ppt-zhangzara-editorial-tri-tone/`,
  `design-templates/html-ppt-zhangzara-grove/`,
  `design-templates/html-ppt-zhangzara-long-table/`,
  `design-templates/html-ppt-zhangzara-mat/`,
  `design-templates/html-ppt-zhangzara-monochrome/`,
  `design-templates/html-ppt-zhangzara-neo-grid-bold/`,
  `design-templates/html-ppt-zhangzara-peoples-platform/`,
  `design-templates/html-ppt-zhangzara-pin-and-paper/`,
  `design-templates/html-ppt-zhangzara-pink-script/`,
  `design-templates/html-ppt-zhangzara-playful/`,
  `design-templates/html-ppt-zhangzara-raw-grid/`,
  `design-templates/html-ppt-zhangzara-retro-windows/`,
  `design-templates/html-ppt-zhangzara-retro-zine/`,
  `design-templates/html-ppt-zhangzara-sakura-chroma/`,
  `design-templates/html-ppt-zhangzara-scatterbrain/`,
  `design-templates/html-ppt-zhangzara-signal/`,
  `design-templates/html-ppt-zhangzara-soft-editorial/`,
  `design-templates/html-ppt-zhangzara-stencil-tablet/`,
  `design-templates/html-ppt-zhangzara-studio/`,
  `design-templates/html-ppt-zhangzara-vellum/`.
- **lewis <sudolewis@gmail.com>**, MIT, Copyright (c) 2026 lewis
  <sudolewis@gmail.com>, upstream https://github.com/lewislulu/html-ppt-skill:
  `design-templates/html-ppt/`.
- **op7418 (歸藏)**, MIT, Copyright (c) 2026 op7418 (歸藏),
  upstream https://github.com/op7418/guizang-ppt-skill:
  `design-templates/guizang-ppt/`.
- **Matt Van Horn**, MIT, Copyright (c) 2026 Matt Van Horn,
  upstream https://github.com/mvanhorn/last30days-skill:
  `design-templates/last30days/`.
- **Peter Steinberger** (vendored inside the above), MIT,
  Copyright (c) 2025 Peter Steinberger:
  `design-templates/last30days/scripts/lib/vendor/bird-search/`.

## Skills

- **Leonxlnx**, MIT, Copyright (c) 2026 Leonxlnx,
  upstream https://github.com/Leonxlnx/taste-skill: `skills/brandkit/`,
  `skills/brutalist-skill/`, `skills/gpt-tasteskill/`,
  `skills/image-to-code-skill/`, `skills/imagegen-frontend-mobile/`,
  `skills/imagegen-frontend-web/`, `skills/minimalist-skill/`,
  `skills/output-skill/`, `skills/redesign-skill/`, `skills/soft-skill/`,
  `skills/stitch-skill/`, `skills/taste-skill-v1/`, `skills/taste-skill/`.
- **Matt Pocock**, MIT, Copyright (c) 2026 Matt Pocock,
  upstream https://github.com/emilkowalski/skills: `skills/emil-design-eng/`,
  `skills/review-animations/`.
- **Vercel Labs**, MIT: `skills/web-design-guidelines/`
  (Copyright (c) 2025 Vercel Labs,
  upstream https://github.com/vercel-labs/web-interface-guidelines),
  `skills/writing-guidelines/` (Copyright (c) 2026 Vercel Labs,
  upstream https://github.com/vercel-labs/writing-guidelines).
- **Jane (@xiaoerzhan / 小耳)**, MIT,
  Copyright (c) 2026 Jane (@xiaoerzhan / 小耳): `skills/web-clone/`
  (no upstream pointer recorded in the skill).
- **Anthropic**, Apache-2.0. `skills/frontend-design/` is adapted from
  Anthropic's official skills repository
  (https://github.com/anthropics/skills/tree/main/skills/frontend-design);
  the bundled `skills/frontend-design/LICENSE.txt` carries the Apache-2.0
  terms and names no separate holder.
- **hatch-pet**, Apache-2.0. `skills/hatch-pet/` was vendored from the Codex
  curated tree (`SKILL.md` frontmatter points at
  https://github.com/openai/skills/tree/main/skills/.curated/hatch-pet`, not
  publicly resolvable at vendoring time). Its `skills/hatch-pet/README.md`
  states that the copyright line in the bundled
  `skills/hatch-pet/LICENSE.txt` is deliberately left unfilled because no
  separate copyright holder was identified at vendoring time. No holder is
  claimed here either; see that README for the re-sync procedure.

## Plugins

- **Zara Zhang**, MIT: `plugins/_official/examples/frontend-slides/`,
  `plugins/_official/examples/fs-creative-voltage/`,
  `plugins/_official/examples/fs-electric-studio/`,
  `plugins/_official/examples/fs-notebook-tabs/`
  (Copyright (c) 2025 Zara Zhang,
  upstream https://github.com/zarazhangrui/frontend-slides);
  `plugins/_official/examples/fs-editorial-forest/`,
  `plugins/_official/examples/fs-emerald-editorial/`
  (Copyright (c) 2026 Zara Zhang).
- **alchaincyf (花叔 · 花生)**, MIT,
  Copyright (c) 2026 alchaincyf (花叔 · 花生),
  adapted from https://github.com/alchaincyf/huashu-design:
  `plugins/_official/examples/huashu-annual-letter/`,
  `plugins/_official/examples/huashu-bento-insight/`,
  `plugins/_official/examples/huashu-golden-circle/`,
  `plugins/_official/examples/huashu-keynote-black/`,
  `plugins/_official/examples/huashu-luxe-whitespace/`,
  `plugins/_official/examples/huashu-pentagram-grid/`,
  `plugins/_official/examples/huashu-slides/`,
  `plugins/_official/examples/huashu-sparkline-arc/`,
  `plugins/_official/examples/huashu-takram-soft-tech/`.
- **lewis <sudolewis@gmail.com>**, MIT,
  Copyright (c) 2026 lewis <sudolewis@gmail.com>,
  upstream https://github.com/lewislulu/html-ppt-skill:
  `plugins/_official/examples/hps-academic-paper/`,
  `plugins/_official/examples/hps-bauhaus/`,
  `plugins/_official/examples/hps-memphis-pop/`,
  `plugins/_official/examples/hps-retro-tv/`,
  `plugins/_official/examples/hps-true-blueprint/`,
  `plugins/_official/examples/hps-y2k-chrome/`.
- **nicobailon (visual-explainer)**, MIT,
  Copyright (c) 2025 nicobailon (visual-explainer),
  upstream https://github.com/nicobailon/visual-explainer:
  `plugins/_official/examples/ve-midnight-editorial/`.
- **Nico Bailon**, MIT, Copyright (c) 2025 Nico Bailon,
  upstream https://github.com/nicobailon/visual-explainer:
  `plugins/_official/examples/ve-terminal-mono/`.
- **Codrops effect authors (ported single-file MIT adaptations)** — each
  `LICENSE` names the effect author and the port in one line, quoted here
  verbatim, and points at the declared-MIT original:
  - `plugins/_official/examples/webgl-depth-gallery/`: "Effect © Houmahani
    Kane / Codrops. Ported to a single self-contained file and packaged for
    OpenDesign.", original
    https://github.com/houmahani/codrops-depth-gallery. Sample imagery from
    Lummi.ai (free commercial license).
  - `plugins/_official/examples/webgl-distortion-grain/`: "Effect © Jan
    Kohlbach / Codrops. Ported to a single self-contained file and packaged
    for OpenDesign.", original
    https://github.com/jankohlbach/codrops-shader-on-scroll.
  - `plugins/_official/examples/webgl-horizontal-parallax/`: "Effect © David
    Faure / Codrops. Ported to a single self-contained file and packaged for
    OpenDesign.", original
    https://github.com/davidfaure/horizontal-parallax-gallery-codrops.
  - `plugins/_official/examples/webgl-pixel-reveal-gallery/`: "Effect ©
    J0SUKE / Codrops. Ported to a single self-contained file and packaged for
    OpenDesign.", original https://github.com/J0SUKE/gsap-threejs-codrops.
- **Hallmark contributors**, MIT, Copyright (c) 2026 Hallmark contributors:
  `plugins/community/hallmark/` (no upstream pointer recorded in the plugin).
- **LearnPrompt**, MIT, Copyright (c) 2026 LearnPrompt:
  `plugins/community/humanize-ppt/` (no upstream pointer recorded in the
  plugin).

## Vendored code

- **Atharva Dharmendra Jagtap and dom-to-pptx contributors**, MIT,
  Copyright (c) 2025 Atharva Dharmendra Jagtap and dom-to-pptx contributors,
  upstream https://github.com/atharva9167j/dom-to-pptx:
  `apps/desktop/vendor/dom-to-pptx/`.
- **7-Zip / Igor Pavlov** (Windows packaging resource, LGPL-family).
  `tools/pack/resources/win/7zip/License.txt`, Copyright (C) 1999-2026 Igor
  Pavlov (https://www.7-zip.org): 7z.dll is GNU LGPL (most code) with an
  unRAR license restriction plus BSD 2-clause / 3-clause parts for some code;
  all other files are GNU LGPL. Redistributions in binary form must reproduce
  the license information from that file.

## Prompt templates

`prompt-templates/**/*.json` (106 files) each carry a per-file `source` block
with `repo`, `license`, `author`, and `url`. License mix: CC-BY-4.0 ×72,
Apache-2.0 ×31, MIT ×1. Source collections include
`YouMind-OpenLab/awesome-gpt-image-2`,
`YouMind-OpenLab/awesome-seedance-2-prompts`, `heygen-com/hyperframes`
(https://hyperframes.heygen.com/catalog), `nexu-io/open-design`,
`joeylee12629-star/open-design`, `xiaoTN/zelda-style-image-prompt`, and
individual `x.com` posts. Preview images are hotlinked from
`cms-assets.youmind.com` and are not bundled with the repository.

CC-BY-4.0 attribution is mandatory and visible, not merely retained: each
template's `source.author` + `source.url` is the credit, and redistributions
that strip the `source` blocks violate the license. The full per-file mapping
is enumerable with
`python -c "import json,glob;[print(f,(json.load(open(f))['source']))for f in
glob.glob('prompt-templates/**/*.json',recursive=True)]"`
(or see the counting script in the WS1 report).

Two templates have **unresolved provenance** and are redistribution blockers
until a human clears them (`source.license` is `"Original X post"`, which
grants nothing):

- `prompt-templates/image/profile-avatar-seedream-high-fashion-dreamy-portrait.json`
  (author "BubbleBrain",
  url https://x.com/BubbleBrain/status/2074856963591290979)
- `prompt-templates/image/social-media-post-seedream-squishcraft-kids-clay-ad.json`
  (author "M", url https://x.com/Strength04_X/status/2075063250656621054)

## Design system references

`design-systems/` contains 154 design-reference packages. The `DESIGN.md`
documents are original analysis written for this project and are CaptDesign's
under Apache-2.0 — but 19 of the packages describe real third-party brands
(`design-systems/airbnb/`, `design-systems/apple/`, `design-systems/nike/`,
`design-systems/tesla/`, `design-systems/meta/`, `design-systems/ferrari/`,
`design-systems/starbucks/`, `design-systems/mastercard/`,
`design-systems/playstation/`, `design-systems/bmw/`,
`design-systems/binance/`, `design-systems/coinbase/`, `design-systems/ibm/`,
`design-systems/pinterest/`, `design-systems/renault/`,
`design-systems/spotify/`, `design-systems/uber/`, `design-systems/bugatti/`,
`design-systems/bmw-m/`), and the brand names, logos, and trade dress they
describe are their owners' trademarks. These packages are design *references*
for internal use as a starting point: they grant no trademark right, and
CaptDesign is not affiliated with or endorsed by any of the named brands. For
example `design-systems/airbnb/components.html` renders an `airbnb` wordmark —
do not lift it into CaptDesign's own brand or UI.

Two reference docs name proprietary typefaces that are described, not shipped:
`design-systems/airbnb/DESIGN.md` (Airbnb Cereal VF, with an explicit note
recommending Inter / system fallbacks as substitutes) and
`design-systems/ferrari/DESIGN.md` (FerrariSans, fallbacks Arial/Helvetica).
Neither font file is bundled; follow the substitutes, do not procure or embed
the proprietary faces.
