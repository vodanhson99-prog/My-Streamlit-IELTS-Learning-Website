"use client"

import { Volume2 } from "lucide-react"
import { UniversalQuestion } from "@/lib/ielts"

interface InlineQuestionPromptProps {
  question: UniversalQuestion
  value: string | string[]
  onChange: (value: string | string[]) => void
  disabled?: boolean
  isSubmitted?: boolean
  isCorrect?: boolean
  isWrong?: boolean
  onListen?: () => void
}

/**
 * Clean inline question prompt for practice view.
 * Embeds input directly within sentence blanks or sits inline.
 * Minimalist borderless styling with underline input to eliminate visual nesting.
 */
export function InlineQuestionPrompt({
  question,
  value,
  onChange,
  disabled = false,
  isSubmitted = false,
  isCorrect = false,
  isWrong = false,
  onListen,
}: InlineQuestionPromptProps) {
  const promptText = question.prompt.trim()
  const inputValue = Array.isArray(value) ? value.join(", ") : value

  // Detect blank pattern: e.g. "___", "[...]", "...", "[blank]", "[input]"
  const blankRegex = /(\[input\]|\[blank\]|\[\.+\]|_{2,}|\.{3,})/i
  const match = promptText.match(blankRegex)

  const inputId = `listening-input-${question.id}`

  const inputElem = (
    <span className="inline-flex items-center mx-1 align-baseline">
      <input
        id={inputId}
        type="text"
        value={inputValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={`Answer for Question ${question.number}`}
        placeholder={`(${question.number})`}
        className={`h-8 px-2 py-0.5 text-xs font-mono rounded-[2px] border-b-2 transition-colors outline-none w-36 sm:w-44 focus-visible:ring-1 focus-visible:ring-ring ${
          isCorrect
            ? "border-b-emerald-600 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
            : isWrong
            ? "border-b-destructive bg-destructive/10 text-destructive dark:text-red-200"
            : "border-b-foreground/40 bg-muted/40 hover:border-b-foreground text-foreground"
        }`}
      />
    </span>
  )

  let content = null
  if (match && match.index !== undefined) {
    const before = promptText.slice(0, match.index)
    const after = promptText.slice(match.index + match[0].length)
    content = (
      <>
        <span>{before}</span>
        {inputElem}
        <span>{after}</span>
      </>
    )
  } else {
    content = (
      <>
        <span>{promptText}</span>
        {inputElem}
      </>
    )
  }

  return (
    <div
      id={`question-wrapper-${question.id}`}
      className={`py-2.5 px-3 rounded-[2px] transition-colors text-xs ${
        isCorrect
          ? "bg-emerald-500/5"
          : isWrong
          ? "bg-destructive/5"
          : "hover:bg-muted/30"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="flex-1 font-medium text-foreground leading-relaxed cursor-pointer">
          <span className="inline-block px-1.5 py-0.5 mr-1 font-mono text-[11px] font-semibold rounded-[2px] bg-muted text-muted-foreground border border-border">
            Q{question.number}
          </span>
          {onListen && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onListen()
              }}
              title="Listen from here"
              aria-label={`Listen to Question ${question.number}`}
              className="inline-flex items-center justify-center size-5 mr-1.5 align-middle rounded-[2px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Volume2 className="size-3" />
            </button>
          )}
          {content}
        </label>

        {isSubmitted && (
          <div className="shrink-0 font-mono text-[11px] font-medium pt-1 sm:pt-0">
            {isCorrect ? (
              <span className="text-emerald-600 flex items-center gap-1">✓ Correct</span>
            ) : (
              <span className="text-destructive font-mono">Ans: {String(question.answer)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
