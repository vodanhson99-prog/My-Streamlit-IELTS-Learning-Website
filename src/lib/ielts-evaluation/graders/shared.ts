import { z } from "zod"
import type { AIProvider, StructuredAiRequest } from "../../ai/contracts"
import { completeStructured } from "../../ai/provider"
import { IELTS_BANDS, IELTS_TASK2_RUBRIC_VERSION } from "../constants"
import type { CriterionEvaluation, IeltsTask2CriterionId, RubricCriterion, Task2Rubric } from "../contracts"
import { normalizeNextBandBlockers } from "../normalization"

export interface CriterionGraderInput {
  readonly task: {
    readonly testType: "academic" | "general_training"
    readonly prompt: string
  }
  readonly essay: string
  readonly rubric: Task2Rubric
}

export type CriterionGrader = (input: CriterionGraderInput) => Promise<CriterionEvaluation>

type PromptBuilder = (input: {
  readonly task: CriterionGraderInput["task"]
  readonly essay: string
  readonly rubric: RubricCriterion
}) => { readonly system: string; readonly user: string }

const inputSchema = z.object({
  task: z.object({
    testType: z.enum(["academic", "general_training"]),
    prompt: z.string().trim().min(1),
  }).strict(),
  essay: z.string().trim().min(1),
  rubric: z.custom<Task2Rubric>(),
}).strict()

const evidenceAnchor = z.discriminatedUnion("type", [
  z.object({ type: z.literal("span"), quote: z.string().trim().min(1) }).strict(),
  z.object({ type: z.literal("paragraph"), paragraphIndex: z.number().int().nonnegative() }).strict(),
  z.object({ type: z.literal("global") }).strict(),
])

const blocker = z.string().trim().min(1)

const evidence = z.object({
  anchor: evidenceAnchor,
  rationale: z.string().trim().min(1),
}).strict()

function createResultSchema(criterionId: IeltsTask2CriterionId, labels: readonly [string, ...string[]]) {
  return z.object({
    criterionId: z.literal(criterionId),
    band: z.union(IELTS_BANDS.map((band) => z.literal(band))),
    descriptorId: z.string().trim().min(1),
    supportingEvidence: z.array(evidence).min(1),
    limitingEvidence: z.array(evidence),
    nextBandBlockers: z.array(blocker),
    annotationCandidates: z.array(z.object({
      quote: z.string().trim().min(1),
      label: z.enum(labels),
      rationale: z.string().trim().min(1),
    }).strict()).min(1),
  }).strict().superRefine((value, context) => {
    const expectedDescriptorId = `${IELTS_TASK2_RUBRIC_VERSION}.${criterionId}.band-${value.band}`
    if (value.descriptorId !== expectedDescriptorId) {
      context.addIssue({ code: "custom", path: ["descriptorId"], message: `Expected ${expectedDescriptorId}` })
    }
    if (value.band < 9 && value.limitingEvidence.length === 0) {
      context.addIssue({ code: "custom", path: ["limitingEvidence"], message: "At least one limiting evidence item required below Band 9" })
    }
    if (value.band < 9 && value.nextBandBlockers.length === 0) {
      context.addIssue({ code: "custom", path: ["nextBandBlockers"], message: "At least one next-band blocker required below Band 9" })
    }
  })
}

export function createCriterionGrader(
  provider: AIProvider,
  criterionId: IeltsTask2CriterionId,
  annotationLabels: readonly [string, ...string[]],
  buildPrompt: PromptBuilder,
): CriterionGrader {
  const resultSchema = createResultSchema(criterionId, annotationLabels)

  return async (rawInput) => {
    const input = inputSchema.parse(rawInput)
    const rubric = input.rubric.criteria.find(({ id }) => id === criterionId)
    if (!rubric) throw new Error(`Rubric is missing criterion ${criterionId}`)

    const prompt = buildPrompt({ task: input.task, essay: input.essay, rubric })
    const request: StructuredAiRequest<CriterionEvaluation> = {
      ...prompt,
      temperature: 0.1,
      maxTokens: 3_200,
      schema: resultSchema,
      parse: (raw) => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return resultSchema.parse(raw) as CriterionEvaluation
        const normalized = raw as Record<string, unknown>
        return resultSchema.parse({
          ...normalized,
          nextBandBlockers: normalizeNextBandBlockers(normalized.nextBandBlockers),
        }) as CriterionEvaluation
      },
    }
    return (await completeStructured(provider, request)).data
  }
}
