"use client"

import { use, useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, RotateCcw, ArrowLeft, CheckCircle2 } from "lucide-react"
import { usePracticeCatalog } from "@/hooks/use-practice-catalog"
import { useProgress } from "@/hooks/use-progress"
import { loadPracticeSession, saveTestResult, clearPracticeSession } from "@/lib/practice-session"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ClientHydration } from "@/components/ielts/client-hydration"
import type { WritingFeedbackResult } from "@/lib/ielts"

interface PageProps {
  params: Promise<{ slug: string }>
}

type StepKey = "prep" | "task1" | "task2" | "aggregate"

const PROCESSING_STEPS: { key: StepKey; title: string; hint: string }[] = [
  { key: "prep", title: "Validating responses", hint: "Confirming Task 1 and Task 2 submission formats" },
  { key: "task1", title: "Evaluating Task 1", hint: "Scoring Task Achievement, Coherence, Lexical, and Grammar" },
  { key: "task2", title: "Evaluating Task 2", hint: "Adjudicating Task Response, Cohesion, Vocabulary, and Syntax" },
  { key: "aggregate", title: "Synthesizing feedback", hint: "Weighting composite band score and compiling evidence" },
]

export default function WritingProcessingPage({ params }: PageProps) {
  const router = useRouter()
  const { slug } = use(params)
  const { getTestBySkillAndSlug, loadTestDetail } = usePracticeCatalog()
  const { addWritingRecord } = useProgress()

  const [currentStep, setCurrentStep] = useState<StepKey>("prep")
  const [errorInfo, setErrorInfo] = useState<{ message: string; requestId?: string; retryable?: boolean } | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  // Protect against double execution per mount
  const hasInvokedRef = useRef(false)

  const runEvaluation = async () => {
    setErrorInfo(null)
    setIsExecuting(true)
    setCurrentStep("prep")

    const session = loadPracticeSession("writing", slug)
    if (!session || !session.writing) {
      setErrorInfo({
        message: "No active draft session found. Please return to your writing test to begin.",
        retryable: false,
      })
      setIsExecuting(false)
      return
    }

    const task1Essay = session.writing.task1Essay || ""
    const task2Essay = session.writing.task2Essay || ""

    if (task1Essay.trim().split(/\s+/).length < 20 || task2Essay.trim().split(/\s+/).length < 20) {
      setErrorInfo({
        message: "Responses for both Task 1 and Task 2 must contain at least 20 words to be evaluated.",
        retryable: false,
      })
      setIsExecuting(false)
      return
    }

    try {
      // Ensure test details with real prompts are available
      let testObj = getTestBySkillAndSlug("writing", slug) ?? null
      if (testObj && (!testObj.writingTasks?.task1Prompt || !testObj.writingTasks?.task2Prompt)) {
        testObj = (await loadTestDetail(testObj)) ?? null
      }

      const task1Prompt = testObj?.writingTasks?.task1Prompt
      const task2Prompt = testObj?.writingTasks?.task2Prompt

      if (!task1Prompt || !task2Prompt) {
        throw new Error("Unable to retrieve official Task 1 and Task 2 prompts for evaluation.")
      }

      // Progressively advance visual indicators
      setCurrentStep("task1")
      const stepTimer = setTimeout(() => setCurrentStep("task2"), 4000)

      const response = await fetch("/api/writing-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: "both",
          testType: "academic",
          task1Prompt,
          task1Essay,
          task2Prompt,
          task2Essay,
        }),
      })

      clearTimeout(stepTimer)
      setCurrentStep("aggregate")

      const data = await response.json()
      if (!response.ok) {
        setErrorInfo({
          message: data.error || "Evaluation failed. The examiner service could not complete the request.",
          requestId: data.requestId,
          retryable: data.retryable ?? true,
        })
        setIsExecuting(false)
        return
      }

      const feedback = data as WritingFeedbackResult

      // Persist results & progress
      addWritingRecord(feedback, session.testId, session.title, slug)
      saveTestResult({
        skill: "writing",
        slug,
        testId: session.testId,
        title: session.title,
        completedAt: new Date().toISOString(),
        band: feedback.band_estimate,
        criterionBands: feedback.criterion_bands,
        criteriaSentences: feedback.criteria_sentences,
        overallTip: feedback.overall_tip,
        source: feedback.source,
        writingDetails: {
          taskType: "both",
          testType: feedback.testType,
          essay: `${task1Essay}\n\n---\n\n${task2Essay}`,
          prompt: `${task1Prompt}\n\n---\n\n${task2Prompt}`,
          evaluation: feedback.evaluation,
          resolvedAnnotations: feedback.resolvedAnnotations,
          coaching: feedback.coaching,
          task1: feedback.task1,
          task2: feedback.task2,
        },
      })

      clearPracticeSession("writing", slug)
      router.replace(`/writing/${slug}/result`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error connecting to evaluation service."
      setErrorInfo({
        message: msg,
        retryable: true,
      })
      setIsExecuting(false)
    }
  }

  useEffect(() => {
    if (!hasInvokedRef.current) {
      hasInvokedRef.current = true
      runEvaluation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentStepIdx = PROCESSING_STEPS.findIndex((s) => s.key === currentStep)

  return (
    <ClientHydration>
      <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-16">
        <section
          aria-label="Evaluation progress"
          className="flex flex-col gap-6 rounded-[3px] border border-border bg-card p-6 sm:p-8"
        >
          <div className="border-b border-border pb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Official IELTS Evaluation
            </span>
            <h1 className="text-xl font-semibold text-foreground pt-1">
              {errorInfo ? "Evaluation Halted" : "Evaluating Your Writing Session"}
            </h1>
            <p className="text-xs text-muted-foreground pt-1">
              {errorInfo
                ? "An issue occurred while evaluating your responses."
                : "Assessing Task 1 and Task 2 across official Cambridge criteria."}
            </p>
          </div>

          {!errorInfo && (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-3">
                {PROCESSING_STEPS.map((step, idx) => {
                  const isDone = idx < currentStepIdx
                  const isCurrent = idx === currentStepIdx
                  return (
                    <div
                      key={step.key}
                      className={`flex items-start gap-3 p-3 rounded-[2px] border transition-colors ${
                        isCurrent
                          ? "border-foreground/30 bg-muted/30"
                          : isDone
                          ? "border-border/60 bg-background opacity-80"
                          : "border-transparent opacity-40"
                      }`}
                    >
                      <div className="mt-0.5">
                        {isDone ? (
                          <CheckCircle2 className="size-4 text-emerald-600" />
                        ) : isCurrent ? (
                          <div className="relative size-4 flex items-center justify-center">
                            <span className="absolute inset-0 rounded-full border border-foreground/30" />
                            <span className="absolute inset-0 rounded-full border-t border-foreground animate-loader-orbit" />
                          </div>
                        ) : (
                          <div className="size-4 rounded-full border border-border" />
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-mono font-semibold text-foreground">
                          {step.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {step.hint}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-2 text-center font-mono text-[10px] text-muted-foreground">
                Please remain on this page while evaluation completes (usually 2-5 minutes)
              </div>
            </div>
          )}

          {errorInfo && (
            <div className="flex flex-col gap-5 py-2">
              <Alert variant="destructive" className="py-3 rounded-[2px]">
                <AlertTriangle className="size-4" />
                <AlertTitle className="text-xs font-mono font-medium">Evaluation Notice</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed pt-1 flex flex-col gap-1.5">
                  <span>{errorInfo.message}</span>
                  {errorInfo.requestId && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Reference Code: {errorInfo.requestId}
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/writing/${slug}`)}
                  className="w-full sm:w-auto min-h-[38px] px-4 text-xs font-mono rounded-[2px]"
                >
                  <ArrowLeft className="size-3.5 mr-1.5" />
                  Return to draft
                </Button>

                {errorInfo.retryable !== false && (
                  <Button
                    onClick={runEvaluation}
                    disabled={isExecuting}
                    className="w-full sm:w-auto min-h-[38px] px-4 text-xs font-mono rounded-[2px]"
                  >
                    <RotateCcw className="size-3.5 mr-1.5" />
                    Try evaluation again
                  </Button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </ClientHydration>
  )
}
