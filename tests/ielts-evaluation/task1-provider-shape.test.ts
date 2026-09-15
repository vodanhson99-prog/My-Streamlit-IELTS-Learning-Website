import { describe, expect, it } from "vitest"
import type { AIProvider } from "@/lib/ai/contracts"
import { createTask1CriterionGrader } from "@/lib/ielts-evaluation/task1/graders/shared"
import { IELTS_TASK1_ACADEMIC_RUBRIC } from "@/lib/ielts-evaluation/task1/rubric/academic-v2023"

const essay = "The chart shows a clear increase in solar energy and a decline in biomass use over the period."

const response = {
  criterionId: "task-achievement",
  band: 6,
  descriptorId: "task1-academic-2023-05.task-achievement.band-6",
  evidence: [
    { type: "positive", quote: "clear increase in solar energy", rationale: "Reports the main trend." },
    { type: "negative", quote: "decline in biomass use", rationale: "Comparison needs more detail." },
  ],
  blockers: ["More precise comparisons are needed."],
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

  it("normalizes legacy criterion and justification output from provider", async () => {
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
    ).resolves.toMatchObject({ criterionId: "task-achievement", band: 6 })
  })
})
