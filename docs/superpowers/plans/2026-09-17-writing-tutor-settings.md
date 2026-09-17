# Writing Tutor Reliability and Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task with a fresh implementer and review gate per task.

**Goal:** Make Writing Tutor reliable and convenient, then add a bilingual local Settings page with English/Vietnamese preferences and safe data controls.

**Architecture:** Keep the existing OpenAI-compatible provider and locked-evaluation boundary. Add a small server-side Tutor reliability layer (validation, one transient retry, bounded diagnostics) and a client-side settings store consumed by navigation, Settings, and Tutor UI. Keep all preferences local and all API secrets server-only.

**Tech Stack:** Next.js App Router 16, React, TypeScript, Tailwind CSS v4, shadcn/ui, Vitest, existing AI provider contracts.

**Spec:** `docs/superpowers/specs/2026-09-17-writing-tutor-settings-design.md`

## Global Constraints

- Tutor retries one transient failure automatically, then exposes a manual retry action.
- The Tutor remains a right-side drawer at every viewport size.
- Scores and locked evaluations are immutable.
- Settings are local-first; no authentication, database, or client-visible API key.
- Defaults are `locale: "en"`, `tutorAutoRetry: true`, `reducedMotion: false`.
- Preserve the existing “Study Sheet” visual system and accessibility requirements.
- Never log essay text, API keys, raw provider bodies, or stack traces.

---

## Phase 1 — Tutor reliability and drawer UX

### Task 1: Define Tutor failure model and request boundary

**Files:**
- Modify: `src/lib/ielts-tutor/contracts.ts`
- Modify: `src/app/api/writing-tutor/route.ts`
- Test: `tests/ielts-evaluation/hardening.test.ts`
- Test: `tests/ielts-evaluation/writing-tutor-route.test.ts` (create if absent)

**Deliverable:** Typed request parsing and safe route responses for validation, missing configuration, authentication, rate limit, timeout, malformed provider output, and unexpected failures. Return a request id and stable error kind; never return raw provider diagnostics.

**Test cases:** valid locked evaluation; missing/ unlocked evaluation → 400; empty/oversized message → 400; missing key → 503; provider auth/timeout/429 → safe status and retryable flag; unexpected error → 500 with request id only.

### Task 2: Add bounded provider retry and structured diagnostics

**Files:**
- Modify: `src/lib/ai/provider.ts`
- Modify: `src/lib/ielts-tutor/answer.ts`
- Modify: `src/lib/ai/contracts.ts`
- Test: `tests/ielts-evaluation/provider.test.ts`
- Test: `tests/ielts-evaluation/tutor-boundary.test.ts`

**Deliverable:** A single retry policy used by Tutor: retry only timeout, network, 429, and 5xx; never retry 400/401/403, invalid configuration, or deterministic schema mismatch more than once. Use bounded backoff and preserve the locked request context. Structured diagnostics expose failure kind, retry count, latency, and safe schema paths.

**Test cases:** transient failure succeeds on second attempt; transient failure fails after exactly two attempts; auth failure does not retry; malformed JSON is classified safely; no diagnostic contains essay/API-key text.

### Task 3: Harden Tutor structured response parsing

**Files:**
- Modify: `src/lib/ielts-tutor/answer.ts`
- Modify: `src/lib/ai/provider.ts`
- Test: `tests/ielts-evaluation/tutor-boundary.test.ts`

**Deliverable:** Accept plain JSON, fenced JSON, and the first complete JSON object surrounded by commentary. Reject truncated/ambiguous output. Enforce `reply`, bounded references, and bounded follow-up strings. Keep regrade refusal behavior unchanged.

**Test cases:** canonical response; fenced response; commentary-wrapped response; appended second object selects first complete object; truncated object rejects; oversized reply/references rejects.

### Task 4: Improve Tutor drawer interaction and failure recovery

**Files:**
- Modify: `src/components/ielts/tutor/tutor-panel.tsx`
- Modify: `src/components/ielts/tutor/tutor-composer.tsx`
- Modify: `src/components/ielts/tutor/tutor-message.tsx`
- Test: `tests/components/tutor-panel.test.tsx` (create using existing component-test setup)

