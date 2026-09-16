import type { CriterionEvaluation, EvaluationEvidence } from "../contracts"
import type { Task1CriterionEvaluation } from "../task1/contracts"

export interface EvidenceValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

export interface ParagraphOffset {
  readonly start: number
  readonly end: number
}

export function getParagraphOffsets(essay: string): readonly ParagraphOffset[] {
  const offsets: ParagraphOffset[] = []
  let currentPos = 0

  for (const paragraph of essay.split(/\n+/).filter((part) => part.trim().length > 0)) {
    const start = essay.indexOf(paragraph, currentPos)
    offsets.push({ start, end: start + paragraph.length })
    currentPos = start + paragraph.length
  }

  return offsets
}

function validateEvidenceAnchors(
  evidence: readonly EvaluationEvidence[],
  criterionId: string,
  essay: string,
  paragraphCount: number,
  errors: string[],
) {
  for (const item of evidence) {
    if (!item.rationale.trim()) {
      errors.push(`Empty evidence rationale in ${criterionId}`)
    }

    if (item.anchor.type === "span") {
      const quote = item.anchor.quote
      if (!quote.trim()) {
        errors.push(`Empty evidence quote in ${criterionId}`)
      } else if (!essay.includes(quote)) {
        errors.push(`Quote not found in essay for ${criterionId}: "${quote}"`)
      }
    } else if (
      item.anchor.type === "paragraph" &&
      (item.anchor.paragraphIndex < 0 || item.anchor.paragraphIndex >= paragraphCount)
    ) {
      errors.push(`Paragraph ${item.anchor.paragraphIndex} not found in essay for ${criterionId}`)
    }
  }
}

export function validateCriterionEvidence(
  evaluation: CriterionEvaluation | Task1CriterionEvaluation,
  essay: string,
): EvidenceValidationResult {
  const errors: string[] = []
  const paragraphCount = getParagraphOffsets(essay).length

  if (evaluation.supportingEvidence.length === 0) {
    errors.push(`At least one supporting evidence item required for ${evaluation.criterionId}`)
  }
  if (evaluation.band < 9 && evaluation.limitingEvidence.length === 0) {
    errors.push(`At least one limiting evidence item required for ${evaluation.criterionId}`)
  }
  if (evaluation.band < 9 && evaluation.nextBandBlockers.length === 0) {
    errors.push(`At least one next-band blocker required for ${evaluation.criterionId}`)
  }

  validateEvidenceAnchors(
    [...evaluation.supportingEvidence, ...evaluation.limitingEvidence],
    evaluation.criterionId,
    essay,
    paragraphCount,
    errors,
  )

  for (const candidate of evaluation.annotationCandidates) {
    const quote = candidate.quote
    if (!quote.trim()) {
      errors.push(`Empty annotation quote in ${evaluation.criterionId}`)
    } else if (!essay.includes(quote)) {
      errors.push(`Annotation quote not found in essay for ${evaluation.criterionId}: "${quote}"`)
    }
  }

  return { valid: errors.length === 0, errors }
}
