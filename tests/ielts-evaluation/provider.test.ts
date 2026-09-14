import { describe, expect, it, vi } from "vitest"
import { AIProviderError, createGroqProvider } from "../../src/lib/ai/provider"

const request = {
  messages: [{ role: "user", content: "Evaluate this essay." }],
  maxTokens: 500,
  temperature: 0.2,
} as const

describe("createGroqProvider", () => {
  it("returns provider text through stable boundary", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }))
    const provider = createGroqProvider({ apiKey: "secret", fetcher })
    await expect(provider.complete(request)).resolves.toEqual({ text: "ok", provider: "groq" })
  })

  it("normalizes upstream errors without exposing raw response text", async () => {
    const fetcher = vi.fn(async () => new Response("secret upstream diagnostics", { status: 429, statusText: "Too Many Requests" }))
    const provider = createGroqProvider({ apiKey: "secret", fetcher })

    const error = await provider.complete(request).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(AIProviderError)
    expect(error).toMatchObject({ code: "rate_limited", retryable: true, browserSafe: false, status: 429 })
    expect(JSON.stringify(error)).not.toContain("secret upstream diagnostics")
  })

  it("fails closed when provider response has no text", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }))
    const provider = createGroqProvider({ apiKey: "secret", fetcher })
    await expect(provider.complete(request)).rejects.toMatchObject({ code: "invalid_response", browserSafe: false })
  })
})
