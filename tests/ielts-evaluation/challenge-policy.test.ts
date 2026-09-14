import { describe, expect, it } from "vitest"
import { shouldChallenge } from "../../src/lib/ielts-evaluation/adjudication/should-challenge"

describe("shouldChallenge policy", () => {
  it("does not challenge when confidence is at or above threshold (default 0.70)", () => {
    const decision = shouldChallenge({
      band: 6,
      confidence: 0.75,
      alternativeBand: 7,
    })
    expect(decision.challenge).toBe(false)
    expect(decision.reason).toContain("sufficient confidence")
  })

  it("challenges when confidence is strictly below threshold", () => {
    const decision = shouldChallenge({
      band: 6,
      confidence: 0.65,
      alternativeBand: 7,
    })
    expect(decision.challenge).toBe(true)
    expect(decision.lowerBand).toBe(6)
    expect(decision.higherBand).toBe(7)
  })

  it("assigns lowerBand and higherBand correctly regardless of alternativeBand direction", () => {
    const dec1 = shouldChallenge({ band: 7, confidence: 0.60, alternativeBand: 6 })
    expect(dec1.lowerBand).toBe(6)
    expect(dec1.higherBand).toBe(7)

    const dec2 = shouldChallenge({ band: 6, confidence: 0.60, alternativeBand: 7 })
    expect(dec2.lowerBand).toBe(6)
    expect(dec2.higherBand).toBe(7)
  })

  it("does not challenge if alternative band is identical or invalid distance (> 1 band difference)", () => {
    const decSame = shouldChallenge({ band: 6, confidence: 0.50, alternativeBand: 6 })
    expect(decSame.challenge).toBe(false)

    const decFar = shouldChallenge({ band: 5, confidence: 0.50, alternativeBand: 8 })
    expect(decFar.challenge).toBe(false)
    expect(decFar.reason).toContain("distance")
  })

  it("respects custom threshold", () => {
    const dec = shouldChallenge(
      { band: 6, confidence: 0.80, alternativeBand: 7 },
      0.85,
    )
    expect(dec.challenge).toBe(true)
  })
})
