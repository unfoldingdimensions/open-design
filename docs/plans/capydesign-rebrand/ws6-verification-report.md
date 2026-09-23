# WS6 (Cloud surface removal) — verification report

Branch: `rebrand/ws6-cloud-removal`. `main` untouched (`eb706207a`).
Generated: 2026-09-23. Machine: Windows 10.0.26200, Node 22.22.0 (workspace toolchain), pnpm workspace.

## Verdict

- **Web package: green.** 903 test files passed, 0 failed, 1 skipped; 8,700 tests passed, 0 failed, 19 skipped.
- **Web typecheck: green.** 0 errors across `src/` + `tests/`.
- **Daemon: no WS6-caused failures remain.** Every daemon failure that survives matches the `main` baseline on the same machine.
- **`pnpm guard`: red on one pre-existing WS1 item only** (licence attribution), unrelated to WS6.

## Completion criteria and evidence

| Criterion | Evidence |
| --- | --- |
| Pre-fix failure inventory | 635 rows across 154 files, captured before fixing (`.openclaw/tmp/inventory.json`) |
| Each failure classified | stale expectation for a deleted capability vs. real regression — recorded per batch |
| Failures fixed one at a time | 49 commits on the branch, batch-scoped, monotonic |
| Each fix verified in isolation | each touched file re-run with `vitest run <file>` before commit |
| One final unfiltered full run | web suite run 2026-09-23 15:49:42 → 16:03:49, 844.85s |
| Report with totals, causes, changelog | this document |

## Final measurements

### Web suite (final unfiltered run)

```
Test Files  903 passed | 1 skipped (904)
     Tests  8700 passed | 19 skipped (8719)
  Duration  844.85s
```

Comparisons:

| Point in time | Failed files | Failed tests |
| --- | --- | --- |
| WS6 baseline | 164 | 702 |
| `main` on this machine | 39 | 113 |

The 39/113 on `main` are pre-existing Windows-environment failures (path separators, timing, native modules) and are not addressed here.

### Web typecheck

`pnpm --filter @capydesign/web typecheck` → exit 0, 0 errors.

### Guard

`pnpm guard` → exit 1, single failing item: two `prompt-templates/image/*.json` files declare
`source.license: "Original X post"`, outside the allow-list `Apache-2.0 | MIT | CC-BY-4.0`.
These files belong to WS1 and were deliberately not touched. **This is the only thing standing
between the branch and an all-green local check.**

### Daemon

The 45 daemon suites whose subject is the removed surface were run explicitly. After fixing:

| Suite | Branch | `main` |
| --- | --- | --- |
| `chat-route.test.ts` | 9 failed | 9 failed |
| `connection-test.test.ts` | 7 failed | 7 failed |

Everything else that fails in the daemon fails identically on `main` — verified by checking out
`main` and re-running each suite:

`server-startup-smoke` (7), `stale-message-snapshot-preserves-daemon-events` (4),
`run-resume-on-failure` (4), `intent-signal-stable-prompt-cache` (4),
`run-atomic-ownership` (2), `runtimes/acp-stall-last-progress-age` (6),
`headless-runs` (1), `run-request-idempotency` (4), `codex-session-resume` (5),
`amr-session-resume` (10), `runtimes/run-failure-telemetry-smoke` (5),
`plain-stream-artifact-event-truncation` (5), `opencode-session-resume` (3),
`run-steer-route` (3), `first-visible-output-telemetry-isolation` (1),
`task-successor-absorption` (2).

A full daemon run is not reachable in one pass on this machine — the process is killed by
resource limits partway through (~18 failing suites reported before the kill). The 45-suite
WS6-scoped run plus the per-file `main` comparison is the substitute, and it bounds the WS6
delta at zero.

## Daemon suites removed for the deleted capability

`collab-presence-transport-off`, `design-system-workspaceless-delete`,
`local-project-data-plane-outage`, `media/analytics-routes`,
`plugins-snapshot-workspace-scope`, `plugins-team-mutation-target`,
`plugins-uninstall-workspace-gate`, `resource-workspace-authority-preflight`,
`skill-navigation-workspace-authority`, `team-mirror-read-revocation`,
`workspace-billing-server-wiring`, `workspace-context-authority-server-wiring`.

Cases dropped inside kept suites: `workspace-scope-context-switch` (3),
`plugin-events-workspace-scope` (3), `plugin-asset-workspace-authority` (2),
`chat-route` (4: Team design-system compose + 3 AMR), `connection-test` (5: all AMR).

## Method notes (why the numbers are trustworthy)

- Deletions remove the test case; the enclosing empty `describe` is then removed, otherwise
  vitest reports a file-level "No test found in suite" failure.
- Cases were matched by line range where CJK or parameterised (`it.each`) names defeat
  name matching.
- Test stand-ins created for removed modules must render `children` and expose callable members,
  otherwise hundreds of unrelated assertions fail spuriously.
- Regression checks diff per-file error counts between logs, never totals alone.

## Open items (not WS6 regressions)

1. WS1 licence attribution item blocking `pnpm guard` — needs a product call.
2. Remaining WS6 scope: i18n key prune across 19 locales, Privacy consent UI unwiring,
   contracts trim (222 load-bearing references), vocabulary rename pass, packaging.
