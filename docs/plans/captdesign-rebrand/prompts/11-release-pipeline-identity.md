# WS11 — Release pipeline identity and channel policy

**Dependencies:** WS10 (local artifact identity) landed, so the constants and the
packaging chain are known-good before the release tooling consumes them.
**You own:** `tools/release/**`, `.github/workflows/release-*.yml`,
`.github/workflows/notify-*.yml`, `.github/scripts/release/**`, and the release
documentation that describes channel policy.

## Scope warning — read this before planning the work

This workstream is **large and partly blocked on human decisions**. The release
pipeline is not a rename target so much as a publishing system pointed entirely at
nexu-io's infrastructure, governed by a detailed channel policy in root
`AGENTS.md` ("Release channel model"). Two things are true at once:

1. The old identity strings must go (`Open Design Beta 0.22.1` → the CaptDesign
   equivalent), or a CaptDesign build publishes under someone else's product name.
2. There is **no CaptDesign release infrastructure** — no R2 channel, no
   `releases.captdesign.*` origin, no notifier webhooks, no GitHub release
   target. The pipeline cannot simply be repointed; it has to be either
   re-targeted to infrastructure the human supplies, or disabled.

**Do not guess a domain.** Do not invent an R2 bucket, a webhook, or a GitHub
org. Where infrastructure is required and unspecified, produce the change as a
config-driven, **fail-closed** default and list the exact values the human must
supply.

## Step 0 — inventory and decision register (do this first, it is most of the value)

Produce `docs/plans/captdesign-rebrand/release-identity-plan.md` containing a row
per item below: `path:line`, what it is, disposition
(repoint / disable / leave), and — where a human-supplied value is required — the
**exact** variable name and example value they must provide.

Measured starting inventory:

- `packages/release/src/index.ts:56` — `const PRODUCT_NAME = "Open Design";`
  feeding every `releaseInstallIdentity` (WS4 owns the appId part; you own any
  product-name usage you find here that WS4 missed — report rather than duplicate).
  Around `:56-110`: descriptors with `appId`, `productName`
  (`${PRODUCT_NAME} Prerelease`, `${PRODUCT_NAME} ${displayLabel}`),
  `githubReleaseEnabled`, `internal`, `storagePrefix`, `displayLabel`.
- `tools/release/src/metadata/prepare-beta.ts:363` — `Open Design Beta ${betaVersion}`
- `tools/release/src/metadata/prepare-stable.ts:592,634` —
  `Open Design ${packagedVersion}`, `Open Design Prerelease ${releaseVersion}`
- `tools/release/src/storage/reserve-beta-version.ts:36` — `release_name`
- `tools/release/src/storage/dogfood.ts:54` — comment referencing
  `Open Design-release-beta-win-setup.exe` (the space-in-product-name hazard;
  keep the reasoning)
- `tools/release/src/notifications/feishu.ts:210-213` — notification titles
- `tools/release/src/notifications/prerelease-card.ts:330` — card title
- `tools/release/src/catalog/export-catalog.ts:31` — error text
- `tools/release/src/metadata/prepare-stable.ts` —
  `validateStablePrereleaseMetadata` requiring `platforms.macIntel`, `mac.signed`,
  Intel dmg/zip URLs. **This is channel policy, not branding — see the next
  section.**
- `.github/workflows/release-beta.yml`, `release-stable.yml`,
  `release-prerelease.yml`, `release-prerelease-tests.yml`,
  `release-prerelease-smoke.yml`, `release-prerelease-card.yml`,
  `notify-release-feishu.yml`, `notify-daily-feishu.yml`,
  `bake-plugin-previews*.yml`, `whats-new-publish.yml`, `metrics.yml`,
  `refresh-plugin-popularity.yml`, `refresh-contributors-wall.yml`
- `.github/scripts/release/publish-platform.ps1`,
  `.github/scripts/release/smoke-artifacts.ts`,
  `.github/scripts/release/dispatch-validation.sh`,
  `.github/scripts/publish_whats_new.py`

## Do NOT change channel policy

Root `AGENTS.md` documents a release model that is deliberate and hard-won, and it
is **not** branding. Do not "simplify" any of it:

- `beta` = fast dev validation; `prerelease` = internal validation for stable;
  `preview` = independent early-access channel with stable-like rigor; `stable` =
  formal delivery gated on validated prerelease artifacts.
