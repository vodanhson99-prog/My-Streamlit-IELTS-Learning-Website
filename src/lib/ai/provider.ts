import { z } from "zod"
import type {
  AICompletionRequest,
  AICompletionResult,
  AIProvider,
  AIProviderErrorCode,
  StructuredAiRequest,
} from "./contracts"

const chatCompletionsResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().min(1) }) })).min(1),
})

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

export interface AIProviderOptions {
  readonly apiKey?: string
  readonly apiUrl?: string
  readonly model?: string
  readonly timeoutMs?: number
  readonly fetcher?: typeof fetch
}

function httpError(status: number): AIProviderError {
  if (status === 401 || status === 403) {
    return new AIProviderError("authentication", "AI provider authentication failed.", false, status)
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
  })
  return { data: request.parse(JSON.parse(result.text)), provider: result.provider }
}

export function createEnvironmentAIProvider(): AIProvider {
  return createAIProvider()
}

export const createEnvironmentGroqProvider = createEnvironmentAIProvider
