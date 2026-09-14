"use client"

import { PracticeSection, answersMatch, hasAnswer } from "@/lib/ielts"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface UnifiedPartNavigatorProps {
  sections: PracticeSection[]
  activePartIndex: number
  onSelectPart: (index: number) => void
  userAnswers: Record<string, string | string[]>
  onQuestionClick?: (questionId: string, sectionIndex: number) => void
  isSubmitted?: boolean
}

export function UnifiedPartNavigator({
  sections,
  activePartIndex,
  onSelectPart,
  userAnswers,
  onQuestionClick,
  isSubmitted = false,
}: UnifiedPartNavigatorProps) {
  const totalParts = sections.length
  const currentSection = sections[activePartIndex]
  const currentQuestions = currentSection?.questions || []

  return (
    <nav
      aria-label="Test parts and question navigator"
      className="sticky bottom-2 z-20 rounded-[4px] border border-border bg-background/95 backdrop-blur-md p-2.5 shadow-sm flex flex-col gap-2.5"
    >
      {/* Part tabs bar + Prev/Next controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => onSelectPart(Math.max(0, activePartIndex - 1))}
            disabled={activePartIndex === 0}
            className="size-8 rounded-[2px] border border-border inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Previous part"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            {sections.map((sec, idx) => {
              const isActive = idx === activePartIndex
              const qList = sec.questions || []
              const answered = qList.filter((q) => hasAnswer(userAnswers[q.id])).length

              return (
                <button
                  key={sec.id || `part-${idx + 1}`}
                  type="button"
                  onClick={() => onSelectPart(idx)}
                  className={`min-h-[32px] px-2.5 py-1 text-xs font-mono rounded-[2px] transition-colors flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? "bg-foreground text-background font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                  }`}
                  aria-pressed={isActive}
                >
                  <span>Part {idx + 1}</span>
                  <span className={`text-[10px] ${isActive ? "text-background/80" : "text-muted-foreground"}`}>
                    ({answered}/{qList.length})
                  </span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => onSelectPart(Math.min(totalParts - 1, activePartIndex + 1))}
            disabled={activePartIndex >= totalParts - 1}
            className="size-8 rounded-[2px] border border-border inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Next part"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <span className="hidden sm:inline text-[11px] font-mono text-muted-foreground shrink-0">
          Jump to question:
        </span>
      </div>

      {/* Direct Question Palette Jump */}
      {currentQuestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
          <span className="text-[10px] font-mono text-muted-foreground mr-1 sm:hidden">
            Part {activePartIndex + 1}:
          </span>
          {currentQuestions.map((q) => {
            const isAnswered = hasAnswer(userAnswers[q.id])
            const isCorrect = isSubmitted && answersMatch(userAnswers[q.id] || "", q.answer)
            const isWrong = isSubmitted && isAnswered && !isCorrect

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onQuestionClick?.(q.id, activePartIndex)}
                aria-label={`Question ${q.number}${isAnswered ? ", answered" : ", unanswered"}`}
                className={`min-w-[28px] h-7 px-1.5 rounded-[2px] font-mono text-[11px] flex items-center justify-center border transition-all select-none cursor-pointer ${
                  isCorrect
                    ? "bg-emerald-600 text-white border-emerald-600 font-semibold"
                    : isWrong
                    ? "bg-destructive text-destructive-foreground border-destructive font-semibold"
                    : isAnswered
                    ? "bg-primary text-primary-foreground border-primary font-medium"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                {q.number}
              </button>
            )
          })}
        </div>
      )}
    </nav>
  )
}
