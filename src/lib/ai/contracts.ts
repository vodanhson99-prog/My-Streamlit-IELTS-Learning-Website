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
export type StructuredFailureKind = "malformed-json" | "schema-invalid" | "provider-timeout" | "provider-failure" | "unknown"

export interface AIDiagnosticMetadata {
  readonly provider?: AICompletionResult["provider"]
  readonly model?: string
  readonly requestId?: string
  readonly status?: number
  readonly failureKind: StructuredFailureKind
  readonly retryCount: number
  readonly latencyMs: number
}

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
  readonly provider: "groq" | "openai-compatible"
}

export interface AIProvider {
  complete(request: AICompletionRequest): Promise<AICompletionResult>
}

export interface StructuredAiRequest<T> {
  readonly system: string
  readonly user: string
  readonly temperature: number
  readonly maxTokens: number
  readonly schema: unknown
  readonly parse: (raw: unknown) => T
}
