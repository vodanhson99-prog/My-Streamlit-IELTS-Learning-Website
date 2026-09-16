import { describe, expect, it } from "vitest"
import type { CriterionEvaluation } from "../../src/lib/ielts-evaluation/contracts"
import { validateCriterionEvidence } from "../../src/lib/ielts-evaluation/validation/evidence"

const ESSAY = `In modern society, technological development has significantly changed human communication.
First, online platforms allow instant connection across the world. For example, business teams collaborate across continents.
However, excessive reliance on social media can reduce meaningful face-to-face interaction, which may lead to social isolation.
Therefore, people should use digital tools wisely while maintaining real personal relationships.`

function makeEval(overrides?: Partial<CriterionEvaluation>): CriterionEvaluation {
  return {
    criterionId: "task-response",
    band: 7,
    descriptorId: "task2-2023-05.task-response.band-7",
    supportingEvidence: [
      { anchor: { type: "span", quote: "online platforms allow instant connection across the world" }, rationale: "Clear relevant example" },
    ],
    limitingEvidence: [
      { anchor: { type: "span", quote: "excessive reliance on social media can reduce meaningful face-to-face interaction" }, rationale: "Needs further elaboration" },
    ],
    nextBandBlockers: ["Needs more extended counter-arguments"],
    annotationCandidates: [
      { quote: "online platforms allow instant connection across the world", label: "addresses-prompt", rationale: "directly relevant" },
    ],
    ...overrides,
  }
}

describe("validateCriterionEvidence", () => {
  it("passes when supporting and limiting evidence anchors are present", () => {
    const res = validateCriterionEvidence(makeEval(), ESSAY)
    expect(res.valid).toBe(true)
    expect(res.errors).toHaveLength(0)
  })

  it("allows Band 9 with supporting evidence and no limitation or blocker", () => {
    const res = validateCriterionEvidence(
      makeEval({
        band: 9,
        supportingEvidence: [
          { anchor: { type: "span", quote: "online platforms allow instant connection across the world" }, rationale: "Clear relevant example" },
        ],
        limitingEvidence: [],
        nextBandBlockers: [],
      }),
      ESSAY,
    )
    expect(res.valid).toBe(true)
  })

  it("allows paragraph-anchored limiting evidence without requiring a quote", () => {
    const res = validateCriterionEvidence(
      makeEval({
        limitingEvidence: [
          { anchor: { type: "paragraph", paragraphIndex: 2 }, rationale: "Progression weakens in this paragraph." },
        ],
      }),
      ESSAY,
    )
    expect(res.valid).toBe(true)
  })

  it("fails when a span evidence quote does not exist in essay", () => {
    const res = validateCriterionEvidence(
      makeEval({
        supportingEvidence: [
          { anchor: { type: "span", quote: "this quote is completely made up and not in essay" }, rationale: "fake" },
        ],
      }),
      ESSAY,
    )
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.includes("Quote not found in essay"))).toBe(true)
  })

  it("fails when a non-Band-9 evaluation has no limiting evidence", () => {
    const res = validateCriterionEvidence(makeEval({ limitingEvidence: [] }), ESSAY)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.includes("At least one limiting evidence item required"))).toBe(true)
  })

  it("allows an empty next-band blocker list only at Band 9", () => {
    const res = validateCriterionEvidence(makeEval({ nextBandBlockers: [] }), ESSAY)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.includes("At least one next-band blocker required"))).toBe(true)
  })

  it("fails when annotationCandidate quote is not in essay", () => {
    const res = validateCriterionEvidence(
      makeEval({
        annotationCandidates: [
          { quote: "nonexistent candidate quote", label: "addresses-prompt", rationale: "test" },
        ],
      }),
      ESSAY,
    )
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.includes("Annotation quote not found in essay"))).toBe(true)
  })
})
