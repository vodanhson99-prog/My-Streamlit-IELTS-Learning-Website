export const AI_MESSAGE_ROLES = ["system", "user", "assistant"] as const
export const AI_PROVIDER_ERROR_CODES = [
  "configuration",
  "rate_limited",
  "authentication",
  "upstream",
  "timeout",
  "network",
  "invalid_response",
] as const

export type AIMessageRole = (typeof AI_MESSAGE_ROLES)[number]
export type AIProviderErrorCode = (typeof AI_PROVIDER_ERROR_CODES)[number]

export interface AIMessage {
  readonly role: AIMessageRole
  readonly content: string
}

export interface AICompletionRequest {
  readonly messages: readonly AIMessage[]
  readonly maxTokens: number
  readonly temperature: number
}

export interface AICompletionResult {
  readonly text: string
  readonly provider: "groq"
}

export interface AIProvider {
  complete(request: AICompletionRequest): Promise<AICompletionResult>
}
