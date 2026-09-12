# WS5 — CLI binary rename `od` → `capt`

**Dependencies:** WS3 (help-text product name) and WS4 (package scope) both
landed. Doing this before them guarantees a second, conflicting sweep.
**You own:** the `bin` entry, the shim, every help string that shows the command
name, every in-code invocation, and every shipped instruction that tells a user
or agent to run `od`.

## The decision, and the break it causes

The human chose: **`capt` only. Drop `od` — do not alias it.**

State this plainly in your report and in the PR body: this is a **deliberate
breaking change** for anything out of tree that shells out to `od`. The repo
itself documents roughly **900** `od <subcommand>` invocations across `docs/`,
`skills/`, `plugins/`, `specs/`, and agent-facing prose — external agents,
plugin skills and automation scripts built against the old contract will fail
until they update. That is accepted by the human's decision; it must not be
discovered later by a user.

## Do this

### 1. The bin entry

`apps/daemon/package.json`:

```json
"bin": {
  "od": "./bin/od.mjs"
}
```

becomes a `capt` entry pointing at the renamed shim. Keep the shim **shape**
identical — it is the one sanctioned `.mjs` in this change, exactly as
`bin/od.mjs` is today:

```bash
git mv apps/daemon/bin/od.mjs apps/daemon/bin/capt.mjs
```

Then update the shim's error message, which currently reads
`OpenDesign daemon dist entry not found at …` — the product name is WS3's
concern but the file is yours, so fix the string here and note it.

### 2. Every in-code invocation

```bash
grep -rn "\bod \b" --include='*.ts' --include='*.tsx' --include='*.mjs' \
  apps/ packages/ tools/ shells/ e2e/ scripts/ | grep -v node_modules | grep -v '/dist/'
```

For each hit decide:

- **A command the code actually executes** (spawn, `execFile`, a shell string
  invoking the CLI) → rename to `capt`. These are the ones that break silently
  if missed; enumerate them explicitly in your report.
- **A help/usage string** → rename.
- **Prose in a comment** → rename, but keep the meaning of the sentence.
- **A false positive** (the English word "od", a variable name, `OD_…`) → leave.

The CLI's own help text is dense with `od <sub>` lines — e.g. `od amr login`,
`od plugin validate`, `od config set odNextStrategyMode off`. Sweep the whole of
`apps/daemon/src/cli.ts` (12,175 lines). Watch specifically for:

- the `SUBCOMMAND_MAP` dispatch block around `apps/daemon/src/cli.ts:388-430`;
- the top-of-file comment explaining that `SUBCOMMAND_MAP[first](rest)` runs
  during module evaluation (around :60, :324, :342-356) — the *reasoning* must
  survive;
- `printStrategyHelp()` around :432+;
- every `--daemon-url … Override the … daemon HTTP base` line.

### 3. The capability contract

Root `AGENTS.md` has a section, **"Capability exposure (UI/CLI dual-track)"**,
that makes the CLI the embeddability contract: every user-facing capability must
be reachable through both the web UI and the `od` CLI, and new capabilities must
register in `SUBCOMMAND_MAP`. Read it before you start, then:

- Update the command name in that section.
- Do **not** change the contract itself, the `--json` requirement, or
  `--prompt-file <path|->`.
- Check `scripts/guard.ts` for a subcommand/`SUBCOMMAND_MAP` parity check and
  confirm it still passes. Also check `.github/config/scopes.json` and the
  planner config for any path rule that names the CLI.

### 4. Shipped instructions (only the command token)

`docs/`, `skills/`, `plugins/`, `specs/` are WS8's for the *product* rename.
**You own the command token `od ` → `capt ` in them**, because a half-renamed
instruction set is worse than either state. Coordinate by doing a
command-token-only pass and listing the files you touched, so WS8 does not
re-edit them for the name.

Be surgical: `od ` inside a code fence or an inline code span becomes `capt `.
The English word "od" in prose, or `OD_`/`od-` identifiers, must not change.
`od-focus`, `od-done`, `od-next` artifact markers and `OD_*` env vars are
**explicitly not renamed** — make sure your pass does not catch them.

### 5. Tests

- Grep `apps/daemon/tests/**` and `e2e/**` for invocations of the binary and
  update them.
- Add one test asserting the package exposes exactly the expected bin name and
  that the shim resolves the built entry — so a future rename cannot half-land.
- If any test asserts the *help output*, update the expectation rather than
  loosening it.

## Verification

```bash
pnpm --filter @captdesign/daemon build
node apps/daemon/bin/capt.mjs --help
pnpm guard
pnpm typecheck
pnpm --filter @captdesign/daemon test
```

Then:

```bash
grep -rn "\bod \b" --include='*.ts' --include='*.tsx' --include='*.md' --include='*.json' \
  apps/ packages/ tools/ e2e/ scripts/ docs/ skills/ plugins/ specs/ \
  | grep -v node_modules | grep -v '/dist/' | grep -v CHANGELOG
```

Remaining hits must be false positives or a documented, justified exception.
List them all.

## Report back

- The new bin name and the shim path.
- **The count and location of every code path that actually executes the CLI** —
  this is the list that determines whether the rename is real or cosmetic.
- The residue grep, with every remaining hit classified.
- Confirmation that `od-focus` / `od-done` / `od-next` / `OD_*` are untouched
  (show the grep proving it).
- A one-paragraph release note the human can publish about the break.

## Do not

- Do not create an `od` alias, symlink, or compatibility shim. The human chose a
  clean drop.
- Do not rename `OD_*` env vars, `--od-stamp-*` flags, or the artifact markers.
- Do not do the product-name rename (WS3) or the scope rename (WS4) — if you
  find residue from either, report it, do not fix it.
- Do not rewrite `CHANGELOG.md` or `docs/CHANGELOG/**`.
