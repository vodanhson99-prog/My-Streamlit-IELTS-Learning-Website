import { describe, expect, it, vi } from "vitest"
import type { AIProvider } from "../../src/lib/ai/contracts"
import { AIProviderError, parseJsonText } from "../../src/lib/ai/provider"
import { askTutor } from "../../src/lib/ielts-tutor/answer"
import type { LockedTask2Evaluation } from "../../src/lib/ielts-evaluation/contracts"

const dummyEvaluation: LockedTask2Evaluation = Object.freeze({
  status: "completed",
  locked: true,
  schemaVersion: "1.0.0",
  rubricVersion: "task2-2023-05",
  overallBand: 6.5,
  stability: "high",
  adjudicationRecords: [],
  summary: "Overall summary",
  criteria: Object.freeze([
    {
      criterionId: "task-response" as const,
      band: 6 as const,
      descriptorId: "task2-2023-05.task-response.band-6" as const,
      supportingEvidence: [],
      limitingEvidence: [],
      nextBandBlockers: ["needs deeper counter-argument development"],
      annotationCandidates: [],
    },
    {
      criterionId: "coherence-cohesion" as const,
      band: 6 as const,
      descriptorId: "task2-2023-05.coherence-cohesion.band-6" as const,
      supportingEvidence: [],
      limitingEvidence: [],
      nextBandBlockers: ["overuse of mechanical cohesive devices"],
      annotationCandidates: [],
    },
    {
      criterionId: "lexical-resource" as const,
      band: 7 as const,
      descriptorId: "task2-2023-05.lexical-resource.band-7" as const,
      supportingEvidence: [],
      limitingEvidence: [],
      nextBandBlockers: [],
      annotationCandidates: [],
    },
    {
      criterionId: "grammatical-range-accuracy" as const,
      band: 6 as const,
      descriptorId: "task2-2023-05.grammatical-range-accuracy.band-6" as const,
      supportingEvidence: [],
      limitingEvidence: [],
      nextBandBlockers: ["frequent minor grammatical errors"],
      annotationCandidates: [],
    },
  ]),
})

