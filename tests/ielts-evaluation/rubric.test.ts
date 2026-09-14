import { createHash } from "node:crypto"
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

  it("pins every source-vetted official descriptor", () => {
    const canonical = IELTS_TASK2_RUBRIC.criteria.flatMap((criterion) =>
      criterion.bands.map(({ id, descriptor }) => `${id}\n${descriptor}`),
    ).join("\n")

    expect(createHash("sha256").update(canonical, "utf8").digest("hex")).toBe(
      "db28343e4b756fc79e4123d96291f9b1e02dc8e1bded8006c1e1abaa96ccc4ff",
    )
  })
})
