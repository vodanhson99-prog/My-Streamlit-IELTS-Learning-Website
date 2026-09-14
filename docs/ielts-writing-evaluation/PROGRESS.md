# IELTS Writing Evaluation Harness — Progress Snapshot

> **Status:** IN PROGRESS (interrupted mid-execution)  
> **Branch:** `feat/ielts-writing-evaluation-harness`  
> **Last updated:** 2026-09-14  
> **Resume from:** Phase 2 review → Phase 3 orchestration

This file records where implementation stopped so any agent/human can continue without re-deriving context.

---

## Goal (one line)

Replace the current single loosely-validated LLM writing grade with a Task 2-only evaluation harness: four isolated graders → evidence validation → optional boundary challenger → deterministic aggregation → score lock → coaching → Tutor Agent → offline eval harness.

Full plan: [`MASTER-PLAN.md`](./MASTER-PLAN.md)  
Superpowers plan: [`../superpowers/plans/2026-09-14-ielts-writing-evaluation-harness.md`](../superpowers/plans/2026-09-14-ielts-writing-evaluation-harness.md)  
SDD ledger: [`../superpowers/sdd/progress.md`](../superpowers/sdd/progress.md)

---

## Done

### Phase 0 — Workspace / baseline

- Feature branch created: `feat/ielts-writing-evaluation-harness`
- Baseline before foundation work: `pnpm test` 11 pass; `pnpm build` pass
- Note: Next.js migration was largely untracked at start; later dump commit included app + skills. Isolated worktree was **not** used because `HEAD` alone would not contain the working app.

### Phase 1 — Foundation ✅

Commits:

- `f08e807` — `feat: add IELTS evaluation foundation`
- `0dc8d4f` — `fix: harden IELTS evaluation foundation`

Delivered:

- Zod runtime schemas + strict TS contracts
- Version constants
- AI provider boundary (`src/lib/ai/provider.ts`) preserving `requestGroq` for Explain Bot
- Normalized provider errors (no raw upstream body leak)
- Official May 2023 Task 2 rubric registry + descriptor checksum pin
- Vitest infrastructure; `pnpm test` runs Node tests + Vitest

Review gate: Spec PASS / quality APPROVED after harden fix.

### Phase 2 — Four isolated graders ✅ (implementation committed; formal review interrupted)

Commit:

- `f6dddc0` — `feat: add isolated IELTS Task 2 graders`

Delivered:

- Graders: TR / CC / LR / GRA under `src/lib/ielts-evaluation/graders/`
- Prompts under `src/lib/ielts-evaluation/prompts/`
- Criterion-only inputs (no `targetBand` in grader prompts)
- Structured provider injection + fail-closed schema parse
- Essay delimiter / untrusted-content handling
- Tests expanded (parent verify after Phase 2: 11 Node + 52 Vitest; build pass)

**Interrupted before:** independent Phase 2 task review could finish (reviewer dispatch failed once). Parent verification of tests/build did pass.

### Opportunistic dump commit (already on remote)

- `f7d9521` — `chưa xong đâu nhé sơn l ơi`  
  Pushed large pre-existing Next.js app / skills / docs into the branch so the tree is runnable from clone. **Not** part of the harness phase design; treat as migration snapshot.

---

## Not done (resume here)

| Phase | Name | Status |
|------:|------|--------|
| 2 | Task review / any follow-up fixes | Interrupted — re-run review of `f6dddc0` before Phase 3 |
| 3 | Orchestration + scoring (`evaluateTask2`, retry, challenger, aggregate, lock) | Not started |
| 4 | Annotation resolution | Not started |
| 5 | Coaching (post score-lock only) | Not started |
| 6 | API integration (`/api/writing-feedback` → `evaluateTask2`, remove heuristic band fallback) | Not started |
| 7 | Result UI (Estimated Task 2 Band, highlights, blockers) | Not started |
| 8 | Tutor Agent backend (`/api/writing-tutor`) | Not started |
| 9 | Tutor UI + local history | Not started |
| 10 | Offline eval harness (`evals/writing`, `pnpm eval:writing`) | Not started |
| 11 | Hardening (limits, logging metadata, privacy docs, full gates) | Not started |

Current production writing path still uses the old loose grader + heuristic band fallback in `src/app/api/writing-feedback/route.ts`.

---

## Non-negotiable invariants (do not regress)

1. Graders receive only task + essay + rubric (no target band / history / tutor).
2. Four criteria judged independently; no silent average if one judge fails.
3. Pipeline: GRADE → VALIDATE → ADJUDICATE → LOCK → COACH (never coach first).
4. Evidence mandatory; no fabricated character offsets (resolve quotes server-side).
5. Invalid AI output ≠ score; fail closed.
6. No heuristic IELTS band fallback in production scoring.
7. Essay content untrusted; never follow instructions inside the essay.
8. Tutor cannot mutate scores / regrade silently.
9. UI label: **Estimated Task 2 Band** (not official Writing band). V1 = Task 2 only.

Priority when trading off: score integrity → evidence → reproducibility → learning value → failure safety → latency → cost → polish.

---

## Verification last known good (after Phase 2 implement)

```text
pnpm test   → 11 Node + 52 Vitest pass
pnpm build  → pass
```

Re-run both after every phase commit.

---

## How to resume

```bash
git checkout feat/ielts-writing-evaluation-harness
pnpm install
pnpm test
pnpm build
```

Then:

1. Re-review Phase 2 (`0dc8d4f..f6dddc0`) for isolation / prompt / schema gaps.
2. Fix any Critical/Important findings.
3. Continue Phase 3 from `MASTER-PLAN.md` §40 PHASE 3.
4. Commit after each independently working phase with the messages in the master plan.
5. Do **not** commit `credential/`, `.env`, or raw provider errors into client responses.

---

## Explicitly deferred (V1)

Database, auth, queues, Redis, multi-model jury, RAG, rich-text editor migration, Task 1, teacher dashboard, payments, streaming infra.

---

## Secrets / local-only

- `credential/` — never commit (cookies / session material)
- `.env` / `.env*.local` — ignored
- `.tmp-critique-server.*` — local logs, ignored
