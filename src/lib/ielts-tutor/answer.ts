import { z } from "zod"
import type { AIProvider, StructuredAiRequest } from "../ai/contracts"
import { completeStructured } from "../ai/provider"
import { wrapUntrustedContent } from "../ielts-evaluation/prompts/shared"
import type { TutorRequestInput, TutorResponse } from "./contracts"

const tutorResponseSchema = z.object({
  reply: z.string().trim().min(1),
  references: z.array(z.string().trim().min(1)).default([]),
  suggestedFollowUps: z.array(z.string().trim().min(1)).default([]),
}).strict()

export async function askTutor(
  provider: AIProvider,
  input: TutorRequestInput,
): Promise<TutorResponse> {
  if (!input.evaluation.locked) {
    throw new Error("Tutor cannot discuss unlocked or unconfirmed evaluations.")
  }

  // Detect regrade/score mutation attempts
  const isRegradeRequest = /\b(regrade|change my score|give me band|increase band|re-evaluate|grade again)\b/i.test(
    input.userMessage,
  )

  if (isRegradeRequest) {
    return {
      reply:
        "Scores and band boundaries are locked and immutable once evaluated. If you make revisions or write a new draft, please submit a new evaluation request to calculate your new band score.",
      suggestedFollowUps: [
        "How can I improve my grammar to reach the next band?",
        "What specific vocabulary collocations should I fix?",
      ],
    }
  }

  const boundedHistory = input.history.slice(-8)

  const system = `You are an expert IELTS Writing Tutor.
You have access to a LOCKED official evaluation of the student's essay.
You CANNOT change scores, overturn bands, or alter locked criteria.
Your goal is to answer the student's questions, explain annotations, clarify grammar rules, provide better natural collocations, and guide them on how to reach the next band.
Be concise, helpful, and pedagogically precise.`

  const userPrompt = `${wrapUntrustedContent("TASK_PROMPT", input.prompt)}

${wrapUntrustedContent("LOCKED_EVALUATION", {
  overallBand: input.evaluation.overallBand,
  criteria: input.evaluation.criteria.map((c) => ({
    criterionId: c.criterionId,
    band: c.band,
    supportingEvidence: c.supportingEvidence,
    limitingEvidence: c.limitingEvidence,
    nextBandBlockers: c.nextBandBlockers,
  })),
})}

${wrapUntrustedContent("ESSAY_TEXT", input.essay)}

${
  input.selectedAnnotation
    ? wrapUntrustedContent("FOCUSED_ANNOTATION", input.selectedAnnotation)
    : ""
}

${wrapUntrustedContent("CONVERSATION_HISTORY", boundedHistory)}

Student question: ${input.userMessage}`

  const request: StructuredAiRequest<TutorResponse> = {
    system,
    user: userPrompt,
    temperature: 0.2,
    maxTokens: 1000,
    schema: tutorResponseSchema,
    parse: (raw) => tutorResponseSchema.parse(raw),
  }

  return (await completeStructured(provider, request)).data
}
