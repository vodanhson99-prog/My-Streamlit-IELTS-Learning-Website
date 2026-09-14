"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { PracticeTest, answersMatch, hasAnswer, rawScoreToIeltsBand, selectedOptionsMatch } from "@/lib/ielts"
import { SessionHeader } from "./session-header"
import { ChoiceQuestion } from "./choice-question"
import { InlineQuestionPrompt } from "./inline-question-prompt"
import {
  loadPracticeSession,
  savePracticeSession,
  clearPracticeSession,
} from "@/lib/practice-session"

interface ReadingViewProps {
  test: PracticeTest
  onComplete: (score: number, total: number, band: number) => void
  onNavigateToExplain?: () => void
}

export function ReadingView({
  test,
  onComplete,
}: ReadingViewProps) {
  const currentSection = test?.sections[0]
  const allQuestions = test?.sections?.flatMap((s) => s.questions || []) || []
  const questions = allQuestions.length > 0 ? allQuestions : currentSection?.questions || []
  const totalQuestions = questions.length

  const [mobileTab, setMobileTab] = useState<"passage" | "questions">("passage")
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | number[] | string>>(() => {
    const existing = loadPracticeSession("reading", test.slug)
    return existing?.reading?.answers || {}
  })
  const [expiresAt, setExpiresAt] = useState<number>(() => {
    const existing = loadPracticeSession("reading", test.slug)
    if (existing?.expiresAt) return existing.expiresAt
    return Date.now() + (test?.durationMinutes || 60) * 60 * 1000
  })
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Initialize session once if none exists
  useEffect(() => {
    const existing = loadPracticeSession("reading", test.slug)
    if (!existing) {
      const exp = Date.now() + (test.durationMinutes || 60) * 60 * 1000
      savePracticeSession({
        skill: "reading",
        slug: test.slug,
        testId: test.id,
        title: test.title,
        startedAt: new Date().toISOString(),
        expiresAt: exp,
        durationMinutes: test.durationMinutes || 60,
        reading: { answers: {} },
      })
    }
  }, [test.slug, test.id, test.title, test.durationMinutes])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (totalQuestions === 0) return

    let correctCount = 0
    questions.forEach((q) => {
      const userAns = selectedAnswers[q.id]
      const correct = q.type === "multiple_choice" && Array.isArray(userAns)
        ? selectedOptionsMatch(userAns, q.answer, q.options)
        : userAns !== undefined && answersMatch(userAns, q.answer)
      if (correct) correctCount += 1
    })

    const band = rawScoreToIeltsBand(correctCount, totalQuestions, "reading")
    const outcome = { score: correctCount, total: totalQuestions, band }
    setIsSubmitted(true)
    clearPracticeSession("reading", test.slug)
    onComplete(outcome.score, outcome.total, band)
  }

  // Save session upon answer changes
  const handleSelectOption = (qId: string, answer: number | number[] | string) => {
    if (isSubmitted) return
    const nextAnswers = {
      ...selectedAnswers,
      [qId]: answer,
    }
    setSelectedAnswers(nextAnswers)
    savePracticeSession({
      skill: "reading",
      slug: test.slug,
      testId: test.id,
      title: test.title,
      startedAt: new Date().toISOString(),
      expiresAt,
      durationMinutes: test.durationMinutes || 60,
      reading: { answers: nextAnswers },
    })
  }

  const handleReset = () => {
    const exp = Date.now() + (test.durationMinutes || 60) * 60 * 1000
    setExpiresAt(exp)
    setSelectedAnswers({})
    setIsSubmitted(false)
    savePracticeSession({
      skill: "reading",
      slug: test.slug,
      testId: test.id,
      title: test.title,
      startedAt: new Date().toISOString(),
      expiresAt: exp,
      durationMinutes: test.durationMinutes || 60,
      reading: { answers: {} },
    })
  }

  const answeredCount = Object.keys(selectedAnswers).length

  return (
    <div className="flex flex-col gap-5">
      <SessionHeader
        skillLabel="Reading"
        title={test?.title || "Reading Practice"}
        expiresAt={expiresAt}
        isRunning={!isSubmitted}
        onExpire={() => handleSubmit()}
        onReset={handleReset}
        showReset={isSubmitted}
        metaText="Academic Reading"
      />

      {/* Mobile view switcher */}
      <div className="flex lg:hidden rounded-[3px] border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setMobileTab("passage")}
          className={`flex-1 min-h-[38px] text-xs font-mono rounded-[2px] transition-colors ${
            mobileTab === "passage"
              ? "bg-background text-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={mobileTab === "passage"}
        >
          Passage Text
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("questions")}
          className={`flex-1 min-h-[38px] text-xs font-mono rounded-[2px] transition-colors ${
            mobileTab === "questions"
              ? "bg-background text-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={mobileTab === "questions"}
        >
          Questions ({answeredCount}/{totalQuestions})
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Passage */}
        <section
          aria-label="Reading passage text"
          className={`lg:col-span-7 flex flex-col gap-3 rounded-[3px] border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-14 ${
            mobileTab === "questions" ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-semibold text-foreground">
              {currentSection?.title || "Reading Passage"}
            </h2>
            <span className="text-[11px] font-mono text-muted-foreground">
              {currentSection?.passageText ? `${currentSection.passageText.split(/\s+/).length} words` : "Text"}
            </span>
          </div>

          <article className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 font-serif leading-relaxed text-[13.5px] whitespace-pre-line lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto pr-1">
            {currentSection?.passageText || "No text available for this section."}
          </article>
        </section>

        {/* Right Column: Questions */}
        <section
          aria-label="Questions list"
          className={`lg:col-span-5 flex flex-col gap-4 rounded-[3px] border border-border bg-card p-4 sm:p-5 ${
            mobileTab === "passage" ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-semibold text-foreground">
              Questions (1–{totalQuestions})
            </h2>
            <span className="text-[11px] font-mono text-muted-foreground">
              {answeredCount}/{totalQuestions} Answered
            </span>
          </div>

          <div className="flex flex-col gap-4 divide-y divide-border/60">
            {questions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-6 text-center">
                No questions currently loaded for this test.
              </p>
            ) : (
              questions.map((q) => {
                const isAnswered = hasAnswer(selectedAnswers[q.id])
                const isWrong = isSubmitted && isAnswered && !answersMatch(selectedAnswers[q.id], q.answer)

                if (q.options?.length) {
                  return <ChoiceQuestion key={q.id} question={q} value={selectedAnswers[q.id]} onChange={(answer) => handleSelectOption(q.id, answer)} disabled={isSubmitted} isSubmitted={isSubmitted} />
                }

                return <InlineQuestionPrompt key={q.id} question={q} value={String(selectedAnswers[q.id] ?? "")} onChange={(answer) => handleSelectOption(q.id, Array.isArray(answer) ? answer.join(", ") : answer)} disabled={isSubmitted} isSubmitted={isSubmitted} isCorrect={isSubmitted && answersMatch(selectedAnswers[q.id] ?? "", q.answer)} isWrong={isWrong} />
              })
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              type="submit"
              disabled={totalQuestions === 0 || isSubmitted}
              className="w-full h-9 text-xs font-mono rounded-[2px]"
            >
              Submit Reading Answers ({answeredCount}/{totalQuestions})
            </Button>
          </div>
        </section>
      </form>
    </div>
  )
}
