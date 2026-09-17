# IELTS Evaluation Repair and Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make current IELTS Writing evaluation changes truthful and production-safe: repair provider/output failures, finish requested evidence and scoring architecture, complete benchmark coverage, and prove behavior with repeatable checks.

**Architecture:** Keep Task 1 and Task 2 as separate evaluator pipelines. Shared provider parsing, evidence contracts, annotation resolution, coaching, and benchmark metrics stay deterministic and fail closed. Combined Writing API keeps raw criterion means and raw weighted mean; display rounding occurs only at final presentation after official intermediate-rounding policy is verified.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Vitest 5, `tsx`, pnpm, OpenAI-compatible provider.

## Global Constraints

- Do not trust model-generated offsets; resolve exact quotes server-side.
- Do not fabricate evidence, blockers, bands, or missing human reference scores.
- Invalid required criterion output fails whole evaluation after one retry.
- Keep essay content untrusted; preserve `<RUBRIC>`, `<TASK>`, and `<ESSAY_DATA>` boundaries.
- Keep Explain Bot, Reading, Listening, native writing textarea, and unrelated UI behavior unchanged.
- Do not commit `credential/`, `.env`, raw essays in logs, or provider secrets.
- Task 1 and Task 2 rubric descriptors remain separate.
- Use raw `task1CriterionMean`, `task2CriterionMean`, and `weightedWritingMean`; `displayBand` is final display value only.
- Do not call self-reported LLM confidence a probability. Use calibrated reliability signals before changing challenger behavior.
- Run focused test after each task, then `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`, and `pnpm eval:writing` before completion.

---

## Current Evidence — Start Here

Observed live run from `pnpm exec tsx scripts/eval-writing.ts --live --category regression`:

- 9 labelled cases loaded.
- 4 failed; invalid-output rate 44.4%.
- Task 1 repeatedly failed because `nextBandBlockers` was empty below Band 9.
- Task 2 failed with `invalid_union` at `limitingEvidence[0].anchor.type`; provider output used an unsupported discriminator.
- 5 cases scored but overall MAE was 1.8, exact agreement 0%, ±0.5 agreement 0%, mean bias +1.8. This is a failed calibration result, not success.
- Existing report is `evals/writing/reports/latest.{json,txt}` and is gitignored.
- Current working tree contains unrelated modified UI/parser files. Do not revert or overwrite them. Limit edits to files named in each task.

Existing implementation already has partial work in:

- `src/lib/ai/provider.ts`
- `src/lib/ielts-evaluation/contracts.ts`
- `src/lib/ielts-evaluation/task1/contracts.ts`
- `src/lib/ielts-evaluation/task1/graders/shared.ts`
- `src/lib/ielts-evaluation/graders/shared.ts`
- `src/lib/ielts-evaluation/validation/evidence.ts`
- `src/lib/ielts-evaluation/validation/output-schema.ts`
- `src/lib/ielts-evaluation/evaluate-task1.ts`
- `src/lib/ielts-evaluation/evaluate-task2.ts`
- `src/lib/ielts-evaluation/coaching/generate-coaching.ts`
- `src/app/api/writing-feedback/route.ts`
- `scripts/eval-writing.ts`

Treat current tests as regression guards, not proof that live provider output works.

---

### Task 1: Capture provider and model-output failures before changing behavior

**Files:**
- Modify: `src/lib/ai/contracts.ts`
- Modify: `src/lib/ai/provider.ts`
- Modify: `src/lib/ielts-evaluation/evaluate-task1.ts`
- Modify: `src/lib/ielts-evaluation/evaluate-task2.ts`
- Test: `tests/ielts-evaluation/provider.test.ts`
- Test: `tests/ielts-evaluation/orchestration.test.ts`

**Interfaces:**
- Preserve `AIProvider.complete()` and `completeStructured()` public signatures.
- Add bounded diagnostic metadata only: provider, model, request ID if available, HTTP status, parse/schema error class, retry count, latency.
- Never log full essay, API key, raw response body, or full model output.

