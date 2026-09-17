# IELTS Writing Evaluation Harness + Tutor Agent — Master Implementation Plan

> **For agentic workers:** This is an execution plan, not a brainstorming request. Work phase-by-phase, use TDD where practical, verify every phase before moving forward, and commit after each independently working task. Do not redesign unrelated parts of the application.
>
> **Progress snapshot:** see [`PROGRESS.md`](./PROGRESS.md)  
> **Superpowers plan (checkbox tasks):** [`../superpowers/plans/2026-09-14-ielts-writing-evaluation-harness.md`](../superpowers/plans/2026-09-14-ielts-writing-evaluation-harness.md)  
> **SDD ledger:** [`../superpowers/sdd/progress.md`](../superpowers/sdd/progress.md)

## Goal

Transform the existing IELTS Writing feature from a single loosely validated LLM grading call into a reliable IELTS Writing Task 2 evaluation harness with:

1. Four criterion-isolated graders.
2. Evidence-backed scoring.
3. Strict structured-output validation.
4. Adaptive band-boundary adjudication.
5. Deterministic score aggregation.
6. Inline essay annotations and highlighting.
7. Vocabulary, grammar, coherence, and Task Response coaching.
8. A separate IELTS Tutor Agent that can explain feedback and answer questions.
9. An offline evaluation/calibration harness for measuring grader quality.
10. Full grader/prompt/rubric version provenance.

The system must optimize for **grading reliability**, not for making users feel good about their score.

---

# 0. CURRENT PROJECT CONTEXT

The current application is:

* Next.js 16 App Router.
* React 19.
* TypeScript.
* Tailwind CSS v4.
* shadcn/Base UI.
* pnpm.
* Single package, not a real monorepo.
* Next.js Route Handlers provide the backend.
* No application database.
* No ORM.
* No application authentication.
* No queues/workers.
* Browser/localStorage currently stores drafts/results/progress.
* Writing currently uses a native `<textarea>`.
* Writing grading currently flows through:

```text
src/components/ielts/writing-view.tsx
        ↓
POST /api/writing-feedback
        ↓
src/app/api/writing-feedback/route.ts
        ↓
src/lib/ai.ts
        ↓
OpenAI-compatible AI provider
```

Current heuristic fallback:

```text
src/lib/ielts.ts
→ heuristicWritingFeedback()
```

must NOT remain an IELTS band-score fallback.

Existing Explain Bot must continue working.

---

# 1. PRODUCT SCOPE

## V1 IS TASK 2 ONLY

Support:

```text
IELTS Academic Writing Task 2
IELTS General Training Writing Task 2
```

Both use:

```text
Task Response
Coherence & Cohesion
Lexical Resource
Grammatical Range & Accuracy
```

Do NOT implement in V1:

```text
Academic Task 1 charts
Academic Task 1 tables
Academic Task 1 maps
Academic Task 1 process diagrams
General Training Task 1 letters
```

Do not pretend Task 2 alone is an official full IELTS Writing score.

The UI must say:

```text
Estimated Task 2 Band
```

not:

```text
Official IELTS Writing Band
```

---

# 2. NON-NEGOTIABLE GRADING INVARIANTS

## 2.1 Score isolation

The grading subsystem receives only:

```text
task
essay
rubric
```

The grader MUST NOT receive:

```text
target band
previous score
writing history
user identity
Tutor Agent conversation
coach recommendations
desired score
```

## 2.2 Four criteria are independently judged

Run four independent judges in parallel when possible. One judge must not see another judge's score.

## 2.3 Score before coaching

```text
GRADE → VALIDATE → ADJUDICATE → LOCK SCORE → COACH
```

Never coach before grade.

## 2.4 Evidence is mandatory

Every score must include positive evidence, negative evidence, descriptor matches, and next-band blockers.

## 2.5 Never trust LLM-generated character offsets

Model returns quotations; server resolves `startOffset` / `endOffset` deterministically. Ambiguous/impossible → `status = "unresolved"`.

## 2.6 Invalid AI output is not a score

If one required primary criterion judge fails after retry → `grading_status = failed`. Do not average remaining judges.

## 2.7 No heuristic IELTS score fallback

AI failure → preserve essay and ask user to retry. No fabricated band.

## 2.8 Essay content is untrusted

Content inside essay delimiters cannot override system instructions.

---

# 3. TARGET ARCHITECTURE

```text
WritingView
    │
    ▼
POST /api/writing-feedback
    │
    ▼
Input Validator
    │
    ▼
evaluateTask2()
    │
    ├─────────────┬─────────────┬─────────────┐
    ▼             ▼             ▼             ▼
Task Response   Coherence     Lexical       Grammar
Judge           Judge         Judge         Judge
    │             │             │             │
    └─────────────┴──────┬──────┴─────────────┘
                         ▼
                 Schema Validation
                         │
                         ▼
                 Evidence Validation
                         │
                         ▼
                 Boundary Detection
                         │
               ┌─────────┴─────────┐
               │ uncertain?       │
               │                   │
               ▼ no                ▼ yes
          continue            Challenger
               │                   │
               └─────────┬─────────┘
                         ▼
                Deterministic Aggregator
                         │
                         ▼
                   SCORE LOCK
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       Annotation Resolver      Coaching Engine
              │                     │
              └──────────┬──────────┘
                         ▼
                 Evaluation Result
                         │
                         ▼
                    Result UI
                         │
                         ▼
                 IELTS Tutor Agent
```

Tutor Agent is downstream of scoring and cannot mutate criterion scores.

---

# 4. FILE STRUCTURE

