import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/writing-feedback/route"
import * as t1 from "@/lib/ielts-evaluation/evaluate-task1"
import * as t2 from "@/lib/ielts-evaluation/evaluate-task2"
import * as coaching from "@/lib/ielts-evaluation/coaching/generate-coaching"

vi.mock("@/lib/ielts-evaluation/evaluate-task1")
vi.mock("@/lib/ielts-evaluation/evaluate-task2")
vi.mock("@/lib/ielts-evaluation/coaching/generate-coaching")

describe("POST /api/writing-feedback", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.AI_API_KEY = "test-key"
    vi.mocked(coaching.generateCoaching).mockReturnValue({ priorities: [] } as any)
  })

  it("never contains numeric band on Task 1 failure", async () => {
    vi.mocked(t1.evaluateTask1).mockResolvedValue({ status: "failed", error: "T1 fail", failedCriteria: [], locked: false })
    vi.mocked(t2.evaluateTask2).mockResolvedValue({ 
      status: "success", 
      overallBand: 7, 
      criteria: [],
      summary: "ok",
      locked: true
    } as any)

    const req = new Request("http://localhost/api/writing-feedback", {
      method: "POST",
      body: JSON.stringify({
        taskType: "both",
        task1Essay: "this is a very long essay that passes the length check. ".repeat(10),
        task1Prompt: "prompt 1",
        task2Essay: "this is a very long essay that passes the length check. ".repeat(10),
        task2Prompt: "prompt 2",
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(502)
    const data = await res.json()
    
    expect(data).toMatchObject({
      error: expect.stringContaining("Task 1"),
      retryable: true,
      failedTask: "Task 1",
      requestId: expect.any(String),
      status: "failed"
    })
    expect(data.band_estimate).toBeUndefined()
    expect(data.combined).toBeUndefined()
  })

  it("never contains numeric band on Task 2 failure", async () => {
    vi.mocked(t1.evaluateTask1).mockResolvedValue({ 
      status: "success", 
      overallBand: 7, 
      criteria: [],
      summary: "ok",
      locked: true
    } as any)
    vi.mocked(t2.evaluateTask2).mockResolvedValue({ status: "failed", error: "T2 fail", failedCriteria: [], locked: false })

    const req = new Request("http://localhost/api/writing-feedback", {
      method: "POST",
      body: JSON.stringify({
        taskType: "both",
        task1Essay: "this is a very long essay that passes the length check. ".repeat(10),
        task1Prompt: "prompt 1",
        task2Essay: "this is a very long essay that passes the length check. ".repeat(10),
        task2Prompt: "prompt 2",
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(502)
    const data = await res.json()
    
    expect(data).toMatchObject({
      error: expect.stringContaining("Task 2"),
      retryable: true,
      failedTask: "Task 2",
      requestId: expect.any(String),
      status: "failed"
    })
    expect(data.band_estimate).toBeUndefined()
  })

  it("provides raw combined means and display band on success", async () => {
    vi.mocked(t1.evaluateTask1).mockResolvedValue({
      status: "success",
      overallBand: 6,
      summary: "T1",
      rubricVersion: "task1-academic-2023-05",
      criteria: [
        { criterionId: "task-achievement", band: 6, annotationCandidates: [], supportingEvidence: [], nextBandBlockers: [] }
      ]
    } as any)
    
    vi.mocked(t2.evaluateTask2).mockResolvedValue({
      status: "success",
      overallBand: 7,
      summary: "T2",
      rubricVersion: "task2-2023-05",
      criteria: [
        { criterionId: "task-response", band: 7, annotationCandidates: [], supportingEvidence: [], nextBandBlockers: [] }
      ]
    } as any)

    const req = new Request("http://localhost/api/writing-feedback", {
      method: "POST",
      body: JSON.stringify({
        taskType: "both",
        task1Essay: "this is a very long essay that passes the length check. ".repeat(10),
        task1Prompt: "prompt 1",
        task2Essay: "this is a very long essay that passes the length check. ".repeat(10),
        task2Prompt: "prompt 2",
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    
    expect(data.combined.task1CriterionMean).toEqual(expect.any(Number))
    expect(data.combined.task2CriterionMean).toEqual(expect.any(Number))
    expect(data.combined.weightedWritingMean).toEqual(expect.any(Number))
    expect(data.combined.displayBand).toEqual(expect.any(Number))
    
    expect(data.band_estimate).toBe(data.combined.displayBand)
    expect(data).toMatchObject({
      status: "completed",
      provenance: {
        schemaVersion: expect.any(String),
        promptVersion: expect.any(String),
        rubricVersions: { task1: expect.any(String), task2: expect.any(String) },
      },
    })
  })

  it("fails closed when either evaluator returns empty criteria", async () => {
    vi.mocked(t1.evaluateTask1).mockResolvedValue({ status: "success", overallBand: 6, criteria: [], summary: "", locked: true } as any)
    vi.mocked(t2.evaluateTask2).mockResolvedValue({ status: "success", overallBand: 7, criteria: [], summary: "", locked: true } as any)
    const req = new Request("http://localhost/api/writing-feedback", { method: "POST", body: JSON.stringify({ taskType: "both", task1Essay: "valid essay ".repeat(10), task1Prompt: "prompt 1", task2Essay: "valid essay ".repeat(10), task2Prompt: "prompt 2" }) })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(502)
    expect(data).toMatchObject({ status: "failed", retryable: true, requestId: expect.any(String) })
    expect(data.band_estimate).toBeUndefined()
  })

  it("fails closed for empty criteria on legacy single-task requests", async () => {
    vi.mocked(t2.evaluateTask2).mockResolvedValue({
      status: "completed",
      locked: true,
      overallBand: 7,
      criteria: [],
      summary: "",
    } as any)

    const res = await POST(new Request("http://localhost/api/writing-feedback", {
      method: "POST",
      body: JSON.stringify({ taskType: "task2", essay: "valid essay ".repeat(10), prompt: "prompt" }),
    }))
    const data = await res.json()

    expect(res.status).toBe(502)
    expect(data).toMatchObject({ status: "failed", retryable: true, failedTask: "Task 2", requestId: expect.any(String) })
    expect(data.band_estimate).toBeUndefined()
    expect(data.evaluation).toBeUndefined()
  })

  it("rejects oversized essays and prompts", async () => {
    const req = new Request("http://localhost/api/writing-feedback", {
      method: "POST",
      body: JSON.stringify({
        taskType: "both",
        task1Essay: "a".repeat(11000),
        task1Prompt: "prompt 1",
        task2Essay: "this is valid. ".repeat(10),
        task2Prompt: "prompt 2",
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/exceeds maximum allowed length/i)
  })
})
