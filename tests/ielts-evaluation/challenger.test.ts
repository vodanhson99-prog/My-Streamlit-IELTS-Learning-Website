import { describe, expect, it } from "vitest"
import type { AIProvider } from "../../src/lib/ai/contracts"
import { challengeBandBoundary } from "../../src/lib/ielts-evaluation/adjudication/challenger"
import { shouldChallenge } from "../../src/lib/ielts-evaluation/adjudication/should-challenge"
import type { CriterionEvaluation } from "../../src/lib/ielts-evaluation/contracts"
import { IELTS_TASK2_RUBRIC } from "../../src/lib/ielts-evaluation/rubric/task2-v2023"

const mockEvaluation: CriterionEvaluation = {
  criterionId: "task-response",
  band: 6,
  descriptorId: "task2-2023-05.task-response.band-6",
  supportingEvidence: [
    { anchor: { type: "span", quote: "some quote" }, rationale: "addresses topic" },
  ],
  limitingEvidence: [
    { anchor: { type: "span", quote: "another quote" }, rationale: "unsupported ideas" },
  ],
  nextBandBlockers: ["ideas need development"],
  annotationCandidates: [{ quote: "some quote", label: "addresses-prompt", rationale: "relevant" }],
}

describe("shouldChallenge", () => {
  it("challenges when evidence is insufficient", () => {
    expect(shouldChallenge({ band: 6, evidenceSufficient: false })).toMatchObject({ challenge: true })
  })

  it("challenges when descriptor conflict is detected", () => {
    expect(shouldChallenge({ band: 6, descriptorConflict: true })).toMatchObject({ challenge: true })
  })

  it("does not challenge when confidence is low but objective signals exist", () => {
    expect(shouldChallenge({ band: 6, confidence: 0.4, evidenceSufficient: true, descriptorConflict: false })).toMatchObject({ challenge: false })
  })
})

describe("challengeBandBoundary", () => {
  it("confirms primary band when provider confirms", async () => {
    const provider: AIProvider = {
      async complete() {
        return {
          text: JSON.stringify({
            decision: "confirmed",
            selectedBand: 6,
            rationale: "Main ideas remain insufficiently developed for Band 7.",
          }),
          provider: "groq",
        }
      },
    }

    const { updatedEvaluation, record } = await challengeBandBoundary(provider, {
      task: { testType: "academic", prompt: "Discuss advantages and disadvantages" },
      essay: "some quote and another quote in essay",
      rubric: IELTS_TASK2_RUBRIC,
      criterionEvaluation: mockEvaluation,
      lowerBand: 6,
      higherBand: 7,
    })

    expect(updatedEvaluation.band).toBe(6)
    expect(record.decision).toBe("confirmed")
    expect(record.originalBand).toBe(6)
    expect(record.challengedBand).toBe(6)
  })

  it("overturns primary band when provider selects alternative hypothesis", async () => {
    const provider: AIProvider = {
      async complete() {
        return {
          text: JSON.stringify({
            decision: "overturned",
            selectedBand: 7,
            rationale: "Evidence demonstrates clear central position with sufficient extension.",
          }),
          provider: "groq",
        }
      },
    }

    const { updatedEvaluation, record } = await challengeBandBoundary(provider, {
      task: { testType: "academic", prompt: "Discuss advantages and disadvantages" },
      essay: "some quote and another quote in essay",
      rubric: IELTS_TASK2_RUBRIC,
      criterionEvaluation: mockEvaluation,
      lowerBand: 6,
      higherBand: 7,
    })

    expect(updatedEvaluation.band).toBe(7)
    expect(updatedEvaluation.descriptorId).toBe("task2-2023-05.task-response.band-7")
    expect(record.decision).toBe("overturned")
    expect(record.originalBand).toBe(6)
    expect(record.challengedBand).toBe(7)
  })

  it("fails if provider selects a band other than lowerBand or higherBand", async () => {
    const provider: AIProvider = {
      async complete() {
        return {
          text: JSON.stringify({
            decision: "overturned",
            selectedBand: 8,
            rationale: "I think it is an 8.",
          }),
          provider: "groq",
        }
      },
    }

    await expect(
      challengeBandBoundary(provider, {
        task: { testType: "academic", prompt: "Discuss advantages and disadvantages" },
        essay: "some quote and another quote in essay",
        rubric: IELTS_TASK2_RUBRIC,
        criterionEvaluation: mockEvaluation,
        lowerBand: 6,
        higherBand: 7,
      }),
    ).rejects.toThrow(/invalid band 8/)
  })
})
