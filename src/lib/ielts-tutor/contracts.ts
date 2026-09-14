import type { LockedTask2Evaluation, ResolvedAnnotation } from "../ielts-evaluation/contracts"
import type { LockedTask1Evaluation } from "../ielts-evaluation/task1/contracts"

export interface TutorMessage {
  readonly role: "user" | "assistant"
  readonly content: string
}

export interface TutorRequestInput {
  readonly evaluation: LockedTask2Evaluation | LockedTask1Evaluation
  readonly essay: string
  readonly prompt: string
  readonly history: readonly TutorMessage[]
  readonly userMessage: string
  readonly selectedAnnotation?: ResolvedAnnotation
}

export interface TutorResponse {
  readonly reply: string
  readonly references?: readonly string[]
  readonly suggestedFollowUps?: readonly string[]
}
