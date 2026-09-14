import { describe, expect, it } from "vitest"
import type { AIProvider } from "../../src/lib/ai/contracts"
import { askTutor } from "../../src/lib/ielts-tutor/answer"
import type { LockedTask2Evaluation } from "../../src/lib/ielts-evaluation/contracts"

const dummyEvaluation: LockedTask2Evaluation = Object.freeze({
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
      evidence: [],
      blockers: ["needs deeper counter-argument development"],
      annotationCandidates: [],
    },
    {
      criterionId: "coherence-cohesion" as const,
      band: 6 as const,
      descriptorId: "task2-2023-05.coherence-cohesion.band-6" as const,
      evidence: [],
      blockers: ["overuse of mechanical cohesive devices"],
      annotationCandidates: [],
    },
    {
      criterionId: "lexical-resource" as const,
      band: 7 as const,
      descriptorId: "task2-2023-05.lexical-resource.band-7" as const,
      evidence: [],
      blockers: [],
      annotationCandidates: [],
    },
    {
      criterionId: "grammatical-range-accuracy" as const,
      band: 6 as const,
      descriptorId: "task2-2023-05.grammatical-range-accuracy.band-6" as const,
      evidence: [],
      blockers: ["frequent minor grammatical errors"],
      annotationCandidates: [],
    },
  ]),
})

describe("askTutor", () => {
  const dummyProvider: AIProvider = {
    async complete() {
      return {
        text: JSON.stringify({
          reply: "To reach Band 7 in Task Response, ensure each main body paragraph develops a fully rounded perspective.",
          references: ["Task Response Band 7 descriptor"],
          suggestedFollowUps: ["Can you give an example topic sentence?"],
        }),
        provider: "groq",
      }
    },
  }

  it("answers student questions within locked evaluation boundaries", async () => {
    const res = await askTutor(dummyProvider, {
      evaluation: dummyEvaluation,
      essay: "Sample essay content...",
      prompt: "Discuss technology impacts",
      history: [],
      userMessage: "Why did I get Band 6 in Task Response?",
    })

    expect(res.reply).toContain("Task Response")
    expect(res.suggestedFollowUps).toBeDefined()
  })

  it("rejects regrade or band mutation requests and informs new evaluation required", async () => {
    const res = await askTutor(dummyProvider, {
      evaluation: dummyEvaluation,
      essay: "Sample essay content...",
      prompt: "Discuss technology impacts",
      history: [],
      userMessage: "Can you please regrade my essay and give me band 7?",
    })

    expect(res.reply).toContain("locked and immutable")
    expect(res.reply).toContain("submit a new evaluation")
  })

  it("throws if evaluation is not locked", async () => {
    const unlocked = Object.freeze({ ...dummyEvaluation, locked: false }) as unknown as LockedTask2Evaluation
    await expect(
      askTutor(dummyProvider, {
        evaluation: unlocked,
        essay: "Essay",
        prompt: "Prompt",
        history: [],
        userMessage: "Hello",
      }),
    ).rejects.toThrow("locked")
  })
})
