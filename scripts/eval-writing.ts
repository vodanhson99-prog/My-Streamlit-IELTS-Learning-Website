import fs from "node:fs"
import path from "node:path"
import {
  datasetCategories,
  evalCaseSchema,
  type BenchmarkReport,
  type DatasetCategory,
  type EvalCase,
  type EvalMetrics,
  type PipelineMetrics,
  type ScoreMetrics,
} from "../evals/writing/schema"
import { evaluateTask1 } from "../src/lib/ielts-evaluation/evaluate-task1"
import { evaluateTask2 } from "../src/lib/ielts-evaluation/evaluate-task2"
import { createAIProvider } from "../src/lib/ai/provider"

const HALF_BAND_LABELS = Array.from({ length: 19 }, (_, i) => Number((i * 0.5).toFixed(1)))

export interface EvaluationComparison {
  caseId: string
  taskType: "task1" | "task2"
  testType: "academic" | "general_training"
  predictedBand: number | null
  groundTruthBand: number
  status: "locked" | "failed"
  diff: number | null
  criterionErrors?: Record<string, number>
  predictedCriteria?: Record<string, number>
  referenceCriteria?: Record<string, number>
  error?: string
  annotationResolved?: number
  annotationTotal?: number
  challengerTriggered?: boolean
  challengerOverturned?: boolean
  challengerAgreedWithReference?: boolean
}

function round1(value: number): number {
  return Number(value.toFixed(1))
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}

function bandKey(value: number): string {
  return String(round1(value))
}

function emptyConfusionMatrix(): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {}
  for (const truth of HALF_BAND_LABELS) {
    const row: Record<string, number> = {}
    for (const pred of HALF_BAND_LABELS) {
      row[bandKey(pred)] = 0
    }
    matrix[bandKey(truth)] = row
  }
  return matrix
}

export function quadraticWeightedKappa(
  predictions: readonly number[],
  references: readonly number[],
): number {
  if (predictions.length === 0 || predictions.length !== references.length) return 0

  const labels = HALF_BAND_LABELS
  const index = new Map(labels.map((label, i) => [bandKey(label), i]))
  const n = labels.length
  const observed = Array.from({ length: n }, () => Array.from({ length: n }, () => 0))
  const weight = Array.from({ length: n }, () => Array.from({ length: n }, () => 0))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      weight[i][j] = ((i - j) ** 2) / ((n - 1) ** 2)
    }
  }

  for (let k = 0; k < predictions.length; k++) {
    const i = index.get(bandKey(references[k]))
    const j = index.get(bandKey(predictions[k]))
    if (i === undefined || j === undefined) continue
    observed[i][j] += 1
  }

  const rowSums = observed.map((row) => row.reduce((a, b) => a + b, 0))
  const colSums = Array.from({ length: n }, (_, j) => observed.reduce((sum, row) => sum + row[j], 0))
  const total = predictions.length
  let observedWeighted = 0
  let expectedWeighted = 0

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      observedWeighted += weight[i][j] * observed[i][j]
      expectedWeighted += weight[i][j] * (rowSums[i] * colSums[j]) / total
    }
  }

  if (expectedWeighted === 0) return 1
  return round2(1 - observedWeighted / expectedWeighted)
}

