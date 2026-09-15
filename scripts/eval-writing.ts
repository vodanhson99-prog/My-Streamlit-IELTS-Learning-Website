import fs from "node:fs"
import path from "node:path"
import { evalCaseSchema, type EvalCase, type EvalMetrics } from "../evals/writing/schema"
import { evaluateTask1 } from "../src/lib/ielts-evaluation/evaluate-task1"
import { evaluateTask2 } from "../src/lib/ielts-evaluation/evaluate-task2"
import { createAIProvider } from "../src/lib/ai/provider"

export interface EvaluationComparison {
  caseId: string
  taskType: "task1" | "task2"
  testType: "academic" | "general_training"
  predictedBand: number
  groundTruthBand: number
  status: "locked" | "failed"
  diff: number
  criterionErrors?: Record<string, number>
}

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
    const diff = Number((r.predictedBand - r.groundTruthBand).toFixed(2))
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

export function loadAllCases(casesDir: string = path.resolve(process.cwd(), "evals/writing/cases")): EvalCase[] {
  if (!fs.existsSync(casesDir)) return []
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
  return allCases
}

async function runLiveEvaluation(cases: EvalCase[]): Promise<EvaluationComparison[]> {
  const apiKey = process.env.AI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("Cannot run live evaluation: AI_API_KEY is not set.")
  }

  const provider = createAIProvider({ apiKey })
  const comparisons: EvaluationComparison[] = []

  for (const c of cases) {
    console.log(`Evaluating [${c.id}] (${c.taskType} - ${c.testType})...`)
    try {
      if (c.taskType === "task1") {
        const evalResult = await evaluateTask1({
          task: { testType: c.testType, prompt: c.prompt },
          essay: c.essay,
          provider,
        })
        if (evalResult.status === "failed") {
          comparisons.push({
            caseId: c.id,
            taskType: c.taskType,
            testType: c.testType,
            predictedBand: 0,
            groundTruthBand: c.groundTruth.overallBand,
            status: "failed",
            diff: -c.groundTruth.overallBand,
          })
        } else {
          const pred = evalResult.overallBand
          comparisons.push({
            caseId: c.id,
            taskType: c.taskType,
            testType: c.testType,
            predictedBand: pred,
            groundTruthBand: c.groundTruth.overallBand,
            status: "locked",
            diff: Number((pred - c.groundTruth.overallBand).toFixed(2)),
          })
        }
      } else {
        const evalResult = await evaluateTask2({
          task: { testType: c.testType, prompt: c.prompt },
          essay: c.essay,
          provider,
        })
        if (evalResult.status === "failed") {
          comparisons.push({
            caseId: c.id,
            taskType: c.taskType,
            testType: c.testType,
            predictedBand: 0,
            groundTruthBand: c.groundTruth.overallBand,
            status: "failed",
            diff: -c.groundTruth.overallBand,
          })
        } else {
          const pred = evalResult.overallBand
          comparisons.push({
            caseId: c.id,
            taskType: c.taskType,
            testType: c.testType,
            predictedBand: pred,
            groundTruthBand: c.groundTruth.overallBand,
            status: "locked",
            diff: Number((pred - c.groundTruth.overallBand).toFixed(2)),
          })
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown evaluation error"
      console.warn(`Evaluation failed closed for [${c.id}]: ${msg}`)
      comparisons.push({
        caseId: c.id,
        taskType: c.taskType,
        testType: c.testType,
        predictedBand: 0,
        groundTruthBand: c.groundTruth.overallBand,
        status: "failed",
        diff: -c.groundTruth.overallBand,
      })
    }
  }

  return comparisons
}

async function main() {
  const isLive = process.argv.includes("--live")
  const allCases = loadAllCases()

  console.log(`Loaded ${allCases.length} labelled evaluation cases.`)
  if (allCases.length === 0) {
    console.log("No test cases to evaluate.")
    return
  }

  if (!isLive) {
    console.log("Schema validation successful. Pass --live to run real evaluations against 9router endpoint.")
    return
  }

  console.log("Running live calibration against 9router endpoint...")
  const results = await runLiveEvaluation(allCases)
  const metrics = computeMetrics(results)

  console.log("\n--- Calibration Results Summary ---")
  console.log(`Total Cases: ${metrics.totalCases}`)
  console.log(`MAE (Mean Absolute Error): ${metrics.meanAbsoluteError}`)
  console.log(`Within ±0.5 Band: ${metrics.withinHalfBandPct}%`)
  console.log(`Exact Matches: ${metrics.exactMatchPct}%`)
  console.log(`Overgraded (> +0.5): ${metrics.overgradedCount}`)
  console.log(`Undergraded (< -0.5): ${metrics.undergradedCount}`)

  const mismatches = results.filter((r) => Math.abs(r.diff) > 0.5)
  if (mismatches.length > 0) {
    console.log(`\nNotable Mismatches (> 0.5 band difference): ${mismatches.length}`)
    for (const m of mismatches) {
      console.log(`  - [${m.caseId}] Target: ${m.groundTruthBand}, Pred: ${m.predictedBand}, Diff: ${m.diff} (${m.status})`)
    }
  } else {
    console.log("\nAll evaluated cases within ±0.5 band tolerance.")
  }
}

if (process.argv[1]?.endsWith("eval-writing.ts")) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