- [ ] **Step 1: Write failing tests for error classification**

Add cases proving:

```ts
expect(classifyStructuredFailure(new SyntaxError("bad JSON"))).toBe("malformed-json")
expect(classifyStructuredFailure(new ZodError([]))).toBe("schema-invalid")
expect(classifyStructuredFailure(new AIProviderError("timeout", "timeout", true))).toBe("provider-timeout")
```

Also assert retry logs/metadata identify criterion and attempt without including essay text or provider response content.

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
pnpm exec vitest run tests/ielts-evaluation/provider.test.ts tests/ielts-evaluation/orchestration.test.ts
```

Expected: FAIL because classifier/metadata helper does not exist.

- [ ] **Step 3: Implement bounded classification**

Add smallest helper near provider boundary. Keep `parseJsonText()` support for one fenced JSON object and `stream: false`. In orchestration, log only:

```text
criterion, attempt, failure kind, safe message, elapsedMs
```

Do not convert schema-invalid output into a score. Retry once, then fail closed.

- [ ] **Step 4: Run focused tests**

Expected: PASS; no raw essay or response text in serialized errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/contracts.ts src/lib/ai/provider.ts src/lib/ielts-evaluation/evaluate-task1.ts src/lib/ielts-evaluation/evaluate-task2.ts tests/ielts-evaluation/provider.test.ts tests/ielts-evaluation/orchestration.test.ts
git commit -m "fix: classify IELTS evaluation failures safely"
```

---

### Task 2: Make Task 1 output normalization fail closed without silently discarding required fields

**Files:**
- Modify: `src/lib/ielts-evaluation/task1/graders/shared.ts`
- Modify: `src/lib/ielts-evaluation/task1/contracts.ts`
- Test: `tests/ielts-evaluation/task1-provider-shape.test.ts`

**Interfaces:**
- `createTask1CriterionGrader(provider, criterionId)` returns `Task1CriterionEvaluation` only after strict schema and essay evidence validation downstream.
- Accepted evidence anchor types: `{ type: "span", quote }`, `{ type: "paragraph", paragraphIndex }`, `{ type: "global" }`.
- `supportingEvidence` requires one item; below Band 9, `limitingEvidence` and `nextBandBlockers` require one item; Band 9 may omit both semantically but must provide arrays.

- [ ] **Step 1: Add failing regression fixtures for real malformed shapes**

Add tests for each provider shape observed in live logs:

```ts
{ band: 6, limitingEvidence: [{ anchor: { type: "negative", quote: "..." }, rationale: "..." }] }
{ band: 6, nextBandBlockers: [] }
{ band: 6, nextBandBlockers: [{ reason: "..." }] }
{ criterion: "Task Achievement", score: 6, justification: "..." }
```

Expected: each rejects; no fallback quote, stringified object, rounded decimal, or invented blocker.

- [ ] **Step 2: Run focused tests**

```bash
pnpm exec vitest run tests/ielts-evaluation/task1-provider-shape.test.ts
```

Expected: new tests fail only where current normalization incorrectly accepts/discards malformed data.

- [ ] **Step 3: Replace lossy normalization with strict shape gate**

Use normalization only for explicit legacy evidence arrays that can be losslessly mapped. If a required new field exists but contains malformed items, return raw input so Zod rejects it; do not `flatMap` invalid items into an empty valid-looking array. Do not map `blockers` objects to strings. Keep integer band requirement and exact descriptor ID.

- [ ] **Step 4: Add test for valid paragraph/global evidence**

Ensure paragraph/global anchors pass without quote lookup; only `span` quote and annotation quotes require verbatim essay validation in `validation/evidence.ts`.

- [ ] **Step 5: Run tests and commit**