- `enable_mac_x64` defaults to `true` and an Intel-less prerelease **cannot be
  promoted to stable** — enforced in code, not docs.
- The forwarding form for a default-on boolean must be
  `${{ github.event_name != 'workflow_dispatch' || inputs.<flag> }}`, never
  `${{ inputs.<flag> || true }}`. A default-off boolean uses
  `${{ inputs.<flag> || false }}`.
- Automated tests do not gate prerelease delivery. Do not reintroduce a test job
  into `build_*` or `publish`'s `needs`/`if`.
- Validation runs **outside** the pipeline, in the three dispatched workflows
  under concurrency groups scoped to the origin run.
- Exactly **one writer** owns the prerelease Feishu card. Do not add a second
  poster.
- `version_metadata_url` is the authoritative "did a package ship?" signal, not
  the workflow conclusion.

Read the whole "Release channel model" section and `.github/AGENTS.md` before
editing a single workflow. If a rename appears to require a policy change, that is
a signal you have misread something — stop and report.

## Your actual task, in order

1. **Product-name strings** in `packages/release/**` and `tools/release/**`.
   Prefer one constant over repeated literals where the existing code already has
   a constant in scope.
2. **Storage prefix and channel identity.** `storagePrefix` currently uses
   `stable` / `prerelease` / the channel name, and the R2 layout is
   `<channel>/latest/…`. If CaptDesign does not own that bucket, the default must
   be **disabled**, not repointed — a CaptDesign build must not write into
   nexu-io's storage.
3. **The updater feed origin** (`apps/desktop/src/main/updater/config.ts`,
   WS7 owns the fail-closed change) — confirm your release side and WS7's client
   side agree. A publish path that writes to an origin the client no longer reads
   is worse than no path.
4. **Notifiers.** `feishu.ts`, `prerelease-card.ts`, `prerelease-progress-card.ts`
   and the `FEISHU_*` secrets belong to nexu-io's team channel. A CaptDesign build
   must not post into it. Make notification **opt-in** via configuration and
   default to off; say so plainly.
5. **GitHub release targets.** `githubReleaseEnabled` and any
   `nexu-io/open-design` release reference must point at the human's repo
   (`unfoldingdimensions/open-design`) or be disabled. Do not leave a workflow
   that attempts to publish a release into someone else's repository.
6. **Signing / notarization.** `mac_sign_mode` defaults to `sign-only`, stable
   ships notarized. CaptDesign has no Apple identity configured. Do **not**
   silently drop signing from the pipeline — instead make the code-signing
   identity and notary credentials explicitly required inputs, and let the build
   fail loudly when they are absent. A pipeline that quietly publishes unsigned
   artifacts is the failure mode to avoid.
7. **Tests.** Extend `tools/release/tests/**` (e.g. `prerelease-card.test.ts`,
   the `prepare-*` tests) so the new names are asserted, and add a test that a
   build with **no** configured storage origin or notifier fails closed rather
   than defaulting into nexu-io's.

## Verification

```bash
pnpm --filter @captdesign/release build
pnpm --filter @captdesign/release test
pnpm --filter @captdesign/tools-release build
pnpm --filter @captdesign/tools-release test
pnpm guard
pnpm typecheck
```

Workflow YAML cannot be fully validated locally; at minimum run
`actionlint` if the repo has it (`.github/actionlint.yaml` exists — check how CI
invokes it) and paste its output.

## Report back

- The decision register path, and the **exact list of values the human must
  supply** (bucket, origin, Apple identity, notifier targets, release repo).
- Every disposition, with the reason, especially every `disable` and why
  repointing was not possible.
- Confirmation, item by item, that **no channel policy changed**. If you believe
  one must, stop and ask rather than acting.
- The fail-closed test you added and its output.
- `actionlint` output, or an honest statement that you could not run it.
- The storage/notifier disable defaults, quoted.

## Do not

- Do not change the release channel model, the mac_x64 requirement, the
  test-gating rule, the boolean-forwarding forms, or the single-writer rule.
- Do not invent a domain, bucket, or webhook.
- Do not leave a publish path that writes into nexu-io's infrastructure.
- Do not remove signing requirements to make a build pass; fail loudly instead.
- Do not add a second prerelease notifier.
- Do not touch the build-cache node keys (`tools/pack/CACHE.md`).
