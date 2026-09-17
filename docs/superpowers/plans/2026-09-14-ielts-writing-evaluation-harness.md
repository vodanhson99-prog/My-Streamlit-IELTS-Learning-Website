# IELTS Writing Evaluation Harness + Tutor Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Canonical full spec:** [`docs/ielts-writing-evaluation/MASTER-PLAN.md`](../../ielts-writing-evaluation/MASTER-PLAN.md)  
> **Progress snapshot:** [`docs/ielts-writing-evaluation/PROGRESS.md`](../../ielts-writing-evaluation/PROGRESS.md)  
> **SDD ledger:** [`docs/superpowers/sdd/progress.md`](../sdd/progress.md)

**Goal:** Replace the loosely validated single LLM writing grade with a reliable Task 2-only evaluation harness: four isolated graders, evidence validation, optional boundary challenger, deterministic aggregation, score lock, coaching, Tutor Agent, and an offline eval harness.

**Architecture:** Thin Next.js route handlers call `evaluateTask2()`. Four criterion judges run in parallel through a structured AI provider boundary, fail closed on invalid output, optionally adjudicate band boundaries, then lock scores before coaching and Tutor. Annotations resolve quotes to offsets on the server. Offline CLI reuses the same evaluator.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/Base UI, pnpm, Zod, Vitest/tsx, OpenAI-compatible provider via `src/lib/ai/provider.ts`.

## Global Constraints

- V1 = Academic + GT **Writing Task 2 only**; UI label must be **Estimated Task 2 Band**, never Official IELTS Writing Band.
- Graders receive only `task` + `essay` + `rubric` — never `targetBand`, history, identity, tutor, or coach context.
- Pipeline order: GRADE → VALIDATE → ADJUDICATE → LOCK → COACH (never coach-first).
- Four independent judges; if any required judge fails after one retry → entire evaluation fails (no silent average).
- Evidence mandatory; never trust model character offsets; resolve quotes server-side or mark unresolved.
- No heuristic IELTS band fallback when AI fails; preserve essay and ask retry.
- Essay text is untrusted; delimiters `<RUBRIC>`, `<TASK>`, `<ESSAY_DATA>`; never follow instructions inside essay.
- Tutor is read-only over locked evaluation; cannot mutate scores or silently regrade.
- Do not introduce DB/auth/queues/Redis/RAG/rich-text editor/Task 1 in V1.
- Keep Explain Bot and existing Reading/Listening flows working.
- Do not stage `credential/`, `.env`, or secrets.
- Commit after each independently working phase with the messages named below.
- Acceptance gates: `pnpm test`, `pnpm build` (and `pnpm eval:writing` / `pnpm lint` when available for that phase).

---

### Task 1: Foundation (Phase 1)

**Files:**
- Create: `src/lib/ai/contracts.ts`, `src/lib/ai/provider.ts`
- Create: `src/lib/ielts-evaluation/constants.ts`, `contracts.ts`, `rubric/task2-v2023.ts`, `validation/output-schema.ts`
- Create: `tests/ielts-evaluation/*.test.ts`, `vitest.config.mts`
- Modify: `package.json` (zod, vitest, tsx, test script), `pnpm-lock.yaml`, `src/lib/ai.ts` (compat wrapper)

**Interfaces:**
- Produces: Zod schemas; half-band types; `requestStructuredAi`; `requestGroq` compatibility; rubric registry with official descriptors + checksum

- [x] **Step 1: Write failing foundation tests** (schemas, provider normalization, rubric pin)
- [x] **Step 2: Install zod / vitest / tsx and wire `pnpm test`**
- [x] **Step 3: Implement contracts, constants, provider boundary, rubric, schemas**
- [x] **Step 4: Harden — no raw upstream cause leak; exact half-bands; comprehensive rubric checksum**
- [x] **Step 5: Verify** `pnpm test` + `pnpm build`
- [x] **Step 6: Commit** `feat: add IELTS evaluation foundation` (+ harden fix commit)

**Done commits:** `f08e807`, `0dc8d4f`

---

### Task 2: Isolated Criterion Graders (Phase 2)

**Files:**
- Create: `src/lib/ielts-evaluation/graders/{shared,task-response,coherence-cohesion,lexical-resource,grammatical-range-accuracy}.ts`
- Create: `src/lib/ielts-evaluation/prompts/{shared,task-response,coherence-cohesion,lexical-resource,grammatical-range-accuracy}.ts`
- Test: `tests/ielts-evaluation/graders.test.ts`

