import { z } from "zod"
import type { AIProvider, StructuredAiRequest } from "../ai/contracts"
import { completeStructured, formatStructuredFailure, isTransientAIError, classifyStructuredFailure } from "../ai/provider"
import { wrapUntrustedContent } from "../ielts-evaluation/prompts/shared"
import type { TutorRequestInput, TutorResponse } from "./contracts"

export interface AskTutorOptions {
  readonly retryDelayMs?: number
}

const tutorResponseSchema = z.object({
  reply: z.string().trim().min(1).max(5000),
  references: z.array(z.string().trim().min(1).max(500)).max(10).default([]),
  suggestedFollowUps: z.array(z.string().trim().min(1).max(250)).max(5).default([]),
}).strict()

export async function askTutor(
  provider: AIProvider,
  input: TutorRequestInput,
  options: AskTutorOptions = {},
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

  const retryDelayMs = options.retryDelayMs ?? 75
  const startTime = Date.now()

  try {
    const res = await completeStructured(provider, request)
    return res.data
  } catch (firstErr) {
    const elapsedMs = Date.now() - startTime
    const failureKind = classifyStructuredFailure(firstErr)
    const safeMsg = formatStructuredFailure(firstErr)
    console.warn(
      `[writing-tutor][attempt=1] failureKind=${failureKind} msg="${safeMsg}" elapsedMs=${elapsedMs}`,
    )

    if (!isTransientAIError(firstErr)) {
      throw firstErr
    }

    if (retryDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
    }

    const retryStartTime = Date.now()
    try {
      const res = await completeStructured(provider, request)
      return res.data
    } catch (retryErr) {
      const retryElapsedMs = Date.now() - retryStartTime
      const retryFailureKind = classifyStructuredFailure(retryErr)
      const retrySafeMsg = formatStructuredFailure(retryErr)
      console.warn(
        `[writing-tutor][attempt=2] failureKind=${retryFailureKind} msg="${retrySafeMsg}" elapsedMs=${retryElapsedMs}`,
      )
      throw retryErr
    }
  }
}
