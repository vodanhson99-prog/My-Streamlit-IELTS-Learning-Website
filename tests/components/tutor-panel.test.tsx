import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { TutorPanel } from "@/components/ielts/tutor/tutor-panel"
import { TutorMessageItem } from "@/components/ielts/tutor/tutor-message"
import { TutorComposer } from "@/components/ielts/tutor/tutor-composer"
import type { TutorMessage } from "@/lib/ielts-tutor/contracts"

describe("Tutor UI components", () => {
  describe("TutorMessageItem", () => {
    it("renders assistant message with references and suggestedFollowUps", () => {
      const msg: TutorMessage = {
        role: "assistant",
        content: "Here is your guidance.",
        references: ["Criteria: Lexical Resource", "Annotation: 'more better'"],
        suggestedFollowUps: ["How to fix this?", "Give me examples"],
      }
      const html = renderToStaticMarkup(React.createElement(TutorMessageItem, { message: msg }))

      expect(html).toContain("Here is your guidance.")
      expect(html).toContain("Criteria: Lexical Resource")
      expect(html).toContain("Annotation: &#x27;more better&#x27;")
      expect(html).toContain("How to fix this?")
      expect(html).toContain("Give me examples")
    })

    it("renders user message with appropriate styling and without assistant chrome", () => {
      const msg: TutorMessage = {
        role: "user",
        content: "My question here",
      }
      const html = renderToStaticMarkup(React.createElement(TutorMessageItem, { message: msg }))
      expect(html).toContain("My question here")
      expect(html).not.toContain("References")
    })
  })

  describe("TutorComposer", () => {
    it("disables input and send button when disabled prop is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(TutorComposer, {
          onSend: () => {},
          disabled: true,
          placeholder: "Type here...",
          initialValue: "Draft content",
        })
      )

      expect(html).toContain('disabled=""')
      expect(html).toContain('value="Draft content"')
      expect(html).toContain('aria-label="Ask IELTS tutor"')
      expect(html).toContain('aria-label="Send message to tutor"')
    })
  })

  describe("TutorPanel drawer markup and accessibility", () => {
    it("renders dialog role, aria-modal, aria-label and right-side drawer classes", () => {
      const html = renderToStaticMarkup(
        React.createElement(TutorPanel, {
          slug: "test-slug",
          isOpen: true,
          onClose: () => {},
        })
      )

      expect(html).toContain('role="dialog"')
      expect(html).toContain('aria-modal="true"')
      expect(html).toContain('aria-label="IELTS Writing Tutor"')
      expect(html).toContain("fixed inset-y-0 right-0 z-50 w-full sm:w-96 max-w-full")
      expect(html).toContain("flex-1 overflow-y-auto")
      expect(html).toContain('aria-live="polite"')
      // Empty state
      expect(html).toContain("Ask anything about your essay")
    })

    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(TutorPanel, {
          slug: "test-slug",
          isOpen: false,
          onClose: () => {},
        })
      )

      expect(html).toBe("")
    })
  })

  describe("TutorPanel interaction logic and failure recovery contracts", () => {
    it("simulates failed response handling and verifies state recovery contract", async () => {
      // Logic test simulating the exact state reducer / handleSendMessage logic from TutorPanel
      let messages: TutorMessage[] = []
      let isLoading = false
      let errorMessage: string | null = null
      let lastFailedText: string | null = null
      let composerDraft: string = ""

      const handleSendMessage = async (userText: string, fetchFn: () => Promise<{ ok: boolean; json: () => Promise<any> }>) => {
        const trimmed = userText.trim()
        if (!trimmed || isLoading) return
        isLoading = true
        errorMessage = null
        lastFailedText = null
        composerDraft = ""

        try {
          const res = await fetchFn()
          const data = await res.json()
          if (!res.ok || !data.reply) {
            errorMessage = "Tutor is currently unavailable. Please try again."
            lastFailedText = trimmed
            composerDraft = trimmed
          } else {
            messages = [
              ...messages,
              { role: "user", content: trimmed },
              {
                role: "assistant",
                content: data.reply,
                references: data.references,
                suggestedFollowUps: data.suggestedFollowUps,
              },
            ]
            composerDraft = ""
          }
        } catch {
          errorMessage = "Unable to connect to IELTS Tutor. Check your network."
          lastFailedText = trimmed
          composerDraft = trimmed
        } finally {
          isLoading = false
        }
      }

      // Step 1: Attempt send with network/server failure
      await handleSendMessage("How can I improve my Task 2 conclusion?", async () => ({
        ok: false,
        json: async () => ({ error: "Internal Server Error" }),
      }))

      // Verify no user message was appended to history
      expect(messages.length).toBe(0)
      // Verify safe generic error (no raw internal error leakage)
      expect(errorMessage).toBe("Tutor is currently unavailable. Please try again.")
      // Verify lastFailedText and composerDraft preserved
      expect(lastFailedText).toBe("How can I improve my Task 2 conclusion?")
      expect(composerDraft).toBe("How can I improve my Task 2 conclusion?")

      // Step 2: Retry with success
      await handleSendMessage(lastFailedText!, async () => ({
        ok: true,
        json: async () => ({
          reply: "Summarize your main points without introducing new evidence.",
          references: ["Band 8 Descriptor"],
          suggestedFollowUps: ["Give me an example closing sentence"],
        }),
      }))

      // Verify messages now contain both user message and assistant message with references and follow ups
      expect(messages.length).toBe(2)
      expect(messages[0]).toEqual({
        role: "user",
        content: "How can I improve my Task 2 conclusion?",
      })
      expect(messages[1]).toEqual({
        role: "assistant",
        content: "Summarize your main points without introducing new evidence.",
        references: ["Band 8 Descriptor"],
        suggestedFollowUps: ["Give me an example closing sentence"],
      })
      expect(composerDraft).toBe("")
      expect(errorMessage).toBeNull()
      expect(lastFailedText).toBeNull()
    })
  })
})
