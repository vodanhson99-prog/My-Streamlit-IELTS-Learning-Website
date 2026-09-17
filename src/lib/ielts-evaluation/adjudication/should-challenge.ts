import type { IeltsBand } from "../contracts"

export interface ShouldChallengeInput {
  readonly band: IeltsBand
  readonly confidence?: number
  readonly alternativeBand?: IeltsBand
  readonly descriptorConflict?: boolean
  readonly evidenceSufficient?: boolean
}

export interface ChallengeDecision {
  readonly challenge: boolean
  readonly reason: string
  readonly lowerBand?: IeltsBand
  readonly higherBand?: IeltsBand
  readonly reliabilityScore?: number
}

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.70

export function shouldChallenge(
  input: ShouldChallengeInput,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD,
): ChallengeDecision {
  let reliabilityScore = 1.0
  const hasObjectiveSignals = input.descriptorConflict !== undefined || input.evidenceSufficient !== undefined

  if (input.descriptorConflict === true) reliabilityScore -= 0.5
  if (input.evidenceSufficient === false) reliabilityScore -= 0.5
  if (input.confidence !== undefined) {
    reliabilityScore = (reliabilityScore * 0.8) + (input.confidence * 0.2)
  }
  reliabilityScore = Math.max(0, Math.min(1, reliabilityScore))

  // Determine if challenge is triggered
  let challenge = false
  let reason = ""

  if (input.descriptorConflict === true) {
    challenge = true
    reason = "Descriptor conflict detected"
  } else if (input.evidenceSufficient === false) {
    challenge = true
    reason = "Insufficient evidence provided"
  } else if (!hasObjectiveSignals && input.confidence !== undefined && input.confidence < threshold) {
    challenge = true
    reason = `Fallback: Confidence ${input.confidence.toFixed(2)} is below threshold ${threshold.toFixed(2)}`
  }

  if (!challenge) {
    return {
      challenge: false,
      reason: "Evaluation has sufficient evidence and no conflicts",
      reliabilityScore,
    }
  }

  // If we challenge, we need alternative bands for boundary challenge
  let lowerBand = input.band
  let higherBand = input.band

  if (input.alternativeBand !== undefined && Math.abs(input.alternativeBand - input.band) === 1) {
    lowerBand = Math.min(input.band, input.alternativeBand) as IeltsBand
    higherBand = Math.max(input.band, input.alternativeBand) as IeltsBand
  } else {
    // If no adjacent alternative band is provided, we can default to band - 1 and band (if band > 0)
    // Or we just return challenge: true without lower/higher if caller can handle it.
    // The previous implementation returned challenge: false if no valid alternativeBand was present,
    // but the task says "expect(shouldChallenge({ band: 6, evidenceSufficient: false })).toMatchObject({ challenge: true })".
    // Let's just return challenge: true.
    if (input.band > 0) {
      lowerBand = Math.max(0, input.band - 1) as IeltsBand
    }
    higherBand = Math.min(9, lowerBand + 1) as IeltsBand
  }

  return {
    challenge: true,
    reason,
    lowerBand,
    higherBand,
    reliabilityScore,
  }
}