**Deliverable:** Right-side responsive drawer with independent message scroll, composer pinned at bottom, duplicate-send prevention, pending state, inline retry action that preserves draft/history, safe error copy, `aria-live`, Escape close, and focus restoration.

**Test cases:** send disables composer; failed send does not duplicate user message; Try again repeats exactly the last request; success appends one assistant message; Escape closes; empty state and loading state are accessible.

### Task 5: Phase 1 integration verification

**Files:**
- Modify: `src/app/api/writing-tutor/route.ts` only if integration fixes are required.
- Test: `tests/ielts-evaluation/writing-tutor-route.test.ts`

**Deliverable:** End-to-end route/component contract verified against the configured API shape without real secrets. Run targeted tests, TypeScript, ESLint, and a manual local smoke test using a controlled fetcher.

---

## Phase 2 — Settings page and English/Vietnamese preferences

### Task 6: Add versioned local settings store and typed dictionary

**Files:**
- Create: `src/lib/settings/contracts.ts`
- Create: `src/lib/settings/storage.ts`
- Create: `src/lib/i18n/contracts.ts`
- Create: `src/lib/i18n/messages.ts`
- Create: `src/hooks/use-settings.ts`
- Test: `tests/settings/storage.test.ts`
- Test: `tests/settings/messages.test.ts`

**Deliverable:** Implement `UserSettings`, defaults, version migration, corrupted-storage fallback, SSR-safe subscription, and complete `en`/`vi` message keys for Settings and Tutor chrome. Storage key must be versioned and local-only.

**Test cases:** defaults; persistence; corrupted JSON fallback; unknown version fallback; locale round-trip; dictionary key parity.

### Task 7: Build `/settings` page

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/components/settings/settings-page.tsx`
- Create: `src/components/settings/language-setting.tsx`
- Create: `src/components/settings/tutor-settings.tsx`
- Create: `src/components/settings/data-settings.tsx`
- Modify: `src/components/site-header.tsx` (or current navigation owner)
- Test: `tests/components/settings-page.test.tsx`

**Deliverable:** Accessible Settings page linked from primary navigation with Language (English/Tiếng Việt), Tutor auto-retry toggle, reduced-motion toggle, clear Tutor history, and clear all local progress confirmation. No API key field. Copy uses typed dictionary and updates immediately without full navigation.

### Task 8: Connect settings to Tutor and global UI

**Files:**
- Modify: `src/components/ielts/tutor/tutor-panel.tsx`
- Modify: `src/components/ielts/tutor/tutor-composer.tsx`
- Modify: `src/components/ielts/writing-result/evaluation-warning.tsx`
- Modify: `src/components/ielts/site-shell.tsx` (or actual app shell owner)
- Test: `tests/components/tutor-settings-integration.test.tsx`

**Deliverable:** Tutor reads `locale`, `tutorAutoRetry`, and `reducedMotion`; retry behavior honors the toggle; Tutor loading/error/empty/follow-up/close strings switch between English and Vietnamese; reduced-motion disables nonessential animation classes.

### Task 9: Phase 2 accessibility and persistence verification

**Files:**
- Modify: any Phase 2 files only for verified defects.
- Test: `tests/settings/*.test.ts`, `tests/components/*.test.tsx`

**Deliverable:** Verify refresh persistence, keyboard navigation, focus visibility, screen-reader labels/live regions, mobile drawer at narrow width, reduced motion, and clear-data confirmation. Run the full relevant suite, TypeScript, ESLint, and an Impeccable detector pass on changed UI targets.

---

## Subagent execution order

Use `superpowers:subagent-driven-development` with one fresh implementer per task, explicit file ownership, and a task reviewer after every implementer. Tasks 1–3 are sequential because Tasks 2–3 consume the failure contracts from Task 1. Tasks 4–5 follow the server contract. Tasks 6–7 are sequential because the Settings page consumes the store/dictionary. Task 8 follows both the Tutor drawer and settings store. Task 9 is the final verification/review pass.

Do not dispatch multiple implementation agents against overlapping files in parallel. Each task must include a failing test first, a green test run, a focused commit, and a review package before the next task begins.
