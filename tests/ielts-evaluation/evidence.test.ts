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
    evidence: [
      { type: "positive", quote: "online platforms allow instant connection across the world", rationale: "Clear relevant example" },
      { type: "negative", quote: "excessive reliance on social media can reduce meaningful face-to-face interaction", rationale: "Needs further elaboration" },
    ],
    blockers: ["Needs more extended counter-arguments"],
    annotationCandidates: [
      { quote: "online platforms allow instant connection across the world", label: "addresses-prompt", rationale: "directly relevant" },
    ],
    ...overrides,
  }
}

describe("validateCriterionEvidence", () => {
  it("passes when all evidence and annotations are present in essay with both polarities and blockers", () => {
    const res = validateCriterionEvidence(makeEval(), ESSAY)
    expect(res.valid).toBe(true)
    expect(res.errors).toHaveLength(0)
  })

  it("fails when an evidence quote does not exist in essay", () => {
    const res = validateCriterionEvidence(
      makeEval({
        evidence: [
          { type: "positive", quote: "this quote is completely made up and not in essay", rationale: "fake" },
          { type: "negative", quote: "excessive reliance on social media can reduce meaningful face-to-face interaction", rationale: "valid" },
        ],
      }),
      ESSAY,
    )
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.includes("Quote not found in essay"))).toBe(true)
  })

  it("fails when positive or negative evidence is missing", () => {
    const res = validateCriterionEvidence(
      makeEval({
        evidence: [
          { type: "positive", quote: "online platforms allow instant connection across the world", rationale: "Clear" },
          { type: "positive", quote: "business teams collaborate across continents", rationale: "Good" },
        ],
      }),
      ESSAY,
    )
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.includes("Missing negative evidence"))).toBe(true)
  })

  it("fails when blockers array is empty", () => {
    const res = validateCriterionEvidence(makeEval({ blockers: [] }), ESSAY)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.includes("At least one blocker required"))).toBe(true)
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
