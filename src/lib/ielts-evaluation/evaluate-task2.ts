import type { AIProvider } from "../ai/contracts"
import { EVALUATION_SCHEMA_VERSION, IELTS_TASK2_CRITERION_IDS, IELTS_TASK2_RUBRIC_VERSION } from "./constants"
import type {
  AdjudicationRecord,
  CriterionEvaluation,
  EvaluationStability,
  IeltsBand,
  IeltsTask2CriterionId,
  LockedTask2Evaluation,
  Task2EvaluationResult,
  Task2Rubric,
} from "./contracts"
import { challengeBandBoundary } from "./adjudication/challenger"
import { shouldChallenge } from "./adjudication/should-challenge"
import { createCoherenceCohesionGrader } from "./graders/coherence-cohesion"
import { createGrammaticalRangeAccuracyGrader } from "./graders/grammatical-range-accuracy"
import { createLexicalResourceGrader } from "./graders/lexical-resource"
import type { CriterionGrader } from "./graders/shared"
import { createTaskResponseGrader } from "./graders/task-response"
import { IELTS_TASK2_RUBRIC } from "./rubric/task2-v2023"
import { aggregateTask2Bands } from "./scoring/aggregate"
import { validateCriterionEvidence } from "./validation/evidence"

export interface EvaluateTask2Input {
  readonly task: {
    readonly testType: "academic" | "general_training"
    readonly prompt: string
  }
  readonly essay: string
  readonly rubric?: Task2Rubric
  readonly provider: AIProvider
  readonly confidenceScores?: Partial<Record<IeltsTask2CriterionId, { confidence: number; alternativeBand?: IeltsBand }>>
  readonly customGraders?: Partial<Record<IeltsTask2CriterionId, CriterionGrader>>
}

function calculateStability(records: readonly AdjudicationRecord[]): EvaluationStability {
  if (records.length === 0) return "high"
  const overturnedCount = records.filter((r) => r.decision === "overturned").length
  if (overturnedCount === 0) return "high"
  if (overturnedCount === 1) return "medium"
  return "low"
}

export async function evaluateTask2(input: EvaluateTask2Input): Promise<Task2EvaluationResult> {
  const essay = input.essay.trim()
  const prompt = input.task.prompt.trim()

  if (!essay || !prompt) {
    return {
      status: "failed",
      locked: false,
      error: "Essay and task prompt are required and cannot be empty",
    }
  }

  const rubric = input.rubric || IELTS_TASK2_RUBRIC
  const provider = input.provider

  const defaultGraders: Record<IeltsTask2CriterionId, CriterionGrader> = {
    "task-response": createTaskResponseGrader(provider),
    "coherence-cohesion": createCoherenceCohesionGrader(provider),
    "lexical-resource": createLexicalResourceGrader(provider),
    "grammatical-range-accuracy": createGrammaticalRangeAccuracyGrader(provider),
  }

  const graders: Record<IeltsTask2CriterionId, CriterionGrader> = {
    "task-response": input.customGraders?.["task-response"] || defaultGraders["task-response"],
    "coherence-cohesion": input.customGraders?.["coherence-cohesion"] || defaultGraders["coherence-cohesion"],
    "lexical-resource": input.customGraders?.["lexical-resource"] || defaultGraders["lexical-resource"],
    "grammatical-range-accuracy": input.customGraders?.["grammatical-range-accuracy"] || defaultGraders["grammatical-range-accuracy"],
  }

  const graderInput = {
    task: {
      testType: input.task.testType,
      prompt,
    },
    essay,
    rubric,
  }

  // 1. Run all 4 graders in parallel with retry-once on failure
  async function runGraderWithRetry(
    criterionId: IeltsTask2CriterionId,
    grader: CriterionGrader,
  ): Promise<{ success: true; evaluation: CriterionEvaluation } | { success: false; error: string }> {
    try {
      const evaluation = await grader(graderInput)
      return { success: true, evaluation }
    } catch (firstErr) {
      console.warn(`[writing-evaluation][task2][${criterionId}][attempt=1] ${firstErr instanceof Error ? firstErr.message : "unknown error"}`)
      try {
        const evaluation = await grader(graderInput)
        return { success: true, evaluation }
      } catch (retryErr) {
        return {
          success: false,
          error: `${criterionId} grading failed after retry: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`,
        }
      }
    }
  }

  const graderPromises = IELTS_TASK2_CRITERION_IDS.map((id) =>
    runGraderWithRetry(id, graders[id]).then((res) => ({ id, res })),
  )

  const results = await Promise.all(graderPromises)

  const failedCriteria: IeltsTask2CriterionId[] = []
  const initialCriteriaMap = new Map<IeltsTask2CriterionId, CriterionEvaluation>()

  for (const { id, res } of results) {
    if (!res.success) {
      failedCriteria.push(id)
    } else {
      initialCriteriaMap.set(id, res.evaluation)
    }
  }

  if (failedCriteria.length > 0) {
    return {
      status: "failed",
      locked: false,
      error: `Criterion evaluation failed for: ${failedCriteria.join(", ")}`,
      failedCriteria,
    }
  }

  // 2. Validate evidence against essay text
  const validationErrors: string[] = []
  for (const criterionId of IELTS_TASK2_CRITERION_IDS) {
    const criterionEval = initialCriteriaMap.get(criterionId)!
    const validation = validateCriterionEvidence(criterionEval, essay)
    if (!validation.valid) {
      validationErrors.push(...validation.errors)
    }
  }

  if (validationErrors.length > 0) {
    return {
      status: "failed",
      locked: false,
      error: `Evidence validation failed: ${validationErrors.join("; ")}`,
    }
  }

  // 3. Adjudication & challenge policy
  const finalCriteria: CriterionEvaluation[] = []
  const adjudicationRecords: AdjudicationRecord[] = []

  for (const criterionId of IELTS_TASK2_CRITERION_IDS) {
    let criterionEval = initialCriteriaMap.get(criterionId)!
    const confMeta = input.confidenceScores?.[criterionId]

    if (confMeta) {
      const decision = shouldChallenge({
        band: criterionEval.band,
        confidence: confMeta.confidence,
        alternativeBand: confMeta.alternativeBand,
      })

      if (decision.challenge && decision.lowerBand !== undefined && decision.higherBand !== undefined) {
        try {
          const { updatedEvaluation, record } = await challengeBandBoundary(provider, {
            task: graderInput.task,
            essay,
            rubric,
            criterionEvaluation: criterionEval,
            lowerBand: decision.lowerBand,
            higherBand: decision.higherBand,
          })
          criterionEval = updatedEvaluation
          adjudicationRecords.push(record)
        } catch {
          // If challenge fails, keep primary evaluation
        }
      }
    }

    finalCriteria.push(criterionEval)
  }

  // 4. Deterministic aggregation
  const overallBand = aggregateTask2Bands(finalCriteria)
  const stability = calculateStability(adjudicationRecords)

  // 5. Score lock
  const lockedResult: LockedTask2Evaluation = Object.freeze({
    status: "completed",
    locked: true,
    schemaVersion: EVALUATION_SCHEMA_VERSION,
    rubricVersion: IELTS_TASK2_RUBRIC_VERSION,
    overallBand,
    criteria: Object.freeze(finalCriteria.map((c) => Object.freeze({ ...c }))),
    stability,
    adjudicationRecords: Object.freeze(adjudicationRecords.map((r) => Object.freeze({ ...r }))),
    summary: `Task 2 Estimated Band ${overallBand.toFixed(1)} based on four independently evaluated criteria.`,
  })

  return lockedResult
}
