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

export type EvidenceAnchor =
  | { readonly type: "span"; readonly quote: string }
  | {
      readonly type: "paragraph"
      /** Zero-based index ignoring pure whitespace paragraphs */
      readonly paragraphIndex: number
    }
  | { readonly type: "global" }

export interface EvaluationEvidence {
  readonly anchor: EvidenceAnchor
  readonly rationale: string
}

export interface AnnotationCandidate {
  readonly quote: string
  readonly label: string
  readonly rationale: string
  /** Zero-based index ignoring pure whitespace paragraphs */
  readonly paragraphIndex?: number
  readonly surroundingContext?: string
}

export type AnnotationResolutionStatus = "resolved" | "ambiguous" | "unresolved"

export interface ResolvedAnnotation {
  readonly id: string
  readonly criterionId: IeltsTask2CriterionId | string
  readonly quote: string
  readonly label: string
  readonly rationale: string
  readonly status: AnnotationResolutionStatus
  readonly startOffset?: number
  readonly endOffset?: number
}

export interface CriterionEvaluation {
  readonly criterionId: IeltsTask2CriterionId
  readonly band: IeltsBand
  readonly descriptorId: Task2DescriptorId
  readonly supportingEvidence: readonly EvaluationEvidence[]
  readonly limitingEvidence: readonly EvaluationEvidence[]
  readonly nextBandBlockers: readonly string[]
  readonly annotationCandidates: readonly AnnotationCandidate[]
  readonly reliabilityScore?: number
}

export interface Task2EvaluationOutput {
  readonly schemaVersion: EvaluationSchemaVersion
  readonly rubricVersion: Task2RubricVersion
  readonly overallBand: IeltsHalfBand
  readonly criteria: readonly CriterionEvaluation[]
  readonly summary: string
}

export type EvaluationStability = "high" | "medium" | "low"

export interface AdjudicationRecord {
  readonly criterionId: IeltsTask2CriterionId
  readonly originalBand: IeltsBand
  readonly challengedBand: IeltsBand
  readonly decision: "confirmed" | "overturned"
  readonly rationale: string
}

export interface LockedTask2Evaluation {
  readonly status: "completed"
  readonly locked: true
  readonly schemaVersion: EvaluationSchemaVersion
  readonly rubricVersion: Task2RubricVersion
  readonly overallBand: IeltsHalfBand
  readonly criteria: readonly CriterionEvaluation[]
  readonly stability: EvaluationStability
  readonly adjudicationRecords: readonly AdjudicationRecord[]
  readonly summary: string
}

export interface FailedTask2Evaluation {
  readonly status: "failed"
  readonly locked: false
  readonly error: string
  readonly failedCriteria?: readonly IeltsTask2CriterionId[]
}

export type Task2EvaluationResult = LockedTask2Evaluation | FailedTask2Evaluation

export interface CombinedWritingScore {
  readonly task1CriterionMean: number
  readonly task2CriterionMean: number
  readonly weightedWritingMean: number
  readonly displayBand: IeltsHalfBand
}