```bash
pnpm exec vitest run tests/ielts-evaluation/task1-provider-shape.test.ts tests/ielts-evaluation/evidence.test.ts
 git add src/lib/ielts-evaluation/task1/graders/shared.ts src/lib/ielts-evaluation/task1/contracts.ts tests/ielts-evaluation/task1-provider-shape.test.ts
 git commit -m "fix: fail closed on malformed Task 1 evidence"
```

---

### Task 3: Add equivalent Task 2 normalization or stricter prompt contract

**Files:**
- Modify: `src/lib/ielts-evaluation/graders/shared.ts`
- Modify: `src/lib/ielts-evaluation/prompts/shared.ts`
- Test: `tests/ielts-evaluation/graders.test.ts`

**Interfaces:**
- Task 2 grader must accept only canonical evidence shape, or a deliberately documented lossless legacy mapping.
- No unsupported discriminator such as `positive`, `negative`, `strength`, `weakness`, or arbitrary object anchor may survive parsing.

- [ ] **Step 1: Add failing tests for discriminator variants**

Test canonical `span`, `paragraph`, `global` success and unsupported anchor failure. Test malformed blocker object failure. Test missing blocker/limitation below Band 9 failure.

- [ ] **Step 2: Strengthen prompt with explicit examples and prohibition**

State exact JSON shape twice: once in system instructions and once in user request. Explicitly say:

```text
anchor.type must be exactly span, paragraph, or global; never positive or negative.
nextBandBlockers items must be JSON strings, never objects.
```

- [ ] **Step 3: Implement only lossless normalization if live provider demonstrably emits a known legacy form**

If no stable legacy form exists, keep strict parsing. Do not broaden schema to accept arbitrary model output merely to increase pass rate.

- [ ] **Step 4: Run focused tests and commit**

```bash
pnpm exec vitest run tests/ielts-evaluation/graders.test.ts
 git add src/lib/ielts-evaluation/graders/shared.ts src/lib/ielts-evaluation/prompts/shared.ts tests/ielts-evaluation/graders.test.ts
 git commit -m "fix: enforce canonical Task 2 evidence anchors"
```

---

### Task 4: Correct evidence validation and annotation resolver edge cases

**Files:**
- Modify: `src/lib/ielts-evaluation/validation/evidence.ts`
- Modify: `src/lib/ielts-evaluation/annotations/resolver.ts`
- Modify: `src/lib/ielts-evaluation/contracts.ts`
- Test: `tests/ielts-evaluation/evidence.test.ts`
- Test: `tests/ielts-evaluation/annotation-resolver.test.ts`

**Interfaces:**
- `validateCriterionEvidence(evaluation, essay)` returns `{ valid, errors }`.
- `resolveAnnotations(candidates, essay, criterionId)` returns statuses `resolved | ambiguous | unresolved`; offsets exist only for `resolved`.
- IDs must be deterministic within one evaluation; avoid `Date.now()` so repeated benchmark runs can compare outputs.

- [ ] **Step 1: Add failing resolver tests**

Cover unique quote, duplicate quote with paragraph index, duplicate quote with surrounding context, missing quote, empty quote, Unicode, newline boundaries, punctuation, and paragraph index out of range.

- [ ] **Step 2: Fix paragraph splitting and offsets**

Preserve exact UTF-16 JavaScript offsets used by DOM/string slicing. Exclude empty paragraphs from paragraph index mapping only if contract documents zero-based non-empty paragraphs. Ensure `essay.slice(startOffset, endOffset) === quote` for every resolved annotation.

- [ ] **Step 3: Make IDs deterministic**

Use `${criterionId}-anno-${index}` or a stable hash of criterion, index, quote, and label. Do not use wall clock time.

- [ ] **Step 4: Run tests and commit**

```bash
pnpm exec vitest run tests/ielts-evaluation/evidence.test.ts tests/ielts-evaluation/annotation-resolver.test.ts
 git add src/lib/ielts-evaluation/validation/evidence.ts src/lib/ielts-evaluation/annotations/resolver.ts src/lib/ielts-evaluation/contracts.ts tests/ielts-evaluation/evidence.test.ts tests/ielts-evaluation/annotation-resolver.test.ts
 git commit -m "fix: make IELTS evidence resolution deterministic"
```

