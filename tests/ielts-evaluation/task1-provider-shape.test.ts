import { describe, expect, it } from "vitest"
import type { AIProvider } from "@/lib/ai/contracts"
import { createTask1CriterionGrader } from "@/lib/ielts-evaluation/task1/graders/shared"
import { IELTS_TASK1_ACADEMIC_RUBRIC } from "@/lib/ielts-evaluation/task1/rubric/academic-v2023"

const essay = "The chart shows a clear increase in solar energy and a decline in biomass use over the period."

const response = {
  criterionId: "task-achievement",
  band: 6,
  descriptorId: "task1-academic-2023-05.task-achievement.band-6",
  supportingEvidence: [
    { anchor: { type: "span", quote: "clear increase in solar energy" }, rationale: "Reports the main trend." },
  ],
  limitingEvidence: [
    { anchor: { type: "span", quote: "decline in biomass use" }, rationale: "Comparison needs more detail." },
  ],
  nextBandBlockers: ["More precise comparisons are needed."],
  annotationCandidates: [
    { quote: "clear increase in solar energy", label: "trend", rationale: "Marks a trend." },
  ],
}

describe("Task 1 provider output contract", () => {
  it("accepts criterionId and evidence fields required by evaluator", async () => {
    const provider: AIProvider = {
      complete: async () => ({ text: JSON.stringify(response), provider: "openai-compatible" }),
    }
    const grader = createTask1CriterionGrader(provider, "task-achievement")
    await expect(
      grader({
        task: { testType: "academic", prompt: "Describe chart" },
        essay,
        rubric: IELTS_TASK1_ACADEMIC_RUBRIC,
      }),
    ).resolves.toMatchObject({ criterionId: "task-achievement", band: 6 })
  })

  it("rejects legacy summary-only output instead of fabricating evidence", async () => {
    const provider: AIProvider = {
      complete: async () => ({
        text: JSON.stringify({ criterion: "Task Achievement", score: 6, justification: "Reports the main trend." }),
        provider: "openai-compatible",
      }),
    }
    const grader = createTask1CriterionGrader(provider, "task-achievement")
    await expect(
      grader({
        task: { testType: "academic", prompt: "Describe chart" },
        essay,
        rubric: IELTS_TASK1_ACADEMIC_RUBRIC,
      }),
    ).rejects.toThrow()
  })

  it("rejects decimal criterion bands instead of rounding them", async () => {
    const provider: AIProvider = {
      complete: async () => ({
        text: JSON.stringify({ ...response, band: 6.5 }),
        provider: "openai-compatible",
      }),
    }

    await expect(
      createTask1CriterionGrader(provider, "task-achievement")({
        task: { testType: "academic", prompt: "Describe chart" },
        essay,
        rubric: IELTS_TASK1_ACADEMIC_RUBRIC,
      }),
    ).rejects.toThrow()
  })

  it("rejects object-shaped next-band blockers instead of stringifying them", async () => {
    const provider: AIProvider = {
      complete: async () => ({
        text: JSON.stringify({
          ...response,
          nextBandBlockers: [{ reason: "More precise comparisons are needed." }],
        }),
        provider: "openai-compatible",
      }),
    }

    await expect(
      createTask1CriterionGrader(provider, "task-achievement")({
        task: { testType: "academic", prompt: "Describe chart" },
        essay,
        rubric: IELTS_TASK1_ACADEMIC_RUBRIC,
      }),
    ).rejects.toThrow()
  })

  it("accepts Band 9 supporting evidence without fabricating a limitation or blocker", async () => {
    const provider: AIProvider = {
      complete: async () => ({
        text: JSON.stringify({
          criterionId: "grammatical-range-accuracy",
          band: 9,
          descriptorId: "task1-academic-2023-05.grammatical-range-accuracy.band-9",
          supportingEvidence: [
            { anchor: { type: "span", quote: "The chart shows a clear increase" }, rationale: "Accurate complex structure." },
            { anchor: { type: "span", quote: "whereas biomass declined steadily" }, rationale: "Accurate subordinate clause." },
            { anchor: { type: "span", quote: "The figures show different trends" }, rationale: "Accurate reporting structure." },
          ],
          limitingEvidence: [],
          nextBandBlockers: [],
          annotationCandidates: [
            { quote: "whereas biomass declined steadily", label: "strong structure", rationale: "Shows controlled clause structure." },
          ],
        }),
        provider: "openai-compatible",
      }),
    }

    await expect(
      createTask1CriterionGrader(provider, "grammatical-range-accuracy")({
        task: { testType: "academic", prompt: "Describe chart" },
        essay: "The chart shows a clear increase whereas biomass declined steadily. The figures show different trends.",
        rubric: IELTS_TASK1_ACADEMIC_RUBRIC,
      }),
    ).resolves.toMatchObject({
      criterionId: "grammatical-range-accuracy",
      band: 9,
      supportingEvidence: expect.arrayContaining([
        expect.objectContaining({ rationale: "Accurate complex structure." }),
      ]),
      limitingEvidence: [],
      nextBandBlockers: [],
    })
  })
})
