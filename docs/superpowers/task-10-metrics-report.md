# Task 10 Metrics + Runner Report

## Status

Implemented deterministic IELTS Writing benchmark metrics and offline/live CLI runner.

## Changed files

- `evals/writing/schema.ts` — added `ScoreMetrics`, `PipelineMetrics`, `BenchmarkReport`
- `scripts/eval-writing.ts` — QWK, confusion matrix, bias, failed-exclusion report, live failure null scores, report writers
- `tests/ielts-evaluation/eval-harness.test.ts` — metrics/report/offline CLI coverage
- `evals/writing/README.md` — usage and metric docs
- `.gitignore` — ignore `evals/writing/reports/`
- `package.json` — `eval:writing` → `tsx scripts/eval-writing.ts`; add `tsx`
- `pnpm-workspace.yaml` — allow `esbuild` builds required by `tsx`
- `pnpm-lock.yaml` — lockfile for `tsx`

## Tests

- `node node_modules/vitest/vitest.mjs run tests/ielts-evaluation/eval-harness.test.ts tests/calibration-harness.test.ts` — 18 passed
- `pnpm eval:writing` — offline schema validation OK

## Concerns

- Offline mode validates cases only; score metrics need `--live` predictions
- Local fixtures remain curated/regression, not official gold
- Unrelated working-tree UI/parser edits were left untouched