---

### Task 5: Replace confidence heuristic with explicit reliability signals

**Files:**
- Modify: `src/lib/ielts-evaluation/adjudication/should-challenge.ts`
- Modify: `src/lib/ielts-evaluation/evaluate-task2.ts`
- Modify: `src/lib/ielts-evaluation/contracts.ts`
- Modify: `scripts/eval-writing.ts`
- Test: `tests/ielts-evaluation/challenger.test.ts`
- Test: `tests/ielts-evaluation/eval-harness.test.ts`

**Interfaces:**
- Add optional `reliabilityScore` metadata, but do not claim it is calibrated until benchmark data supports calibration.
- Reliability inputs should include objective signals: descriptor conflict, evidence insufficiency, boundary proximity, repeat-run instability, and challenger history.
- Preserve backward compatibility for callers that provide `confidenceScores`; map self-confidence to a low-priority diagnostic only, not sole trigger.

- [ ] **Step 1: Add failing policy tests**

Examples:

```ts
expect(shouldChallenge({ band: 6, evidenceSufficient: false })).toMatchObject({ challenge: true })
expect(shouldChallenge({ band: 6, descriptorConflict: true })).toMatchObject({ challenge: true })
expect(shouldChallenge({ band: 6, confidence: 0.4, evidenceSufficient: true, descriptorConflict: false })).toMatchObject({ challenge: false })
```

- [ ] **Step 2: Implement minimal signal-based decision**

Define a typed input with boolean/number objective signals. Compute a bounded `reliabilityScore` only for observability. Trigger challenger on configured objective conditions; retain threshold as a temporary fallback only when no objective metadata exists, and mark reason explicitly.

- [ ] **Step 3: Add benchmark fields**

Record trigger, overturn, and whether challenge agreed with reference. Add run-to-run variance field in report model.

- [ ] **Step 4: Run tests and commit**

```bash
pnpm exec vitest run tests/ielts-evaluation/challenger.test.ts tests/ielts-evaluation/eval-harness.test.ts
 git add src/lib/ielts-evaluation/adjudication/should-challenge.ts src/lib/ielts-evaluation/evaluate-task2.ts src/lib/ielts-evaluation/contracts.ts scripts/eval-writing.ts tests/ielts-evaluation/challenger.test.ts tests/ielts-evaluation/eval-harness.test.ts
 git commit -m "feat: add evidence-based grader reliability signals"
```

---

### Task 6: Preserve raw combined Writing means and verify final rounding policy

**Files:**
- Modify: `src/app/api/writing-feedback/route.ts`
- Modify: `src/lib/ielts-evaluation/task1/contracts.ts`
- Modify: `src/lib/ielts-evaluation/contracts.ts`
- Modify: `src/lib/ielts-evaluation/scoring/aggregate.ts`
- Test: `tests/ielts-evaluation/aggregate.test.ts`
- Test: `tests/ielts-evaluation/api-contract.test.ts` (create)

**Interfaces:**

```ts
type CombinedWritingScore = {
  task1CriterionMean: number
  task2CriterionMean: number
  weightedWritingMean: number
  displayBand: IeltsHalfBand
}
```

- [ ] **Step 1: Add failing boundary tests**

Test values where rounding each task before weighting differs from weighting raw means. Assert payload includes all four fields and `band_estimate === displayBand` only for backward compatibility.

- [ ] **Step 2: Implement raw mean calculation**

Compute:

```ts
const task1CriterionMean = mean(task1Result.criteria.map(({ band }) => band))
const task2CriterionMean = mean(task2Result.criteria.map(({ band }) => band))
const weightedWritingMean = (task1CriterionMean + 2 * task2CriterionMean) / 3
const displayBand = calculateIeltsHalfBand(weightedWritingMean)
```

