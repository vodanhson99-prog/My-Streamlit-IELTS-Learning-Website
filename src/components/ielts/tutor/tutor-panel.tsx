"use client"

import { useCallback, useEffect, useState } from "react"
import { Bot, X, MessageSquare } from "lucide-react"
import type { TutorMessage } from "@/lib/ielts-tutor/contracts"
import type { WritingDetailsPayload } from "@/lib/ielts"
import type { ResolvedAnnotation } from "@/lib/ielts-evaluation/contracts"
import { TutorMessageItem } from "./tutor-message"
import { TutorComposer } from "./tutor-composer"

interface TutorPanelProps {
  slug: string
  writingDetails?: WritingDetailsPayload
  isOpen: boolean
  onClose: () => void
  focusedAnnotationId?: string
}

const STORAGE_PREFIX = "ielts_tutor_v1"

export function TutorPanel({
  slug,
  writingDetails,
  isOpen,
  onClose,
  focusedAnnotationId,
}: TutorPanelProps) {
  const storageKey = `${STORAGE_PREFIX}:${slug}`

  const [messages, setMessages] = useState<TutorMessage[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [isLoading, setIsLoading] = useState(false)

  // Save bounded history to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-8)))
    } catch {
      // quota or private mode
    }
  }, [messages, storageKey])

  const handleSendMessage = useCallback(async (userText: string, specificAnnotation?: ResolvedAnnotation) => {
    if (!userText.trim() || isLoading || !writingDetails?.evaluation) return

    const newMsg: TutorMessage = { role: "user", content: userText }
    const updated = [...messages, newMsg]
    setMessages(updated)
    setIsLoading(true)

    try {
      const selectedAnnotation =
        specificAnnotation ||
        writingDetails?.resolvedAnnotations?.find(
          (a) => a.id === focusedAnnotationId,
        )

      const res = await fetch("/api/writing-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluation: writingDetails.evaluation,
          essay: writingDetails.essay,
          prompt: writingDetails.prompt,
          history: updated.slice(-8),
          userMessage: userText,
          selectedAnnotation,
        }),
      })

      const data = await res.json()
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }])
      } else if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Tutor error: ${data.error}` },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to connect to IELTS Tutor agent." },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [focusedAnnotationId, isLoading, messages, writingDetails])

  // Calculate initial prompt derived directly during render (Rule 5.1: Calculate Derived State During Rendering)
  const targetAnnotation =
    focusedAnnotationId && writingDetails?.resolvedAnnotations
      ? writingDetails.resolvedAnnotations.find((a) => a.id === focusedAnnotationId)
      : undefined

  const initialPrompt = targetAnnotation
    ? `Can you explain the feedback on "${targetAnnotation.quote}" (${targetAnnotation.label}): ${targetAnnotation.rationale}?`
    : undefined

  if (!isOpen) return null

  return (
    <aside
      aria-label="IELTS Writing Tutor"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-card border-l border-border shadow-xl flex flex-col justify-between p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-[2px] bg-primary/10 flex items-center justify-center">
            <Bot className="size-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">IELTS Tutor Agent</h3>
            <span className="text-[10px] font-mono text-muted-foreground">Read-only pedagogical assistant</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="size-7 rounded-[2px] border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"
          aria-label="Close tutor panel"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="my-auto text-center p-6 flex flex-col items-center gap-2">
            <MessageSquare className="size-6 text-muted-foreground/40" />
            <p className="text-xs font-semibold text-foreground">Ask anything about your essay</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Ask how to overcome specific band blockers, improve collocations, or clarify grammar mistakes.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => <TutorMessageItem key={idx} message={m} />)
        )}
        {isLoading && (
          <div className="text-xs text-muted-foreground italic font-mono px-3">
            Tutor is thinking...
          </div>
        )}
      </div>

      {/* Composer */}
      <TutorComposer
        onSend={handleSendMessage}
        disabled={isLoading}
        placeholder={initialPrompt || "Ask tutor about feedback or grammar..."}
      />
    </aside>
  )
}