export function computeScoreMetrics(
  results: readonly { predictedBand: number; groundTruthBand: number }[],
): ScoreMetrics {
  if (results.length === 0) {
    return {
      totalCases: 0,
      meanAbsoluteError: 0,
      withinHalfBandPct: 0,
      overgradedCount: 0,
      undergradedCount: 0,
      exactMatchPct: 0,
      meanBias: 0,
      quadraticWeightedKappa: 0,
      confusionMatrix: emptyConfusionMatrix(),
    }
  }

  let totalDiff = 0
  let totalBias = 0
  let withinHalfBand = 0
  let exact = 0
  let overgraded = 0
  let undergraded = 0
  const confusionMatrix = emptyConfusionMatrix()
  const predictions: number[] = []
  const references: number[] = []

  for (const result of results) {
    const diff = round2(result.predictedBand - result.groundTruthBand)
    totalDiff += Math.abs(diff)
    totalBias += diff
    if (Math.abs(diff) <= 0.5) withinHalfBand++
    if (diff === 0) exact++
    if (diff > 0.5) overgraded++
    if (diff < -0.5) undergraded++

    const truthKey = bandKey(result.groundTruthBand)
    const predKey = bandKey(result.predictedBand)
    if (!confusionMatrix[truthKey]) confusionMatrix[truthKey] = {}
    confusionMatrix[truthKey][predKey] = (confusionMatrix[truthKey][predKey] ?? 0) + 1

    predictions.push(result.predictedBand)
    references.push(result.groundTruthBand)
  }

  return {
    totalCases: results.length,
    meanAbsoluteError: round2(totalDiff / results.length),
    withinHalfBandPct: round1((withinHalfBand / results.length) * 100),
    exactMatchPct: round1((exact / results.length) * 100),
    overgradedCount: overgraded,
    undergradedCount: undergraded,
    meanBias: round2(totalBias / results.length),
    quadraticWeightedKappa: quadraticWeightedKappa(predictions, references),
    confusionMatrix,
  }
}

export function computeMetrics(
  results: { caseId: string; predictedBand: number; groundTruthBand: number }[],
): EvalMetrics {
  const metrics = computeScoreMetrics(results)
  return {
    totalCases: metrics.totalCases,
    meanAbsoluteError: metrics.meanAbsoluteError,
    withinHalfBandPct: metrics.withinHalfBandPct,
    overgradedCount: metrics.overgradedCount,
    undergradedCount: metrics.undergradedCount,
    exactMatchPct: metrics.exactMatchPct,
  }
}

export function buildBenchmarkReport(
  comparisons: readonly EvaluationComparison[],
): BenchmarkReport {
  const scored = comparisons.filter((item) => item.status === "locked" && item.predictedBand !== null)
  const failed = comparisons.filter((item) => item.status === "failed")
  const overall = computeScoreMetrics(
    scored.map((item) => ({
      predictedBand: item.predictedBand as number,
      groundTruthBand: item.groundTruthBand,
    })),
  )

  const criterionNames = new Set<string>()
  for (const item of scored) {
    for (const key of Object.keys(item.referenceCriteria ?? {})) {
      if (item.predictedCriteria && item.predictedCriteria[key] !== undefined) {
        criterionNames.add(key)
      }
    }
  }

  const criteria: Record<string, ScoreMetrics> = {}
  for (const name of criterionNames) {
    const pairs = scored.flatMap((item) => {
      const predicted = item.predictedCriteria?.[name]
      const reference = item.referenceCriteria?.[name]
      if (predicted === undefined || reference === undefined) return []
      return [{ predictedBand: predicted, groundTruthBand: reference }]
    })
    criteria[name] = computeScoreMetrics(pairs)
  }

  let annotationResolved = 0
  let annotationTotal = 0
  let challengerTriggered = 0
  let challengerOverturned = 0
  let challengerObserved = 0
  let challengerAgreedWithReferenceCount = 0

  for (const item of comparisons) {
    if (item.annotationTotal !== undefined) {
      annotationTotal += item.annotationTotal
      annotationResolved += item.annotationResolved ?? 0
    }
    if (item.challengerTriggered !== undefined) {
      challengerObserved += 1
      if (item.challengerTriggered) {
        challengerTriggered += 1
        if (item.challengerOverturned) challengerOverturned += 1
        if (item.challengerAgreedWithReference) challengerAgreedWithReferenceCount += 1
      }
    }
  }

  const pipeline: PipelineMetrics = {
    failedCount: failed.length,
    scoredCount: scored.length,
    invalidOutputRate: comparisons.length === 0 ? 0 : round1((failed.length / comparisons.length) * 100),
    annotationResolutionRate: annotationTotal === 0 ? null : round1((annotationResolved / annotationTotal) * 100),
    challengerTriggerRate: challengerObserved === 0 ? null : round1((challengerTriggered / challengerObserved) * 100),
    challengerOverturnRate: challengerTriggered === 0 ? null : round1((challengerOverturned / challengerTriggered) * 100),
    challengerAgreementRate: challengerTriggered === 0 ? null : round1((challengerAgreedWithReferenceCount / challengerTriggered) * 100),
  }

  return {
    scoredCount: scored.length,
    failedCount: failed.length,
    overall,
    criteria,
    pipeline,
  }
}