Do not weight already-rounded `overallBand` values. Add raw fields to API result and UI contract.

- [ ] **Step 3: Verify official intermediate rounding rule**

Record source URL and decision in a short existing privacy/evaluation note, or code comment. If no official intermediate rule is available, preserve raw values and document final display rounding as a project policy.

- [ ] **Step 4: Run tests and commit**

```bash
pnpm exec vitest run tests/ielts-evaluation/aggregate.test.ts tests/ielts-evaluation/api-contract.test.ts
 git add src/app/api/writing-feedback/route.ts src/lib/ielts-evaluation/task1/contracts.ts src/lib/ielts-evaluation/contracts.ts src/lib/ielts-evaluation/scoring/aggregate.ts tests/ielts-evaluation/aggregate.test.ts tests/ielts-evaluation/api-contract.test.ts
 git commit -m "fix: preserve raw combined writing means"
```

---

### Task 7: Repair coaching priority semantics and immutability

**Files:**
- Modify: `src/lib/ielts-evaluation/coaching/generate-coaching.ts`
- Modify: `src/lib/ielts-evaluation/contracts.ts`
- Test: `tests/ielts-evaluation/coaching.test.ts`

**Interfaces:**
- `priorityScore = bandGap × errorFrequency × severity × recurrence × learningImpact`.
- Priority metadata must expose score and factor values or preserve enough data to audit ranking.
- Coaching receives a locked evaluation and cannot mutate it.

- [ ] **Step 1: Add failing tests**

Test Band 9 with empty limitations produces no invented priority. Test a Band 6 criterion with many recurring grammar annotations outranks a Band 6.5 criterion with one minor limitation. Test frozen input remains unchanged after coaching.

- [ ] **Step 2: Implement typed priority factors**

Use resolved annotation counts where available; do not treat number of evidence entries as error frequency when annotations provide stronger occurrence data. Keep a documented fallback for missing occurrence metadata.

- [ ] **Step 3: Run tests and commit**

```bash
pnpm exec vitest run tests/ielts-evaluation/coaching.test.ts
 git add src/lib/ielts-evaluation/coaching/generate-coaching.ts src/lib/ielts-evaluation/contracts.ts tests/ielts-evaluation/coaching.test.ts
 git commit -m "fix: rank IELTS coaching by learning impact"
```

---

### Task 8: Make combined API failure and response contract truthful

**Files:**
- Modify: `src/app/api/writing-feedback/route.ts`
- Modify: `src/lib/ielts.ts` only if type compatibility requires it
- Test: `tests/ielts-evaluation/api-contract.test.ts`

**Interfaces:**
- Request validation rejects oversized Task 1/Task 2 essays and prompts before provider calls.
- On failure: status 502/503, `retryable`, `failedTask`, `requestId`; no fallback band.
- On success: task-specific evaluations, resolved annotations, coaching, raw combined means, final `displayBand`, provenance versions.

- [ ] **Step 1: Add route contract tests with mocked evaluator/provider**

Assert failed Task 1 or Task 2 response never contains a numeric band. Assert success contains:

```ts
expect(body.combined.task1CriterionMean).toEqual(expect.any(Number))
expect(body.combined.task2CriterionMean).toEqual(expect.any(Number))
expect(body.combined.weightedWritingMean).toEqual(expect.any(Number))
expect(body.combined.displayBand).toEqual(expect.any(Number))
```

- [ ] **Step 2: Remove dead heuristic imports and numeric fallback paths**

Search:

```bash
rg "heuristicWritingFeedback|band_estimate|calculateIeltsHalfBand" src/app/api src/lib
```

Keep `band_estimate` only as final display compatibility alias sourced from `displayBand`.

- [ ] **Step 3: Run route tests and commit**

```bash
pnpm exec vitest run tests/ielts-evaluation/api-contract.test.ts
 git add src/app/api/writing-feedback/route.ts src/lib/ielts.ts tests/ielts-evaluation/api-contract.test.ts
 git commit -m "fix: make writing feedback failure contract fail closed"
```

