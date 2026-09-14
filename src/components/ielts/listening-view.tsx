"use client"

import { useEffect, useState, useRef } from "react"
import { Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PracticeTest, QuestionAnswer, answersMatch, hasAnswer, optionIndex, rawScoreToIeltsBand, selectedOptionsMatch, validateListeningCompleteness } from "@/lib/ielts"
import { SessionHeader } from "./session-header"
import { InlineQuestionPrompt } from "./inline-question-prompt"
import { ChoiceQuestion } from "./choice-question"
import { UnifiedPartNavigator } from "./unified-part-navigator"
import {
  loadPracticeSession,
  savePracticeSession,
  clearPracticeSession,
} from "@/lib/practice-session"

interface ListeningViewProps {
  test: PracticeTest
  onComplete: (score: number, total: number, band: number) => void
  onNavigateToExplain?: () => void
}

export function ListeningView({
  test,
  onComplete,
}: ListeningViewProps) {
  const sections = test.sections || []
  const allQuestions = sections.flatMap((s) => s.questions || [])
  const totalQuestions = allQuestions.length

  const completeness = validateListeningCompleteness(test)

  const [activePartIndex, setActivePartIndex] = useState<number>(0)
  const [userAnswers, setUserAnswers] = useState<Record<string, string | string[]>>(() => {
    const existing = loadPracticeSession("listening", test.slug)
    return existing?.listening?.answers || {}
  })
  const [expiresAt, setExpiresAt] = useState<number>(() => {
    const existing = loadPracticeSession("listening", test.slug)
    if (existing?.expiresAt) return existing.expiresAt
    return Date.now() + (test?.durationMinutes || 30) * 60 * 1000
  })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const existing = loadPracticeSession("listening", test.slug)
    if (!existing) {
      const exp = Date.now() + (test.durationMinutes || 30) * 60 * 1000
      savePracticeSession({
        skill: "listening",
        slug: test.slug,
        testId: test.id,
        title: test.title,
        startedAt: new Date().toISOString(),
        expiresAt: exp,
        durationMinutes: test.durationMinutes || 30,
        listening: { answers: {} },
      })
    }
  }, [test.slug, test.id, test.title, test.durationMinutes])

  const currentSection = sections[activePartIndex] || sections[0]
  const currentQuestions = currentSection?.questions || []

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (totalQuestions === 0) return

    let correctCount = 0
    allQuestions.forEach((q) => {
      const userVal = userAnswers[q.id] || ""
      const correct = q.type === "multiple_choice"
        ? selectedOptionsMatch((Array.isArray(userVal) ? userVal : []).map(Number), q.answer, q.options)
        : q.options
          ? optionIndex(userVal as string, q.options) === optionIndex(String(q.answer), q.options)
          : answersMatch(userVal, q.answer)
      if (correct) correctCount += 1
    })

    const band = rawScoreToIeltsBand(correctCount, totalQuestions, "listening")
    const outcome = { score: correctCount, total: totalQuestions, band }
    setIsSubmitted(true)
    clearPracticeSession("listening", test.slug)
    onComplete(outcome.score, outcome.total, band)
  }

  const handleAnswerChange = (qId: string, val: QuestionAnswer) => {
    if (isSubmitted) return
    const nextAnswers = { ...userAnswers, [qId]: Array.isArray(val) ? val.map(String) : String(val) }
    setUserAnswers(nextAnswers)
    savePracticeSession({
      skill: "listening",
      slug: test.slug,
      testId: test.id,
      title: test.title,
      startedAt: new Date().toISOString(),
      expiresAt,
      durationMinutes: test.durationMinutes || 30,
      listening: { answers: nextAnswers },
    })
  }

  const handleReset = () => {
    const exp = Date.now() + (test.durationMinutes || 30) * 60 * 1000
    setExpiresAt(exp)
    setUserAnswers({})
    setIsSubmitted(false)
    setActivePartIndex(0)
    savePracticeSession({
      skill: "listening",
      slug: test.slug,
      testId: test.id,
      title: test.title,
      startedAt: new Date().toISOString(),
      expiresAt: exp,
      durationMinutes: test.durationMinutes || 30,
      listening: { answers: {} },
    })
  }

  const handleSeek = (seconds: number) => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = seconds
      void audio.play().catch(() => undefined)
    }
  }

  const handleQuestionJump = (questionId: string, sectionIndex: number) => {
    setActivePartIndex(sectionIndex)
    setTimeout(() => {
      const el = document.getElementById(`question-wrapper-${questionId}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        const input = document.getElementById(`listening-input-${questionId}`)
        input?.focus()
      }
    }, 50)
  }

  const answeredCount = Object.values(userAnswers).filter((ans) => hasAnswer(ans)).length

  return (
    <div className="flex flex-col gap-5">
      {/* Shared unified session header */}
      <SessionHeader
        skillLabel="Listening"
        title={test?.title || "Listening Practice"}
        expiresAt={expiresAt}
        isRunning={!isSubmitted}
        onExpire={() => handleSubmit()}
        onReset={handleReset}
        showReset={isSubmitted}
        metaText="Academic & General"
      />

      {/* Quiet soft note if test data is below 40 questions */}
      {!completeness.isComplete && (
        <p className="text-[11px] font-mono text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-[2px] border border-border/50">
          Note: Preview dataset with {completeness.totalSections}/4 parts and {completeness.totalQuestions}/40 questions.
        </p>
      )}

      {/* Thin Audio Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 px-3 rounded-[3px] border border-border bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <Volume2 className="size-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium truncate">
            Part {activePartIndex + 1}: {currentSection?.title || "Audio Track"}
          </span>
        </div>

        {currentSection?.audioUrl ? (
          <audio
            ref={audioRef}
            key={currentSection.audioUrl}
            controls
            className="w-full sm:w-72 h-8 outline-none"
            src={currentSection.audioUrl}
          >
            Your browser does not support audio playback.
          </audio>
        ) : (
          <span className="text-[11px] font-mono text-muted-foreground italic">
            Audio stream available in full mock session
          </span>
        )}
      </div>

      {/* Main Worksurface: Instructions & Flattened Questions */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-[3px] border border-border bg-card p-4 sm:p-5">
          {/* Section Heading & Static Instructions */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded-[2px] bg-foreground text-background text-[11px] font-mono font-bold">
                Part {activePartIndex + 1}
              </span>
              <span>{currentSection?.title}</span>
            </h2>

            <span className="font-mono text-[11px] text-muted-foreground">
              {answeredCount}/{totalQuestions} Answered
            </span>
          </div>

          {currentSection?.instructions && (
            <p className="text-xs font-mono text-muted-foreground border-l-2 border-foreground/30 pl-2.5 py-0.5">
              {currentSection.instructions}
            </p>
          )}

          {currentSection?.audioTimestamp !== undefined && (
            <Button type="button" variant="outline" size="sm" onClick={() => handleSeek(currentSection.audioTimestamp!)} className="self-start font-mono">
              Listen from here ({Math.floor(currentSection.audioTimestamp! / 60)}:{String(currentSection.audioTimestamp! % 60).padStart(2, "0")})
            </Button>
          )}

          {currentSection?.examples?.map((example, index) => (
            <p key={`${example.prompt}-${index}`} className="rounded-[2px] border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Example:</span> {example.prompt}
            </p>
          ))}

          {currentSection?.grid && (
            <div className="overflow-x-auto rounded-[2px] border border-border">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-muted/40"><tr>{currentSection.grid.headers.map((header) => <th key={header} className="border-b border-border px-3 py-2 text-left font-mono">{header}</th>)}</tr></thead>
                <tbody>{currentSection.grid.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.cells.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="border-b border-border/60 px-3 py-2">{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}

          {/* Question List */}
          <div className="flex flex-col divide-y divide-border/60 pt-1">
            {currentQuestions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-6 text-center">
                No questions available for Part {activePartIndex + 1}.
              </p>
            ) : (
              currentQuestions.map((q) => {
                const val = userAnswers[q.id] || ""
                const isCorrect = isSubmitted && answersMatch(val, q.answer)
                const isWrong = isSubmitted && hasAnswer(val) && !isCorrect

                if (q.options?.length) {
                  const choiceValue = Array.isArray(val) ? val.map(Number) : val === "" ? undefined : Number(val)
                  return <ChoiceQuestion key={q.id} question={q} value={choiceValue} onChange={(newVal) => handleAnswerChange(q.id, newVal)} disabled={isSubmitted} isSubmitted={isSubmitted} />
                }

                return <InlineQuestionPrompt key={q.id} question={q} value={val} onChange={(newVal) => handleAnswerChange(q.id, newVal)} disabled={isSubmitted} isSubmitted={isSubmitted} isCorrect={isCorrect} isWrong={isWrong} />
              })
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-border">
            <Button
              type="submit"
              disabled={totalQuestions === 0 || isSubmitted}
              className="w-full h-9 text-xs font-mono rounded-[2px]"
            >
              Submit Listening Answers ({answeredCount}/{totalQuestions})
            </Button>
          </div>
        </div>

        {/* Unified sticky part and question jump controls */}
        {sections.length > 0 && (
          <UnifiedPartNavigator
            sections={sections}
            activePartIndex={activePartIndex}
            onSelectPart={setActivePartIndex}
            userAnswers={userAnswers}
            onQuestionClick={handleQuestionJump}
            isSubmitted={isSubmitted}
          />
        )}
      </form>
    </div>
  )
}
