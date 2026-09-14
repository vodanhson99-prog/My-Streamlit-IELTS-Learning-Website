import type {
  EVALUATION_SCHEMA_VERSION,
  IELTS_BANDS,
  IELTS_HALF_BANDS,
  IELTS_TASK2_CRITERION_IDS,
  IELTS_TASK2_RUBRIC_PUBLISHED_DATE,
  IELTS_TASK2_RUBRIC_SOURCE_URL,
  IELTS_TASK2_RUBRIC_VERSION,
} from "./constants"

export type IeltsTask2CriterionId = (typeof IELTS_TASK2_CRITERION_IDS)[number]
export type IeltsBand = (typeof IELTS_BANDS)[number]
export type IeltsHalfBand = (typeof IELTS_HALF_BANDS)[number]
export type EvaluationSchemaVersion = typeof EVALUATION_SCHEMA_VERSION
export type Task2RubricVersion = typeof IELTS_TASK2_RUBRIC_VERSION
export type Task2RubricPublishedDate = typeof IELTS_TASK2_RUBRIC_PUBLISHED_DATE
export type Task2RubricSourceUrl = typeof IELTS_TASK2_RUBRIC_SOURCE_URL

export type Task2DescriptorId = `${Task2RubricVersion}.${IeltsTask2CriterionId}.band-${IeltsBand}`

export interface RubricBandDescriptor {
  readonly id: Task2DescriptorId
  readonly band: IeltsBand
  readonly descriptor: string
}

export interface RubricCriterion {
  readonly id: IeltsTask2CriterionId
  readonly name: string
  readonly bands: readonly RubricBandDescriptor[]
}

export interface Task2Rubric {
  readonly id: "ielts-writing-task-2"
  readonly version: Task2RubricVersion
  readonly publishedDate: Task2RubricPublishedDate
  readonly sourceUrl: Task2RubricSourceUrl
  readonly criteria: readonly RubricCriterion[]
}

export interface EvaluationEvidence {
  readonly quote: string
  readonly rationale: string
}

export interface AnnotationCandidate {
  readonly quote: string
  readonly label: string
  readonly rationale: string
}

export interface CriterionEvaluation {
  readonly criterionId: IeltsTask2CriterionId
  readonly band: IeltsBand
  readonly descriptorId: Task2DescriptorId
  readonly evidence: readonly EvaluationEvidence[]
  readonly blockers: readonly string[]
  readonly annotationCandidates: readonly AnnotationCandidate[]
}

export interface Task2EvaluationOutput {
  readonly schemaVersion: EvaluationSchemaVersion
  readonly rubricVersion: Task2RubricVersion
  readonly overallBand: IeltsHalfBand
  readonly criteria: readonly CriterionEvaluation[]
  readonly summary: string
}
