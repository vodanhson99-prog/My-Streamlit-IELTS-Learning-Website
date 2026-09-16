import { describe, expect, it } from "vitest"
import type { CriterionEvaluation } from "../../src/lib/ielts-evaluation/contracts"
import { aggregateTask2Bands, calculateIeltsHalfBand } from "../../src/lib/ielts-evaluation/scoring/aggregate"

function makeCriterion(criterionId: CriterionEvaluation["criterionId"], band: CriterionEvaluation["band"]): CriterionEvaluation {
  return {
    criterionId,
    band,
    descriptorId: `task2-2023-05.${criterionId}.band-${band}`,
    supportingEvidence: [
      { anchor: { type: "span", quote: "good points" }, rationale: "addresses topic" },
    ],
    limitingEvidence: [
      { anchor: { type: "span", quote: "some flaws" }, rationale: "missing support" },
    ],
    nextBandBlockers: ["needs deeper nuance"],
    annotationCandidates: [{ quote: "good points", label: "balanced-argument", rationale: "sound analysis" }],
  }
}

describe("calculateIeltsHalfBand", () => {
  it("rounds exact quarter points up to next half band according to official IELTS rules", () => {
    expect(calculateIeltsHalfBand(6.125)).toBe(6.0)
    expect(calculateIeltsHalfBand(6.25)).toBe(6.5)
    expect(calculateIeltsHalfBand(6.375)).toBe(6.5)
    expect(calculateIeltsHalfBand(6.75)).toBe(7.0)
    expect(calculateIeltsHalfBand(6.875)).toBe(7.0)
  })

  it("clamps between 0 and 9", () => {
    expect(calculateIeltsHalfBand(-1)).toBe(0)
    expect(calculateIeltsHalfBand(10)).toBe(9)
  })
})

describe("aggregateTask2Bands", () => {
  it("aggregates the four criteria deterministically", () => {
    const criteria: CriterionEvaluation[] = [
      makeCriterion("task-response", 6),
      makeCriterion("coherence-cohesion", 6),
      makeCriterion("lexical-resource", 7),
      makeCriterion("grammatical-range-accuracy", 6),
    ]

    // (6 + 6 + 7 + 6) / 4 = 6.25 -> 6.5
    expect(aggregateTask2Bands(criteria)).toBe(6.5)
  })

  it("produces identical output regardless of input array order", () => {
    const c1 = makeCriterion("task-response", 7)
    const c2 = makeCriterion("coherence-cohesion", 6)
    const c3 = makeCriterion("lexical-resource", 8)
    const c4 = makeCriterion("grammatical-range-accuracy", 6)

    // (7 + 6 + 8 + 6) / 4 = 6.75 -> 7.0
    expect(aggregateTask2Bands([c1, c2, c3, c4])).toBe(7.0)
    expect(aggregateTask2Bands([c4, c2, c1, c3])).toBe(7.0)
  })

  it("throws if any of the required four criteria is missing or duplicated", () => {
    const incomplete = [
      makeCriterion("task-response", 6),
      makeCriterion("coherence-cohesion", 6),
      makeCriterion("lexical-resource", 7),
    ]
    expect(() => aggregateTask2Bands(incomplete)).toThrow(/exactly 4 unique criteria/)

    const duplicate = [
      makeCriterion("task-response", 6),
      makeCriterion("task-response", 7),
      makeCriterion("lexical-resource", 7),
      makeCriterion("grammatical-range-accuracy", 6),
    ]
    expect(() => aggregateTask2Bands(duplicate)).toThrow(/exactly 4 unique criteria/)
  })
})
