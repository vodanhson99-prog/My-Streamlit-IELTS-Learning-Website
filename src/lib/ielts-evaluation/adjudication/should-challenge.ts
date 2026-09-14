import type { IeltsBand } from "../contracts"

export interface ShouldChallengeInput {
  readonly band: IeltsBand
  readonly confidence: number
  readonly alternativeBand?: IeltsBand
}

export interface ChallengeDecision {
  readonly challenge: boolean
  readonly reason: string
  readonly lowerBand?: IeltsBand
  readonly higherBand?: IeltsBand
}

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.70

export function shouldChallenge(
  input: ShouldChallengeInput,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD,
): ChallengeDecision {
  if (input.confidence >= threshold) {
    return {
      challenge: false,
      reason: `Evaluation has sufficient confidence (${input.confidence.toFixed(2)} >= ${threshold.toFixed(2)})`,
    }
  }

  if (input.alternativeBand === undefined || input.alternativeBand === input.band) {
    return {
      challenge: false,
      reason: "No adjacent alternative band provided for boundary challenge",
    }
  }

  const diff = Math.abs(input.alternativeBand - input.band)
  if (diff !== 1) {
    return {
      challenge: false,
      reason: `Alternative band distance is ${diff}, only adjacent 1-band distance can be challenged`,
    }
  }

  const lowerBand = Math.min(input.band, input.alternativeBand) as IeltsBand
  const higherBand = Math.max(input.band, input.alternativeBand) as IeltsBand

  return {
    challenge: true,
    reason: `Confidence ${input.confidence.toFixed(2)} is below threshold ${threshold.toFixed(2)} at band boundary ${lowerBand}/${higherBand}`,
    lowerBand,
    higherBand,
  }
}
