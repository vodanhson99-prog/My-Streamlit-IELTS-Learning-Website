import { z } from "zod"
import type { AIProvider, StructuredAiRequest } from "../../ai/contracts"
import { completeStructured } from "../../ai/provider"
import { IELTS_BANDS, IELTS_TASK2_RUBRIC_VERSION } from "../constants"
import type {
  AdjudicationRecord,
  CriterionEvaluation,
  IeltsBand,
  Task2DescriptorId,
  Task2Rubric,
} from "../contracts"
import { wrapUntrustedContent } from "../prompts/shared"

export interface ChallengeInput {
  readonly task: {
    readonly testType: "academic" | "general_training"
    readonly prompt: string
  }
  readonly essay: string
  readonly rubric: Task2Rubric
  readonly criterionEvaluation: CriterionEvaluation
  readonly lowerBand: IeltsBand
  readonly higherBand: IeltsBand
}

const challengeOutputSchema = z.object({
  decision: z.enum(["confirmed", "overturned"]),
  selectedBand: z.union(IELTS_BANDS.map((b) => z.literal(b))),
  rationale: z.string().trim().min(1),
}).strict()

export type ChallengeResult = z.infer<typeof challengeOutputSchema>

export async function challengeBandBoundary(
  provider: AIProvider,
  input: ChallengeInput,
): Promise<{ updatedEvaluation: CriterionEvaluation; record: AdjudicationRecord }> {
  const { criterionEvaluation, lowerBand, higherBand } = input
  const criterionId = criterionEvaluation.criterionId

  const rubricItem = input.rubric.criteria.find((c) => c.id === criterionId)
  if (!rubricItem) throw new Error(`Rubric missing criterion ${criterionId}`)

  const lowerDesc = rubricItem.bands.find((b) => b.band === lowerBand)?.descriptor || ""
  const higherDesc = rubricItem.bands.find((b) => b.band === higherBand)?.descriptor || ""

  const systemPrompt = `You are an expert IELTS Writing Task 2 Senior Examiner adjudicating a boundary disagreement.
Focus strictly on criterion: ${criterionId}.
Evaluate two specific competing hypotheses:
- Hypothesis 1 (H1): The essay meets Band ${lowerBand}: "${lowerDesc}"
- Hypothesis 2 (H2): The essay meets Band ${higherBand}: "${higherDesc}"

The primary examiner scored the essay as Band ${criterionEvaluation.band}.
Decide whether to "confirmed" the primary score or "overturned" it to the other hypothesis.
Never average the scores. You must select either Band ${lowerBand} or Band ${higherBand}.

Return JSON:
{
  "decision": "confirmed" | "overturned",
  "selectedBand": ${lowerBand} | ${higherBand},
  "rationale": "Clear detailed reason referencing descriptor clauses"
}`

  const userPrompt = `${wrapUntrustedContent("TASK", input.task.prompt)}

${wrapUntrustedContent("ESSAY_DATA", input.essay)}

Primary evaluation band: ${criterionEvaluation.band}
Current blockers: ${criterionEvaluation.blockers.join("; ")}

Adjudicate between Band ${lowerBand} and Band ${higherBand}.`

  const request: StructuredAiRequest<ChallengeResult> = {
    system: systemPrompt,
    user: userPrompt,
    temperature: 0.1,
    maxTokens: 1000,
    schema: challengeOutputSchema,
    parse: (raw) => {
      const parsed = challengeOutputSchema.parse(raw)
      if (parsed.selectedBand !== lowerBand && parsed.selectedBand !== higherBand) {
        throw new Error(`Challenger selected invalid band ${parsed.selectedBand}, must be ${lowerBand} or ${higherBand}`)
      }
      return parsed
    },
  }

  const { data } = await completeStructured(provider, request)

  const finalBand = data.selectedBand
  const finalDescriptorId: Task2DescriptorId = `${IELTS_TASK2_RUBRIC_VERSION}.${criterionId}.band-${finalBand}`

  const updatedEvaluation: CriterionEvaluation = {
    ...criterionEvaluation,
    band: finalBand,
    descriptorId: finalDescriptorId,
  }

  const record: AdjudicationRecord = {
    criterionId,
    originalBand: criterionEvaluation.band,
    challengedBand: finalBand,
    decision: data.decision,
    rationale: data.rationale,
  }

  return { updatedEvaluation, record }
}
