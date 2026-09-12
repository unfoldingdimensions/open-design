# WS8 — Docs and shipped content rename

**Dependencies:** WS3 (code strings) landed. Runs **after** WS5 and WS7 have done
their command-token and URL passes, so you are not racing them.
**You own:** `docs/`, `specs/`, `design-systems/`, `design-templates/`,
`plugins/`, `skills/`, `craft/`, `CHANGELOG`-adjacent prose, and the README family.

**You are the last writer on these paths.** No other workstream may edit them
(except the four OD Next prompt assets, which WS3 owns, and the JiduMono lines in
two files, which WS2 owns). Reconcile with their reports before you start.

## The scale, and why this is not a find/replace

Measured `OpenDesign`/`Open Design` occurrences by area:

| Area | Files | Occurrences |
|---|---|---|
| `design-systems/` | 152 `DESIGN.md` + 19 locale variants each | **1,813** |
| `plugins/` | — | 417 |
| `skills/` | — | 104 |
| `docs/` | 113 | — |
| `design-templates/` | — | 77 |
| `specs/` | 39 | — |
| `craft/` | — | 4 |

**`design-systems/` is the trap.** Most of its 1,813 hits are not the product
name at all — they are `manifest.json` fields like
`"origin": "OpenDesign curated bundled fixture"` and `DESIGN.md` prose about a
third-party brand. A blind replace rewrites sentences about *other companies*
into sentences about CaptDesign. That is both wrong and a legal problem.

## Rule 1 — never rename a third party

Preserve, verbatim:

- Every bundled `LICENSE` / `LICENSE.txt` and every copyright holder name inside
  them (`Zara Zhang`, `alchaincyf (花叔 · 花生)`, `lewis <sudolewis@gmail.com>`,
  `Leonxlnx`, `op7418 (歸藏)`, `Matt Pocock`, `Vercel Labs`, `Jane (@xiaoerzhan)`,
  the Codrops effect authors, `Atharva Dharmendra Jagtap`, `Matt Van Horn`,
  `Peter Steinberger`, `Hallmark contributors`, `LearnPrompt`, and the rest).
- Third-party project names: `guizang-ppt-skill`, `html-ppt`, `awesome-gpt-image-2`,
  `awesome-seedance-2-prompts`, `hyperframes`, `dom-to-pptx`, `upstream UI/UX Pro Max`.
- Third-party **brand** names in `design-systems/`: `airbnb`, `apple`, `nike`,
  `tesla`, `meta`, `ferrari`, `starbucks`, `mastercard`, `playstation`, `bmw`,
  `binance`, `coinbase`, `ibm`, `pinterest`, `renault`, `spotify`, `uber`,
  `bugatti`. These are their owners' marks. Renaming or rebranding them is not
  yours to do.
- Proprietary typeface names documented inside those packages (`Airbnb Cereal VF`,
  `FerrariSans`) — they are facts about the referenced brand.
- `op7418`, `@lewislulu`, `@Jane-xiaoer` etc. in README credits.

If a rename would change what a sentence says about someone else, **stop and
leave it**, then list it in your report.

## Rule 2 — history stays history

Do **not** rewrite:

- `CHANGELOG.md`
- `docs/CHANGELOG/**` (including `v0.17.0`, `v0.18.0`, `v0.18.1`, `v0.19.0`, `v0.22.1`)
- `RELEASE-NOTES-0.10.0.md`
- `docs/spec.md`, `docs/roadmap.md` (both explicitly archived per `AGENTS.md`)
- `specs/current/**` and `specs/change/**` — these are dated records of decisions
  made under the old name. Rewriting them makes them lie about their own date.
  The one exception WS2 owns (the JiduMono lines in
  `specs/current/chat-panel-component-gap-2026-09-02.md`) is already handled.
- `plugins/spec/**` if it is a versioned spec with a published history — check
  and decide, then state your reasoning.

