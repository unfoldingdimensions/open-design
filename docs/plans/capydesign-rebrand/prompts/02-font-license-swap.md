# WS2 — Font license swap: remove JiduMono Pro, collapse to Albert Sans

**Dependencies:** WS0 (baseline). WS1 writes the notices that describe your
result, so land this first and tell WS1 what you shipped.
**You own:** `apps/web/public/fonts/**`, the font `@font-face` blocks, the `--mono`
token, every consumer that names the old family, the affected tests.

## Why

`apps/web/public/fonts/JiduMonoPro-Regular.otf` is a **commercial** font from
CoType Foundry. Its embedded name table reads, verbatim:

```
nameID 0  (Copyright):    Copyright (c) 2020 CoType Foundry. All Rights Reserved.
nameID 8  (Manufacturer): CoType Foundry
nameID 9  (Designer):     Mark Bloom
nameID 11 (Vendor URL):   www.cotypefoundry.com
nameID 14 (License URL):  www.cotypefoundry.com/eula
```

It ships in an Apache-2.0 repository with **no license file beside it** and no
mention in the README's attribution section. Apache-2.0 cannot relicense it.
Upstream may hold a license; nothing in this repository transfers one to a
redistributor. `md5 207e55ed70d71a2deb9c6516f75c2d4a` — byte-identical to what
upstream ships.

**Do not resolve this by adding a license file or an attribution note.** The font
must not be distributed.

## The replacement: Albert Sans, which the repo already ships

The human's decision: **switch to Albert Sans.** Do **not** add a third font
family. Do **not** download a substitute. `apps/web/public/fonts/` should contain
exactly the two Albert Sans files it already has when you are done:

```
AlbertSans-VariableFont_wght.ttf          (SIL OFL 1.1, variable 100-900)
AlbertSans-Italic-VariableFont_wght.ttf   (SIL OFL 1.1, variable 100-900)
```

Both are already licensed OFL 1.1 (`Copyright 2021 The Albert Sans Project
Authors`, `https://github.com/usted/Albert-Sans`), and the embedded name table
carries the OFL notice in nameID 13 and `https://scripts.sil.org/OFL` in nameID
14 — retain both. Nothing needs to be fetched or added; this is a **deletion plus
a token collapse**, and that is the whole point of the choice.

## What you must tell the human, and why it is not optional

Albert Sans is a **proportional** face. It is not a monospace, and it has **no
tabular-figure feature**. Measured from the shipped variable font
(`unitsPerEm 1000`, `numGlyphs 405`, `GSUB` features present:
`aalt, ccmp, frac, liga, locl, ordn, ss01-ss05, sups`):

| Glyph | Advance (units/1000) |
|---|---|
| `1` | **306** |
| `7` | 556 |
| `9` | 599 |
| `3` | 599 |
| `6` | 599 |
| `2` | 601 |
| `5` | 624 |
| `0` | 629 |
| `8` | 632 |
| `4` | **655** |

A 2.1× spread between `1` and `4`. `tnum` is **absent** from `GSUB`, so
`font-variant-numeric: tabular-nums` is a **no-op** — the browser has no tabular
figures to switch to and will fall back to the proportional ones.

Consequence: everywhere the mono face currently aligns **timings, file paths, hex
values, line/column numbers and diff counts**, those will now jitter in width, and
a changing digit (a running timer, a live line count) will make the surrounding
text visibly shift. This is the cost of the decision and it is **accepted** — but
it must appear in your report as a known regression, and in the PR body, so nobody
discovers it as a bug later. If the human wants alignment back, the only real fix
is a monospace or a tabular-figure face, which this decision explicitly declines.

## Do this

1. **Record the evidence first.** Compute and save the MD5/SHA-256 of the file you
   are deleting, and capture the name-table fields quoted above, so the removal is
   documented in your report.

2. **Delete the font and its `@font-face`:**

   ```bash
   git rm apps/web/public/fonts/JiduMonoPro-Regular.otf
   ```

   Remove the whole `@font-face { font-family: "JiduMono Pro"; … }` block in
   `apps/web/src/styles/base.css` (around lines 31-39) **and** the long comment
   above it (lines ~21-30) that explains the 400-vs-500 descriptor reasoning. That
   comment documents a face that no longer exists; keeping it would be worse than
   removing it. If any of its reasoning still applies to the new state, restate
   the surviving part in one short comment.

3. **Point `--mono` at a system stack.** `apps/web/src/styles/tokens.css:172`:

   ```
   --mono: "JiduMono Pro", ui-monospace, "SFMono-Regular", monospace;
   ```

   becomes a pure system-monospace stack (`ui-monospace, "SFMono-Regular", Menlo,
   Consolas, monospace`). **Do not point it at Albert Sans.** `--mono` names a
   semantic role — "positions where alignment matters" — and every call site uses
   the variable, not the family. Keeping `--mono` as a real monospace stack
   preserves the semantic seam and confines the change to one line; if the human
   later wants Albert Sans in those slots too, it is then a one-line decision
   rather than a hunt. Say this explicitly in your report so they can flip it.

   Also remove `JiduMono Pro` from the two fallback lists at
   `apps/web/src/styles/viewer/memory.css:808,898` and from the binding comment at
   `apps/web/src/components/chat/ChatRoot.module.css:197-198`.