describe("askTutor", () => {
  const dummyProvider: AIProvider = {
    async complete() {
      return {
        text: JSON.stringify({
          reply: "To reach Band 7 in Task Response, ensure each main body paragraph develops a fully rounded perspective.",
          references: ["Task Response Band 7 descriptor"],
          suggestedFollowUps: ["Can you give an example topic sentence?"],
        }),
        provider: "groq",
      }
    },
  }

  it("answers student questions within locked evaluation boundaries", async () => {
    const res = await askTutor(dummyProvider, {
      evaluation: dummyEvaluation,
      essay: "Sample essay content...",
      prompt: "Discuss technology impacts",
      history: [],
      userMessage: "Why did I get Band 6 in Task Response?",
    })

    expect(res.reply).toContain("Task Response")
    expect(res.suggestedFollowUps).toBeDefined()
  })

  it("rejects regrade or band mutation requests and informs new evaluation required", async () => {
    const res = await askTutor(dummyProvider, {
      evaluation: dummyEvaluation,
      essay: "Sample essay content...",
      prompt: "Discuss technology impacts",
      history: [],
      userMessage: "Can you please regrade my essay and give me band 7?",
    })

    expect(res.reply).toContain("locked and immutable")
    expect(res.reply).toContain("submit a new evaluation")
  })

  it("throws if evaluation is not locked", async () => {
    const unlocked = Object.freeze({ ...dummyEvaluation, locked: false }) as unknown as LockedTask2Evaluation
    await expect(
      askTutor(dummyProvider, {
        evaluation: unlocked,
        essay: "Essay",
        prompt: "Prompt",
        history: [],
        userMessage: "Hello",
      }),
    ).rejects.toThrow("locked")
  })

  describe("bounded retry and diagnostics", () => {
    const defaultInput = {
      evaluation: dummyEvaluation,
      essay: "Sample essay content with secret password 9999",
      prompt: "Discuss technology impacts",
      history: [],
      userMessage: "What is my biggest grammar issue?",
    }

    it("succeeds on second attempt when first attempt encounters transient error (503)", async () => {
      let attempts = 0
      const flakyProvider: AIProvider = {
        complete: vi.fn(async () => {
          attempts++
          if (attempts === 1) {
            throw new AIProviderError("upstream", "Service Unavailable", true, 503)
          }
          return {
            text: JSON.stringify({
              reply: "Second attempt succeeded.",
              references: [],
              suggestedFollowUps: [],
            }),
            provider: "openai-compatible" as const,
          }
        }),
      }

      const res = await askTutor(flakyProvider, defaultInput, { retryDelayMs: 1 })
      expect(res.reply).toBe("Second attempt succeeded.")
      expect(attempts).toBe(2)
      expect(flakyProvider.complete).toHaveBeenCalledTimes(2)
    })

    it("fails after exactly two attempts when transient failure persists", async () => {
      let attempts = 0
      const failingProvider: AIProvider = {
        complete: vi.fn(async () => {
          attempts++
          throw new AIProviderError("timeout", "Request timed out", true, 504)
        }),
      }

      await expect(
        askTutor(failingProvider, defaultInput, { retryDelayMs: 1 }),
      ).rejects.toMatchObject({
        code: "timeout",
      })
      expect(attempts).toBe(2)
      expect(failingProvider.complete).toHaveBeenCalledTimes(2)
    })

    it("fails immediately on 1st attempt for non-transient errors (401)", async () => {
      let attempts = 0
      const authErrorProvider: AIProvider = {
        complete: vi.fn(async () => {
          attempts++
          throw new AIProviderError("authentication", "Invalid key", false, 401)
        }),
      }

      await expect(
        askTutor(authErrorProvider, defaultInput, { retryDelayMs: 1 }),
      ).rejects.toMatchObject({
        code: "authentication",
      })
      expect(attempts).toBe(1)
      expect(authErrorProvider.complete).toHaveBeenCalledTimes(1)
    })

    it("fails immediately on 1st attempt for deterministic schema mismatch", async () => {
      let attempts = 0
      const badSchemaProvider: AIProvider = {
        complete: vi.fn(async () => {
          attempts++
          return {
            text: JSON.stringify({
              unexpectedField: "missing reply property",
            }),
            provider: "openai-compatible" as const,
          }
        }),
      }

      await expect(
        askTutor(badSchemaProvider, defaultInput, { retryDelayMs: 1 }),
      ).rejects.toThrow()
      expect(attempts).toBe(1)
      expect(badSchemaProvider.complete).toHaveBeenCalledTimes(1)
    })

    it("does not leak essay content, student questions, or API keys in structured diagnostics or logs", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const failingProvider: AIProvider = {
        complete: vi.fn(async () => {
          throw new AIProviderError("upstream", "Gateway failure", true, 502)
        }),
      }

      await expect(
        askTutor(failingProvider, defaultInput, { retryDelayMs: 1 }),
      ).rejects.toThrow()

      expect(warnSpy).toHaveBeenCalled()
      for (const call of warnSpy.mock.calls) {
        const logLine = call.join(" ")
        expect(logLine).not.toContain("secret password 9999")
        expect(logLine).not.toContain("What is my biggest grammar issue?")
        expect(logLine).not.toContain("Sample essay content")
      }
      warnSpy.mockRestore()
    })
  })

  describe("structured response parsing and boundary enforcement", () => {
    const defaultInput = {
      evaluation: dummyEvaluation,
      essay: "Sample essay content",
      prompt: "Discuss technology impacts",
      history: [],
      userMessage: "How can I improve Task Response?",
    }

    it("parses canonical JSON response successfully", async () => {
      const canonicalProvider: AIProvider = {
        complete: async () => ({
          text: JSON.stringify({
            reply: "Develop your arguments more fully.",
            references: ["Band 7 descriptor"],
            suggestedFollowUps: ["Give me an example."],
          }),
          provider: "openai-compatible",
        }),
      }

      const res = await askTutor(canonicalProvider, defaultInput)
      expect(res.reply).toBe("Develop your arguments more fully.")
      expect(res.references).toEqual(["Band 7 descriptor"])
      expect(res.suggestedFollowUps).toEqual(["Give me an example."])
    })

    it("parses markdown fenced JSON response successfully", async () => {
      const fencedProvider: AIProvider = {
        complete: async () => ({
          text: "```json\n" + JSON.stringify({
            reply: "Fenced reply content.",
            references: ["Ref 1"],
            suggestedFollowUps: ["Follow up 1"],
          }) + "\n```",
          provider: "openai-compatible",
        }),
      }

      const res = await askTutor(fencedProvider, defaultInput)
      expect(res.reply).toBe("Fenced reply content.")
      expect(res.references).toEqual(["Ref 1"])
      expect(res.suggestedFollowUps).toEqual(["Follow up 1"])
    })

    it("parses commentary-wrapped JSON response successfully", async () => {
      const commentaryProvider: AIProvider = {
        complete: async () => ({
          text: "Here is the feedback you requested:\n```json\n" + JSON.stringify({
            reply: "Commentary wrapped reply.",
            references: ["Ref 1"],
            suggestedFollowUps: [],
          }) + "\n```\nHope this helps!",
          provider: "openai-compatible",
        }),
      }

      const res = await askTutor(commentaryProvider, defaultInput)
      expect(res.reply).toBe("Commentary wrapped reply.")
      expect(res.references).toEqual(["Ref 1"])
    })

    it("selects first complete JSON object when a second object or trailing text is appended", async () => {
      const appendedProvider: AIProvider = {
        complete: async () => ({
          text: JSON.stringify({
            reply: "First object reply.",
            references: [],
            suggestedFollowUps: [],
          }) + "\n" + JSON.stringify({
            reply: "Second unwanted object.",
          }),
          provider: "openai-compatible",
        }),
      }

      const res = await askTutor(appendedProvider, defaultInput)
      expect(res.reply).toBe("First object reply.")
    })

    it("rejects truncated JSON object", async () => {
      const truncatedProvider: AIProvider = {
        complete: async () => ({
          text: '{"reply": "Incomplete text that gets cut off',
          provider: "openai-compatible",
        }),
      }

      await expect(askTutor(truncatedProvider, defaultInput)).rejects.toThrow()
    })

    it("rejects oversized reply (> 5000 chars)", async () => {
      const oversizedReplyProvider: AIProvider = {
        complete: async () => ({
          text: JSON.stringify({
            reply: "a".repeat(5001),
            references: [],
            suggestedFollowUps: [],
          }),
          provider: "openai-compatible",
        }),
      }

      await expect(askTutor(oversizedReplyProvider, defaultInput)).rejects.toThrow()
    })

    it("rejects oversized references (> 10 items or item > 500 chars)", async () => {
      const tooManyRefsProvider: AIProvider = {
        complete: async () => ({
          text: JSON.stringify({
            reply: "Valid reply",
            references: Array(11).fill("Ref"),
            suggestedFollowUps: [],
          }),
          provider: "openai-compatible",
        }),
      }

      await expect(askTutor(tooManyRefsProvider, defaultInput)).rejects.toThrow()

      const itemTooLongRefsProvider: AIProvider = {
        complete: async () => ({
          text: JSON.stringify({
            reply: "Valid reply",
            references: ["b".repeat(501)],
            suggestedFollowUps: [],
          }),
          provider: "openai-compatible",
        }),
      }

      await expect(askTutor(itemTooLongRefsProvider, defaultInput)).rejects.toThrow()
    })

    it("rejects oversized suggestedFollowUps (> 5 items or item > 250 chars)", async () => {
      const tooManyFollowUpsProvider: AIProvider = {
        complete: async () => ({
          text: JSON.stringify({
            reply: "Valid reply",
            references: [],
            suggestedFollowUps: Array(6).fill("Follow up"),
          }),
          provider: "openai-compatible",
        }),
      }

      await expect(askTutor(tooManyFollowUpsProvider, defaultInput)).rejects.toThrow()

      const itemTooLongFollowUpsProvider: AIProvider = {
        complete: async () => ({
          text: JSON.stringify({
            reply: "Valid reply",
            references: [],
            suggestedFollowUps: ["c".repeat(251)],
          }),
          provider: "openai-compatible",
        }),
      }

      await expect(askTutor(itemTooLongFollowUpsProvider, defaultInput)).rejects.toThrow()
    })

    it("preserves regrade refusal behavior without calling provider", async () => {
      const providerSpy: AIProvider = {
        complete: vi.fn(),
      }

      const res = await askTutor(providerSpy, {
        ...defaultInput,
        userMessage: "Can you please regrade my score to band 8?",
      })

      expect(res.reply).toContain("locked and immutable")
      expect(providerSpy.complete).not.toHaveBeenCalled()
    })
  })

  describe("parseJsonText unit tests", () => {
    it("parses canonical JSON object", () => {
      expect(parseJsonText('{"a": 1, "b": "test"}')).toEqual({ a: 1, b: "test" })
    })

    it("parses markdown code fenced JSON (```json and ```)", () => {
      expect(parseJsonText('```json\n{"a": 1}\n```')).toEqual({ a: 1 })
      expect(parseJsonText('```\n{"a": 2}\n```')).toEqual({ a: 2 })
    })

    it("parses commentary before and after JSON object", () => {
      expect(parseJsonText('Here is the result:\n{"a": 1}\nHave a nice day!')).toEqual({ a: 1 })
    })

    it("extracts first complete balanced JSON object when trailing text or subsequent objects exist", () => {
      expect(parseJsonText('{"a": 1}{"b": 2}')).toEqual({ a: 1 })
      expect(parseJsonText('{"a": {"nested": true}} trailing notes')).toEqual({ a: { nested: true } })
    })

    it("throws SyntaxError on truncated or unclosed JSON", () => {
      expect(() => parseJsonText('{"a": 1')).toThrow(SyntaxError)
      expect(() => parseJsonText('{"a": "unclosed string')).toThrow(SyntaxError)
      expect(() => parseJsonText('not json at all')).toThrow(SyntaxError)
    })
  })
})
