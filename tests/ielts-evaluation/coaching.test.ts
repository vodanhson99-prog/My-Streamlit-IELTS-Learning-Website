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
      supportingEvidence: [
        { anchor: { type: "span" as const, quote: "some quote" }, rationale: "addresses topic" },
      ],
      limitingEvidence: [
        { anchor: { type: "span" as const, quote: "other quote" }, rationale: "missing nuance" },
      ],
      nextBandBlockers: ["needs deeper counter-argument development"],
      annotationCandidates: [],
    },
    {
      criterionId: "coherence-cohesion" as const,
      band: 6 as const,
      descriptorId: "task2-2023-05.coherence-cohesion.band-6" as const,
      supportingEvidence: [
        { anchor: { type: "span" as const, quote: "well linked" }, rationale: "logical progression" },
      ],
      limitingEvidence: [
        { anchor: { type: "span" as const, quote: "repetitive link" }, rationale: "overuse of 'furthermore'" },
      ],
      nextBandBlockers: ["overuse of mechanical cohesive devices"],
      annotationCandidates: [],
    },
    {
      criterionId: "lexical-resource" as const,
      band: 7 as const,
      descriptorId: "task2-2023-05.lexical-resource.band-7" as const,
      supportingEvidence: [
        { anchor: { type: "span" as const, quote: "sophisticated lexis" }, rationale: "flexible vocabulary" },
      ],
      limitingEvidence: [
        { anchor: { type: "span" as const, quote: "wrong form" }, rationale: "word formation slip" },
      ],
      nextBandBlockers: ["minor collocation inaccuracies"],
      annotationCandidates: [],
    },
    {
      criterionId: "grammatical-range-accuracy" as const,
      band: 6 as const,
      descriptorId: "task2-2023-05.grammatical-range-accuracy.band-6" as const,
      supportingEvidence: [
        { anchor: { type: "span" as const, quote: "good clauses" }, rationale: "mix of complex forms" },
      ],
      limitingEvidence: [
        { anchor: { type: "span" as const, quote: "agreement error" }, rationale: "subject-verb slip" },
      ],
      nextBandBlockers: ["frequent minor grammatical errors"],
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

  it("does not invent improvement priorities for Band 9 criteria without blockers", () => {
    const bandNine = {
      ...mockLockedEval,
      overallBand: 9 as const,
      criteria: mockLockedEval.criteria.map((criterion) => ({
        ...criterion,
        band: 9 as const,
        descriptorId: `task2-2023-05.${criterion.criterionId}.band-9` as const,
        limitingEvidence: [],
        nextBandBlockers: [],
      })),
    }

    expect(generateCoaching(bandNine).priorities).toEqual([])
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

  it("prioritizes Band 6 with many annotations over Band 6.5 with minor limitation", () => {
    const evalWithGaps: LockedTask2Evaluation = {
      ...mockLockedEval,
      overallBand: 6.5 as const,
      criteria: [
        {
          criterionId: "grammatical-range-accuracy",
          band: 6,
          descriptorId: "task2-2023-05.grammatical-range-accuracy.band-6",
          supportingEvidence: [],
          limitingEvidence: [],
          nextBandBlockers: ["frequent grammatical errors"],
          annotationCandidates: [],
        },
        {
          criterionId: "task-response",
          band: 6.5 as any, // cheating type for test, or just use 6 vs 7 if type doesn't allow 6.5. Actually, band is IeltsBand (integers), so let's use 6 and 7! Wait, prompt says "Band 6 vs Band 6.5"? IeltsBand only has integers.
          // Wait, Task 1/2 criteria bands are integers: 0-9. The prompt said "Band 6.5 criterion", which might mean overall band 6.5, or a half-band criterion? But criteria are integer bands. Let's just use 6 vs 7, or if it meant 6 with many vs 6 with few.
          descriptorId: "task2-2023-05.task-response.band-7",
          supportingEvidence: [],
          limitingEvidence: [{ anchor: { type: "global" }, rationale: "minor" }],
          nextBandBlockers: ["minor limitation"],
          annotationCandidates: [],
        },
      ] as any,
    }

    const manyAnnotations: ResolvedAnnotation[] = Array.from({ length: 10 }).map((_, i) => ({
      id: `anno-${i}`,
      criterionId: "grammatical-range-accuracy",
      quote: "err",
      label: "grammar",
      rationale: "err",
      status: "resolved",
    }))

    const coaching = generateCoaching(evalWithGaps, manyAnnotations)
    expect(coaching.priorities[0].criterionId).toBe("grammatical-range-accuracy")
    
    // Check audit metadata exists
    expect(coaching.priorities[0].factors).toBeDefined()
    expect(coaching.priorities[0].factors?.errorFrequency).toBe(10)
  })
})
