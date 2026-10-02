# WS8 slice 1 — docs + README family rename report

Status: **slice 1 complete** (README family, `docs/` active prose, root guides,
`AGENTS.md` files, deploy-script identity, clipper store listing).
Branch: `rebrand/ws7-upstream-links-and-infra` (branched from the WS7 tip per the
WS8 dependency rule: after WS3/WS5/WS7).

Slices still open: `plugins/` (417), `skills/` (104), `design-templates/` (77),
`craft/` (4), `specs/` (39), and `design-systems/` (1,813 — the third-party trap,
last).

## WS1 coordination finding

`NOTICE` and `THIRD-PARTY-NOTICES.md` spelled the product **"CaptDesign"** — a
misspelling of decision D1 (`CapyDesign`). Both corrected; the README provenance
paragraph uses the Rule 4 wording and agrees with the notices.

## What changed

| Area | Before | After |
|---|---|---|
| `README.md` | 30 product-name hits | 0 — remaining 3 lines are attribution (provenance, upstream maintainer credit) and the one historical `OpenDesign Cloud` roadmap line |
| 13 translated READMEs | 21–35 hits each | 0 — each keeps its one historical `OpenDesign Cloud` roadmap line, now annotated "removed in CapyDesign, this fork is local-only" |
| `docs/i18n/CONTRIBUTING.*` (7) + `MAINTAINERS.*` (7) | 1–3 each | 0 |
| `docs/i18n/QUICKSTART.*` (8) | 9–11 each | 0 |
| `docs/*.md` active prose (30 files, incl. `deployment/`, `design/run-errors/`, `testing/`, `rfc-drafts/`) | ~290 hits | see residue table |
| Root guides (`QUICKSTART`, `CONTEXT`, `CONTRIBUTING`, `MAINTAINERS`, `PRIVACY`) | 29 hits | 0 |
| `AGENTS.md` root + 4 per-directory files | 13 hits | 0 |
| `clipper/store/LISTING.md` | 32 hits | 0 |
| `deploy/scripts/{install,update,uninstall}.sh` + `deploy/azure/azure-pipelines.yml` | 11 user-facing `OpenDesign` strings | 0 |

## Content decisions beyond the mechanical swap

1. **Provenance added** (Rule 4): README top blockquote — derivative-work
   statement plus the Rule 2 historical-docs note. `CONTRIBUTING.md` gets the
   same paragraph. Maintainer roster reframed: the three people listed are
   credited as **upstream Open Design's core team**, not this fork's maintainers.
2. **Sealos section removed from README** — a missed WS7 endpoint: the
   one-click button deployed **upstream's** app-store template (nexu-io's
   product). With no CapyDesign template existing, the section went.
3. **Historical roadmap line**: "OpenDesign Cloud" keeps its original name in
   the README roadmap and all 13 translations (renaming it would falsify what
   0.9.0 shipped), each annotated as removed in CapyDesign.
4. **Plugin spec (docs/plugins-spec.md + zh-CN) content repairs**:
   stale `od …` command tokens → `capt …` (WS5 residue); ~60 prose "OD"
   short-name tokens → CapyDesign (word-boundary swap; `OD_*`, `od:*`, `od-*`
   identifier tokens untouched); `$schema` example lines removed (WS7 dropped
   the key from generated manifests); example author/owner URLs →
   `https://example.com`; §13 reframed as **upstream's public-marketplace
   design, not hosted by CapyDesign**; TOC anchors re-slugged.
4b. **Short-name "OD" pass** across the same active docs with word-boundary
   safety: "OD Next" is a code-anchored feature name
   (`evaluateOdNextRollout`, `OD_NEXT_STRATEGY_ROLLOUT`) and is protected via a
   placeholder swap; CJK-adjacent forms (`OD는/ODは/OD的`) handled with a
   Unicode-category lookahead. `docs/prompt-composition.md` was left untouched
   by design (it documents the OD Next switch).
4c. **Stale package-scope pass**: ~120 `@open-design/*` references in active
   docs (commands like `pnpm --filter @open-design/daemon …` stopped working
   when WS4 renamed the scope) → `@capydesign/*`. Protected history
   (`docs/plans/**`, changelogs, dated specs) keeps the names it used.
5. **Deploy identity** (boundary exception, recorded): `deploy/scripts/*.sh`
   and the azure pipeline label still printed "OpenDesign" — missed WS3
   strings in user-facing installer/updater/uninstaller output. Renamed so the
   install-guide transcript does not lie. Banner art unchanged (same width).
   Identifier-class tokens (`open-design` container name, `[open-design]` log
   prefix, `open-design` daemon user, `OD_*` env, `od://` scheme) untouched.
6. **Dead Vela/AMR rollout docs removed** from `deploy/README.md` (WS6 handoff
   prose): the table row and 30 lines of Vela install/mount instructions
   documented a runtime the daemon no longer has. Tutorial template checkbox
   label now names CapyDesign/the fork.

## Residue classification (this slice's areas)

| Class | Where | Count (approx) |
|---|---|---|
| `attribution` | README provenance + maintainer credit, `NOTICE`, `THIRD-PARTY-NOTICES.md`, CONTRIBUTING/MAINTAINERS derivative wording | ~10 lines |
| `history` | README + 13 translations "OpenDesign Cloud" roadmap lines (annotated), `docs/CHANGELOG/**`, `docs/spec.md`, `docs/roadmap.md`, `docs/v0.8.0-announcement.*`, `docs/plans/**` (incl. the rebrand prompts themselves), `docs/superpowers/{plans,specs}/**` (dated), `docs/testing/syntax-acceptance.md` (upstream-era telemetry validation witness) | ~250 |
| `deferred` | `docs/design-systems.md:37` `"origin": "OpenDesign curated bundled fixture"` — the literal still lives in `design-systems/*/manifest.json`; renamed together in the design-systems slice to avoid a doc/data desync | 1 |
| `stale-feature, left deliberately` | `docs/design/run-errors/{error-ux-design,implementation-audit}.md` — Cloud-era error-UX design-review records ("推荐 Open Design 智能体" upsell scenarios, AMR guidance). Renaming the product inside them would claim CapyDesign offers the cloud upsell it removed. Content call needed: delete as WS6 residue or accept as historical design records | ~60 |
| `missed → fixed` | everything else in the table above | 0 remaining |

## Flagged for follow-up (not renamed — content is stale post-WS6)

- `PRIVACY.md` "CapyDesign AMR" section + telemetry-relay wording: WS6's
  outstanding privacy-truth item (draft exists at `ws6-privacy-copy-draft.md`,
  explicitly not applied).
- `CONTEXT.md` glossary entries for the cloud runtime / AMR CLI contract:
  describe removed features.
- `docs/deployment/workspace-team-rollout.md`, `docs/testing/amr-*.zh-CN.md`:
  tokens now read CapyDesign but the workflows they describe (team/workspace
  rollout, AMR test cases) are WS6-removed surfaces.
- `MAINTAINERS.md` governance is inherited upstream wholesale (criteria, team
  concepts); a fork-specific pass is a human product decision.

## Verification

- `pnpm guard`: exit 1 **only** on the two documented `seedream`
  attribution-notice violations (WS1 item, pre-existing and permitted).
- `pnpm typecheck`: not re-run — this slice touched only `.md`, `.yml`
  (non-workflow), and `.sh` files; no compiled surface changed. The documented
  e2e/seedream baseline is unchanged.
- Residue grep per the WS8 prompt, classified above.
