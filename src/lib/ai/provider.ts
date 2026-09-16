import { z, ZodError } from "zod"
import type {
  AICompletionRequest,
  AICompletionResult,
  AIProvider,
  AIProviderErrorCode,
  StructuredAiRequest,
  StructuredFailureKind,
} from "./contracts"

export function classifyStructuredFailure(error: unknown): StructuredFailureKind {
  if (error instanceof SyntaxError) return "malformed-json"
  if (error instanceof ZodError) return "schema-invalid"
  if (error instanceof AIProviderError) {
    return error.code === "timeout" ? "provider-timeout" : "provider-failure"
  }
  return "unknown"
}

export function isTransientAIError(error: unknown): boolean {
  if (error instanceof AIProviderError) {
    if (error.code === "timeout" || error.code === "network" || error.code === "rate_limited") {
      return true
    }
    if (error.status !== undefined && (error.status === 429 || error.status >= 500)) {
      return true
    }
    return error.retryable
  }
  return false
}

const chatCompletionsResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().min(1) }) })).min(1),
})

function parseJsonText(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const candidate = fenced?.[1] ?? trimmed
  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf("{")
    if (start >= 0) {
      let depth = 0
      let inString = false
      let escaped = false
      for (let index = start; index < candidate.length; index += 1) {
        const char = candidate[index]
        if (inString) {
          if (escaped) escaped = false
          else if (char === "\\") escaped = true
          else if (char === '"') inString = false
          continue
        }
        if (char === '"') inString = true
        else if (char === "{") depth += 1
        else if (char === "}" && --depth === 0) return JSON.parse(candidate.slice(start, index + 1))
      }
    }
    const end = candidate.lastIndexOf("}")
    throw new SyntaxError(`Provider returned malformed JSON (length=${candidate.length}, objectStart=${start}, objectEnd=${end}).`)
  }
}

function sanitizeProviderError(error: unknown): string {
  if (error instanceof AIProviderError) return error.message
  if (error instanceof Error) return error.message.slice(0, 180)
  return "Unknown provider error"
}

let activeRequests = 0
const queuedRequests: (() => void)[] = []

async function withProviderConcurrency<T>(work: () => Promise<T>): Promise<T> {
  if (activeRequests >= 2) {
    await new Promise<void>((resolve) => queuedRequests.push(resolve))
  }
  activeRequests += 1
  try {
    return await work()
  } finally {
    activeRequests -= 1
    queuedRequests.shift()?.()
  }
}

export class AIProviderError extends Error {
  readonly browserSafe = false

  constructor(
    readonly code: AIProviderErrorCode,
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message)
    this.name = "AIProviderError"
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      browserSafe: this.browserSafe,
      status: this.status,
    }
  }
}

/** Return bounded, non-sensitive diagnostics for structured-output failures. */
export function formatStructuredFailure(error: unknown): string {
  if (error instanceof AIProviderError) return error.message
  if (error instanceof ZodError) {
    const issues = error.issues.slice(0, 3).map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "output"
      return `${path}: ${issue.message}`
    })
    return issues.length > 0
      ? `Structured output schema mismatch (${issues.join("; ")}).`
      : "Structured output schema mismatch."
  }
  if (error instanceof SyntaxError) return error.message.slice(0, 180)
  return "Structured evaluation failed."
}

export interface AIProviderOptions {
  readonly apiKey?: string
  readonly apiUrl?: string
  readonly model?: string
  readonly timeoutMs?: number
  readonly fetcher?: typeof fetch
}

function httpError(status: number): AIProviderError {
  if (status === 401 || status === 403) {
    return new AIProviderError(
      "authentication",
      "AI provider authentication failed. Verify that AI_API_KEY is a valid key for the configured AI_API_URL (remote 9Router instances require a 9Router API key).",
      false,
      status,
    )
  }
  if (status === 429) {
    return new AIProviderError("rate_limited", "AI provider rate limit exceeded.", true, status)
  }
  return new AIProviderError("upstream", "AI provider request failed.", status >= 500, status)
}

export function createAIProvider(options: AIProviderOptions = {}): AIProvider {
  const apiKey = (options.apiKey ?? process.env.AI_API_KEY)?.trim()
  const apiUrl = options.apiUrl || process.env.AI_API_URL || "https://9router.minhmice.com/v1/chat/completions"
  const model = options.model || process.env.AI_MODEL || "coding-rbs"
  const configuredTimeoutMs = Number(process.env.AI_TIMEOUT_MS)
  const timeoutMs = options.timeoutMs ?? (Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0 ? configuredTimeoutMs : 120_000)
  const fetcher = options.fetcher ?? fetch

  return {
    async complete(request: AICompletionRequest): Promise<AICompletionResult> {
      if (!apiKey) {
        throw new AIProviderError("configuration", "Server AI API key is not configured (AI_API_KEY).", false)
      }

      let response: Response
      try {
        response = await withProviderConcurrency(() =>
          fetcher(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model,
              messages: request.messages,
              max_tokens: request.maxTokens,
              temperature: request.temperature,
              ...(request.responseFormat ? { response_format: { type: request.responseFormat } } : {}),
              stream: false,
            }),
            signal: AbortSignal.timeout(timeoutMs),
          }),
        )
      } catch (error) {
        if (error instanceof AIProviderError) throw error
        const timedOut = error instanceof DOMException && error.name === "TimeoutError"
        throw new AIProviderError(
          timedOut ? "timeout" : "network",
          timedOut ? "AI provider request timed out." : `AI provider network request failed: ${sanitizeProviderError(error)}`,
          true,
        )
      }

      if (!response.ok) throw httpError(response.status)

      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        throw new AIProviderError("invalid_response", "AI provider returned invalid JSON.", false, response.status)
      }

      const parsed = chatCompletionsResponseSchema.safeParse(payload)
      if (!parsed.success) {
        throw new AIProviderError("invalid_response", "AI provider returned an invalid response.", false, response.status)
      }

      return { text: parsed.data.choices[0].message.content, provider: "openai-compatible" }
    },
  }
}

// Retain backward-compatible alias for existing imports
export const createGroqProvider = createAIProvider

export async function completeStructured<T>(
  provider: AIProvider,
  request: StructuredAiRequest<T>,
): Promise<{ readonly data: T; readonly provider: AICompletionResult["provider"] }> {
  const result = await provider.complete({
    messages: [
      { role: "system", content: request.system },
      { role: "user", content: request.user },
    ],
    maxTokens: request.maxTokens,
    temperature: request.temperature,
    responseFormat: "json_object",
  })
  return { data: request.parse(parseJsonText(result.text)), provider: result.provider }
}

export function createEnvironmentAIProvider(): AIProvider {
  return createAIProvider()
}

export const createEnvironmentGroqProvider = createEnvironmentAIProvider
