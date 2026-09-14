import { describe, expect, it } from "vitest"
import { evaluationOutputSchema } from "../../src/lib/ielts-evaluation/validation/output-schema"

const validOutput = {
  schemaVersion: "1.0.0",
  rubricVersion: "task2-2023-05",
  overallBand: 7,
  criteria: [
    {
      criterionId: "task-response",
      band: 7,
      descriptorId: "task2-2023-05.task-response.band-7",
      evidence: [{ quote: "Governments should fund public transport.", rationale: "Clear position." }],
      blockers: ["Supporting detail lacks precision."],
      annotationCandidates: [{ quote: "fund public transport", label: "position", rationale: "Direct answer." }],
    },
    {
      criterionId: "coherence-cohesion",
      band: 7,
      descriptorId: "task2-2023-05.coherence-cohesion.band-7",
      evidence: [{ quote: "However", rationale: "Marks contrast." }],
      blockers: ["One paragraph has weak internal sequencing."],
      annotationCandidates: [{ quote: "However", label: "cohesive-device", rationale: "Contrast marker." }],
    },
    {
      criterionId: "lexical-resource",
      band: 7,
      descriptorId: "task2-2023-05.lexical-resource.band-7",
      evidence: [{ quote: "public transport", rationale: "Appropriate topic vocabulary." }],
      blockers: ["Some repeated wording."],
      annotationCandidates: [{ quote: "public transport", label: "topic-vocabulary", rationale: "Relevant phrase." }],
    },
    {
      criterionId: "grammatical-range-accuracy",
      band: 7,
      descriptorId: "task2-2023-05.grammatical-range-accuracy.band-7",
      evidence: [{ quote: "Although it costs more, it benefits cities.", rationale: "Accurate complex sentence." }],
      blockers: ["Minor article errors persist."],
      annotationCandidates: [{ quote: "Although it costs more", label: "complex-structure", rationale: "Subordinate clause." }],
    },
  ],
  summary: "Clear response with specific next steps.",
} as const

describe("evaluationOutputSchema", () => {
  it("accepts a complete evidence-grounded evaluation", () => {
    expect(evaluationOutputSchema.parse(validOutput)).toEqual(validOutput)
  })

  it.each([undefined, null, -1, 5.5, 10, "7"])("fails closed for invalid criterion score %j", (band) => {
    const invalid = structuredClone(validOutput) as Record<string, unknown>
    ;(invalid.criteria as Array<Record<string, unknown>>)[0].band = band
    expect(evaluationOutputSchema.safeParse(invalid).success).toBe(false)
  })

  it.each([undefined, null, -0.5, 4.25, 9.5, "7"])("fails closed for invalid overall score %j", (overallBand) => {
    expect(evaluationOutputSchema.safeParse({ ...validOutput, overallBand }).success).toBe(false)
  })

  it.each([0, 0.5, 6, 6.5, 9])("accepts IELTS half-band overall score %s", (overallBand) => {
    expect(evaluationOutputSchema.safeParse({ ...validOutput, overallBand }).success).toBe(true)
  })

  it("rejects missing evidence, blockers, and annotation candidates", () => {
    for (const field of ["evidence", "blockers", "annotationCandidates"] as const) {
      const invalid = structuredClone(validOutput)
      delete (invalid.criteria[0] as Partial<(typeof invalid.criteria)[number]>)[field]
      expect(evaluationOutputSchema.safeParse(invalid).success).toBe(false)
    }
  })

  it("rejects duplicate or missing criteria", () => {
    const duplicate = structuredClone(validOutput) as unknown as { criteria: Array<Record<string, unknown>> }
    duplicate.criteria[3] = structuredClone(duplicate.criteria[0])
    expect(evaluationOutputSchema.safeParse(duplicate).success).toBe(false)
    expect(evaluationOutputSchema.safeParse({ ...validOutput, criteria: validOutput.criteria.slice(0, 3) }).success).toBe(false)
  })
})