export function formatBenchmarkReport(report: BenchmarkReport): string {
  const lines = [
    "IELTS Writing Evaluation Benchmark",
    `Scored cases: ${report.scoredCount}`,
    `Failed evaluations: ${report.failedCount}`,
    `Invalid-output rate: ${report.pipeline.invalidOutputRate}%`,
    "",
    "Overall",
    `  Overall MAE: ${report.overall.meanAbsoluteError}`,
    `  Exact agreement: ${report.overall.exactMatchPct}%`,
    `  Within ±0.5: ${report.overall.withinHalfBandPct}%`,
    `  Mean bias: ${report.overall.meanBias}`,
    `  Overgraded: ${report.overall.overgradedCount}`,
    `  Undergraded: ${report.overall.undergradedCount}`,
    `  Quadratic Weighted Kappa: ${report.overall.quadraticWeightedKappa}`,
  ]

  const criterionEntries = Object.entries(report.criteria)
  if (criterionEntries.length > 0) {
    lines.push("", "Per-criterion")
    for (const [name, metrics] of criterionEntries) {
      lines.push(
        `  ${name}: MAE=${metrics.meanAbsoluteError}, exact=${metrics.exactMatchPct}%, ±0.5=${metrics.withinHalfBandPct}%, QWK=${metrics.quadraticWeightedKappa}`,
      )
    }
  }

  if (report.pipeline.annotationResolutionRate !== null) {
    lines.push(`Annotation resolution rate: ${report.pipeline.annotationResolutionRate}%`)
  }
  if (report.pipeline.challengerTriggerRate !== null) {
    lines.push(`Challenger trigger rate: ${report.pipeline.challengerTriggerRate}%`)
  }
  if (report.pipeline.challengerOverturnRate !== null) {
    lines.push(`Challenger overturn rate: ${report.pipeline.challengerOverturnRate}%`)
  }
  if (report.pipeline.challengerAgreementRate !== null) {
    lines.push(`Challenger agreement rate: ${report.pipeline.challengerAgreementRate}%`)
  }

  return lines.join("\n")
}

export interface OfflineBenchmarkResult {
  mode: "offline"
  caseCount: number
  reportText: string
  cases: EvalCase[]
}

export function runOfflineBenchmark(
  casesDir: string = path.resolve(process.cwd(), "evals/writing/cases"),
): OfflineBenchmarkResult {
  const cases = loadAllCases(casesDir)
  return {
    mode: "offline",
    caseCount: cases.length,
    reportText: [
      `Loaded ${cases.length} labelled evaluation cases.`,
      "Schema validation successful.",
      "Pass --live to run real evaluations against the configured AI provider.",
      "Score metrics require locked predictions; offline mode only validates cases.",
    ].join("\n"),
    cases,
  }
}

export interface LoadCasesOptions {
  categories?: readonly DatasetCategory[] | readonly string[]
}

function isDatasetCategory(value: string): value is DatasetCategory {
  return (datasetCategories as readonly string[]).includes(value)
}

