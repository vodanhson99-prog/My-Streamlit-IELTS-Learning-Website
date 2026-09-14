import type { CriterionEvaluation } from "../contracts"

export interface EvidenceValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

/**
 * Validates that:
 * 1. Both positive and negative evidence polarities are present.
 * 2. Every evidence quote is non-empty and occurs verbatim in the essay.
 * 3. At least one blocker is listed.
 * 4. Every annotation candidate quote is non-empty and occurs verbatim in the essay.
 */
export function validateCriterionEvidence(
  evaluation: CriterionEvaluation,
  essay: string,
): EvidenceValidationResult {
  const errors: string[] = []

  const polarities = new Set(evaluation.evidence.map((e) => e.type))
  if (!polarities.has("positive")) {
    errors.push(`Missing positive evidence for ${evaluation.criterionId}`)
  }
  if (!polarities.has("negative")) {
    errors.push(`Missing negative evidence for ${evaluation.criterionId}`)
  }

  for (const item of evaluation.evidence) {
    const quote = item.quote.trim()
    if (!quote) {
      errors.push(`Empty evidence quote in ${evaluation.criterionId}`)
      continue
    }
    if (!essay.includes(quote)) {
      errors.push(`Quote not found in essay for ${evaluation.criterionId}: "${quote}"`)
    }
  }

  if (!evaluation.blockers || evaluation.blockers.length === 0) {
    errors.push(`At least one blocker required for ${evaluation.criterionId}`)
  }

  for (const candidate of evaluation.annotationCandidates) {
    const quote = candidate.quote.trim()
    if (!quote) {
      errors.push(`Empty annotation quote in ${evaluation.criterionId}`)
      continue
    }
    if (!essay.includes(quote)) {
      errors.push(`Annotation quote not found in essay for ${evaluation.criterionId}: "${quote}"`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
