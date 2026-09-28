# WS6 — privacy truth: copy draft for review

**Status: draft, not applied.** The app currently tells users their usage data may be shared with the
CapyDesign team. In a CapyDesign build there is no analytics or telemetry destination — the daemon's
`local/telemetry-sink.ts` returns a no-op service, `readAnalyticsEndpointConfig` returns null, and every
`post*` returns `not_expected` — so the copy is not stale, it is **wrong**.

Two changes are needed and both are held for approval:

1. **Copy** (below) — the misleading strings, in all 19 locales.
2. **Consent surface removal** — the first-run banner and the Settings toggles ask permission to send
   data that is never sent. Making the copy truthful does not make *asking* sensible; the banner should
   go, which touches `PrivacyConsentModal.tsx`, its App wiring, `PrivacySection.tsx`, and ~12 test files.

Why this is not applied yet: privacy wording is legally sensitive, and machine-quality output across 19
languages is a real risk — writing this draft I introduced two typos in one locale, which is exactly the
failure mode that would ship if the change were applied unreviewed. **Native review is recommended for
every non-English string below.**

## (1) String changes — 7 keys, 19 locales

### English (source of truth)

| Key | Current | Proposed |
| --- | --- | --- |
| `settings.privacyHint` | What data is shared with the CapyDesign team | Nothing is collected or sent. This build has no analytics destination. |
| `settings.privacyConsentKicker` | Help us improve CapyDesign | CapyDesign keeps your work on your machine |
| `settings.privacyConsentLead` | Sharing usage data helps us understand how… | This build has no analytics or telemetry destination, so nothing you do here is transmitted, whichever choice you make. Your preference is stored locally so the app stops asking. |
| `settings.privacyConsentBannerFooter` | Data sharing is on by default… | Nothing is transmitted in this build. Your preference is stored locally and can be changed any time in Settings. |
| `settings.privacyMetricsHint` | Run counts, token usage, error rate, and duration as basic usage metrics. | Run counts, token usage, error rate, and duration. Never transmitted in this build. |
| `settings.privacyContentHint` | After secrets… are stripped, we use prompts, assistant responses… | Prompts, responses, and tool input/output. Never transmitted in this build. |
| `settings.privacyDataDeletionHint` | Rotates your anonymous ID and stops sending… | Rotates the local anonymous ID. Nothing was transmitted, so there is no remote copy to delete. |

Keys kept unchanged because they remain true: `settings.privacy`, `settings.privacyConsentFooter`
("change these any time in Settings"), `settings.privacyConsentShare`, `settings.privacyConsentDecline`,
`settings.privacyConsentAccept`, `settings.privacyMetrics`, `settings.privacyContent`,
`settings.privacyInstallationId`, `settings.privacyOptedOut`, `settings.privacyDataDeletion`,
`settings.privacyConsentPolicyLink`.

### Translations

Authored for all 18 non-English locales in the companion script
`.openclaw/tmp/ws6-privacy-copy.mjs` (a per-locale key→value map; the run was aborted before writing).
Locales covered: ar, de, es-ES, fa, fr, hu, id, it, ja, ko, pl, pt-BR, ru, th, tr, uk, zh-CN, zh-TW.

Known defects found in my own draft, to fix before applying:

- `ko` `settings.privacyDataDeletionHint` — two stray `}` characters around the identifier.
- `ko` `settings.privacyConsentBannerFooter` — invalid escape `\u{ubcc0}` (should be `\u{bcc0}`).
- `tr` `settings.privacyMetricsHint` / `privacyContentHint` — leading space before the first word.

## (2) `PRIVACY.md` rewrite outline

The current page describes two telemetry classes, PostHog ingestion, a Langfuse relay, an opt-out
consent model, and AMR data sharing. None of it is true of this build. Proposed structure:

1. **Local-first, and nothing leaves the machine.** Projects, generated files, and BYOK keys stay local.
2. **No analytics or telemetry destination exists in this build.** No PostHog key, no relay, no Langfuse
   endpoint. Nothing is transmitted, so there is nothing to opt out of.
3. **What this means for the in-app controls.** The Settings → Privacy toggles and the first-run banner
   record a local preference only.
4. **What is never collected** — keep the existing list; it is still accurate and worth stating.
5. **Bring your own key** — keep as-is.
6. **Changes to this page** — keep as-is.
7. Remove: the two-telemetry-class split, the opt-out model, the PostHog/Langfuse transport sections,
   the "anonymous ID for optional analytics" rationale, and the OpenDesign AMR sharing section.
