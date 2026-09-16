import { z } from "zod"
import {
  EVALUATION_SCHEMA_VERSION,
  IELTS_HALF_BANDS,
  IELTS_TASK2_CRITERION_IDS,
  IELTS_TASK2_RUBRIC_VERSION,
} from "../constants"
import type { IeltsTask2CriterionId, Task2EvaluationOutput } from "../contracts"

const bandSchema = z.number().int().min(0).max(9)
const nonEmptyText = z.string().trim().min(1)

const evidenceAnchorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("span"), quote: nonEmptyText }).strict(),
  z.object({ type: z.literal("paragraph"), paragraphIndex: z.number().int().nonnegative() }).strict(),
  z.object({ type: z.literal("global") }).strict(),
])

const evidenceSchema = z.object({
  anchor: evidenceAnchorSchema,
  rationale: nonEmptyText,
}).strict()

const annotationCandidateSchema = z.object({
  quote: nonEmptyText,
  label: nonEmptyText,
  rationale: nonEmptyText,
}).strict()

const criterionEvaluationSchema = z.object({
  criterionId: z.enum(IELTS_TASK2_CRITERION_IDS),
  band: bandSchema,
  descriptorId: nonEmptyText,
  supportingEvidence: z.array(evidenceSchema).min(1),
  limitingEvidence: z.array(evidenceSchema),
  nextBandBlockers: z.array(nonEmptyText),
  annotationCandidates: z.array(annotationCandidateSchema).min(1),
}).strict().superRefine((value, context) => {
  const expected = `${IELTS_TASK2_RUBRIC_VERSION}.${value.criterionId}.band-${value.band}`
  if (value.descriptorId !== expected) {
    context.addIssue({ code: "custom", path: ["descriptorId"], message: `Expected descriptorId ${expected}` })
  }
  if (value.band < 9 && value.limitingEvidence.length === 0) {
    context.addIssue({ code: "custom", path: ["limitingEvidence"], message: "At least one limiting evidence item required below Band 9" })
  }
  if (value.band < 9 && value.nextBandBlockers.length === 0) {
    context.addIssue({ code: "custom", path: ["nextBandBlockers"], message: "At least one next-band blocker required below Band 9" })
  }
})

export const evaluationOutputSchema = z.object({
  schemaVersion: z.literal(EVALUATION_SCHEMA_VERSION),
  rubricVersion: z.literal(IELTS_TASK2_RUBRIC_VERSION),
  overallBand: z.union(IELTS_HALF_BANDS.map((band) => z.literal(band))),
  criteria: z.array(criterionEvaluationSchema).length(IELTS_TASK2_CRITERION_IDS.length),
  summary: nonEmptyText,
}).strict().superRefine((value, context) => {
  const found = new Set<IeltsTask2CriterionId>()
  for (const criterion of value.criteria) {
    if (found.has(criterion.criterionId)) {
      context.addIssue({ code: "custom", path: ["criteria"], message: `Duplicate criterion ${criterion.criterionId}` })
    }
    found.add(criterion.criterionId)
  }
  for (const criterionId of IELTS_TASK2_CRITERION_IDS) {
    if (!found.has(criterionId)) {
      context.addIssue({ code: "custom", path: ["criteria"], message: `Missing criterion ${criterionId}` })
    }
  }
})

export function parseEvaluationOutput(input: unknown): Task2EvaluationOutput {
  return evaluationOutputSchema.parse(input) as Task2EvaluationOutput
}
