"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bot, X, MessageSquare, AlertCircle, RefreshCw } from "lucide-react"
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastFailedText, setLastFailedText] = useState<string | null>(null)
  const [composerDraft, setComposerDraft] = useState<string>("")

  const composerInputRef = useRef<HTMLInputElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  // Save bounded history to localStorage (only assistant and user successful turns)
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-8)))
    } catch {
      // quota or private mode
    }
  }, [messages, storageKey])

  // Focus restoration & Escape key handler
  useEffect(() => {
    if (!isOpen) return

    if (typeof document !== "undefined") {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null
    }

    const timer = setTimeout(() => {
      composerInputRef.current?.focus()
    }, 50)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("keydown", handleKeyDown)
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus()
      }
    }
  }, [isOpen, onClose])

  const handleSendMessage = useCallback(async (userText: string, specificAnnotation?: ResolvedAnnotation) => {
    const trimmed = userText.trim()
    if (!trimmed || isLoading) return

    if (!writingDetails?.evaluation) {
      setErrorMessage("Writing evaluation is unavailable. Complete an evaluation first.")
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    setLastFailedText(null)
    setComposerDraft("")

    const newMsg: TutorMessage = { role: "user", content: trimmed }
    const updatedHistory = [...messages, newMsg]

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
          history: updatedHistory.slice(-8),
          userMessage: trimmed,
          selectedAnnotation,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.reply) {
        // Handle failure safely without duplicating user message into state
        setErrorMessage("Tutor is currently unavailable. Please try again.")
        setLastFailedText(trimmed)
        setComposerDraft(trimmed)
      } else {
        // Success: append both user and assistant to state
        setMessages([
          ...updatedHistory,
          {
            role: "assistant",
            content: data.reply,
            references: data.references,
            suggestedFollowUps: data.suggestedFollowUps,
          },
        ])
        setComposerDraft("")
      }
    } catch {
      setErrorMessage("Unable to connect to IELTS Tutor. Check your network.")
      setLastFailedText(trimmed)
      setComposerDraft(trimmed)
    } finally {
      setIsLoading(false)
    }
  }, [focusedAnnotationId, isLoading, messages, writingDetails])

  const handleRetry = useCallback(() => {
    if (lastFailedText) {
      handleSendMessage(lastFailedText)
    }
  }, [handleSendMessage, lastFailedText])

  const handleSelectFollowUp = useCallback((followUpText: string) => {
    handleSendMessage(followUpText)
  }, [handleSendMessage])

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
      role="dialog"
      aria-modal="true"
      aria-label="IELTS Writing Tutor"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 max-w-full bg-card border-l border-border shadow-xl flex flex-col justify-between p-4"
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
          className="size-7 rounded-[2px] border border-border flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
          aria-label="Close tutor panel"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-3">
        {messages.length === 0 && !isLoading && !errorMessage ? (
          <div className="my-auto text-center p-6 flex flex-col items-center gap-2">
            <MessageSquare className="size-6 text-muted-foreground/40" />
            <p className="text-xs font-semibold text-foreground">Ask anything about your essay</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Ask how to overcome specific band blockers, improve collocations, or clarify grammar mistakes.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => (
            <TutorMessageItem
              key={idx}
              message={m}
              onSelectFollowUp={handleSelectFollowUp}
            />
          ))
        )}

        {/* Pending state */}
        <div aria-live="polite" aria-atomic="true">
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground italic font-mono px-3 py-2 bg-muted/20 border border-border/40 rounded-[2px]">
              <RefreshCw className="size-3 animate-spin text-primary" />
              <span>Tutor is thinking...</span>
            </div>
          )}
        </div>

        {/* Inline safe error & retry */}
        {errorMessage && (
          <div
            role="alert"
            className="p-2.5 rounded-[2px] bg-destructive/10 border border-destructive/20 flex items-start justify-between gap-2 text-xs"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-medium text-foreground">{errorMessage}</span>
              </div>
            </div>
            {lastFailedText && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isLoading}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-foreground hover:underline shrink-0 font-medium px-1.5 py-0.5 border border-border rounded-[2px] bg-background hover:bg-muted"
              >
                <RefreshCw className="size-2.5" />
                <span>Try again</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <TutorComposer
        inputRef={composerInputRef}
        onSend={handleSendMessage}
        disabled={isLoading}
        placeholder={initialPrompt || "Ask tutor about feedback or grammar..."}
        initialValue={composerDraft}
      />
    </aside>
  )
}
