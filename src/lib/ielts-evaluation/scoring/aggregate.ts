import { IELTS_HALF_BANDS, IELTS_TASK2_CRITERION_IDS } from "../constants"
import type { CriterionEvaluation, IeltsHalfBand } from "../contracts"

/**
 * Official IELTS overall band rounding:
 * Fractional part:
 *  - < 0.25 -> round down to whole band (.0)
 *  - >= 0.25 and < 0.75 -> round to half band (.5)
 *  - >= 0.75 -> round up to next whole band (.0)
 */
export function calculateIeltsHalfBand(rawAverage: number): IeltsHalfBand {
  if (rawAverage <= 0) return 0
  if (rawAverage >= 9) return 9

  const whole = Math.floor(rawAverage)
  const fraction = rawAverage - whole

  let calculated: number
  if (fraction < 0.25) {
    calculated = whole
  } else if (fraction < 0.75) {
    calculated = whole + 0.5
  } else {
    calculated = whole + 1.0
  }

  const clamped = Math.min(9, Math.max(0, calculated))
  const matched = IELTS_HALF_BANDS.find((b) => Math.abs(b - clamped) < 1e-6)
  if (matched === undefined) {
    throw new Error(`Unexpected non-half-band result: ${clamped}`)
  }
  return matched
}

export function aggregateTask2Bands(criteria: readonly CriterionEvaluation[]): IeltsHalfBand {
  if (criteria.length !== IELTS_TASK2_CRITERION_IDS.length) {
    throw new Error(`Expected exactly 4 unique criteria, got ${criteria.length}`)
  }

  const seen = new Set<string>()
  for (const c of criteria) {
    if (seen.has(c.criterionId)) {
      throw new Error(`Expected exactly 4 unique criteria, got duplicate ${c.criterionId}`)
    }
    seen.add(c.criterionId)
  }

  let totalScore = 0
  for (const criterionId of IELTS_TASK2_CRITERION_IDS) {
    const item = criteria.find((c) => c.criterionId === criterionId)
    if (!item) {
      throw new Error(`Missing required criterion: ${criterionId}`)
    }
    totalScore += item.band
  }

  const average = totalScore / IELTS_TASK2_CRITERION_IDS.length
  return calculateIeltsHalfBand(average)
}
