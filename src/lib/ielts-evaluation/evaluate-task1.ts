import type { AIProvider } from "../ai/contracts"
import { classifyStructuredFailure, formatStructuredFailure } from "../ai/provider"
import { EVALUATION_SCHEMA_VERSION } from "./constants"
import type { EvaluationStability, IeltsHalfBand } from "./contracts"
import { calculateIeltsHalfBand } from "./scoring/aggregate"
import { sanitizeCriterionEvidence, validateCriterionEvidence } from "./validation/evidence"
import {
  IELTS_TASK1_CRITERION_IDS,
  type IeltsTask1CriterionId,
  type Task1CriterionEvaluation,
  type Task1EvaluationResult,
  type Task1Rubric,
} from "./task1/contracts"
import { createTask1CriterionGrader, type Task1CriterionGrader } from "./task1/graders/shared"
import { IELTS_TASK1_ACADEMIC_RUBRIC } from "./task1/rubric/academic-v2023"
import { IELTS_TASK1_GT_RUBRIC } from "./task1/rubric/general-training-v2023"

export interface EvaluateTask1Input {
  readonly task: {
    readonly testType: "academic" | "general_training"
    readonly prompt: string
  }
  readonly essay: string
  readonly provider: AIProvider
  readonly customGraders?: Partial<Record<IeltsTask1CriterionId, Task1CriterionGrader>>
}

function aggregateTask1Bands(criteria: readonly Task1CriterionEvaluation[]): IeltsHalfBand {
  if (criteria.length !== IELTS_TASK1_CRITERION_IDS.length) {
    throw new Error(`Expected 4 Task 1 criteria, got ${criteria.length}`)
  }
  const sum = criteria.reduce((acc, c) => acc + c.band, 0)
  return calculateIeltsHalfBand(sum / 4)
}

export async function evaluateTask1(input: EvaluateTask1Input): Promise<Task1EvaluationResult> {
  const essay = input.essay.trim()
  const prompt = input.task.prompt.trim()

  if (!essay || !prompt) {
    return {
      status: "failed",
      locked: false,
      error: "Task 1 essay and prompt cannot be empty",
    }
  }

  const rubric: Task1Rubric =
    input.task.testType === "academic" ? IELTS_TASK1_ACADEMIC_RUBRIC : IELTS_TASK1_GT_RUBRIC

  const defaultGraders: Record<IeltsTask1CriterionId, Task1CriterionGrader> = {
    "task-achievement": createTask1CriterionGrader(input.provider, "task-achievement"),
    "coherence-cohesion": createTask1CriterionGrader(input.provider, "coherence-cohesion"),
    "lexical-resource": createTask1CriterionGrader(input.provider, "lexical-resource"),
    "grammatical-range-accuracy": createTask1CriterionGrader(input.provider, "grammatical-range-accuracy"),
  }

  const graders: Record<IeltsTask1CriterionId, Task1CriterionGrader> = {
    "task-achievement": input.customGraders?.["task-achievement"] || defaultGraders["task-achievement"],
    "coherence-cohesion": input.customGraders?.["coherence-cohesion"] || defaultGraders["coherence-cohesion"],
    "lexical-resource": input.customGraders?.["lexical-resource"] || defaultGraders["lexical-resource"],
    "grammatical-range-accuracy": input.customGraders?.["grammatical-range-accuracy"] || defaultGraders["grammatical-range-accuracy"],
  }

  const graderInput = {
    task: input.task,
    essay,
    rubric,
  }

  const results = await Promise.all(
    IELTS_TASK1_CRITERION_IDS.map(async (id) => {
      const start = Date.now()
      try {
        const evaluation = await graders[id](graderInput)
        return { id, success: true as const, evaluation }
      } catch (firstErr) {
        const kind = classifyStructuredFailure(firstErr)
        const elapsedMs = Date.now() - start
        const safeMsg = formatStructuredFailure(firstErr)
        console.warn(`[writing-evaluation][task1][${id}][attempt=1] failure=${kind} msg="${safeMsg}" elapsedMs=${elapsedMs}`)
        try {
          const evaluation = await graders[id](graderInput)
          return { id, success: true as const, evaluation }
        } catch (retryErr) {
          return {
            id,
            success: false as const,
            error: formatStructuredFailure(retryErr),
          }
        }
      }
    }),
  )

  const failed = results.filter((r) => !r.success)
  if (failed.length > 0) {
    return {
      status: "failed",
      locked: false,
      error: `Task 1 grading failed for: ${failed.map((f) => f.id).join(", ")}`,
      failedCriteria: failed.map((f) => f.id),
    }
  }

  const criteria = results.map((r) => {
    const evaluation = (r as { evaluation: Task1CriterionEvaluation }).evaluation
    return input.customGraders ? evaluation : sanitizeCriterionEvidence(evaluation, essay)
  })

  // Validate evidence anchors and annotation quotes against essay
  for (const c of criteria) {
    const valid = validateCriterionEvidence(c, essay)
    if (!valid.valid) {
      return {
        status: "failed",
        locked: false,
        error: `Evidence validation failed: ${valid.errors.join("; ")}`,
      }
    }
  }

  const overallBand = aggregateTask1Bands(criteria)

  return Object.freeze({
    status: "completed",
    locked: true,
    taskType: "task1",
    taskSubtype: input.task.testType,
    schemaVersion: EVALUATION_SCHEMA_VERSION,
    rubricVersion: rubric.version,
    overallBand,
    criteria: Object.freeze(criteria.map((c) => Object.freeze({ ...c }))),
    stability: "high" as EvaluationStability,
    adjudicationRecords: Object.freeze([]),
    summary: `Task 1 (${input.task.testType}) Estimated Band ${overallBand.toFixed(1)} based on four independently evaluated criteria.`,
  })
}