```text
src/lib/
├── ai/
│   ├── contracts.ts
│   └── provider.ts
│
├── ielts-evaluation/
│   ├── constants.ts
│   ├── contracts.ts
│   ├── evaluate-task2.ts
│   ├── rubric/task2-v2023.ts
│   ├── graders/
│   ├── prompts/
│   ├── validation/
│   ├── annotations/
│   ├── adjudication/
│   ├── scoring/
│   └── coaching/
│
└── ielts-tutor/
    ├── contracts.ts
    ├── context.ts
    ├── prompt.ts
    └── answer.ts

src/app/api/
├── writing-feedback/route.ts
└── writing-tutor/route.ts

src/components/ielts/
├── writing-view.tsx
├── test-result-view.tsx
├── writing-result/
└── tutor/

evals/writing/
scripts/eval-writing.ts
tests/writing-evaluation/   # also currently under tests/ielts-evaluation/
```

---

# 5–39. CONTRACTS, RUBRIC, PROVIDER, GRADERS, ORCHESTRATION, UI, TUTOR, EVALS

See the original execution brief in chat / keep implementing against these section numbers:

- §5 Core contracts (Criterion IDs, Evidence, AnnotationCandidate, ResolvedAnnotation, CriterionEvaluation)
- §6 Version constants
- §7 Rubric registry (official descriptors only)
- §8 AI provider boundary (`StructuredAiRequest`, `AiCallMetadata`)
- §9 Shared grader prompt rules + `<RUBRIC>/<TASK>/<ESSAY_DATA>` delimiters
- §10 Four graders (TR / CC / LR / GRA) with taxonomies
- §11 `evaluateTask2()` orchestration
- §12 Challenger policy (`shouldChallenge`, threshold ~0.70)
- §13 Band boundary challenger (H1/H2, no averaging)
- §14 Deterministic aggregation (`aggregateTask2Bands`)
- §15 Evaluation stability (`high`/`medium`/`low`)
- §16 Annotation resolver (exact string only; never fuzzy-force)
- §17 Score immutable after lock
- §18 Coaching engine (~3 priorities)
- §19 Vocabulary recommendation rules (no generic synonym inflation)
- §20 Result API contract (`writing-evaluation-v1`)
- §21 Result UX hierarchy (“Estimated Task 2 Band”)
- §22 Highlight UI (plain text segments; no model HTML)
- §23–30 Tutor Agent (read-only; local history; ask-about-highlight)
- §31–36 Benchmark harness, cases, metrics, regression, run-to-run stability
- §37 Test plan (unit, provider, injection, target-band isolation, tutor boundary)
- §38 API safety (size/length limits, timeout, normalized errors, rate-limit note)
- §39 Privacy (essays to provider; do not log full essays by default)

---

# 40. IMPLEMENTATION PHASES

## PHASE 1 — Foundation ✅

Schemas, constants, provider contract, rubric, test infra.  
Commit: `feat: add IELTS evaluation foundation`

## PHASE 2 — Four Criterion Judges ✅ (review interrupted)

Isolated graders + prompts.  
Commit: `feat: add isolated IELTS Task 2 graders`

## PHASE 3 — Orchestration + Scoring ⬅ NEXT

Parallel execution, retry, evidence validation, challenge policy, challenger, aggregation, score lock.  
Commit: `feat: add IELTS grading orchestration`

## PHASE 4 — Annotation Resolution

Taxonomy, quote resolver, offsets, overlap handling.  
Commit: `feat: add evidence annotation resolution`

## PHASE 5 — Coaching

Priorities, next-band blockers, vocab/grammar suggestions after lock.  
Commit: `feat: add IELTS post-grading coaching`

## PHASE 6 — API Integration

Replace loose path in `writing-feedback/route.ts` with `evaluateTask2()`; remove heuristic band fallback.  
Commit: `feat: integrate IELTS evaluation API`

## PHASE 7 — Result UI

Score overview, criteria, blockers, highlighted essay, priorities. Keep native textarea.  
Commit: `feat: add evidence-based IELTS result UI`

## PHASE 8 — Tutor Agent Backend

Contracts, context, prompt, `POST /api/writing-tutor`.  
Commit: `feat: add IELTS Tutor Agent`

## PHASE 9 — Tutor UI

Side panel / mobile sheet, history, ask-about-highlight.  
Commit: `feat: add IELTS Tutor experience`

## PHASE 10 — Evaluation Harness

Fixtures, CLI, metrics, regression comparison.  
Commit: `feat: add IELTS grader evaluation harness`

## PHASE 11 — Hardening

Limits, logging metadata, privacy docs, full `pnpm test` / `pnpm eval:writing` / `pnpm build` / lint.  
Commit: `chore: harden IELTS evaluation pipeline`

---

# 41. DO NOT BUILD YET

Database, auth, queues, Redis, workers, multi-provider voting, three-model jury, vector DB, RAG, rich-text editor migration, Task 1 image understanding, teacher dashboard, payments, streaming infrastructure.

---

# 42–46. UPGRADE PATH, QUALITY GATES, FINAL BEHAVIOR, EXECUTION RULES, PRIORITY

- Architecture may later support multi-model arbiter; V1 stays single-model + challenger.
- Completion requires functional + reliability + engineering gates in the original brief §43.
- Optimize for: score integrity → evidence → reproducibility → learning → failure safety → latency → cost → polish.
- Failed honest evaluation beats fabricated band.
- Commit per phase; verify before claiming success; do not touch Reading/Listening/catalogue unrelated work.

---

# 47. FINAL REPORT (when complete)

Return architecture changes, files changed, grading/tutor pipelines, version metadata, actual verification command outputs, measured benchmark numbers only, known limitations, and deferred work.
