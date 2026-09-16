import { describe, expect, it } from "vitest"
import type { AIProvider } from "../../src/lib/ai/contracts"
import type { CriterionEvaluation } from "../../src/lib/ielts-evaluation/contracts"
import { evaluateTask2 } from "../../src/lib/ielts-evaluation/evaluate-task2"

const ESSAY = `Technology brings significant advantages to global communication.
For instance, international businesses coordinate operations seamlessly.
However, individuals face challenges when digital interactions replace human empathy.
In conclusion, society must balance virtual convenience with personal connections.`

function createMockCriterion(id: CriterionEvaluation["criterionId"], band: CriterionEvaluation["band"]): CriterionEvaluation {
  return {
    criterionId: id,
    band,
    descriptorId: `task2-2023-05.${id}.band-${band}`,
    supportingEvidence: [
      { anchor: { type: "span", quote: "international businesses coordinate operations seamlessly" }, rationale: "Relevant example" },
    ],
    limitingEvidence: [
      { anchor: { type: "span", quote: "individuals face challenges when digital interactions replace human empathy" }, rationale: "Needs elaboration" },
    ],
    nextBandBlockers: ["needs deeper nuance"],
    annotationCandidates: [
      { quote: "international businesses coordinate operations seamlessly", label: id === "task-response" ? "addresses-prompt" : id === "lexical-resource" ? "topic-lexis" : id === "coherence-cohesion" ? "paragraph-topic" : "complex-subordinate", rationale: "good phrase" },
    ],
  }
}

describe("evaluateTask2 Orchestration", () => {
  const dummyProvider: AIProvider = {
    async complete() {
      return { text: "{}", provider: "groq" }
    },
  }

  it("successfully coordinates 4 graders, aggregates deterministic score, and locks result", async () => {
    const customGraders = {
      "task-response": async () => createMockCriterion("task-response", 6),
      "coherence-cohesion": async () => createMockCriterion("coherence-cohesion", 6),
      "lexical-resource": async () => createMockCriterion("lexical-resource", 7),
      "grammatical-range-accuracy": async () => createMockCriterion("grammatical-range-accuracy", 6),
    }

    const result = await evaluateTask2({
      task: { testType: "academic", prompt: "Discuss modern communication technologies" },
      essay: ESSAY,
      provider: dummyProvider,
      customGraders,
    })

    expect(result.status).toBe("completed")
    if (result.status === "completed") {
      expect(result.locked).toBe(true)
      // (6 + 6 + 7 + 6) / 4 = 6.25 -> 6.5
      expect(result.overallBand).toBe(6.5)
      expect(result.criteria).toHaveLength(4)
      expect(result.stability).toBe("high")
      expect(Object.isFrozen(result)).toBe(true)
      expect(Object.isFrozen(result.criteria)).toBe(true)
    }
  })

  it("retries once and succeeds if first attempt fails", async () => {
    let attempts = 0
    const customGraders = {
      "task-response": async () => {
        attempts++
        if (attempts === 1) throw new Error("Transient error")
        return createMockCriterion("task-response", 7)
      },
      "coherence-cohesion": async () => createMockCriterion("coherence-cohesion", 7),
      "lexical-resource": async () => createMockCriterion("lexical-resource", 7),
      "grammatical-range-accuracy": async () => createMockCriterion("grammatical-range-accuracy", 7),
    }

    const result = await evaluateTask2({
      task: { testType: "academic", prompt: "Discuss modern communication technologies" },
      essay: ESSAY,
      provider: dummyProvider,
      customGraders,
    })

    expect(result.status).toBe("completed")
    expect(attempts).toBe(2)
  })

  it("fails closed when one criterion repeatedly fails (no silent average)", async () => {
    const customGraders = {
      "task-response": async () => {
        throw new Error("Persistent timeout")
      },
      "coherence-cohesion": async () => createMockCriterion("coherence-cohesion", 7),
      "lexical-resource": async () => createMockCriterion("lexical-resource", 7),
      "grammatical-range-accuracy": async () => createMockCriterion("grammatical-range-accuracy", 7),
    }

    const result = await evaluateTask2({
      task: { testType: "academic", prompt: "Discuss modern communication technologies" },
      essay: ESSAY,
      provider: dummyProvider,
      customGraders,
    })

    expect(result.status).toBe("failed")
    if (result.status === "failed") {
      expect(result.locked).toBe(false)
      expect(result.error).toContain("task-response")
      expect(result.failedCriteria).toContain("task-response")
    }
  })

  it("fails closed if evidence validation fails (fake quotes not in essay)", async () => {
    const customGraders = {
      "task-response": async (): Promise<CriterionEvaluation> => ({
        ...createMockCriterion("task-response", 6),
        supportingEvidence: [
          { anchor: { type: "span" as const, quote: "this quote is completely made up and not in essay" }, rationale: "fake" },
        ],
      }),
      "coherence-cohesion": async () => createMockCriterion("coherence-cohesion", 6),
      "lexical-resource": async () => createMockCriterion("lexical-resource", 6),
      "grammatical-range-accuracy": async () => createMockCriterion("grammatical-range-accuracy", 6),
    }

    const result = await evaluateTask2({
      task: { testType: "academic", prompt: "Discuss modern communication technologies" },
      essay: ESSAY,
      provider: dummyProvider,
      customGraders,
    })

    expect(result.status).toBe("failed")
    if (result.status === "failed") {
      expect(result.error).toContain("Evidence validation failed")
    }
  })

  it("triggers challenge adjudication when confidence is low and updates band accordingly", async () => {
    const customGraders = {
      "task-response": async () => createMockCriterion("task-response", 6),
      "coherence-cohesion": async () => createMockCriterion("coherence-cohesion", 6),
      "lexical-resource": async () => createMockCriterion("lexical-resource", 6),
      "grammatical-range-accuracy": async () => createMockCriterion("grammatical-range-accuracy", 6),
    }

    const mockChallengerProvider: AIProvider = {
      async complete() {
        return {
          text: JSON.stringify({
            decision: "overturned",
            selectedBand: 7,
            rationale: "Clear position merits Band 7 rather than 6",
          }),
          provider: "groq",
        }
      },
    }

    const result = await evaluateTask2({
      task: { testType: "academic", prompt: "Discuss modern communication technologies" },
      essay: ESSAY,
      provider: mockChallengerProvider,
      customGraders,
      confidenceScores: {
        "task-response": { confidence: 0.60, alternativeBand: 7 },
      },
    })

    expect(result.status).toBe("completed")
    if (result.status === "completed") {
      const tr = result.criteria.find((c) => c.criterionId === "task-response")!
      expect(tr.band).toBe(7)
      expect(result.adjudicationRecords).toHaveLength(1)
      expect(result.adjudicationRecords[0].decision).toBe("overturned")
      expect(result.stability).toBe("medium")
    }
  })
})
