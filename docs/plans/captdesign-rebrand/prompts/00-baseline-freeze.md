# WS0 — Baseline freeze & verification gate

**Dependencies:** none. Run this first; every other workstream assumes it.
**You own:** measurement and a green-baseline record. **You change no product code.**

## Goal

Establish the pre-rebrand baseline so that every later workstream can tell "I
broke this" from "it was already broken", and so the final verification (WS13)
has something to diff against.

## Do this

1. Confirm state before touching anything:

   ```bash
   git status --short
   git log --oneline -1
   git rev-list --left-right --count upstream/main...HEAD
   ```

   Record the branch, the HEAD sha, and the ahead/behind counts. If the working
   tree is dirty with changes unrelated to the rebrand, say so in your report and
   stop — a baseline taken over a dirty tree is worthless.

2. Install and build the workspace fresh, and capture the result:

   ```bash
   corepack enable
   pnpm install
   pnpm guard
   pnpm typecheck
   ```

   Save the exact output of each to `.captdesign-rebrand/baseline/guard.txt`
   and `.captdesign-rebrand/baseline/typecheck.txt`. Create that directory; it is
   scratch, and **add it to `.gitignore`** rather than committing it.

3. Capture the per-suite baseline for the suites WS12 will re-baseline:

   ```bash
   pnpm --filter @open-design/contracts test  2>&1 | tail -40
   pnpm --filter @open-design/daemon   test  2>&1 | tail -40
   pnpm --filter @open-design/web      test  2>&1 | tail -40
   pnpm --filter @open-design/e2e      test  2>&1 | tail -40
   ```

   Record pass/fail/skip counts and the **names of every already-failing test**.
   This list is the single most valuable artifact you produce: without it, WS12
   will "fix" pre-existing failures or report new ones as pre-existing. Put it in
   `.captdesign-rebrand/baseline/failing-tests.md` as a plain list, grouped by
   suite.

4. Record the counters the plan's acceptance criteria depend on, so WS13 can
   assert they all went to zero:

   ```bash
   grep -rn "OpenDesign\|Open Design" --include='*.ts' --include='*.tsx' apps/ packages/ tools/ e2e/ | grep -v node_modules | grep -v '/dist/' | wc -l
   grep -rn "open-design\.ai" --include='*.ts' --include='*.tsx' --include='*.json' . | grep -v node_modules | grep -v '/dist/' | wc -l
   grep -rn "@open-design/" --include='package.json' . | grep -v node_modules | wc -l
   find . -name 'LICENSE*' -not -path '*/node_modules/*' -not -path './.git/*' | wc -l
   ```

   Expected at baseline (measured): 6066, ~2066, 90, 87. Write your measured
   numbers to `.captdesign-rebrand/baseline/counters.txt` with the labels.

5. Record the identifier facts that WS4 and WS10 will change:

   ```bash
   grep -rn "io\.open-design\.desktop" --include='*.ts' tools/ apps/ | grep -v dist/
   grep -n "DEFAULT_RELEASE_ORIGIN\|defaultMetadataUrl" apps/desktop/src/main/updater/config.ts
   grep -n "appId\|productName\|namespace" packages/release/src/index.ts | head -30
   ```

   Append to the same counters file.

6. Commit the baseline record:

   ```bash
   git add .gitignore
   git commit -m "chore(rebrand): capture pre-rebrand baseline and ignore scratch dir"
   ```

   Do **not** commit `.captdesign-rebrand/` itself.

## Report back

- The baseline HEAD sha and branch.
- Whether `pnpm guard` and `pnpm typecheck` passed clean. If not, the exact
  failures — later workstreams need to know they did not cause them.
- The failing-test list (path to the file and the count per suite).
- The four measured counters, and any that differ materially from the expected
  values above. A large divergence means upstream moved; say so.
- Anything in `git status` that looks like it does not belong to this effort.

## Do not

- Do not fix anything. A baseline you repaired is not a baseline.
- Do not reformat, rename, or "tidy" any file.
- Do not commit the scratch directory or any test report output.
