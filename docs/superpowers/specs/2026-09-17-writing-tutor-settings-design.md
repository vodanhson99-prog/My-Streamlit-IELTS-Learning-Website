# Writing Tutor Reliability and Settings Design

## Goal

Make the locked IELTS Writing Tutor dependable under provider failures, then add a local Settings page where learners can choose English/Vietnamese and control tutor retry, motion, and local data behavior.

## Product decisions

- Tutor retries one transient failure automatically, then exposes a manual retry action.
- The Tutor remains a right-side drawer at every viewport size; it is not replaced by a mobile bottom sheet.
- Scores and locked evaluations are immutable. Tutor answers may explain them but cannot regrade or mutate them.
- Settings are local-first and require no authentication or database.
- Phase 1 UI copy remains English so it matches the current IELTS workspace.
- Phase 2 adds English and Vietnamese for the settings surface and shared Tutor states; the selected locale is persisted locally.
- API keys remain server-only and are never editable or displayed in the browser.

## Phase 1 design: Tutor reliability

The route validates the request with a bounded schema, creates the configured OpenAI-compatible provider, and classifies failures into validation, provider authentication, rate limit, timeout, network, malformed JSON, and schema mismatch. Transient failures receive one bounded retry with the same locked context and a small backoff; non-transient failures return a safe status and request id. The route must not expose essay text, API keys, raw provider bodies, or stack traces.

The structured Tutor response remains `{ reply: string, references: string[], suggestedFollowUps: string[] }`. The parser accepts valid JSON, fenced JSON, and one complete JSON object surrounded by provider commentary; it rejects truncated or ambiguous output. Provider diagnostics include only status, failure kind, latency, and schema paths.

The drawer keeps conversation history in localStorage, prevents duplicate sends, shows an explicit pending state, preserves the user's draft on failure, and renders an inline error row with `Try again`. Retry repeats the last user message without duplicating it in local history. Keyboard focus returns to the composer after success or error; Escape closes the drawer.

## Phase 2 design: Settings and bilingual UX

Add `/settings` to the primary navigation. Settings are represented by a versioned local preference object:

```ts
type AppLocale = "en" | "vi"
interface UserSettings {
  version: 1
  locale: AppLocale
  tutorAutoRetry: boolean
  reducedMotion: boolean
}
```

Defaults are `{ version: 1, locale: "en", tutorAutoRetry: true, reducedMotion: false }`. Parsing is fail-closed to defaults and never crashes on corrupted localStorage. The page provides language selection, Tutor retry toggle, reduced-motion toggle, clear Tutor history, and clear all local progress with explicit confirmation. Settings copy is translated through a small typed dictionary; provider/API configuration is not part of this page.

The Tutor reads locale and auto-retry preferences through the shared settings hook. Error, retry, loading, empty, close, and follow-up affordances use the dictionary. IELTS feedback content itself remains the source evaluation content; only UI chrome and Tutor helper text are translated.

## Accessibility and visual direction

Preserve the existing “Study Sheet” world from DESIGN.md: paper/ink palette, ruled borders, near-square corners, compact mono labels, no resting shadows. Use semantic dialog/drawer labeling, visible focus rings, keyboard Escape close, `aria-live="polite"` for pending/error states, minimum 40px touch targets, and reduced-motion behavior.

## Verification

- Unit tests cover request validation, retry classification, bounded retry count, parser variants, redacted diagnostics, settings migration/defaults, locale dictionary completeness, and localStorage corruption.
- Component tests cover disabled composer while pending, retry without duplicate user message, drawer keyboard close, and settings persistence.
- Route tests cover successful response, validation 400, provider timeout/401/429/invalid JSON, and safe 500/503 payloads.
- Manual pass checks `/writing/.../result`, Tutor drawer at desktop/mobile widths, `/settings`, locale switching, refresh persistence, reduced motion, and clear-data confirmation.
