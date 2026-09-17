import { describe, expect, it, vi } from "vitest"
import { createAIProvider } from "@/lib/ai/provider"

describe("AI provider request scheduling", () => {
  it("does not queue requests when endpoint responds normally", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 }))
    const provider = createAIProvider({ apiKey: "secret", fetcher })

    await Promise.all(Array.from({ length: 8 }, () => provider.complete({
      messages: [{ role: "user", content: "test" }],
      maxTokens: 100,
      temperature: 0.1,
    })))

    expect(fetcher).toHaveBeenCalledTimes(8)
  })
})
