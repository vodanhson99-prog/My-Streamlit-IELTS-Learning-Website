import { describe, expect, it } from "vitest"
import type { WritingFeedbackResult } from "../../src/lib/ielts"

describe("WritingFeedbackResult Contract", () => {
  it("includes combined fields for both tasks", () => {
    // This is just a type-level check for the interface.
    // The route integration test will verify the actual payload.
    const result: WritingFeedbackResult = {
      source: "ai",
      band_estimate: 6.5,
      criterion_bands: null,
      criteria_sentences: [],
      overall_tip: "",
      combined: {
        task1CriterionMean: 6.25,
        task2CriterionMean: 6.75,
        weightedWritingMean: 6.58,
        displayBand: 6.5,
      },
    }

    expect(result.combined?.task1CriterionMean).toEqual(expect.any(Number))
    expect(result.combined?.task2CriterionMean).toEqual(expect.any(Number))
    expect(result.combined?.weightedWritingMean).toEqual(expect.any(Number))
    expect(result.combined?.displayBand).toEqual(expect.any(Number))
  })
})