export function loadAllCases(
  casesDir: string = path.resolve(process.cwd(), "evals/writing/cases"),
  options: LoadCasesOptions = {},
): EvalCase[] {
  if (!fs.existsSync(casesDir)) return []
  const requestedCategories = options.categories ?? []
  for (const category of requestedCategories) {
    if (!isDatasetCategory(category)) {
      throw new Error(`Unknown dataset category '${category}'. Expected one of: ${datasetCategories.join(", ")}.`)
    }
  }

  const files = fs.readdirSync(casesDir).filter((f) => f.endsWith(".json")).sort()
  const allCases: EvalCase[] = []
  const seenIds = new Set<string>()

  for (const file of files) {
    const filePath = path.join(casesDir, file)
    let parsed: unknown
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    } catch (error) {
      const reason = error instanceof Error ? error.message : "invalid JSON"
      throw new Error(`Failed to parse ${file}: invalid JSON (${reason})`)
    }
    if (!Array.isArray(parsed)) {
      throw new Error(`Invalid fixture ${file}: expected a JSON array of evaluation cases.`)
    }

    for (const [index, item] of parsed.entries()) {
      const result = evalCaseSchema.safeParse(item)
      if (!result.success) {
        throw new Error(`Invalid case in ${file} at index ${index}: ${result.error.message}`)
      }
      const evalCase = result.data
      if (seenIds.has(evalCase.id)) {
        throw new Error(`Duplicate case ID '${evalCase.id}' found in ${file}. Case IDs must be unique.`)
      }
      seenIds.add(evalCase.id)
      if (requestedCategories.length === 0 || (evalCase.dataset && requestedCategories.includes(evalCase.dataset.category))) {
        allCases.push(evalCase)
      }
    }
  }
  return allCases
}

function extractReferenceCriteria(evalCase: EvalCase): Record<string, number> {
  const criteria: Record<string, number> = {
    ...(evalCase.groundTruth.referenceCriterionScores ?? {}),
    ...(evalCase.groundTruth.criteriaBands ?? {}),
  }
  if (evalCase.groundTruth.taskAchievementOrResponse !== undefined) {
    criteria.taskAchievementOrResponse = evalCase.groundTruth.taskAchievementOrResponse
  }
  if (evalCase.groundTruth.coherenceAndCohesion !== undefined) {
    criteria.coherenceAndCohesion = evalCase.groundTruth.coherenceAndCohesion
  }
  if (evalCase.groundTruth.lexicalResource !== undefined) {
    criteria.lexicalResource = evalCase.groundTruth.lexicalResource
  }
  if (evalCase.groundTruth.grammaticalRangeAndAccuracy !== undefined) {
    criteria.grammaticalRangeAndAccuracy = evalCase.groundTruth.grammaticalRangeAndAccuracy
  }
  return criteria
}

