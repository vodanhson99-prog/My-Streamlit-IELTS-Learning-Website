# IELTS Writing Grader Evaluation Benchmark

Labelled offline evaluation harness for measuring IELTS grader accuracy against verified benchmarks.

## Usage

```bash
# Validate local labelled cases (offline)
pnpm eval:writing

# Optional live grading against AI_API_KEY
pnpm eval:writing -- --live

# Filter by dataset category
pnpm eval:writing -- --dataset=regression
```

## Metrics Reported

- MAE (Mean Absolute Error)
- Exact agreement
- Within ±0.5 band
- Over/undergrading counts
- Mean bias
- Confusion matrix
- Quadratic weighted kappa
- Failed / invalid-output rate
- Per-criterion metrics when reference criterion scores exist
- Challenger / annotation rates when available

## Dataset Categories

- `gold-official`
- `gold-human`
- `silver-public`
- `adversarial`
- `regression`

Live reports are written to `evals/writing/reports/` (gitignored).
