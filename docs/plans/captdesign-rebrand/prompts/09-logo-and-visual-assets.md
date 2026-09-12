# WS9 — Logo, icon, and visual brand assets

**Dependencies:** WS3 (identity) landed. **This workstream is BLOCKED on a human
supplying the actual artwork** — see "What you need from the human" below.
**You own:** `apps/web/public/*logo*`, `app-icon.*`, `brand-icon.svg`,
`avatar.png`, `drafts-empty-mark.png`, `official_badge.svg`,
`startup-animation.webm`, the splash video module, the icon wiring in
`tools/pack`, `clipper/` and `figma-plugin/` store assets.

## Read this first

Every asset below is **OpenDesign's own branding** — its marks. Apache-2.0 §6:

> This License does not grant permission to use the trade names, trademarks,
> service marks, or product names of the Licensor, except as required for
> describing the origin of the Work and reproducing the content of the NOTICE
> file.

So a CaptDesign build cannot ship OpenDesign's logo, glyph, wordmark, app icon,
or splash. This is the one part of the rebrand that **cannot be done by editing
code** — it needs artwork that does not exist yet.

## What you need from the human

Do not invent a logo and do not claim one was supplied. Ask for, and wait on:

1. **A new brand glyph / mark** (SVG, monochrome-capable, `currentColor`-safe).
2. **A wordmark** for "CaptDesign" (SVG). Note the current hero wordmark is
   animated by a WebGL pixel-scan engine that samples an SVG's alpha channel — a
   replacement must have a clean, high-contrast silhouette or the effect will
   look muddy.
3. **An app icon** at the sizes `tools/pack` expects, plus a 512×512+ PNG.
4. **A splash animation** (or an explicit decision to ship none and use a static
   splash).
5. **Confirm the accent color** — the app ships light-only with an accent
   variable mix; a new brand color changes `accentVars()` and the theme-color
   meta.

Until those arrive: **stop after producing the inventory and the swap plan.**
Do not delete the existing assets (that breaks every build and every test), and
do not leave a half-swapped tree.

## The inventory (measured)

| Asset | Size | Role | Consumed by |
|---|---|---|---|
| `apps/web/public/logo.svg` | 983 B | brand glyph | `home-logo-assets.test.ts`, `HomeHero` |
| `apps/web/public/logo-03.svg` | 11,049 B | full logotype (hero header) | `home-logo-assets.test.ts` |
| `apps/web/public/logo-scan.svg` | 11,047 B | pixel-scan source (alpha mask) | `home-hero/pixel-scan/engine.ts:185` (`LOGO_SRC`) |
| `apps/web/public/logo-tiles.svg` | 11,047 B | tile variant | styles |
| `apps/web/public/logo-mark.svg` | 1,222 B | compact mark | styles |
| `apps/web/public/logo.png` | 20,564 B | raster logo | misc |
| `apps/web/public/brand-icon.svg` | 988 B | monochrome mask (`currentColor`) | `styles/primitives.css:391-398` |
| `apps/web/public/app-icon.svg` / `.png` | 5,015 B / 77,017 B | app icon | `apps/web/app/layout.tsx:12-13` (favicon + apple), `apps/desktop/src/main/runtime.ts:1563`, `tools/pack` mac icon |
| `apps/web/public/avatar.png` | 187,684 B | default avatar | UI |
| `apps/web/public/drafts-empty-mark.png` | 37,335 B | empty-state mark | UI |
| `apps/web/public/official_badge.svg` | 3,103 B | "official" badge | plugin/marketplace UI |
| `apps/web/public/startup-animation.webm` | 230,695 B | splash master | `apps/desktop/src/main/splash-video.ts` (inlined as base64) |
| `clipper/store/assets/store-logo-300.png` | — | browser-extension store listing | clipper store |
| `docs/assets/logo.png` | — | docs branding | README/docs |

## Constraints you must honour

1. **`home-logo-assets.test.ts` is a real contract, not a formality.** It reads
   `logo.svg`, `brand-icon.svg`, `logo-03.svg` and `logo-scan.svg` and asserts:
   - both `logo.svg` and `brand-icon.svg` contain the current glyph path prefix
     `M41 0.726562`;
   - neither contains the retired glyph markers
     (`#202020`, `M212.059`, `width="444"`);
   - `brand-icon.svg` contains `currentColor` (it is used as a CSS `mask`, so a
     baked-in color breaks theming);
   - `HomeHero.tsx` mounts `<PixelScanLogo` and does **not** contain
     `src="/logo-03.svg"` or `src="/app-icon.svg"`;
   - `EntryNavRail.tsx` does not fall back to the raster `app-icon.png`.

   When the new mark arrives, update `CURRENT_GLYPH_PATH_PREFIX` to the new
   silhouette's actual first path command — **read it out of the file, do not
   guess** — and keep the retired-marker assertion, adding the *OpenDesign* glyph
   markers to the retired list so the old mark cannot return through an upstream
   merge. That last point is the whole reason this test exists; extend it, do not
   weaken it.