function extractPredictedCriteria(
  criteria: readonly { criterionId: string; band: number }[],
): Record<string, number> {
  const mapped: Record<string, number> = {}
  for (const item of criteria) {
    mapped[item.criterionId] = item.band
    if (item.criterionId === "task-response" || item.criterionId === "task-achievement") {
      mapped.taskAchievementOrResponse = item.band
    }
    if (item.criterionId === "coherence-cohesion") mapped.coherenceAndCohesion = item.band
    if (item.criterionId === "lexical-resource") mapped.lexicalResource = item.band
    if (item.criterionId === "grammatical-range-accuracy") mapped.grammaticalRangeAndAccuracy = item.band
  }
  return mapped
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
      const evalResult = c.taskType === "task1"
        ? await evaluateTask1({
          task: { testType: c.testType, prompt: c.prompt },
          essay: c.essay,
          provider,
        })
        : await evaluateTask2({
          task: { testType: c.testType, prompt: c.prompt },
          essay: c.essay,
          provider,
        })

      if (evalResult.status === "failed") {
        comparisons.push({
          caseId: c.id,
          taskType: c.taskType,
          testType: c.testType,
          predictedBand: null,
          groundTruthBand: c.groundTruth.overallBand,
          status: "failed",
          diff: null,
          error: evalResult.error,
          referenceCriteria: extractReferenceCriteria(c),
        })
        continue
      }

      const pred = evalResult.overallBand
      const adjudicationRecords = "adjudicationRecords" in evalResult ? evalResult.adjudicationRecords : []
      const refCriteria = extractReferenceCriteria(c)
      comparisons.push({
        caseId: c.id,
        taskType: c.taskType,
        testType: c.testType,
        predictedBand: pred,
        groundTruthBand: c.groundTruth.overallBand,
        status: "locked",
        diff: round2(pred - c.groundTruth.overallBand),
        predictedCriteria: extractPredictedCriteria(evalResult.criteria),
        referenceCriteria: refCriteria,
        challengerTriggered: adjudicationRecords.length > 0,
        challengerOverturned: adjudicationRecords.some((record) => {
          const decision = (record as { decision?: string }).decision
          return decision === "overturned"
        }),
        challengerAgreedWithReference: adjudicationRecords.length > 0 && adjudicationRecords.every((record) => {
          const rec = record as { criterionId: string, challengedBand: number, decision: string, originalBand: number }
          const target = refCriteria[rec.criterionId]
          if (target === undefined) return false
          const finalBand = rec.decision === "overturned" ? rec.challengedBand : rec.originalBand
          return finalBand === target
        }),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown evaluation error"
      console.warn(`Evaluation failed closed for [${c.id}]: ${msg}`)
      comparisons.push({
        caseId: c.id,
        taskType: c.taskType,
        testType: c.testType,
        predictedBand: null,
        groundTruthBand: c.groundTruth.overallBand,
        status: "failed",
        diff: null,
        error: msg,
        referenceCriteria: extractReferenceCriteria(c),
      })
    }
  }

  return comparisons
}

function writeReports(report: BenchmarkReport, text: string) {
  const reportDir = path.resolve(process.cwd(), "evals/writing/reports")
  fs.mkdirSync(reportDir, { recursive: true })
  fs.writeFileSync(path.join(reportDir, "latest.json"), `${JSON.stringify(report, null, 2)}\n`, "utf-8")
  fs.writeFileSync(path.join(reportDir, "latest.txt"), `${text}\n`, "utf-8")
}

async function main() {
  const isLive = process.argv.includes("--live")
  const categoryArgs = process.argv
    .filter((arg) => arg.startsWith("--dataset="))
    .map((arg) => arg.slice("--dataset=".length))

  const allCases = loadAllCases(undefined, categoryArgs.length > 0 ? { categories: categoryArgs } : {})
  console.log(`Loaded ${allCases.length} labelled evaluation cases.`)
  if (allCases.length === 0) {
    console.log("No test cases to evaluate.")
    return
  }

  if (!isLive) {
    console.log([
      "Schema validation successful.",
      "Pass --live to run real evaluations against the configured AI provider.",
      "Score metrics require locked predictions; offline mode only validates cases.",
    ].join("\n"))
    return
  }

  console.log("Running live calibration against configured AI provider...")
  const results = await runLiveEvaluation(allCases)
  const report = buildBenchmarkReport(results)
  const text = formatBenchmarkReport(report)
  writeReports(report, text)
  console.log(`\n${text}`)

  const mismatches = results.filter((r) => r.status === "locked" && r.diff !== null && Math.abs(r.diff) > 0.5)
  if (mismatches.length > 0) {
    console.log(`\nNotable Mismatches (> 0.5 band difference): ${mismatches.length}`)
    for (const m of mismatches) {
      console.log(`  - [${m.caseId}] Target: ${m.groundTruthBand}, Pred: ${m.predictedBand}, Diff: ${m.diff}`)
    }
  }
}

const isDirectRun = process.argv[1]?.includes("eval-writing")
if (isDirectRun) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