4. **Sweep every remaining reference** to the old family. Measured call sites —
   treat as a starting list, then grep to be sure:

   | File | What |
   |------|------|
   | `apps/web/src/styles/base.css:31-39` | the `@font-face` block |
   | `apps/web/src/styles/tokens.css:172` | `--mono` |
   | `apps/web/src/styles/viewer/memory.css:808,898` | fallback lists |
   | `apps/web/src/components/chat/ChatRoot.module.css:197-198` | comment binding this to `base.css` |
   | `apps/web/tests/components/chat/question-form-latest-spec-drift.test.tsx:139` | `const MONO` |
   | `apps/web/tests/components/chat/queue-draft-alignment.test.tsx:84` | `mono:` expectation |
   | `apps/web/tests/components/chat/record-progress-ink-latest-spec.test.tsx:85` | `DESIGN_MONO` |
   | `apps/web/tests/components/chat/typography-baseline.test.ts:28,244-245` | asserts the `@font-face` exists and its weight matches the chat baseline |
   | `apps/web/tests/components/chat/mirror-gallery.test.tsx:2804,2850` | comment text naming the family |
   | `docs/design/chat-mirror/README.md:159` | prose naming the family |
   | `specs/current/chat-panel-component-gap-2026-09-02.md:176-185` | historical spec narrative |

   `docs/` and `specs/` are **WS8's** for the product rename, but these specific
   lines are font facts you own. Fix only the font-family mentions in those two
   files and list them so WS8 does not double-edit. The spec narrative is a dated
   record — if you judge it should keep its original text, say so and leave it;
   either is defensible, but the choice must be stated.

5. **Fix the tests properly — do not delete the invariant.**
   `apps/web/tests/components/chat/typography-baseline.test.ts` encodes a real
   contract: the mono `@font-face` descriptor and `ChatRoot.module.css`'s baseline
   weight must agree, or browsers resolve "requested 500, available 400"
   differently (face selection vs synthetic bolding). That contract now reads
   differently in two ways:

   - the `@font-face` it greps for **no longer exists**;
   - the theme is a **system** stack, so the font is chosen by the OS and the
     descriptor-agreement question is settled by the user's platform, not by us.

   Rewrite the test to assert the **new** truth: `base.css` declares no bundled
   mono face, `--mono` resolves to a system-monospace stack, and every call site
   consumes the `--mono` variable rather than naming a family. Explain in a
   comment why the old agreement check existed and why it is now the OS's
   responsibility. **A test that merely stops failing because you loosened it is a
   regression** — and deleting it without a replacement leaves the seam unwatched.

6. **Add the regression fence.** A new test that inspects the shipped files and
   fails if:
   - `apps/web/public/fonts/` contains anything other than the two Albert Sans
     files;
   - any file under `apps/web/public/fonts/` carries a `CoType Foundry` copyright
     string;
   - any `@font-face` or font-family declaration anywhere in `apps/web/src`
     names `JiduMono` / `Jidu Mono`.

   This is what stops the commercial font returning through an upstream merge.
   The repo already does programmatic font/name-table work in
   `apps/daemon/src/brands/fonts.ts` if you want a pattern; a simple string check
   over the font binary's name table is enough and more robust than grepping the
   source alone.

7. **Verify and measure.**

   ```bash
   pnpm --filter @open-design/web typecheck
   pnpm --filter @open-design/web test
   pnpm guard
   ```

   Then confirm zero references remain:

   ```bash
   grep -rn "JiduMono\|Jidu Mono" --include='*.ts' --include='*.tsx' --include='*.css' \
     --include='*.md' apps/ packages/ docs/ specs/ | grep -v node_modules | grep -v '/dist/'
   ```

   The only permitted remaining hits are the ones WS1 needs for the "removed"
   notice, plus any historical spec line you justified above. List them.

   Finally, produce a **visual** check of the alignment regression: render a view
   that shows a timing, a file path and a diff count side by side (the chat
   execution record is ideal) and note whether the jitter is acceptably small.
   Green tests cannot tell you that — a human eye can. Stage it with
   `pnpm tools-dev` and hand the human the command.

## Report back

- The deleted file's MD5/SHA-256 and its name-table fields, quoted.
- Confirmation the folder now contains exactly the two Albert Sans files, listed.
- The new `--mono` value, quoted, plus your explicit statement that you kept the
  semantic seam rather than pointing `--mono` at Albert Sans.
- The tabular-figure finding in your own words, with the digit-advance table,
  flagged as an **accepted regression**. Put it in the PR body too.
- Every test you rewrote and the invariant it now asserts.
- The regression-fence test and what it fails on.
- The `pnpm guard` / `typecheck` / `web test` output.
- The residue grep, with every remaining hit classified.
- Anything you could not complete, with the exact failing command.

## Do not

- Do not add JetBrains Mono, Geist Mono, IBM Plex Mono, or any third font. The
  decision is Albert Sans only.
- Do not add a license file for JiduMono Pro, or keep the `.otf` "for reference".
- Do not point `--mono` at Albert Sans (see step 3 — keep the semantic seam, and
  tell the human it is a one-line flip if they want it).
- Do not delete `typography-baseline.test.ts`'s invariant without replacing it.
- Do not edit `docs/` or `specs/` beyond the font-family lines listed above.
- Do not claim the alignment regression does not exist. It does; report it.
