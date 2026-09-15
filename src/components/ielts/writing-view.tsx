"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type PracticeTest } from "@/lib/ielts"
import { SessionHeader } from "./session-header"
import { loadPracticeSession, savePracticeSession } from "@/lib/practice-session"

interface WritingViewProps {
  test: PracticeTest
}

export function WritingView({ test }: WritingViewProps) {
  const router = useRouter()

  const [activeTask, setActiveTask] = useState<"task1" | "task2">(() => {
    const existing = loadPracticeSession("writing", test.slug)
    return existing?.writing?.activeTask || "task1"
  })

  const [task1Essay, setTask1Essay] = useState<string>(() => {
    const existing = loadPracticeSession("writing", test.slug)
    return existing?.writing?.task1Essay || (existing?.writing?.activeTask === "task1" ? existing?.writing?.essay : "") || ""
  })

  const [task2Essay, setTask2Essay] = useState<string>(() => {
    const existing = loadPracticeSession("writing", test.slug)
    return existing?.writing?.task2Essay || (existing?.writing?.activeTask === "task2" ? existing?.writing?.essay : "") || ""
  })

  const [expiresAt, setExpiresAt] = useState<number>(() => {
    const existing = loadPracticeSession("writing", test.slug)
    if (existing?.expiresAt) return existing.expiresAt
    return Date.now() + (test?.durationMinutes || 60) * 60 * 1000
  })

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
        writing: {
          activeTask: "task1",
          phase: "task1",
          task1Essay: "",
          task2Essay: "",
        },
      })
    }
  }, [test.slug, test.id, test.title, test.durationMinutes])

  const task1Prompt = test?.writingTasks?.task1Prompt || ""
  const task2Prompt = test?.writingTasks?.task2Prompt || ""

  const currentPrompt = activeTask === "task1" ? task1Prompt : task2Prompt
  const currentEssay = activeTask === "task1" ? task1Essay : task2Essay
  const minWords = activeTask === "task1" ? 150 : 250

  const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0)
  const task1Words = countWords(task1Essay)
  const task2Words = countWords(task2Essay)
  const currentWords = activeTask === "task1" ? task1Words : task2Words

  const wordsRemaining = Math.max(0, minWords - currentWords)
  const isTargetMet = currentWords >= minWords

  const handleEssayChange = (value: string) => {
    setErrorMsg(null)
    if (activeTask === "task1") {
      setTask1Essay(value)
      savePracticeSession({
        skill: "writing",
        slug: test.slug,
        testId: test.id,
        title: test.title,
        startedAt: new Date().toISOString(),
        expiresAt,
        durationMinutes: test.durationMinutes || 60,
        writing: {
          activeTask: "task1",
          phase: "task1",
          task1Essay: value,
          task2Essay,
        },
      })
    } else {
      setTask2Essay(value)
      savePracticeSession({
        skill: "writing",
        slug: test.slug,
        testId: test.id,
        title: test.title,
        startedAt: new Date().toISOString(),
        expiresAt,
        durationMinutes: test.durationMinutes || 60,
        writing: {
          activeTask: "task2",
          phase: "task2",
          task1Essay,
          task2Essay: value,
        },
      })
    }
  }

  const handleTaskChange = (task: "task1" | "task2") => {
    if (task === activeTask) return
    setActiveTask(task)
    setErrorMsg(null)
    savePracticeSession({
      skill: "writing",
      slug: test.slug,
      testId: test.id,
      title: test.title,
      startedAt: new Date().toISOString(),
      expiresAt,
      durationMinutes: test.durationMinutes || 60,
      writing: {
        activeTask: task,
        phase: task,
        task1Essay,
        task2Essay,
      },
    })
  }

  const handleAdvanceToTask2 = () => {
    if (!task1Prompt) {
      setErrorMsg("Task 1 prompt is missing from upstream test. Cannot proceed.")
      return
    }
    if (task1Words < 20) {
      setErrorMsg("Please draft at least 20 words for Task 1 before continuing to Task 2.")
      return
    }
    setErrorMsg(null)
    handleTaskChange("task2")
  }

  const handleSubmitBothTasks = () => {
    if (!task1Prompt || !task2Prompt) {
      setErrorMsg("Prompts for Task 1 or Task 2 are missing. Cannot evaluate incomplete test.")
      return
    }
    if (task1Words < 20) {
      setErrorMsg("Task 1 is incomplete (minimum 20 words required). Switch to Task 1 to complete your draft.")
      return
    }
    if (task2Words < 20) {
      setErrorMsg("Task 2 is incomplete (minimum 20 words required). Complete your draft before evaluation.")
      return
    }

    setErrorMsg(null)

    // Save state marked as processing phase
    savePracticeSession({
      skill: "writing",
      slug: test.slug,
      testId: test.id,
      title: test.title,
      startedAt: new Date().toISOString(),
      expiresAt,
      durationMinutes: test.durationMinutes || 60,
      writing: {
        activeTask: "task2",
        phase: "processing",
        task1Essay,
        task2Essay,
      },
    })

    // Advance directly to dedicated processing route
    router.push(`/writing/${test.slug}/processing`)
  }

  const handleResetDraft = () => {
    const exp = Date.now() + (test.durationMinutes || 60) * 60 * 1000
    setExpiresAt(exp)
    setTask1Essay("")
    setTask2Essay("")
    setActiveTask("task1")
    setErrorMsg(null)
    savePracticeSession({
      skill: "writing",
      slug: test.slug,
      testId: test.id,
      title: test.title,
      startedAt: new Date().toISOString(),
      expiresAt: exp,
      durationMinutes: test.durationMinutes || 60,
      writing: {
        activeTask: "task1",
        phase: "task1",
        task1Essay: "",
        task2Essay: "",
      },
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <SessionHeader
        skillLabel="Writing"
        title={test?.title || "Writing Practice"}
        expiresAt={expiresAt}
        isRunning={true}
        onExpire={() => {
          if (task1Words >= 20 && task2Words >= 20) {
            handleSubmitBothTasks()
          } else {
            setErrorMsg("Time expired. Drafts are preserved locally on this device.")
          }
        }}
        onReset={handleResetDraft}
        showReset={Boolean(task1Essay.trim() || task2Essay.trim())}
        metaText="Academic & General"
      />

      {/* Task selector tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex rounded-[3px] border border-border bg-muted/40 p-1 max-w-sm w-full">
          <button
            type="button"
            onClick={() => handleTaskChange("task1")}
            className={`flex-1 min-h-[38px] text-xs font-mono rounded-[2px] transition-colors flex items-center justify-center gap-1.5 ${
              activeTask === "task1"
                ? "bg-background text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={activeTask === "task1"}
          >
            <span>Task 1 (150w)</span>
            {task1Words >= 150 && <CheckCircle2 className="size-3 text-emerald-600" />}
          </button>
          <button
            type="button"
            onClick={() => handleTaskChange("task2")}
            className={`flex-1 min-h-[38px] text-xs font-mono rounded-[2px] transition-colors flex items-center justify-center gap-1.5 ${
              activeTask === "task2"
                ? "bg-background text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={activeTask === "task2"}
          >
            <span>Task 2 (250w)</span>
            {task2Words >= 250 && <CheckCircle2 className="size-3 text-emerald-600" />}
          </button>
        </div>

        <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-2">
          <span>Task 1: {task1Words}w</span>
          <span>·</span>
          <span>Task 2: {task2Words}w</span>
        </div>
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
            <span className="text-[10px] font-mono text-muted-foreground">
              Min target: {minWords} words
            </span>
          </div>
          <p className="text-xs font-serif leading-relaxed text-foreground/90 whitespace-pre-line pt-1">
            {currentPrompt || "Prompt unavailable. Check network or return to catalog."}
          </p>
          {activeTask === "task1" && test?.writingTasks?.task1ImageUrl && (
            <div className="pt-2 flex flex-col gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={test.writingTasks.task1ImageUrl}
                alt={test.writingTasks.task1ImageAlt || "IELTS Writing Task 1 Diagram"}
                className="max-h-[380px] w-auto max-w-full rounded-[2px] border border-border bg-background object-contain"
                loading="eager"
                onError={(e) => {
                  const target = e.currentTarget
                  target.style.display = "none"
                  const parent = target.parentElement
                  if (parent && !parent.querySelector(".img-fallback-notice")) {
                    const notice = document.createElement("p")
                    notice.className = "img-fallback-notice text-xs text-muted-foreground italic py-2"
                    notice.textContent = "Image preview unavailable. Refer to diagram prompt description above."
                    parent.appendChild(notice)
                  }
                }}
              />
            </div>
          )}
        </section>

        {/* Drafting Workspace */}
        <section
          aria-label="Drafting editor"
          className="flex flex-col gap-3 rounded-[3px] border border-border bg-card p-4 sm:p-5"
        >
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 className="text-sm font-semibold text-foreground">
              {activeTask === "task1" ? "Task 1 Response" : "Task 2 Response"}
            </h2>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground mr-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Auto-saved
              </span>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className={`font-semibold ${isTargetMet ? "text-emerald-600" : "text-foreground"}`}>
                  {currentWords} / {minWords} words
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {wordsRemaining > 0 ? `(-${wordsRemaining})` : "(Target met)"}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Word Target Progress Bar */}
          <div className="w-full bg-muted rounded-full h-1 overflow-hidden" aria-hidden="true">
            <div
              className={`h-full transition-all duration-300 ${
                isTargetMet ? "bg-emerald-600" : "bg-foreground/70"
              }`}
              style={{ width: `${Math.min(100, Math.round((currentWords / minWords) * 100))}%` }}
            />
          </div>

          <Textarea
            placeholder={
              activeTask === "task1"
                ? "Type your Task 1 report or letter here..."
                : "Type your Task 2 essay here..."
            }
            value={currentEssay}
            onChange={(e) => handleEssayChange(e.target.value)}
            rows={16}
            className="font-serif text-sm leading-relaxed rounded-[2px] border-border resize-y bg-background"
            aria-label={`IELTS ${activeTask} text response`}
          />

          {errorMsg && (
            <Alert variant="destructive" className="py-2 rounded-[2px]">
              <AlertTriangle className="size-3.5" />
              <AlertTitle className="text-xs font-mono">Notice</AlertTitle>
              <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
            </Alert>
          )}

          <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[10px] font-mono text-muted-foreground">
              Drafts saved locally on this device
            </span>

            {activeTask === "task1" ? (
              <Button
                onClick={handleAdvanceToTask2}
                disabled={task1Words < 20}
                className="w-full sm:w-auto min-h-[38px] px-4 text-xs font-mono rounded-[2px]"
              >
                <span>Continue to Task 2</span>
                <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => handleTaskChange("task1")}
                  className="flex-1 sm:flex-none min-h-[38px] px-3 text-xs font-mono rounded-[2px]"
                >
                  Review Task 1
                </Button>
                <Button
                  onClick={handleSubmitBothTasks}
                  disabled={task1Words < 20 || task2Words < 20}
                  className="flex-1 sm:flex-none min-h-[38px] px-4 text-xs font-mono rounded-[2px]"
                >
                  <Sparkles className="size-3.5 mr-1.5" />
                  Submit both tasks for evaluation
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