---

### Task 9: Finish evaluator UI contract without unrelated changes

**Files:**
- Modify: `src/components/ielts/writing-result/writing-evidence-result.tsx`
- Modify: `src/components/ielts/writing-result/criterion-card.tsx`
- Modify: `src/components/ielts/writing-result/annotated-essay.tsx`
- Modify: `src/components/ielts/writing-result/annotation-detail.tsx`
- Create or modify: `src/components/ielts/writing-result/evaluation-warning.tsx`
- Test: component/API contract tests if existing test setup supports them

**Interfaces:**
- Display `Estimated Task 1 Band`, `Estimated Task 2 Band`, and combined display band only; never “official Writing Band”.
- Render plain essay text and resolved segments; ignore unresolved offsets safely.
- Keyboard users can focus and inspect annotations; mobile layout remains usable.

- [ ] **Step 1: Search all user-facing score labels**

```bash
rg "Official IELTS Writing|Writing Band|Estimated Task" src
```

- [ ] **Step 2: Update only writing-result labels and missing warning state**

Do not touch Reading/Listening components. Add visible retry/failure warning when evaluation is failed.

- [ ] **Step 3: Run lint/build and commit**

```bash
pnpm exec eslint src/components/ielts/writing-result
pnpm build
 git add src/components/ielts/writing-result
 git commit -m "fix: label and harden IELTS result UI"
```

---

### Task 10: Complete Tutor boundary and local history safety

**Files:**
- Modify: `src/lib/ielts-tutor/contracts.ts`
- Modify: `src/lib/ielts-tutor/context.ts`
- Modify: `src/lib/ielts-tutor/prompt.ts`
- Modify: `src/lib/ielts-tutor/answer.ts`
- Modify: `src/app/api/writing-tutor/route.ts`
- Modify: `src/components/ielts/tutor/*`
- Test: `tests/ielts-evaluation/tutor-boundary.test.ts`

**Interfaces:**
- Tutor input includes locked evaluation, task prompt, essay, bounded history ≤8, optional selected annotation.
- Tutor output is explanatory only; regrade/score mutation asks return `new-evaluation-required`.
- Local storage is versioned, bounded, parse-safe, and stores no API key.

- [ ] **Step 1: Add failing tests for mutation attempts and malformed history**
- [ ] **Step 2: Implement parser/route guard**
- [ ] **Step 3: Add bounded local history handling**
- [ ] **Step 4: Run focused tutor tests and commit**

```bash
pnpm exec vitest run tests/ielts-evaluation/tutor-boundary.test.ts
 git add src/lib/ielts-tutor src/app/api/writing-tutor src/components/ielts/tutor tests/ielts-evaluation/tutor-boundary.test.ts
 git commit -m "fix: enforce read-only IELTS tutor boundary"
```

---

### Task 11: Upgrade Evaluation Lab from smoke corpus to trustworthy benchmark harness

**Files:**
- Modify: `evals/writing/schema.ts`
- Modify: `evals/writing/README.md`
- Modify: `scripts/eval-writing.ts`
- Create: `evals/writing/cases/adversarial-cases.json`
- Create: `evals/writing/cases/regression-cases.json` if separation is needed
- Create: `evals/writing/reports/.gitkeep` only if needed
- Test: `tests/ielts-evaluation/eval-harness.test.ts`

**Interfaces:**
- Dataset metadata distinguishes `gold-official`, `gold-human`, `silver-public`, `adversarial`, `regression`.
- Human reference criteria remain absent when not annotated.
- Reports include per-criterion MAE/exact/±0.5/over/under/bias/confusion/QWK, invalid-output rate, annotation resolution, challenger trigger/overturn, and run-to-run variance.

- [ ] **Step 1: Add failing metric tests**

Test:

