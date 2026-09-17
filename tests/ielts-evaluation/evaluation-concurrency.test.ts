import { describe, expect, it, vi } from "vitest"
import { createAIProvider } from "@/lib/ai/provider"

const request = {
  messages: [{ role: "user" as const, content: "Evaluate this essay." }],
  maxTokens: 100,
  temperature: 0.1,
}

describe("AI provider concurrency", () => {
  it("limits upstream calls to two concurrent requests", async () => {
    let active = 0
    let peak = 0
    const fetcher = vi.fn(async () => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active -= 1
      return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 })
    })
    const provider = createAIProvider({ apiKey: "secret", fetcher })

    await Promise.all(Array.from({ length: 8 }, () => provider.complete(request)))

    expect(fetcher).toHaveBeenCalledTimes(8)
    expect(peak).toBeLessThanOrEqual(2)
  })
})
