import { describe, expect, it } from "vitest"
import type { AIProvider } from "../../src/lib/ai/contracts"
import { evaluateTask1 } from "../../src/lib/ielts-evaluation/evaluate-task1"
import { IELTS_TASK1_ACADEMIC_RUBRIC } from "../../src/lib/ielts-evaluation/task1/rubric/academic-v2023"
import { IELTS_TASK1_GT_RUBRIC } from "../../src/lib/ielts-evaluation/task1/rubric/general-training-v2023"

const ESSAY = `The chart illustrates renewable energy consumption between 2010 and 2020.
Overall, solar and wind power expanded rapidly, whereas traditional biomass declined steadily.
In 2010, biomass constituted over 60 percent of green energy. By 2020, solar power surpassed 40 percent.`

import type { IeltsBand } from "../../src/lib/ielts-evaluation/contracts"
import type { Task1CriterionEvaluation, IeltsTask1CriterionId } from "../../src/lib/ielts-evaluation/task1/contracts"

function makeCriterion(id: IeltsTask1CriterionId, band: IeltsBand): Task1CriterionEvaluation {
  return {
    criterionId: id,
    band,
    descriptorId: `task1-academic-2023-05.${id}.band-${band}`,
    supportingEvidence: [
      { anchor: { type: "span" as const, quote: "solar and wind power expanded rapidly" }, rationale: "Clear trend" },
    ],
    limitingEvidence: [
      { anchor: { type: "span" as const, quote: "solar power surpassed 40 percent" }, rationale: "Needs comparative data" },
    ],
    nextBandBlockers: ["needs deeper data points"],
    annotationCandidates: [
      { quote: "solar and wind power expanded rapidly", label: "overview", rationale: "identifies key trend" },
    ],
  }
}

describe("Task 1 Rubric and Pipeline", () => {
  const dummyProvider: AIProvider = {
    async complete() {
      return { text: "{}", provider: "groq" }
    },
  }

  it("has complete Academic Task 1 rubric with Task Achievement and all 10 bands", () => {
    expect(IELTS_TASK1_ACADEMIC_RUBRIC.criteria).toHaveLength(4)
    const ta = IELTS_TASK1_ACADEMIC_RUBRIC.criteria.find((c) => c.id === "task-achievement")!
    expect(ta).toBeDefined()
    expect(ta.bands).toHaveLength(10)
  })

  it("has complete GT Task 1 rubric with letter-focused descriptors", () => {
    expect(IELTS_TASK1_GT_RUBRIC.criteria).toHaveLength(4)
    const ta = IELTS_TASK1_GT_RUBRIC.criteria.find((c) => c.id === "task-achievement")!
    expect(ta.bands[1].descriptor).toContain("bullet points")
  })

  it("evaluates Task 1 successfully and returns locked Task 1 result", async () => {
    const customGraders = {
      "task-achievement": async () => makeCriterion("task-achievement", 6),
      "coherence-cohesion": async () => makeCriterion("coherence-cohesion", 6),
      "lexical-resource": async () => makeCriterion("lexical-resource", 7),
      "grammatical-range-accuracy": async () => makeCriterion("grammatical-range-accuracy", 6),
    }

    const res = await evaluateTask1({
      task: { testType: "academic", prompt: "Summarise the energy chart" },
      essay: ESSAY,
      provider: dummyProvider,
      customGraders,
    })

    expect(res.status).toBe("completed")
    if (res.status === "completed") {
      expect(res.locked).toBe(true)
      expect(res.taskType).toBe("task1")
      expect(res.overallBand).toBe(6.5)
      expect(res.criteria).toHaveLength(4)
    }
  })

  it("fails closed when any Task 1 criterion fails", async () => {
    const customGraders = {
      "task-achievement": async () => {
        throw new Error("TA Judge Down")
      },
      "coherence-cohesion": async () => makeCriterion("coherence-cohesion", 6),
      "lexical-resource": async () => makeCriterion("lexical-resource", 7),
      "grammatical-range-accuracy": async () => makeCriterion("grammatical-range-accuracy", 6),
    }

    const res = await evaluateTask1({
      task: { testType: "academic", prompt: "Summarise the energy chart" },
      essay: ESSAY,
      provider: dummyProvider,
      customGraders,
    })

    expect(res.status).toBe("failed")
    if (res.status === "failed") {
      expect(res.error).toContain("task-achievement")
    }
  })
})
