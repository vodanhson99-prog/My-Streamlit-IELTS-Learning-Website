# Remaining IELTS Evaluation Phases Design

## Goal

Complete remaining IELTS Writing evaluation work from Phase 4 through Phase 11 while extending support to Academic Task 1 and General Training Task 1 through a separate Task 1 pipeline. Preserve existing Task 2 reliability work and keep Reading, Listening, Explain Bot, and native textarea behavior working.

## Architecture

Use separate evaluators:

- `evaluateTask2()` keeps current Task 2 contracts, rubric, four isolated criterion graders, evidence validation, challenger, deterministic aggregation, and score lock.
- `evaluateTask1()` owns Task 1 routing and separate rubric/schema/grader contracts for Academic Task 1 and General Training Task 1.
- Shared downstream services consume locked evaluation contracts: annotation resolution, coaching, result presentation, Tutor Agent context, and offline metrics.

Task 1 criterion mapping:

- Academic Task 1: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.
- General Training Task 1: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy, with letter-purpose/register/bullet coverage encoded in Task Achievement rubric and prompts.

No Task 1 implementation reuses Task 2 descriptors. No evaluator returns heuristic IELTS scores after provider failure.

## Data flow

```text
WritingView
  --> writing-feedback route
      --> task classifier and request validator
          --> evaluateTask1() or evaluateTask2()
              --> isolated graders
              --> schema and evidence validation
              --> optional boundary challenger
              --> deterministic aggregation
              --> score lock
                  --> annotation resolver
                  --> coaching
                  --> result response
                      --> result UI
                          --> read-only Tutor Agent
```

## Phase boundaries

### Phase 4 — Annotation resolution

Build exact quote resolution shared by Task 1 and Task 2. Resolve unique quotes, duplicate quotes with paragraph/context disambiguation, Unicode/newline/punctuation cases, and mark ambiguous or missing matches unresolved. Generate offsets only on exact resolution. Never fuzzy-force a match or trust model offsets.

### Phase 5 — Coaching

Generate coaching only from immutable locked evaluations and resolved annotations. Limit priorities to roughly three. Include criterion strengths, next-band blockers, contextual vocabulary advice, grammar advice, and Task Achievement/Response advice. Coaching cannot mutate bands, evidence, adjudication, or lock state.

### Phase 6 — API integration

Replace loose `/api/writing-feedback` grading path with validated routing to `evaluateTask1()` or `evaluateTask2()`. Support Academic/GT and Task 1/Task 2. Return versioned success and safe failure contracts. Remove heuristic score fallback. Preserve essay on failure and return retry guidance. Keep `/api/explain` unchanged.

### Phase 7 — Result UI

Render task-specific estimated band labels, criterion cards, blockers, coaching, evidence highlights, and evaluation warnings. Use plain essay text plus server-resolved segments; never render model HTML. Preserve native textarea. Add keyboard-accessible annotation details and mobile layout.

### Phase 8 — Tutor Agent backend

Create read-only Tutor contracts, context builder, prompt, answer parser, and `/api/writing-tutor`. Tutor receives locked evaluation, essay, task prompt, bounded history, and optional selected annotation. Regrade or score mutation requests return a clear new-evaluation-required response. Tutor imports no score-mutating functions.

### Phase 9 — Tutor UI

Add desktop panel and mobile drawer/sheet. Wire selected highlights to ask-about-highlight. Persist bounded conversation per writing session in versioned localStorage. Tutor failures cannot alter stored grading results.

### Phase 10 — Offline evaluation harness

Add labelled case schema and loader for Task 1 and Task 2. Never invent missing human scores. Add CLI metrics for MAE, within-half-band accuracy, over/undergrading, invalid outputs, challenge frequency, annotation resolution, and run-to-run stability. Add `pnpm eval:writing`.

### Phase 11 — Hardening

Add request size and essay length limits, timeout handling, normalized client-safe errors, rate-limit strategy documentation, privacy guidance, metadata-only logging, version provenance, and full verification gates.

## Reliability rules

- Graders receive only their allowed task, essay, and rubric data.
- Four criterion graders run independently and fail closed if any required judge remains invalid after one retry.
- Pipeline order remains `GRADE → VALIDATE → ADJUDICATE → LOCK → COACH`.
- Evidence quotes must exist verbatim in essay before score acceptance.
- Challenger selects lower or higher hypothesis; never averages.
- Overall score uses deterministic half-band aggregation.
- Locked scores are immutable.
- Essay content is untrusted and cannot override system instructions.
- No database, auth, queue, Redis, RAG, rich-text editor, or unrelated skill changes.

## Verification

Each phase gets focused tests. Full gates before phase completion:

- `pnpm test`
- `pnpm build`
- `pnpm lint` when lint path is available
- `pnpm eval:writing` from Phase 10 onward

## Deferred

Teacher dashboard, payments, streaming infrastructure, multi-model jury, vector DB, and unrelated Reading/Listening redesign remain out of scope.
