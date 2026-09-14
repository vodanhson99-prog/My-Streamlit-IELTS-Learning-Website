import { afterEach, describe, expect, it, vi } from "vitest"
import { requestGroq } from "../../src/lib/ai"
import { AIProviderError, createGroqProvider } from "../../src/lib/ai/provider"

const request = {
  messages: [{ role: "user", content: "Evaluate this essay." }],
  maxTokens: 500,
  temperature: 0.2,
} as const

function rejectingFetcher(error: unknown): typeof fetch {
  return vi.fn(() => Promise.reject(error)) as typeof fetch
}

async function normalizedError(provider: ReturnType<typeof createGroqProvider>): Promise<AIProviderError> {
  try {
    await provider.complete(request)
    throw new Error("Expected provider call to fail")
  } catch (error) {
    if (error instanceof AIProviderError) return error
    throw error
  }
}

afterEach(() => vi.unstubAllGlobals())

describe("createGroqProvider", () => {
  it("returns provider text through stable boundary", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }))
    const provider = createGroqProvider({ apiKey: "secret", fetcher })
    await expect(provider.complete(request)).resolves.toEqual({ text: "ok", provider: "groq" })
  })

  it.each([
    [401, "authentication", false],
    [403, "authentication", false],
    [429, "rate_limited", true],
    [400, "upstream", false],
    [503, "upstream", true],
  ] as const)("normalizes HTTP %i as %s", async (status, code, retryable) => {
    const fetcher = vi.fn(async () => new Response("secret upstream diagnostics", { status }))
    const error = await normalizedError(createGroqProvider({ apiKey: "secret", fetcher }))
    expect(error).toMatchObject({ code, retryable, browserSafe: false, status })
    expect(JSON.stringify(error)).not.toContain("secret upstream diagnostics")
  })

  it("drops malformed JSON cause and body from normalized error", async () => {
    const secretBody = "secret malformed upstream body"
    const response = new Response(secretBody, { status: 200 })
    response.json = vi.fn(async () => { throw new SyntaxError(`Unexpected token '${secretBody}'`) })
    const error = await normalizedError(createGroqProvider({ apiKey: "secret", fetcher: vi.fn(async () => response) }))

    expect(error).toMatchObject({ code: "invalid_response", retryable: false, browserSafe: false, status: 200 })
    expect(error).not.toHaveProperty("cause")
    expect(JSON.stringify(error)).not.toContain(secretBody)
    expect(String(error.stack)).not.toContain(secretBody)
  })

  it("fails closed when provider response has no text", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }))
    await expect(createGroqProvider({ apiKey: "secret", fetcher }).complete(request)).rejects.toMatchObject({
      code: "invalid_response",
      browserSafe: false,
    })
  })

  it("normalizes missing configuration", async () => {
    const error = await normalizedError(createGroqProvider({ apiKey: " " }))
    expect(error).toMatchObject({ code: "configuration", retryable: false, browserSafe: false })
  })

  it("normalizes timeout without retaining raw cause", async () => {
    const raw = new DOMException("secret timeout diagnostics", "TimeoutError")
    const error = await normalizedError(createGroqProvider({ apiKey: "secret", fetcher: rejectingFetcher(raw) }))
    expect(error).toMatchObject({ code: "timeout", retryable: true, browserSafe: false })
    expect(error).not.toHaveProperty("cause")
  })

  it("normalizes network failure without retaining raw cause", async () => {
    const error = await normalizedError(createGroqProvider({ apiKey: "secret", fetcher: rejectingFetcher(new Error("secret network diagnostics")) }))
    expect(error).toMatchObject({ code: "network", retryable: true, browserSafe: false })
    expect(error).not.toHaveProperty("cause")
  })
})

describe("requestGroq compatibility", () => {
  it("keeps Explain Bot string-returning signature", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "compatible" } }] }), { status: 200 })))
    vi.stubEnv("GROQ_API_KEY", "secret")
    await expect(requestGroq([{ role: "user", content: "Explain" }], 100, 0.3)).resolves.toBe("compatible")
  })
})