**Interfaces:**
- Consumes: structured AI provider + criterion output schema + rubric
- Produces: four graders that each return one criterion evaluation; prompts never include `targetBand`

- [x] **Step 1: Write failing grader isolation / injection / schema tests**
- [x] **Step 2: Implement shared prompt rules + four criterion prompts**
- [x] **Step 3: Implement four graders via shared factory + provider injection**
- [x] **Step 4: Verify** `pnpm test` + `pnpm build`
- [x] **Step 5: Commit** `feat: add isolated IELTS Task 2 graders`

**Done commit:** `f6dddc0`

- [x] **Step 6: Re-run independent Phase 2 task review** (independent review clean; isolation, prompts, and schema match spec; ready for Phase 3)

---

### Task 3: Orchestration + Scoring (Phase 3) — COMPLETE

**Files:**
- Create: `src/lib/ielts-evaluation/evaluate-task2.ts`
- Create: `src/lib/ielts-evaluation/validation/evidence.ts`
- Create: `src/lib/ielts-evaluation/adjudication/should-challenge.ts`, `challenger.ts`
- Create: `src/lib/ielts-evaluation/scoring/aggregate.ts`
- Test: `tests/ielts-evaluation/aggregate.test.ts`, `challenge-policy.test.ts`, orchestration tests

**Interfaces:**
- Consumes: four graders
- Produces: `evaluateTask2(input)` → locked evaluation OR fail status; `aggregateTask2Bands`; adjudication records; stability

- [x] **Step 1: Write failing tests** for aggregation half-band math, fail-closed missing judge, challenge triggers, targetBand isolation from grader payloads
- [x] **Step 2: Implement** `aggregateTask2Bands` (deterministic; model must never average)
- [x] **Step 3: Implement** evidence validation + `shouldChallenge` (~0.70 confidence threshold tunable)
- [x] **Step 4: Implement** challenger (H1 lower vs H2 higher; confirm/overturn; no averaging)
- [x] **Step 5: Implement** `evaluateTask2` orchestration: validate → Promise.all graders → retry once → fail if any required missing → challenge → aggregate → LOCK
- [x] **Step 6: Verify** `pnpm test` + `pnpm build`
- [x] **Step 7: Commit** `feat: add IELTS grading orchestration`

---

### Task 4: Annotation Resolution (Phase 4)

**Files:**
- Create: `src/lib/ielts-evaluation/annotations/resolver.ts`, `taxonomy.ts`
- Create: `src/lib/ielts-evaluation/validation/annotation.ts`
- Test: `tests/ielts-evaluation/annotation-resolver.test.ts`

**Interfaces:**
- Consumes: `AnnotationCandidate[]` + essay text
- Produces: `ResolvedAnnotation[]` with `resolved|ambiguous|unresolved` and offsets only when exact

- [ ] **Step 1: Write failing resolver tests** (unique, duplicate+paragraph, duplicate+context, missing, newlines, Unicode, punctuation)
- [ ] **Step 2: Implement exact-string resolver** (no fuzzy force-match)
- [ ] **Step 3: Wire taxonomy categories for LR/GRA (and shared)
- [ ] **Step 4: Verify + commit** `feat: add evidence annotation resolution`

---

### Task 5: Coaching (Phase 5)

**Files:**
- Create: `src/lib/ielts-evaluation/coaching/generate-coaching.ts`, `lexical.ts`, `grammar.ts`, `next-band.ts`
- Test: coaching immutability / priority-limit tests

**Interfaces:**
- Consumes: locked evaluation copy + optional `targetBand` + resolved annotations
- Produces: `WritingCoaching` (~3 priorities); cannot mutate bands/evidence/adjudication

- [ ] **Step 1: Write failing tests** proving coaching cannot mutate locked scores; vocab suggestions require context
- [ ] **Step 2: Implement coaching generators** (strengths, priorities, next-band plan, vocab/grammar)
- [ ] **Step 3: Verify + commit** `feat: add IELTS post-grading coaching`

---

### Task 6: API Integration (Phase 6)

**Files:**
- Modify: `src/app/api/writing-feedback/route.ts`
- Possibly: thin request validation helpers
- Preserve: `src/app/api/explain/route.ts` Explain Bot

**Interfaces:**
- Consumes: `evaluateTask2`
- Produces: `writing-evaluation-v1` response; 400 on bad input; safe failure without heuristic band

