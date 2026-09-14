import fs from "node:fs"
import path from "node:path"
import { evalCaseSchema, type EvalCase, type EvalMetrics } from "../evals/writing/schema"

export function computeMetrics(
  results: { caseId: string; predictedBand: number; groundTruthBand: number }[],
): EvalMetrics {
  if (results.length === 0) {
    return {
      totalCases: 0,
      meanAbsoluteError: 0,
      withinHalfBandPct: 0,
      overgradedCount: 0,
      undergradedCount: 0,
      exactMatchPct: 0,
    }
  }

  let totalDiff = 0
  let withinHalfBand = 0
  let exact = 0
  let overgraded = 0
  let undergraded = 0

  for (const r of results) {
    const diff = r.predictedBand - r.groundTruthBand
    totalDiff += Math.abs(diff)
    if (Math.abs(diff) <= 0.5) withinHalfBand++
    if (diff === 0) exact++
    if (diff > 0.5) overgraded++
    if (diff < -0.5) undergraded++
  }

  return {
    totalCases: results.length,
    meanAbsoluteError: Number((totalDiff / results.length).toFixed(2)),
    withinHalfBandPct: Number(((withinHalfBand / results.length) * 100).toFixed(1)),
    exactMatchPct: Number(((exact / results.length) * 100).toFixed(1)),
    overgradedCount: overgraded,
    undergradedCount: undergraded,
  }
}

async function main() {
  const casesDir = path.resolve(process.cwd(), "evals/writing/cases")
  if (!fs.existsSync(casesDir)) {
    console.log("No evals/writing/cases directory found.")
    return
  }

  const files = fs.readdirSync(casesDir).filter((f) => f.endsWith(".json"))
  const allCases: EvalCase[] = []

  for (const f of files) {
    const raw = fs.readFileSync(path.join(casesDir, f), "utf-8")
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        allCases.push(evalCaseSchema.parse(item))
      }
    }
  }

  console.log(`Loaded ${allCases.length} labelled evaluation cases.`)
  if (allCases.length === 0) {
    console.log("No test cases to evaluate.")
    return
  }

  console.log("Benchmark schema validated successfully.")
}

if (process.argv[1]?.endsWith("eval-writing.ts")) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
