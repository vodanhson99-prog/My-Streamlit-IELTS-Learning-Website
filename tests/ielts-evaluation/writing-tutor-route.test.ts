import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { POST as tutorPost } from "../../src/app/api/writing-tutor/route"
import type { TutorErrorKind, TutorErrorResponse } from "../../src/lib/ielts-tutor/contracts"

const dummyEvaluation = {
  status: "completed",
  locked: true,
  schemaVersion: "1.0.0",
  rubricVersion: "task2-2023-05",
  overallBand: 6.5,
  stability: "high",
  adjudicationRecords: [],
  summary: "Overall summary",
  criteria: [],
}

describe("POST /api/writing-tutor", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, AI_API_KEY: "test-api-key" }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it("returns 400 with invalid_request if evaluation is missing", async () => {
    const req = new Request("http://localhost/api/writing-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        essay: "Essay",
        prompt: "Prompt",
        userMessage: "Hello tutor",
      }),
    })
    const res = await tutorPost(req)
    expect(res.status).toBe(400)
    const data: TutorErrorResponse = await res.json()
    expect(data.kind).toBe("invalid_request")
    expect(data.retryable).toBe(false)
    expect(data.requestId).toBeDefined()
    expect(typeof data.requestId).toBe("string")
    expect(data.requestId.length).toBeGreaterThan(0)
    expect(data.error).toBeDefined()
  })

  it("returns 400 with invalid_request if evaluation is unlocked", async () => {
    const req = new Request("http://localhost/api/writing-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evaluation: { ...dummyEvaluation, locked: false },
        essay: "Essay",
        prompt: "Prompt",
        userMessage: "Hello tutor",
      }),
    })
    const res = await tutorPost(req)
    expect(res.status).toBe(400)
    const data: TutorErrorResponse = await res.json()
    expect(data.kind).toBe("invalid_request")
    expect(data.retryable).toBe(false)
    expect(data.requestId).toBeDefined()
  })

  it("returns 400 with invalid_request if userMessage is empty or whitespace", async () => {
    const req = new Request("http://localhost/api/writing-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evaluation: dummyEvaluation,
        essay: "Essay",
        prompt: "Prompt",
        userMessage: "   ",
      }),
    })
    const res = await tutorPost(req)
    expect(res.status).toBe(400)
    const data: TutorErrorResponse = await res.json()
    expect(data.kind).toBe("invalid_request")
    expect(data.retryable).toBe(false)
    expect(data.requestId).toBeDefined()
  })

  it("returns 400 with invalid_request if userMessage is oversized (>2000 chars)", async () => {
    const req = new Request("http://localhost/api/writing-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evaluation: dummyEvaluation,
        essay: "Essay",
        prompt: "Prompt",
        userMessage: "a".repeat(2001),
      }),
    })
    const res = await tutorPost(req)
    expect(res.status).toBe(400)
    const data: TutorErrorResponse = await res.json()
    expect(data.kind).toBe("invalid_request")
    expect(data.retryable).toBe(false)
    expect(data.requestId).toBeDefined()
  })

  it("returns 400 with invalid_request if JSON body is malformed", async () => {
    const req = new Request("http://localhost/api/writing-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not-valid-json }",
    })
    const res = await tutorPost(req)
    expect(res.status).toBe(400)
    const data: TutorErrorResponse = await res.json()
    expect(data.kind).toBe("invalid_request")
    expect(data.retryable).toBe(false)
    expect(data.requestId).toBeDefined()
  })

  it("returns 503 with missing_configuration if AI_API_KEY is missing", async () => {
    delete process.env.AI_API_KEY
    const req = new Request("http://localhost/api/writing-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evaluation: dummyEvaluation,
        essay: "Essay",
        prompt: "Prompt",
        userMessage: "Hello tutor",
      }),
    })
    const res = await tutorPost(req)
    expect(res.status).toBe(503)
    const data: TutorErrorResponse = await res.json()
    expect(data.kind).toBe("missing_configuration")
    expect(data.retryable).toBe(false)
    expect(data.requestId).toBeDefined()
  })

  it("returns safe response for provider auth error", async () => {
    const askTutorModule = await import("../../src/lib/ielts-tutor/answer")
    const { AIProviderError } = await import("../../src/lib/ai/provider")
    vi.spyOn(askTutorModule, "askTutor").mockRejectedValueOnce(
      new AIProviderError("authentication", "AI provider authentication failed.", false, 401)
    )

    const req = new Request("http://localhost/api/writing-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evaluation: dummyEvaluation,
        essay: "Essay",
        prompt: "Prompt",
        userMessage: "Hello tutor",
      }),
    })
    const res = await tutorPost(req)
    expect([401, 502]).toContain(res.status)
    const data: TutorErrorResponse = await res.json()
    expect(data.kind).toBe("authentication_failed")
    expect(data.retryable).toBe(false)
    expect(data.requestId).toBeDefined()
  })

  it("returns safe response (504, retryable: true) for provider timeout", async () => {
    const askTutorModule = await import("../../src/lib/ielts-tutor/answer")
    const { AIProviderError } = await import("../../src/lib/ai/provider")
    vi.spyOn(askTutorModule, "askTutor").mockRejectedValueOnce(
      new AIProviderError("timeout", "AI provider request timed out.", true, 504)
    )

    const req = new Request("http://localhost/api/writing-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evaluation: dummyEvaluation,
        essay: "Essay",
        prompt: "Prompt",
        userMessage: "Hello tutor",
      }),
    })
    const res = await tutorPost(req)
    expect(res.status).toBe(504)
    const data: TutorErrorResponse = await res.json()
    expect(data.kind).toBe("timeout")
    expect(data.retryable).toBe(true)
    expect(data.requestId).toBeDefined()
  })

  it("returns safe response (429, retryable: true) for provider rate limit", async () => {
    const askTutorModule = await import("../../src/lib/ielts-tutor/answer")
    const { AIProviderError } = await import("../../src/lib/ai/provider")
    vi.spyOn(askTutorModule, "askTutor").mockRejectedValueOnce(
      new AIProviderError("rate_limited", "AI provider rate limit exceeded.", true, 429)
    )

    const req = new Request("http://localhost/api/writing-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evaluation: dummyEvaluation,
        essay: "Essay",
        prompt: "Prompt",
        userMessage: "Hello tutor",
      }),
    })
    const res = await tutorPost(req)
    expect(res.status).toBe(429)
    const data: TutorErrorResponse = await res.json()
    expect(data.kind).toBe("rate_limited")
    expect(data.retryable).toBe(true)
    expect(data.requestId).toBeDefined()
  })

  it("returns 500 with internal_error and requestId only for unexpected errors without leaking traces or input", async () => {
    const askTutorModule = await import("../../src/lib/ielts-tutor/answer")
    vi.spyOn(askTutorModule, "askTutor").mockRejectedValueOnce(
      new Error("SecretStack: sensitive trace with secret api key 12345 at InternalFile.ts:99")
    )

    const sensitiveEssay = "Sensitive essay content top secret"
    const req = new Request("http://localhost/api/writing-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evaluation: dummyEvaluation,
        essay: sensitiveEssay,
        prompt: "Prompt",
        userMessage: "Hello tutor",
      }),
    })
    const res = await tutorPost(req)
    expect(res.status).toBe(500)
    const data: TutorErrorResponse = await res.json()
    expect(data.kind).toBe("internal_error")
    expect(data.retryable).toBe(false)
    expect(data.requestId).toBeDefined()
    expect(data.error).not.toContain("SecretStack")
    expect(data.error).not.toContain("12345")
    expect(data.error).not.toContain(sensitiveEssay)
  })

  it("returns success payload with requestId on valid locked evaluation request", async () => {
    const askTutorModule = await import("../../src/lib/ielts-tutor/answer")
    vi.spyOn(askTutorModule, "askTutor").mockResolvedValueOnce({
      reply: "Here is guidance on your task response.",
      suggestedFollowUps: ["What else?"],
    })

    const req = new Request("http://localhost/api/writing-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evaluation: dummyEvaluation,
        essay: "My essay",
        prompt: "Task 2 Prompt",
        userMessage: "How do I improve?",
      }),
    })
    const res = await tutorPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.reply).toBe("Here is guidance on your task response.")
    expect(data.requestId).toBeDefined()
  })
})
