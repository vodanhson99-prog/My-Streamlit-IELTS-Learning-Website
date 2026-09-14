"use client"

import { useEffect, useState } from "react"
import { Sparkles, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  type PracticeTest,
  type WritingFeedbackResult,
} from "@/lib/ielts"
import { SessionHeader } from "./session-header"
import {
  loadPracticeSession,
  savePracticeSession,
  clearPracticeSession,
} from "@/lib/practice-session"

interface WritingViewProps {
  test: PracticeTest
  onComplete: (feedback: WritingFeedbackResult) => void
}

export function WritingView({ test, onComplete }: WritingViewProps) {
  const [activeTask, setActiveTask] = useState<"task1" | "task2">(() => {
    const existing = loadPracticeSession("writing", test.slug)
    return existing?.writing?.activeTask || "task2"
  })
  const [essay, setEssay] = useState<string>(() => {
    const existing = loadPracticeSession("writing", test.slug)
    return existing?.writing?.essay || ""
  })
  const [expiresAt, setExpiresAt] = useState<number>(() => {
    const existing = loadPracticeSession("writing", test.slug)
    if (existing?.expiresAt) return existing.expiresAt
    return Date.now() + (test?.durationMinutes || 60) * 60 * 1000
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Initialize session once if none exists
  useEffect(() => {
    const existing = loadPracticeSession("writing", test.slug)
    if (!existing) {
      const exp = Date.now() + (test.durationMinutes || 60) * 60 * 1000
      savePracticeSession({
        skill: "writing",
        slug: test.slug,
        testId: test.id,
        title: test.title,
        startedAt: new Date().toISOString(),
        expiresAt: exp,
        durationMinutes: test.durationMinutes || 60,
        writing: { activeTask: "task2", essay: "" },
      })
    }
  }, [test.slug, test.id, test.title, test.durationMinutes])

  const currentPrompt =
    activeTask === "task1"
      ? test?.writingTasks?.task1Prompt || "Summarise the given diagram or chart (150 words minimum)."
      : test?.writingTasks?.task2Prompt || "Discuss both views and give your opinion (250 words minimum)."

  const minWords = activeTask === "task1" ? 150 : 250
  const words = essay.trim() ? essay.trim().split(/\s+/).length : 0
  const wordsRemaining = Math.max(0, minWords - words)
  const isTargetMet = words >= minWords

  const handleEssayChange = (value: string) => {
    setEssay(value)
    savePracticeSession({
      skill: "writing",
      slug: test.slug,
      testId: test.id,
      title: test.title,
      startedAt: new Date().toISOString(),
      expiresAt,
      durationMinutes: test.durationMinutes || 60,
      writing: { activeTask, essay: value },
    })
  }

  const handleTaskChange = (task: "task1" | "task2") => {
    if (task === activeTask) return
    setActiveTask(task)
    savePracticeSession({
      skill: "writing",
      slug: test.slug,
      testId: test.id,
      title: test.title,
      startedAt: new Date().toISOString(),
      expiresAt,
      durationMinutes: test.durationMinutes || 60,
      writing: { activeTask: task, essay },
    })
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!essay.trim()) return

    setIsLoading(true)
    setErrorMsg(null)

    try {
      const response = await fetch("/api/writing-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essay,
          prompt: currentPrompt,
          taskType: activeTask,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to evaluate essay")
      }

      clearPracticeSession("writing", test.slug)
      onComplete(data)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error evaluating essay")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetDraft = () => {
    const exp = Date.now() + (test.durationMinutes || 60) * 60 * 1000
    setExpiresAt(exp)
    setEssay("")
    setErrorMsg(null)
    savePracticeSession({
      skill: "writing",
      slug: test.slug,
      testId: test.id,
      title: test.title,
      startedAt: new Date().toISOString(),
      expiresAt: exp,
      durationMinutes: test.durationMinutes || 60,
      writing: { activeTask, essay: "" },
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <SessionHeader
        skillLabel="Writing"
        title={test?.title || "Writing Practice"}
        expiresAt={expiresAt}
        isRunning={!isLoading}
        onExpire={() => handleSubmit()}
        onReset={handleResetDraft}
        showReset={Boolean(essay.trim())}
        metaText="Academic & General"
      />

      {/* Task selector tabs */}
      <div className="flex rounded-[3px] border border-border bg-muted/40 p-1 max-w-sm">
        <button
          type="button"
          onClick={() => handleTaskChange("task1")}
          className={`flex-1 min-h-[38px] text-xs font-mono rounded-[2px] transition-colors ${
            activeTask === "task1"
              ? "bg-background text-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={activeTask === "task1"}
        >
          Task 1 (150w)
        </button>
        <button
          type="button"
          onClick={() => handleTaskChange("task2")}
          className={`flex-1 min-h-[38px] text-xs font-mono rounded-[2px] transition-colors ${
            activeTask === "task2"
              ? "bg-background text-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={activeTask === "task2"}
        >
          Task 2 (250w)
        </button>
      </div>

      <div className="flex flex-col gap-5">
        {/* Flattened Prompt Surface */}
        <section
          aria-label="Writing prompt"
          className="flex flex-col gap-2 rounded-[3px] border border-border bg-card p-4 sm:p-5"
        >
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 className="text-sm font-semibold text-foreground">
              {activeTask === "task1" ? "Task 1 Prompt" : "Task 2 Prompt"}
            </h2>
            <span className="text-[11px] font-mono text-muted-foreground">
              Min target: {minWords} words
            </span>
          </div>
          <p className="text-[13px] font-serif leading-relaxed text-foreground/90 whitespace-pre-line pt-1">
            {currentPrompt}
          </p>
        </section>

        {/* Drafting Workspace */}
        <section
          aria-label="Drafting editor"
          className="flex flex-col gap-3 rounded-[3px] border border-border bg-card p-4 sm:p-5"
        >
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 className="text-sm font-semibold text-foreground">Your Response</h2>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`font-semibold ${isTargetMet ? "text-emerald-600" : "text-foreground"}`}>
                {words} words
              </span>
              <span className="text-muted-foreground text-[11px]">
                {wordsRemaining > 0 ? `(${wordsRemaining} more to minimum)` : "(Target met)"}
              </span>
            </div>
          </div>

          <Textarea
            placeholder="Type your IELTS response here..."
            value={essay}
            onChange={(e) => handleEssayChange(e.target.value)}
            disabled={isLoading}
            rows={16}
            className="font-serif text-sm leading-relaxed rounded-[2px] border-border resize-y bg-background"
            aria-label="IELTS essay text response"
          />

          {errorMsg && (
            <Alert variant="destructive" className="py-2 rounded-[2px]">
              <AlertTriangle className="size-3.5" />
              <AlertTitle className="text-xs font-mono">Submission Error</AlertTitle>
              <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
            </Alert>
          )}

          <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-muted-foreground">
              Saved on this device
            </span>

            <Button
              onClick={handleSubmit}
              disabled={isLoading || words < 20}
              className="w-full sm:w-auto min-h-[38px] px-4 text-xs font-mono rounded-[2px]"
            >
              {isLoading ? (
                <>
                  <span className="relative size-3 mr-2 flex items-center justify-center">
                    <span className="absolute inset-0 rounded-full border border-primary-foreground/40" />
                    <span className="absolute inset-0 rounded-full border-t border-primary-foreground animate-loader-orbit" />
                  </span>
                  Evaluating essay...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5 mr-1.5" />
                  Submit Essay ({words} words)
                </>
              )}
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
