import { describe, expect, it } from "vitest"
import type { LockedTask2Evaluation, ResolvedAnnotation } from "../../src/lib/ielts-evaluation/contracts"
import { generateCoaching } from "../../src/lib/ielts-evaluation/coaching/generate-coaching"

const mockLockedEval: LockedTask2Evaluation = Object.freeze({
  status: "completed",
  locked: true,
  schemaVersion: "1.0.0",
  rubricVersion: "task2-2023-05",
  overallBand: 6.5,
  stability: "high",
  adjudicationRecords: [],
  summary: "Overall summary",
  criteria: Object.freeze([
    {
      criterionId: "task-response" as const,
      band: 6 as const,
      descriptorId: "task2-2023-05.task-response.band-6" as const,
      evidence: [
        { type: "positive" as const, quote: "some quote", rationale: "addresses topic" },
        { type: "negative" as const, quote: "other quote", rationale: "missing nuance" },
      ],
      blockers: ["needs deeper counter-argument development"],
      annotationCandidates: [],
    },
    {
      criterionId: "coherence-cohesion" as const,
      band: 6 as const,
      descriptorId: "task2-2023-05.coherence-cohesion.band-6" as const,
      evidence: [
        { type: "positive" as const, quote: "well linked", rationale: "logical progression" },
        { type: "negative" as const, quote: "repetitive link", rationale: "overuse of 'furthermore'" },
      ],
      blockers: ["overuse of mechanical cohesive devices"],
      annotationCandidates: [],
    },
    {
      criterionId: "lexical-resource" as const,
      band: 7 as const,
      descriptorId: "task2-2023-05.lexical-resource.band-7" as const,
      evidence: [
        { type: "positive" as const, quote: "sophisticated lexis", rationale: "flexible vocabulary" },
        { type: "negative" as const, quote: "wrong form", rationale: "word formation slip" },
      ],
      blockers: ["minor collocation inaccuracies"],
      annotationCandidates: [],
    },
    {
      criterionId: "grammatical-range-accuracy" as const,
      band: 6 as const,
      descriptorId: "task2-2023-05.grammatical-range-accuracy.band-6" as const,
      evidence: [
        { type: "positive" as const, quote: "good clauses", rationale: "mix of complex forms" },
        { type: "negative" as const, quote: "agreement error", rationale: "subject-verb slip" },
      ],
      blockers: ["frequent minor grammatical errors"],
      annotationCandidates: [],
    },
  ]),
})

const mockAnnotations: ResolvedAnnotation[] = [
  {
    id: "anno-1",
    criterionId: "lexical-resource",
    quote: "wrong form",
    label: "word_form",
    rationale: "Should be adjective rather than noun",
    status: "resolved",
    startOffset: 10,
    endOffset: 20,
  },
  {
    id: "anno-2",
    criterionId: "grammatical-range-accuracy",
    quote: "agreement error",
    label: "subject_verb_agreement",
    rationale: "Plural subject with singular verb",
    status: "resolved",
    startOffset: 30,
    endOffset: 45,
  },
]

describe("generateCoaching", () => {
  it("generates max 3 actionable priorities sorted by lowest band", () => {
    const coaching = generateCoaching(mockLockedEval, mockAnnotations, 7.5)

    expect(coaching.priorities).toHaveLength(3)
    // The three lowest are bands 6 (TR, CC, GRA)
    const priorityCriteria = coaching.priorities.map((p) => p.criterionId)
    expect(priorityCriteria).toContain("task-response")
    expect(priorityCriteria).toContain("coherence-cohesion")
    expect(priorityCriteria).toContain("grammatical-range-accuracy")
    expect(priorityCriteria).not.toContain("lexical-resource")
  })

  it("extracts vocabulary suggestions strictly from resolved annotations", () => {
    const coaching = generateCoaching(mockLockedEval, mockAnnotations)
    expect(coaching.vocabularySuggestions).toHaveLength(1)
    expect(coaching.vocabularySuggestions[0].original).toBe("wrong form")
  })

  it("extracts grammar suggestions strictly from resolved annotations", () => {
    const coaching = generateCoaching(mockLockedEval, mockAnnotations)
    expect(coaching.grammarSuggestions).toHaveLength(1)
    expect(coaching.grammarSuggestions[0].original).toBe("agreement error")
  })

  it("creates a target band plan when target band exceeds current overall band", () => {
    const coaching = generateCoaching(mockLockedEval, mockAnnotations, 7.5)
    expect(coaching.targetBandPlan).toBeDefined()
    expect(coaching.targetBandPlan?.currentBand).toBe(6.5)
    expect(coaching.targetBandPlan?.targetBand).toBe(7.5)
  })

  it("does not allow mutating the locked evaluation or output coaching", () => {
    const coaching = generateCoaching(mockLockedEval, mockAnnotations)
    expect(Object.isFrozen(coaching)).toBe(true)
    expect(mockLockedEval.overallBand).toBe(6.5)
  })
})
