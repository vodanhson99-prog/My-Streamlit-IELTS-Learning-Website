import { z } from "zod"
import type { AIProvider, StructuredAiRequest } from "../../ai/contracts"
import { completeStructured } from "../../ai/provider"
import { IELTS_BANDS, IELTS_TASK2_RUBRIC_VERSION } from "../constants"
import type { CriterionEvaluation, IeltsTask2CriterionId, RubricCriterion, Task2Rubric } from "../contracts"

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

function createResultSchema(criterionId: IeltsTask2CriterionId, labels: readonly [string, ...string[]]) {
  const evidence = z.object({
    type: z.enum(["positive", "negative"]),
    quote: z.string().trim().min(1),
    rationale: z.string().trim().min(1),
  }).strict()

  return z.object({
    criterionId: z.literal(criterionId),
    band: z.union(IELTS_BANDS.map((band) => z.literal(band))),
    descriptorId: z.string().trim().min(1),
    evidence: z.array(evidence).min(2),
    blockers: z.array(z.string().trim().min(1)).min(1),
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
    const polarities = new Set(value.evidence.map(({ type }) => type))
    for (const required of ["positive", "negative"] as const) {
      if (!polarities.has(required)) {
        context.addIssue({ code: "custom", path: ["evidence"], message: `Missing ${required} evidence` })
      }
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
      maxTokens: 1_800,
      schema: resultSchema,
      parse: (raw) => resultSchema.parse(raw) as CriterionEvaluation,
    }
    return (await completeStructured(provider, request)).data
  }
}