Add a short note at the top of `docs/plans/captdesign-rebrand/PLAN.md`'s sibling
(or in `README.md`'s provenance section) explaining that historical documents
retain the original product name because that is what they described at the time.

## Rule 3 — rename the product, everywhere else

Product-name occurrences in prose, headings, diagrams, code fences, and content
metadata → **CaptDesign**. Includes:

- `README.md` (48 `OpenDesign` hits) and the **13 translated READMEs** under
  `docs/i18n/`: `ar, de, es, fr, ja-JP, ko, pt-BR, ru, th, tr, uk, zh-CN, zh-TW`.
- `docs/*.md` — `architecture.md`, `agent-adapters.md`, `modes.md`,
  `plugins-spec.md` (+ `.zh-CN`), `prompt-composition.md`, `design-systems.md`,
  `install-guide.md`, `whats-new.md`, `windows-troubleshooting.md`,
  `deepseek-harness-one-click-install.zh-CN.md`, `orchestrator-workspaces.md`,
  `new-agent-runtime-acp.md`, `external-media-orchestration.md`, `atoms.md`,
  `MOCKS-CONTRACT-CHECK.md`, `codex-pets.md`, `notebooklm.md`,
  `ai-native-observability-trace-analysis.md`, and the rest.
- `CONTRIBUTING.md`, `MAINTAINERS.md`, `AGENTS.md` (root **and** the per-directory
  `AGENTS.md` files under `apps/`, `packages/`, `tools/`, `e2e/`, `.github/`,
  `skills/`, `design-templates/`, `design-systems/`, `apps/web/src/components/chat/`),
  `CLAUDE.md`, `QUICKSTART.md`, `CONTEXT.md`, `SECURITY`/`PRIVACY.md`.

**`AGENTS.md` needs care.** It is the agent-facing source of truth and it
documents real architecture. Change the product name; **do not restate, reorder,
or "improve" any rule.** Several sections are explicitly load-bearing — the
Daemon data directory contract, the prompt-variants switch, the annotated-tag
conventions. If you touch a section, you must preserve every normative sentence.

- `plugins/**` content — `SKILL.md` bodies, `open-design.json` sidecars,
  `_official/**` examples, `plugins/spec/**`, registry docs. Watch
  `plugins/community/**`, which contains third-party authors' work: rename only
  the product references, never the authors' text about their own plugin.
- `skills/**` — `SKILL.md` bodies, `references/`, `scripts/`. Same rule: 13 of
  these are third-party skills under MIT with their own authors. Their prose
  describing their own craft stays; product references change.
- `design-templates/**` — `SKILL.md`, `template.json`, READMEs (including
  `html-ppt/README.md` + `.pt-BR` + `.zh-CN` which carry third-party content).
- `craft/**` — 4 hits, universal craft rules.
- `design-systems/**` — **only** the `manifest.json` / `DESIGN.md` occurrences
  that refer to *this product* (e.g. `"origin": "OpenDesign curated bundled
  fixture"`, "Bundled OpenDesign package for …"). Every occurrence that refers to
  the third-party brand stays. If in doubt, leave it and list it — a missed
  rename is cheap; a wrong one is a claim about someone else's trademark.

## Rule 4 — the attribution you must ADD

While you are in these files, make the provenance discoverable where a reader
actually looks. Add, near the top of `README.md` and in `CONTRIBUTING.md`:

> CaptDesign is a derivative work of **Open Design**
> ([nexu-io/open-design](https://github.com/nexu-io/open-design)), Copyright 2026
> Open Design contributors, licensed under Apache-2.0. CaptDesign is not
> affiliated with or endorsed by the Open Design project or nexu-io. Bundled
> third-party components remain under their own licenses — see
> `THIRD-PARTY-NOTICES.md`.

Coordinate the exact wording with WS1 (it owns the notices) so the two agree.
Where a doc credits upstream authors of bundled skills/templates, **keep every
name**.

## Verification

```bash
pnpm guard
pnpm typecheck
```

Plus a residue pass you must classify:

```bash
grep -rn "OpenDesign\|Open Design" --include='*.md' --include='*.mdx' --include='*.json' \
  docs/ specs/ plugins/ skills/ design-templates/ design-systems/ craft/ \
  | grep -v node_modules | wc -l
```

Every remaining hit must fall into exactly one class:

| Class | Meaning |
|---|---|
| `third-party` | a holder, author, or other company's name — correct to keep |
| `history` | a changelog, archived spec, or dated record — correct to keep |
| `attribution` | a deliberate credit to Open Design / nexu-io — correct to keep |
| `missed` | a product reference you should have changed — **fix it** |

Report the counts per class and the path list for `missed` after fixing. A large
`missed` count means your pass was too narrow; go back.

## Report back

- Counts per area before and after, and the residue classification table.
- The 13 translated READMEs: confirmed updated, or list the ones you could not
  read (do not machine-translate; a product name is language-independent).
- Every `design-systems/` occurrence you deliberately left, grouped, with the
  reason (this is the highest-risk area in the workstream).
- Every third-party name you preserved, so the human can spot-check.
- The provenance paragraph you added, quoted, and where it landed.
- Which files you found that WS2/WS3/WS5/WS7 had already touched, so nothing is
  double-edited.

## Do not

- Do not rewrite `CHANGELOG.md`, `docs/CHANGELOG/**`, `RELEASE-NOTES-0.10.0.md`,
  archived specs, or `specs/current|change/**`.
- Do not rename a third-party brand, author, holder, project, or typeface name.
- Do not machine-translate anything.
- Do not edit code, package manifests, or CI.
- Do not remove a credit to save a rename.
- Do not restate or "tidy" root `AGENTS.md` rules while renaming inside it.