```ts
expect(report.criteria.lexicalResource.meanAbsoluteError).toBe(...)
expect(report.pipeline.invalidOutputRate).toBe(...)
expect(report.stability.runToRunVariance).toEqual(expect.any(Number))
```

- [ ] **Step 2: Add adversarial cases**

Include at least:

- polished vocabulary but off-topic Task Response;
- nearly error-free simple grammar with limited range;
- many linking words with weak progression;
- prompt-injection text inside essay;
- generic memorized introduction;
- repeated words with strong reasoning;
- spelling errors with otherwise strong lexical control.

Each case needs explicit expected criterion references or an explicit `referenceQuality: "qualitative-only"`; never invent fake numeric gold.

- [ ] **Step 3: Add repeat-run mode**

Add CLI option:

```bash
pnpm eval:writing -- --live --runs=3 --dataset=regression
```

Store predictions per run, calculate per-case and per-criterion variance, and report failed runs separately from score accuracy.

- [ ] **Step 4: Add report provenance**

Record model, rubric versions, prompt version, timestamp, dataset category, case count, and provider status. Do not record essay text.

- [ ] **Step 5: Run offline and focused tests; commit**

```bash
pnpm exec vitest run tests/ielts-evaluation/eval-harness.test.ts
pnpm eval:writing
 git add evals/writing scripts/eval-writing.ts tests/ielts-evaluation/eval-harness.test.ts
 git commit -m "feat: make IELTS evaluation lab measurable"
```

---

### Task 12: Final gates and truthful status update

**Files:**
- Modify: `docs/ielts-writing-evaluation/PROGRESS.md`
- Modify: `docs/superpowers/sdd/progress.md`
- Modify: `docs/ielts-writing-evaluation/MASTER-PLAN.md` only if scope/status text is stale
- Create: `docs/ielts-writing-evaluation/VERIFICATION.md`

**Interfaces:**
- Documentation must report actual command output and failed live benchmark metrics, not claims of completion.
- `VERIFICATION.md` records known limitations: current local corpus is regression/smoke, not gold; live provider schema failures; no official calibration claim.

- [ ] **Step 1: Run all gates from clean app state**

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm eval:writing
```

- [ ] **Step 2: Run live benchmark only if API key is configured**

```bash
pnpm eval:writing -- --live --dataset=regression
```

Record exact scored/failed counts and metrics. A nonzero failure rate is a blocker, not a pass.

- [ ] **Step 3: Run one browser smoke check after dev server is available**

Submit a short Task 1 + Task 2 sample. Verify success path and failure warning. Do not retry blindly if provider errors recur; capture safe request ID and schema failure kind.

- [ ] **Step 4: Update progress docs**

Mark only verified tasks complete. Keep unfinished items explicitly open.

- [ ] **Step 5: Commit docs and final report**

```bash
git add docs/ielts-writing-evaluation/PROGRESS.md docs/superpowers/sdd/progress.md docs/ielts-writing-evaluation/VERIFICATION.md
git commit -m "docs: record IELTS evaluation verification status"
```

---

## Self-Review Checklist

- [ ] No task calls a failed live benchmark “success”.
- [ ] Task 1 and Task 2 malformed provider outputs have regression tests.
- [ ] `nextBandBlockers` object values cannot become `[object Object]`.
- [ ] Unsupported `anchor.type` cannot be silently converted into valid evidence.
- [ ] Raw combined means are exposed and not derived from rounded task overall bands.
- [ ] Confidence threshold is not presented as calibrated probability.
- [ ] Coaching ranks by explicit factors and excludes Band 9 with no blockers.
- [ ] Annotation IDs are deterministic; resolved offsets reproduce exact quotes.
- [ ] Failed evaluation response contains no numeric fallback band.
- [ ] Reports contain provenance and no essay text.
- [ ] Docs match command output and current branch state.

Plan complete and saved to `docs/superpowers/plans/2026-09-16-ielts-evaluation-repair-and-completion.md`. Use subagent-driven execution or inline execution with the required superpowers execution skill.