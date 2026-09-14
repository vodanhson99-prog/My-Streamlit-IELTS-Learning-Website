import { describe, expect, it } from "vitest"
import { IELTS_TASK2_RUBRIC } from "../../src/lib/ielts-evaluation/rubric/task2-v2023"

const officialSource = "https://ielts.org/cdn/ielts-guides/ielts-writing-band-descriptors.pdf"

describe("IELTS_TASK2_RUBRIC", () => {
  it("records authoritative May 2023 source metadata", () => {
    expect(IELTS_TASK2_RUBRIC.version).toBe("task2-2023-05")
    expect(IELTS_TASK2_RUBRIC.publishedDate).toBe("2023-05-03")
    expect(IELTS_TASK2_RUBRIC.sourceUrl).toBe(officialSource)
  })

  it("contains four official criteria and every official band", () => {
    expect(IELTS_TASK2_RUBRIC.criteria.map(({ id }) => id)).toEqual([
      "task-response",
      "coherence-cohesion",
      "lexical-resource",
      "grammatical-range-accuracy",
    ])
    for (const criterion of IELTS_TASK2_RUBRIC.criteria) {
      expect(criterion.bands.map(({ band }) => band)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0])
      expect(new Set(criterion.bands.map(({ id }) => id)).size).toBe(10)
    }
  })

  it("uses current official Task Response wording", () => {
    const band9 = IELTS_TASK2_RUBRIC.criteria[0].bands[0]
    expect(band9.descriptor).toContain("The prompt is appropriately addressed and explored in depth.")
    expect(band9.descriptor).toContain("Any lapses in content or support are extremely rare.")
  })
})
