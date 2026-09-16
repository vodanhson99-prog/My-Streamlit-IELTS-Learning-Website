import { z } from "zod"

export const datasetCategories = ["gold-official", "gold-human", "silver-public", "adversarial", "regression"] as const

const bandScoreSchema = z.number().min(0).max(9)

const scoreSchema = z.object({
  overallBand: bandScoreSchema,
  taskAchievementOrResponse: bandScoreSchema.optional(),
  coherenceAndCohesion: bandScoreSchema.optional(),
  lexicalResource: bandScoreSchema.optional(),
  grammaticalRangeAndAccuracy: bandScoreSchema.optional(),
  criteriaBands: z.record(z.string(), bandScoreSchema).optional(),
  referenceCriterionScores: z.record(z.string(), bandScoreSchema).optional(),
})

const datasetSchema = z.object({
  category: z.enum(datasetCategories),
  source: z.string().min(1),
  version: z.string().min(1).optional(),
})

export const evalCaseSchema = z.object({
  id: z.string().min(1),
  taskType: z.enum(["task1", "task2"]),
  testType: z.enum(["academic", "general_training"]),
  promptFamily: z.enum(["chart", "process", "map", "table", "letter", "opinion", "discussion", "advantages_disadvantages", "problem_solution", "two_part"]).optional(),
  controlTag: z.string().optional(),
  prompt: z.string().min(1),
  essay: z.string().min(1),
  dataset: datasetSchema.optional(),
  raters: z.array(z.object({
    id: z.string().min(1).optional(),
    score: scoreSchema,
    notes: z.string().optional(),
  })).optional(),
  adjudicated: z.boolean().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string().min(1)).optional(),
  groundTruth: scoreSchema,
})

export type DatasetCategory = (typeof datasetCategories)[number]
export type EvalCase = z.infer<typeof evalCaseSchema>

export interface EvalMetrics {
  totalCases: number
  meanAbsoluteError: number
  withinHalfBandPct: number
  overgradedCount: number
  undergradedCount: number
  exactMatchPct: number
  criterionErrors?: Record<string, number>
}

export interface ScoreMetrics extends EvalMetrics {
  meanBias: number
  quadraticWeightedKappa: number
  confusionMatrix: Record<string, Record<string, number>>
}

export interface PipelineMetrics {
  failedCount: number
  scoredCount: number
  invalidOutputRate: number
  annotationResolutionRate: number | null
  challengerTriggerRate: number | null
  challengerOverturnRate: number | null
  challengerAgreementRate: number | null
}

export interface StabilityMetrics {
  runToRunVariance: number
}

export interface BenchmarkReport {
  scoredCount: number
  failedCount: number
  overall: ScoreMetrics
  criteria: Record<string, ScoreMetrics>
  pipeline: PipelineMetrics
  stability?: StabilityMetrics
}
