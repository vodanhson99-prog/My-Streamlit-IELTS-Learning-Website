/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { TutorPanel } from "@/components/ielts/tutor/tutor-panel"
import { TutorComposer } from "@/components/ielts/tutor/tutor-composer"
import { EvaluationWarning } from "@/components/ielts/writing-result/evaluation-warning"
import { askTutor } from "@/lib/ielts-tutor/answer"
import type { AIProvider } from "@/lib/ai/contracts"
import { AIProviderError } from "@/lib/ai/provider"
import type { LockedTask2Evaluation } from "@/lib/ielts-evaluation/contracts"

const mockEvaluation: LockedTask2Evaluation = {
  status: "completed",
  locked: true,
  schemaVersion: "1.0.0",
  rubricVersion: "task2-2023-05",
  overallBand: 6.5,
  stability: "high",
  adjudicationRecords: [],
  summary: "Solid response",
  criteria: [
    {
      criterionId: "task-response",
      band: 6,
      descriptorId: "task2-2023-05.task-response.band-6",
      supportingEvidence: [],
      limitingEvidence: [],
      nextBandBlockers: ["Develop secondary argument"],
      annotationCandidates: [],
    },
    {
      criterionId: "coherence-cohesion",
      band: 6,
      descriptorId: "task2-2023-05.coherence-cohesion.band-6",
      supportingEvidence: [],
      limitingEvidence: [],
      nextBandBlockers: [],
      annotationCandidates: [],
    },
    {
      criterionId: "lexical-resource",
      band: 7,
      descriptorId: "task2-2023-05.lexical-resource.band-7",
      supportingEvidence: [],
      limitingEvidence: [],
      nextBandBlockers: [],
      annotationCandidates: [],
    },
    {
      criterionId: "grammatical-range-accuracy",
      band: 7,
      descriptorId: "task2-2023-05.grammatical-range-accuracy.band-7",
      supportingEvidence: [],
      limitingEvidence: [],
      nextBandBlockers: [],
      annotationCandidates: [],
    },
  ],
}

