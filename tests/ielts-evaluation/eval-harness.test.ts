import { describe, expect, it } from "vitest"
import { computeMetrics } from "../../scripts/eval-writing"
import { evalCaseSchema } from "../../evals/writing/schema"

describe("Offline Evaluation Harness", () => {
  it("validates eval case schema", () => {
    const validCase = {
      id: "case-1",
      taskType: "task2",
      testType: "academic",
      prompt: "Discuss views",
      essay: "Sample essay content...",
      groundTruth: { overallBand: 6.5 },
    }
    expect(evalCaseSchema.parse(validCase)).toBeDefined()
  })

  it("calculates accuracy and error metrics accurately", () => {
    const results = [
      { caseId: "1", predictedBand: 6.5, groundTruthBand: 6.5 }, // exact
      { caseId: "2", predictedBand: 7.0, groundTruthBand: 6.5 }, // within 0.5
      { caseId: "3", predictedBand: 5.5, groundTruthBand: 7.0 }, // undergraded > 0.5
    ]

    const metrics = computeMetrics(results)
    expect(metrics.totalCases).toBe(3)
    expect(metrics.exactMatchPct).toBe(33.3)
    expect(metrics.withinHalfBandPct).toBe(66.7)
    expect(metrics.undergradedCount).toBe(1)
    expect(metrics.overgradedCount).toBe(0)
  })
})