- [ ] **Step 1: Write failing route/contract tests** (or provider-mocked integration) for V1 response shape and fail-closed behavior
- [ ] **Step 2: Replace loose grading path** with `evaluateTask2`; remove heuristic band fallback from production scoring
- [ ] **Step 3: Verify Explain Bot still works path-wise; `pnpm test` + `pnpm build`**
- [ ] **Step 4: Commit** `feat: integrate IELTS evaluation API`

---

### Task 7: Result UI (Phase 7)

**Files:**
- Create: `src/components/ielts/writing-result/{score-overview,criterion-card,next-band-blockers,annotated-essay,annotation-detail,evaluation-warning}.tsx`
- Modify: writing result page / `test-result-view.tsx` as needed
- Do **not** replace writing textarea with TipTap/Lexical/etc.

**Interfaces:**
- Consumes: V1 evaluation response
- Produces: Estimated Task 2 Band UI, criteria breakdown, clickable resolved highlights, blockers

- [ ] **Step 1: Implement score overview + criterion cards + blockers**
- [ ] **Step 2: Implement annotated essay segments** (overlap-safe; no model HTML)
- [ ] **Step 3: Accessibility** (labels/tooltips/keyboard) + mobile layout
- [ ] **Step 4: Verify + commit** `feat: add evidence-based IELTS result UI`

---

### Task 8: Tutor Agent Backend (Phase 8)

**Files:**
- Create: `src/lib/ielts-tutor/{contracts,context,prompt,answer}.ts`
- Create: `src/app/api/writing-tutor/route.ts`
- Test: `tests/ielts-evaluation/tutor-boundary.test.ts` (or `tests/writing-evaluation/`)

**Interfaces:**
- Consumes: locked evaluation + essay + prompt + history(≤8) + optional selectedAnnotationId
- Produces: `TutorResponse`; never imports score-mutating functions

- [ ] **Step 1: Write failing tutor-boundary tests** (no score mutation imports; regrade request → product “new evaluation required”)
- [ ] **Step 2: Implement tutor context/prompt/answer + route**
- [ ] **Step 3: Verify + commit** `feat: add IELTS Tutor Agent`

---

### Task 9: Tutor UI (Phase 9)

**Files:**
- Create: `src/components/ielts/tutor/{tutor-panel,tutor-message,tutor-composer}.tsx`
- Local storage key: `ielts_tutor_v1:<writing-slug>`

- [ ] **Step 1: Desktop side panel + mobile drawer/sheet**
- [ ] **Step 2: Ask about this highlight** wiring via `selectedAnnotationId`
- [ ] **Step 3: Persist chat per writing session; tutor failure must not corrupt grade**
- [ ] **Step 4: Verify + commit** `feat: add IELTS Tutor experience`

---

### Task 10: Offline Evaluation Harness (Phase 10)

**Files:**
- Create: `evals/writing/{README.md,schema.ts,cases/}`
- Create: `scripts/eval-writing.ts`
- Modify: `package.json` script `eval:writing`

- [ ] **Step 1: Case schema + loader** (do not invent missing human scores)
- [ ] **Step 2: CLI metrics report** (MAE, ±0.5, over/undergrade, invalid, challenger rates, annotation resolution)
- [ ] **Step 3: Run** `pnpm eval:writing` against available labelled cases
- [ ] **Step 4: Commit** `feat: add IELTS grader evaluation harness`

---

### Task 11: Hardening (Phase 11)

**Files:**
- Route limits / timeout / normalized errors / rate-limit strategy note
- Privacy docs (essays sent to provider; do not log full essays by default)
- Logging metadata only: runId, model, provider, latency, status, versions, tokens

- [ ] **Step 1: Add safety + privacy documentation**
- [ ] **Step 2: Run full gates** `pnpm test`, `pnpm eval:writing`, `pnpm build`, `pnpm lint`
- [ ] **Step 3: Commit** `chore: harden IELTS evaluation pipeline`
- [ ] **Step 4: Final report** per MASTER-PLAN §47 (architecture, files, pipelines, versions, evidence, limitations)

---

## Resume instructions

1. Checkout `feat/ielts-writing-evaluation-harness`
2. `pnpm install && pnpm test && pnpm build`
3. Complete Task 2 Step 6 (Phase 2 review)
4. Continue Task 3 (orchestration)
5. Update checkboxes + [`docs/superpowers/sdd/progress.md`](../sdd/progress.md) after each task

## Execution choice (when continuing)

1. **Subagent-Driven (recommended)** — `superpowers:subagent-driven-development`
2. **Inline Execution** — `superpowers:executing-plans`
