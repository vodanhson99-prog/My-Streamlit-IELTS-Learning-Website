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
  const gridQuestionIds = new Set(
    currentSection?.grid?.rows.flatMap((row) => row.questionIds.filter((id): id is string => Boolean(id))) ?? [],
  )
  const standaloneQuestions = currentQuestions.filter((question) => !gridQuestionIds.has(question.id))

  const partNumber = activePartIndex + 1
  const partLabel = `Part ${partNumber}`
  const rawTitle = currentSection?.title?.trim() || ""
  const cleanedTitle = rawTitle.replace(new RegExp(`^${partLabel}\\s*[:\\-–—]?\\s*`, "i"), "").trim()

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

  const handleSeekRelative = (deltaSeconds: number) => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(audio.duration || Infinity, audio.currentTime + deltaSeconds))
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
            {partLabel}{cleanedTitle ? `: ${cleanedTitle}` : ""}
          </span>
        </div>

        {currentSection?.audioUrl ? (
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSeekRelative(-5)}
              className="h-8 px-2 rounded-[2px] border border-border bg-background text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              title="Replay 5 seconds"
              aria-label="Replay 5 seconds"
            >
              -5s
            </button>
            <audio
              ref={audioRef}
              key={currentSection.audioUrl}
              controls
              className="w-full sm:w-64 h-8 outline-none"
              src={currentSection.audioUrl}
            >
              Your browser does not support audio playback.
            </audio>
            <button
              type="button"
              onClick={() => handleSeekRelative(5)}
              className="h-8 px-2 rounded-[2px] border border-border bg-background text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              title="Forward 5 seconds"
              aria-label="Forward 5 seconds"
            >
              +5s
            </button>
          </div>
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
                {partLabel}
              </span>
              {cleanedTitle ? <span>{cleanedTitle}</span> : null}
            </h2>

            <span className="font-mono text-[11px] text-muted-foreground">
              {answeredCount}/{totalQuestions} Answered
            </span>
          </div>

          {currentSection?.instructions && (
            <div className="rounded-[3px] bg-muted/30 border border-border/80 px-3 py-2 text-xs font-medium text-muted-foreground leading-relaxed">
              {currentSection.instructions}
            </div>
          )}

          {currentSection?.audioUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSeek(currentSection.audioTimestamp ?? 0)}
              className="self-start text-xs font-medium rounded-[2px] h-7 px-2.5 gap-1.5 border-border hover:bg-muted font-mono"
            >
              <Volume2 className="size-3.5 text-muted-foreground" />
              Listen from here
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
                <tbody>
                  {currentSection.grid.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.cells.map((cell, cellIndex) => {
                        const questionId = row.questionIds[cellIndex]
                        const question = questionId ? currentQuestions.find((item) => item.id === questionId) : undefined
                        const value = question ? userAnswers[question.id] || "" : ""
                        const correct = Boolean(question && isSubmitted && answersMatch(value, question.answer))
                        const wrong = Boolean(question && isSubmitted && hasAnswer(value) && !correct)

                        return (
                          <td key={`${rowIndex}-${cellIndex}`} className={`border-b border-border/60 px-3 py-2 ${correct ? "bg-emerald-500/10" : wrong ? "bg-destructive/10" : ""}`}>
                            {question ? (
                              <label className="flex items-center gap-1.5 min-w-24">
                                <span className="font-mono text-[10px] text-muted-foreground">Q{question.number}</span>
                                <input
                                  aria-label={`Answer for Question ${question.number}`}
                                  value={Array.isArray(value) ? value.join(", ") : value}
                                  onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                                  disabled={isSubmitted}
                                  className="min-w-0 w-full border-b border-border bg-transparent px-1 py-0.5 text-xs outline-none focus:border-foreground disabled:opacity-60"
                                />
                              </label>
                            ) : cell}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Question List */}
          <div className="flex flex-col divide-y divide-border/60 pt-1">
            {standaloneQuestions.length === 0 ? (
              currentSection?.grid ? null : (
                <p className="text-xs text-muted-foreground italic py-6 text-center">
                  No questions available for {partLabel}.
                </p>
              )
            ) : (
              standaloneQuestions.map((q, qIndex) => {
                const val = userAnswers[q.id] || ""
                const isCorrect = isSubmitted && answersMatch(val, q.answer)
                const isWrong = isSubmitted && hasAnswer(val) && !isCorrect

                const prevQ = qIndex > 0 ? standaloneQuestions[qIndex - 1] : null
                const isFirstOfGroup = Boolean(
                  (q.group?.title && q.group.title !== prevQ?.group?.title) ||
                  (q.group?.instructions && q.group.instructions !== prevQ?.group?.instructions) ||
                  (q.group?.answerRange && q.number === q.group.answerRange[0]) ||
                  (qIndex > 0 && q.audioTimestamp !== undefined && q.audioTimestamp !== prevQ?.audioTimestamp)
                )

                const qTimestamp =
                  q.audioTimestamp ?? q.group?.audioTimestamp ?? currentSection?.audioTimestamp ?? 0

                return (
                  <div key={q.id} className="flex flex-col">
                    {isFirstOfGroup && (
                      <div className="pt-4 pb-1.5 flex flex-col gap-1 border-t border-border/40 mt-2 first:mt-0 first:border-t-0">
                        <div className="flex items-center justify-between gap-2">
                          {q.group?.title ? (
                            <h3 className="text-xs font-semibold text-foreground tracking-tight px-1 uppercase">
                              {q.group.title}
                            </h3>
                          ) : q.group?.answerRange ? (
                            <span className="text-[11px] font-mono font-semibold text-muted-foreground px-1 uppercase">
                              Questions {q.group.answerRange[0]}–{q.group.answerRange[1]}
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono font-semibold text-muted-foreground px-1">
                              Question {q.number}
                            </span>
                          )}

                          {currentSection?.audioUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSeek(qTimestamp)}
                              className="h-6 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted gap-1 rounded-[2px]"
                            >
                              <Volume2 className="size-3" />
                              Listen from here
                            </Button>
                          )}
                        </div>

                        {q.group?.instructions && (
                          <p className="mt-1 text-xs text-muted-foreground border-l-2 border-foreground/30 pl-2.5 py-0.5 italic">
                            {q.group.instructions}
                          </p>
                        )}
                      </div>
                    )}
                    {q.options?.length ? (
                      <ChoiceQuestion
                        question={q}
                        value={Array.isArray(val) ? val.map(Number) : val === "" ? undefined : Number(val)}
                        onChange={(newVal) => handleAnswerChange(q.id, newVal)}
                        disabled={isSubmitted}
                        isSubmitted={isSubmitted}
                        onListen={currentSection?.audioUrl ? () => handleSeek(qTimestamp) : undefined}
                      />
                    ) : (
                      <InlineQuestionPrompt
                        question={q}
                        value={val}
                        onChange={(newVal) => handleAnswerChange(q.id, newVal)}
                        disabled={isSubmitted}
                        isSubmitted={isSubmitted}
                        isCorrect={isCorrect}
                        isWrong={isWrong}
                        onListen={currentSection?.audioUrl ? () => handleSeek(qTimestamp) : undefined}
                      />
                    )}
                  </div>
                )
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
