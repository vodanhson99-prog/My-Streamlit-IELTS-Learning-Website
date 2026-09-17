import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  buildBenchmarkReport,
  computeMetrics,
  computeScoreMetrics,
  formatBenchmarkReport,
  loadAllCases,
  quadraticWeightedKappa,
  runOfflineBenchmark,
} from "../../scripts/eval-writing"
import { evalCaseSchema } from "../../evals/writing/schema"

const baseCase = {
  id: "case-1",
  taskType: "task2" as const,
  testType: "academic" as const,
  prompt: "Discuss views",
  essay: "Sample essay content...",
  groundTruth: { overallBand: 6.5 },
}

function withFixture(files: Record<string, unknown>, callback: (directory: string) => void) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ielts-eval-"))
  try {
    for (const [name, contents] of Object.entries(files)) {
      fs.writeFileSync(path.join(directory, name), typeof contents === "string" ? contents : JSON.stringify(contents))
    }
    callback(directory)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
}


describe("Offline Evaluation Harness", () => {
  it("parses dataset metadata, raters, adjudication, notes, tags, and reference scores", () => {
    const parsed = evalCaseSchema.parse({
      ...baseCase,
      dataset: {
        category: "gold-human",
        source: "curated-local",
        version: "2026-09-16",
      },
      raters: [{ id: "rater-1", score: { overallBand: 6.5 } }],
      adjudicated: true,
      notes: "Reviewed for calibration.",
      tags: ["boundary", "task2"],
      promptFamily: "opinion",
      groundTruth: {
        overallBand: 6.5,
        referenceCriterionScores: { lexicalResource: 6.0 },
      },
    })

    expect(parsed.dataset).toBeDefined()
    expect(parsed.dataset?.category).toBe("gold-human")
    expect(parsed.raters?.[0].score.overallBand).toBe(6.5)
    expect(parsed.adjudicated).toBe(true)
    expect(parsed.groundTruth.referenceCriterionScores?.lexicalResource).toBe(6)
  })

  it("keeps legacy fixtures with only overallBand valid", () => {
    expect(evalCaseSchema.parse(baseCase).groundTruth).toEqual({ overallBand: 6.5 })
  })

  it("rejects unknown dataset categories", () => {
    expect(() => evalCaseSchema.parse({
      ...baseCase,
      dataset: { category: "unknown", source: "curated-local" },
    })).toThrow()
  })

  it("rejects duplicate IDs across fixture files", () => {
    withFixture({
      "first.json": [baseCase],
      "second.json": [{ ...baseCase, id: "case-1" }],
    }, (directory) => {
      expect(() => loadAllCases(directory)).toThrow(/duplicate case ID.*case-1/i)
    })
  })

  it("filters cases by dataset category", () => {
    withFixture({
      "cases.json": [
        { ...baseCase, id: "gold", dataset: { category: "gold-human", source: "curated-local" } },
        { ...baseCase, id: "regression", dataset: { category: "regression", source: "curated-local" } },
      ],
    }, (directory) => {
      expect(loadAllCases(directory, { categories: ["regression"] }).map((item) => item.id)).toEqual(["regression"])
      expect(() => loadAllCases(directory, { categories: ["unknown" as never] })).toThrow(/unknown dataset categor/i)
    })
  })

  it("reports malformed fixture JSON with its filename", () => {
    withFixture({ "broken.json": "{" }, (directory) => {
      expect(() => loadAllCases(directory)).toThrow(/broken\.json.*JSON/i)
    })
  })

  it("reports malformed fixture schema with file and case index", () => {
    withFixture({ "bad-schema.json": [{ ...baseCase, prompt: 42 }] }, (directory) => {
      expect(() => loadAllCases(directory)).toThrow(/bad-schema\.json.*index 0/i)
    })
  })

  it("calculates accuracy and error metrics accurately", () => {
    const results = [
      { caseId: "1", predictedBand: 6.5, groundTruthBand: 6.5 }, // exact
      { caseId: "2", predictedBand: 7.0, groundTruthBand: 6.5 }, // within 0.5
      { caseId: "3", predictedBand: 5.5, groundTruthBand: 7.0 }, // undergraded > 0.5
    ]

    const metrics = computeMetrics(results)
    expect(metrics.totalCases).toBe(3)
    expect(metrics.exactMatchPct).toBe(33.3)
    expect(metrics.withinHalfBandPct).toBe(66.7)
    expect(metrics.undergradedCount).toBe(1)
    expect(metrics.overgradedCount).toBe(0)
  })

  it("computes bias, confusion matrix, and quadratic weighted kappa", () => {
    const metrics = computeScoreMetrics([
      { predictedBand: 6.0, groundTruthBand: 6.0 },
      { predictedBand: 7.0, groundTruthBand: 6.5 },
      { predictedBand: 5.5, groundTruthBand: 6.0 },
    ])

    expect(metrics.meanBias).toBe(0)
    expect(metrics.quadraticWeightedKappa).toBeGreaterThan(0)
    expect(metrics.confusionMatrix["6"]["6"]).toBe(1)
    expect(metrics.confusionMatrix["6.5"]["7"]).toBe(1)
    expect(metrics.confusionMatrix["6"]["5.5"]).toBe(1)
  })

  it("returns perfect kappa for identical ordinal scores", () => {
    expect(quadraticWeightedKappa([6, 6.5, 7], [6, 6.5, 7])).toBe(1)
  })

  it("excludes failed evaluations from score metrics and reports failure count", () => {
    const report = buildBenchmarkReport([
      {
        caseId: "ok",
        taskType: "task2",
        testType: "academic",
        predictedBand: 6.5,
        groundTruthBand: 6.5,
        status: "locked",
        diff: 0,
        predictedCriteria: { lexicalResource: 6 },
        referenceCriteria: { lexicalResource: 6 },
        challengerTriggered: true,
        challengerOverturned: true,
        challengerAgreedWithReference: true,
      },
      {
        caseId: "fail",
        taskType: "task2",
        testType: "academic",
        predictedBand: null,
        groundTruthBand: 7,
        status: "failed",
        diff: null,
        error: "Criterion evaluation failed",
      },
    ])

    expect(report.failedCount).toBe(1)
    expect(report.scoredCount).toBe(1)
    expect(report.overall.totalCases).toBe(1)
    expect(report.overall.exactMatchPct).toBe(100)
    expect(report.criteria.lexicalResource?.exactMatchPct).toBe(100)
    expect(report.pipeline.invalidOutputRate).toBe(50)
    expect(report.pipeline.challengerTriggerRate).toBe(100)
    expect(report.pipeline.challengerOverturnRate).toBe(100)
    expect(report.pipeline.challengerAgreementRate).toBe(100)
  })

  it("formats a readable offline report", () => {
    const text = formatBenchmarkReport(buildBenchmarkReport([
      {
        caseId: "ok",
        taskType: "task2",
        testType: "academic",
        predictedBand: 6.5,
        groundTruthBand: 6.5,
        status: "locked",
        diff: 0,
      },
    ]))

    expect(text).toContain("Overall MAE")
    expect(text).toContain("Quadratic Weighted Kappa")
    expect(text).toContain("Failed evaluations")
  })

  it("runs offline benchmark validation without live provider calls", () => {
    const offline = runOfflineBenchmark()
    expect(offline.caseCount).toBeGreaterThanOrEqual(8)
    expect(offline.mode).toBe("offline")
    expect(offline.reportText).toContain("Schema validation successful")
  })
})