describe("Tutor & Settings Integration", () => {
  const store: Record<string, string> = {}
  const listeners: Record<string, ((e: any) => void)[]> = {}

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key]
    for (const key of Object.keys(listeners)) delete listeners[key]

    const fakeLocalStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = String(val)
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        for (const key of Object.keys(store)) delete store[key]
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() {
        return Object.keys(store).length
      },
    }

    const fakeWindow = {
      localStorage: fakeLocalStorage,
      addEventListener: (type: string, listener: any) => {
        if (!listeners[type]) listeners[type] = []
        listeners[type].push(listener)
      },
      removeEventListener: (type: string, listener: any) => {
        if (!listeners[type]) return
        listeners[type] = listeners[type].filter((l) => l !== listener)
      },
      dispatchEvent: (event: any) => {
        const type = event.type
        if (listeners[type]) {
          for (const l of listeners[type]) l(event)
        }
        return true
      },
      CustomEvent: class CustomEvent {
        type: string
        detail: any
        constructor(type: string, init?: any) {
          this.type = type
          this.detail = init?.detail
        }
      },
    }

    // @ts-expect-error mock window
    globalThis.window = fakeWindow
    ;(globalThis as any).localStorage = fakeLocalStorage
    // @ts-expect-error mock CustomEvent
    globalThis.CustomEvent = fakeWindow.CustomEvent
  })

  afterEach(() => {
    // @ts-expect-error cleanup
    delete globalThis.window
    delete (globalThis as any).localStorage
    delete (globalThis as any).CustomEvent
    vi.restoreAllMocks()
  })

  describe("Tutor chrome localization", () => {
    it("renders default english strings when locale is en", () => {
      ;(globalThis as any).localStorage.setItem(
        "ielts_settings_v1",
        JSON.stringify({ version: 1, locale: "en", tutorAutoRetry: true, reducedMotion: false })
      )

      const html = renderToStaticMarkup(
        <TutorPanel
          slug="test-slug"
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(html).toContain("AI Writing Tutor")
      expect(html).toContain("Ask anything about your essay")
      expect(html).toContain("Ask how to overcome specific band blockers")
      expect(html).toContain('placeholder="Ask tutor about feedback or grammar..."')
      expect(html).toContain('aria-label="Close tutor panel"')
    })

    it("renders vietnamese strings when locale is vi", () => {
      ;(globalThis as any).localStorage.setItem(
        "ielts_settings_v1",
        JSON.stringify({ version: 1, locale: "vi", tutorAutoRetry: true, reducedMotion: false })
      )

      const html = renderToStaticMarkup(
        <TutorPanel
          slug="test-slug"
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(html).toContain("Trợ lý AI Viết")
      expect(html).toContain("Trợ lý sư phạm hỗ trợ học tập")
      expect(html).toContain("Hỏi bất cứ điều gì về bài viết của bạn")
      expect(html).toContain("Hỏi cách cải thiện band điểm, trau chuốt từ vựng hay giải thích các lỗi ngữ pháp.")
      expect(html).toContain('placeholder="Hỏi trợ lý về nhận xét hoặc ngữ pháp..."')
      expect(html).toContain('aria-label="Đóng trợ lý"')
    })
  })

  describe("Reduced motion support in TutorPanel", () => {
    it("applies motion-reduce or disables transitions when reducedMotion is true", () => {
      ;(globalThis as any).localStorage.setItem(
        "ielts_settings_v1",
        JSON.stringify({ version: 1, locale: "en", tutorAutoRetry: true, reducedMotion: true })
      )

      const html = renderToStaticMarkup(
        <TutorPanel
          slug="test-slug"
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(html).toContain("motion-reduce")
    })

    it("does not force motion-reduce class when reducedMotion is false", () => {
      ;(globalThis as any).localStorage.setItem(
        "ielts_settings_v1",
        JSON.stringify({ version: 1, locale: "en", tutorAutoRetry: true, reducedMotion: false })
      )

      const html = renderToStaticMarkup(
        <TutorPanel
          slug="test-slug"
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(html).not.toContain("motion-reduce")
    })
  })

  describe("autoRetry in askTutor", () => {
    it("does not retry transient error when maxRetries is 0", async () => {
      let completeCalls = 0
      const mockProvider: AIProvider = {
        complete: async () => {
          completeCalls++
          throw new AIProviderError("rate_limited", "Rate limited", true, 429)
        },
      }

      await expect(
        askTutor(
          mockProvider,
          {
            evaluation: mockEvaluation,
            essay: "Some essay content",
            prompt: "Some prompt",
            history: [],
            userMessage: "Explain feedback",
          },
          { maxRetries: 0, retryDelayMs: 0 }
        )
      ).rejects.toThrow()

      expect(completeCalls).toBe(1)
    })

    it("retries transient error once when maxRetries is 1 (default)", async () => {
      let completeCalls = 0
      const mockProvider: AIProvider = {
        complete: async () => {
          completeCalls++
          if (completeCalls === 1) {
            throw new AIProviderError("rate_limited", "Rate limited", true, 429)
          }
          return {
            text: JSON.stringify({
              reply: "Here is your explanation",
              references: [],
              suggestedFollowUps: [],
            }),
            provider: "groq",
          }
        },
      }

      const res = await askTutor(
        mockProvider,
        {
          evaluation: mockEvaluation,
          essay: "Some essay content",
          prompt: "Some prompt",
          history: [],
          userMessage: "Explain feedback",
        },
        { retryDelayMs: 0 }
      )

      expect(completeCalls).toBe(2)
      expect(res.reply).toBe("Here is your explanation")
    })
  })

  describe("TutorComposer localization", () => {
    it("renders custom send button text and placeholder", () => {
      const html = renderToStaticMarkup(
        <TutorComposer
          onSend={() => {}}
          placeholder="Hỏi trợ lý..."
          sendLabel="Gửi"
        />
      )

      expect(html).toContain('placeholder="Hỏi trợ lý..."')
      expect(html).toContain("Gửi")
    })
  })

  describe("EvaluationWarning localization / rendering", () => {
    it("renders default text and supports custom retry label", () => {
      const html = renderToStaticMarkup(
        <EvaluationWarning
          onRetry={() => {}}
          retryLabel="Thử lại"
        />
      )

      expect(html).toContain("Writing evaluation failed")
      expect(html).toContain("Thử lại")
    })
  })
})
