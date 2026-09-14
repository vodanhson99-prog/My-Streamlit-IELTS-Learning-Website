"use client"

import { PracticeSection } from "@/lib/ielts"

interface QuestionPaletteProps {
  sections: PracticeSection[]
  activeSectionIndex: number
  onSelectSection: (index: number) => void
  userAnswers: Record<string, string>
  onQuestionClick?: (questionId: string, sectionIndex: number) => void
  isSubmitted?: boolean
}

/**
 * Question Palette bar matching official mock test style.
 * Displays Part groupings, answered counts (e.g. "0 of 10 questions"),
 * and clickable question numbers with active & answered states.
 */
export function QuestionPalette({
  sections,
  activeSectionIndex,
  onSelectSection,
  userAnswers,
  onQuestionClick,
  isSubmitted = false,
}: QuestionPaletteProps) {
  return (
    <section
      aria-label="Question palette"
      className="question-palette w-full p-3 rounded-[3px] border border-border bg-card shadow-none"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sections.map((sec, secIdx) => {
          const isActive = secIdx === activeSectionIndex
          const qList = sec.questions || []
          const answeredInPart = qList.filter((q) => Boolean(userAnswers[q.id]?.trim())).length
          const totalInPart = qList.length

          return (
            <div
              key={sec.id || `part-${secIdx + 1}`}
              className={`flex flex-col gap-2 p-2.5 rounded-[2px] border transition-colors ${
                isActive
                  ? "border-foreground/60 bg-muted/30 ring-1 ring-foreground/20"
                  : "border-border/60 bg-background/50 hover:border-border"
              }`}
            >
              {/* Part title & status bar */}
              <div className="flex items-center justify-between gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => onSelectSection(secIdx)}
                  className={`font-semibold tracking-tight text-left hover:underline focus-visible:ring-1 focus-visible:ring-ring rounded-[2px] ${
                    isActive ? "text-foreground underline decoration-1" : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={isActive}
                >
                  Part {secIdx + 1}
                </button>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {answeredInPart}/{totalInPart} answered
                </span>
              </div>

              {/* Number items group */}
              <div className="flex flex-wrap gap-1 items-center">
                {qList.length === 0 ? (
                  <span className="text-[10px] font-mono text-muted-foreground/70 italic">No questions</span>
                ) : (
                  qList.map((q) => {
                    const isAnswered = Boolean(userAnswers[q.id]?.trim())
                    const isCorrect =
                      isSubmitted &&
                      (userAnswers[q.id] || "").trim().toLowerCase() === String(q.answer).trim().toLowerCase()
                    const isWrong = isSubmitted && isAnswered && !isCorrect

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          if (!isActive) onSelectSection(secIdx)
                          onQuestionClick?.(q.id, secIdx)
                        }}
                        aria-label={`Question ${q.number}${isAnswered ? ", answered" : ", unanswered"}`}
                        className={`size-6 rounded-[2px] font-mono text-[11px] flex items-center justify-center border transition-all cursor-pointer select-none ${
                          isCorrect
                            ? "bg-emerald-600 text-white border-emerald-600 font-semibold"
                            : isWrong
                            ? "bg-destructive text-destructive-foreground border-destructive font-semibold"
                            : isAnswered
                            ? "bg-primary text-primary-foreground border-primary font-medium"
                            : "bg-muted/60 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {q.number}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
