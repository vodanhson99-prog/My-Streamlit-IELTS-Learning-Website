import { describe, it, expect } from "vitest"
import { computeMetrics, loadAllCases } from "../scripts/eval-writing"
import { evalCaseSchema } from "../evals/writing/schema"
import { createAIProvider, AIProviderError } from "@/lib/ai/provider"

describe("Calibration Evaluation Harness", () => {
  it("computes accurate MAE and classification metrics", () => {
    const mockResults = [
      { caseId: "case-1", predictedBand: 6.5, groundTruthBand: 6.5 }, // diff 0
      { caseId: "case-2", predictedBand: 7.0, groundTruthBand: 6.5 }, // diff +0.5
      { caseId: "case-3", predictedBand: 5.5, groundTruthBand: 6.0 }, // diff -0.5
      { caseId: "case-4", predictedBand: 7.5, groundTruthBand: 6.0 }, // diff +1.5 (overgraded)
    ]

    const metrics = computeMetrics(mockResults)
    expect(metrics.totalCases).toBe(4)
    // Absolute diffs: 0, 0.5, 0.5, 1.5 => sum 2.5 / 4 = 0.625 => 0.63
    expect(metrics.meanAbsoluteError).toBe(0.63)
    // within ±0.5: 3 out of 4 => 75%
    expect(metrics.withinHalfBandPct).toBe(75.0)
    // exact: 1 out of 4 => 25%
    expect(metrics.exactMatchPct).toBe(25.0)
    expect(metrics.overgradedCount).toBe(1)
    expect(metrics.undergradedCount).toBe(0)
  })

  it("handles empty result sets gracefully", () => {
    const metrics = computeMetrics([])
    expect(metrics.totalCases).toBe(0)
    expect(metrics.meanAbsoluteError).toBe(0)
  })

  it("loads and validates all calibration corpus cases against schema", () => {
    const cases = loadAllCases()
    expect(cases.length).toBeGreaterThanOrEqual(8)

    for (const c of cases) {
      const parsed = evalCaseSchema.safeParse(c)
      expect(parsed.success).toBe(true)
      expect(c.groundTruth.overallBand).toBeGreaterThanOrEqual(1.0)
      expect(c.groundTruth.overallBand).toBeLessThanOrEqual(9.0)
      expect(c.essay.length).toBeGreaterThan(50)
      expect(c.prompt.length).toBeGreaterThan(20)
    }
  })
})

describe("9router AI Provider Secret Safety & Config", () => {
  it("throws clear configuration error when AI_API_KEY is omitted", async () => {
    const provider = createAIProvider({ apiKey: "" })
    await expect(
      provider.complete({
        messages: [{ role: "user", content: "hi" }],
        maxTokens: 50,
        temperature: 0.1,
      }),
    ).rejects.toThrowError(AIProviderError)
  })

  it("redacts credentials from error outputs", async () => {
    const mockFetcher = (async () => {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
      })
    }) as typeof fetch

    const provider = createAIProvider({
      apiKey: "secret-token-do-not-leak",
      fetcher: mockFetcher,
    })

    try {
      await provider.complete({
        messages: [{ role: "user", content: "test" }],
        maxTokens: 50,
        temperature: 0.1,
      })
      expect.unreachable("Should have thrown")
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AIProviderError)
      const error = err as AIProviderError
      expect(error.message).not.toContain("secret-token-do-not-leak")
      expect(JSON.stringify(error.toJSON())).not.toContain("secret-token-do-not-leak")
    }
  })
})