2. **`app-icon.svg` is referenced by an observability allow-list**:
   `apps/web/src/observability/resource-error.ts:48-60` enumerates asset
   basenames (`app-icon.png`, `app-icon.svg`, `brand-icon.svg`, `logo-03.svg`,
   `logo-mark.svg`, `logo-scan.svg`, `logo-tiles.svg`, `logo.svg`,
   `startup-animation.webm`). If you rename a file, update that list in the same
   commit or resource errors get misattributed.

3. **`startup-animation.webm` is inlined, not fetched.** `apps/desktop/src/main/splash-video.ts`
   is **auto-generated** and carries a long comment explaining that the clip is
   embedded as a base64 `data:` URL because the splash window shows before any
   HTTP server exists, that it is transparent VP9 (`alpha_mode=1`), that the
   window background `#f2f4f5` shows through, and that a replacement must
   preserve the alpha channel. Its provenance comment states it was re-cut with
   the wordmark capitalised (was "Open design"). **If the human supplies a
   replacement, regenerate via the documented path — re-cut the master, base64
   the WebM without line wraps, keep the MIME in sync, keep the alpha, keep the
   window background matching.** If they ship no animation, remove the module and
   its use in `runtime.ts:41,1023` and give the splash a static state; note that
   the splash is shown before the daemon boots, so a static fallback must not
   depend on the web server either.

4. **Packaged-app icon wiring**: `tools/pack/src/mac/builder.ts:109-156` passes
   `icon: macResources.icon` at three sites (app, installer, dmg). Windows and
   Linux have their own icon inputs. A new icon must be supplied at the platform
   sizes those builders expect — check each builder, do not assume one file.

5. **Chromium extension + Figma plugin**: `clipper/manifest.json`,
   `clipper/store/assets/store-logo-300.png`, `clipper/store/LISTING.md`,
   `figma-plugin/manifest.json`. Store listings are public artifacts; the clipper
   source files also carry the product name in comments (`clipper/background.js:1`,
   `brand-capture.js:1`, `capture.js:1`, `content.js:1,7,36,827`) — those are
   prose, and WS8 owns prose, but the store assets are yours.

6. **Do not source a new mark from Remix Icon.** Its license (§3.3) forbids using
   its icons as a logo, brand identifier, or primary visual identity, and §4.2
   says brand icons carry their owners' trademarks. Using an icon from
   `apps/web/src/components/remix-icon-paths.ts` as CaptDesign's app icon is a
   license violation. State this in your report if anyone suggests it.

7. **Style policy**: `scripts/guard.ts` rejects hardcoded UI colors in favour of
   tokens, and the app ships **light-only** with an accent-variable mix that must
   stay in sync with `accentVars()` in `apps/web/app/layout.tsx`. Any new accent
   color must be introduced as tokens, not literals, or `pnpm guard` fails.

## Deliverables

1. `docs/plans/captdesign-rebrand/visual-asset-swap-plan.md` — the inventory
   above, extended with: for each asset, the exact replacement step, the
   consumers that must be updated, the test that will fail if you get it wrong,
   and the platform sizes required. Include the list of artwork you are waiting
   on.
2. The swap itself, **once the artwork exists**.
3. Updated `home-logo-assets.test.ts` asserting the new mark's real path prefix
   and listing the OpenDesign glyph as retired.
4. A hand-verification note: this is a **visual** change. Green tests are not
   acceptance. Produce a before/after the human can look at — the splash, the
   hero, the app icon in the dock/taskbar, and the favicon — using
   `pnpm tools-dev` and, if desktop is in scope,
   `pnpm tools-dev inspect desktop screenshot --path /tmp/captdesign-splash.png`
   and `inspect desktop eval` per the root `AGENTS.md` validation guidance.

## Report back

- Whether the artwork arrived. If not, say so plainly and stop — this is the
  expected state until the human delivers.
- The swap plan and the exact list of what you are blocked on.
- If artwork did arrive: every consumer updated, the new glyph path prefix you
  read from the file, and the screenshots for human review.
- Anything you discovered that makes a swap unsafe (a hardcoded size, a baked
  color, an effect that needs a specific silhouette).

## Do not

- Do not invent, generate, or AI-synthesize a logo.
- Do not delete the existing assets before replacements exist.
- Do not derive a mark from Remix Icon or any other bundled icon set.
- Do not weaken `home-logo-assets.test.ts`. Extend it.
- Do not hand-edit `splash-video.ts`'s base64 by hand — regenerate it.
- Do not add hardcoded colors; use tokens or `pnpm guard` will fail you.
