import { describe, expectTypeOf, it } from "vitest"
import type {
  EvaluationSchemaVersion,
  IeltsHalfBand,
  Task2EvaluationOutput,
  Task2RubricPublishedDate,
  Task2RubricSourceUrl,
  Task2RubricVersion,
} from "../../src/lib/ielts-evaluation/contracts"

describe("IELTS evaluation contracts", () => {
  it("derive metadata literals from central constants", () => {
    expectTypeOf<EvaluationSchemaVersion>().toEqualTypeOf<"1.0.0">()
    expectTypeOf<Task2RubricVersion>().toEqualTypeOf<"task2-2023-05">()
    expectTypeOf<Task2RubricPublishedDate>().toEqualTypeOf<"2023-05-03">()
    expectTypeOf<Task2RubricSourceUrl>().toEqualTypeOf<"https://ielts.org/cdn/ielts-guides/ielts-writing-band-descriptors.pdf">()
  })

  it("restricts overall scores to IELTS half-bands", () => {
    expectTypeOf<Task2EvaluationOutput["overallBand"]>().toEqualTypeOf<IeltsHalfBand>()
    expectTypeOf<6.5>().toExtend<IeltsHalfBand>()
    expectTypeOf<6.25>().not.toExtend<IeltsHalfBand>()
  })
})
