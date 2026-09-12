# CaptDesign rebrand — agent prompt sheets

One file = one agent. Give the agent **only** its own prompt, plus the repo
checkout. Each prompt is self-contained: it restates the decisions, the scope,
the rules and the verification its workstream must satisfy.

Start with `PLAN.md` — it carries the decisions, the dependency graph, the global
rules, and the risks. Do not hand an agent a prompt without having read the
plan's conflict section (C1, C2) first.

## Run order

```
00 baseline ──┬── 01 attribution ledger
              ├── 02 font license swap
              ├── 03 product identity ──┬── 04 package scope & namespaces ──┬── 05 CLI bin rename
              │                         │                                   │
              │                         ├── 06 cloud surface removal ───────┤
              │                         ├── 07 upstream links & infra ──────┤
              │                         ├── 08 docs & content rename        │
              │                         └── 09 visual assets (BLOCKED: needs artwork)
              │                                                             │
              │                                      04 ── 10 pack hotfix identity ── 11 release pipeline
              └─────────────────────────────────────────────────────────────┴── 12 test rebaseline ── 13 final verification
```

| # | File | Can run in parallel with |
|---|------|--------------------------|
| 00 | `00-baseline-freeze.md` | — (first) |
| 01 | `01-attribution-ledger.md` | 02 |
| 02 | `02-font-license-swap.md` | 01 |
| 03 | `03-product-identity-captdesign.md` | after 01+02 |
| 04 | `04-package-scope-and-namespaces.md` | after 03 |
| 05 | `05-cli-bin-rename.md` | after 04 |
| 06 | `06-cloud-surface-removal.md` | **serial** with 07 (06 first). Largest and riskiest — removes the identity layer, not just a feature. |
| 07 | `07-upstream-links-and-infra.md` | **serial** with 06 (07 second) |
| 08 | `08-docs-and-content-rename.md` | after 05+07 (it is the last writer on docs/content) |
| 09 | `09-logo-and-visual-assets.md` | **blocked** on human artwork |
| 10 | `10-local-pack-hotfix-identity.md` | after 04 |
| 11 | `11-release-pipeline-identity.md` | after 10 |
| 12 | `12-test-suite-rebaseline.md` | after 02–06 |
| 13 | `13-final-verification.md` | last |

**Never run 06 and 07 concurrently** — both edit `apps/daemon/src/server.ts`,
`apps/web/src/components/HomeHero.tsx` and the prompt files.

**Never let a second agent edit `docs/`, `specs/`, `design-systems/`,
`design-templates/`, `plugins/` or `skills/`** while 08 is running.

## Two prompts that will not finish on the first pass

- **09** needs a human to supply a logo, wordmark, app icon and splash. It is
  designed to stop cleanly after producing the inventory and swap plan. Do not
  ask an agent to improvise a brand mark.
- **11** needs the human to supply release infrastructure (bucket/origin, Apple
  signing identity, notifier targets, release repo). It is designed to produce a
  decision register and fail-closed defaults, then stop.
- **13** blocks on 09 for the visual half of its artifact check.

## Before you hand out a prompt

1. Confirm the dependency prompts have actually landed (`git log --oneline`).
2. Check the previous agent did not leave the tree dirty: `git status --short`.
3. Tell the agent the repo root path and the branch.
4. Give it the prompt file's path — not the whole plan — unless it is running 12
   or 13, which need the plan's acceptance criteria.

## What to expect back

Every prompt demands a specific report shape, and each one is designed so you can
spot the failure mode that matters for that workstream:

- 01 / 13 tell you which licenses are **unresolved** — the redistribution blocker.
- 02 tells you the font's **hash and provenance** — proof the swap is real.
- 03 / 04 / 05 / 08 return a **classified residue list** — a hit nobody can
  classify is a bug, and that is where a rename quietly goes half-done.
- 06 must prove the daemon still serves the user's own projects with **no** Cloud
  identity — a headerless `GET /api/projects` returning real data, not `[]` or 400.
  The workspace layer it removes was an access gate; getting this wrong locks the
  user out of their own machine.
- 07 must prove the **updater fails closed**.
- 10 must quote values read **from the built artifact**, never from source.
- 12 must separate `real-regression` from `stale-expectation` — do not accept a
  green suite that got there by editing assertions.
- 13 must not soften the "not legal advice" limitation.

## Standing instruction for every agent

Repo root `AGENTS.md` and the per-directory `AGENTS.md` files are binding. Ship
tests with every behavioural change. Run `pnpm guard` and `pnpm typecheck` before
declaring done. Commits carry no co-author trailers. Stay in your workstream's
file list and report what belongs to someone else instead of fixing it.
