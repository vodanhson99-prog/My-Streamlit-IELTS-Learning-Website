import { z } from "zod"

export const evalCaseSchema = z.object({
  id: z.string().min(1),
  taskType: z.enum(["task1", "task2"]),
  testType: z.enum(["academic", "general_training"]),
  prompt: z.string().min(1),
  essay: z.string().min(1),
  groundTruth: z.object({
    overallBand: z.number().min(0).max(9),
    criteriaBands: z.record(z.string(), z.number().min(0).max(9)).optional(),
  }),
})

export type EvalCase = z.infer<typeof evalCaseSchema>

export interface EvalMetrics {
  totalCases: number
  meanAbsoluteError: number
  withinHalfBandPct: number
  overgradedCount: number
  undergradedCount: number
  exactMatchPct: number
}
