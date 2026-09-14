import type {
  EvaluationSchemaVersion,
  EvaluationStability,
  IeltsBand,
  IeltsHalfBand,
  Task2DescriptorId,
} from "../contracts"

export const IELTS_TASK1_CRITERION_IDS = [
  "task-achievement",
  "coherence-cohesion",
  "lexical-resource",
  "grammatical-range-accuracy",
] as const

export type IeltsTask1CriterionId = (typeof IELTS_TASK1_CRITERION_IDS)[number]

export const IELTS_TASK1_ACADEMIC_RUBRIC_VERSION = "task1-academic-2023-05" as const
export const IELTS_TASK1_GT_RUBRIC_VERSION = "task1-gt-2023-05" as const

export type Task1RubricVersion =
  | typeof IELTS_TASK1_ACADEMIC_RUBRIC_VERSION
  | typeof IELTS_TASK1_GT_RUBRIC_VERSION

export type Task1DescriptorId = `${Task1RubricVersion}.${IeltsTask1CriterionId}.band-${IeltsBand}`

export interface Task1RubricBandDescriptor {
  readonly id: Task1DescriptorId
  readonly band: IeltsBand
  readonly descriptor: string
}

export interface Task1RubricCriterion {
  readonly id: IeltsTask1CriterionId
  readonly name: string
  readonly bands: readonly Task1RubricBandDescriptor[]
}

export interface Task1Rubric {
  readonly id: "ielts-writing-task-1"
  readonly taskSubtype: "academic" | "general_training"
  readonly version: Task1RubricVersion
  readonly publishedDate: "2023-05-03"
  readonly sourceUrl: string
  readonly criteria: readonly Task1RubricCriterion[]
}

export interface Task1CriterionEvaluation {
  readonly criterionId: IeltsTask1CriterionId
  readonly band: IeltsBand
  readonly descriptorId: Task1DescriptorId | Task2DescriptorId | string
  readonly evidence: readonly { readonly type: "positive" | "negative"; readonly quote: string; readonly rationale: string }[]
  readonly blockers: readonly string[]
  readonly annotationCandidates: readonly { readonly quote: string; readonly label: string; readonly rationale: string }[]
}

export interface LockedTask1Evaluation {
  readonly status: "completed"
  readonly locked: true
  readonly taskType: "task1"
  readonly taskSubtype: "academic" | "general_training"
  readonly schemaVersion: EvaluationSchemaVersion
  readonly rubricVersion: Task1RubricVersion
  readonly overallBand: IeltsHalfBand
  readonly criteria: readonly Task1CriterionEvaluation[]
  readonly stability: EvaluationStability
  readonly adjudicationRecords: readonly unknown[]
  readonly summary: string
}

export interface FailedTask1Evaluation {
  readonly status: "failed"
  readonly locked: false
  readonly error: string
  readonly failedCriteria?: readonly IeltsTask1CriterionId[]
}

export type Task1EvaluationResult = LockedTask1Evaluation | FailedTask1Evaluation
