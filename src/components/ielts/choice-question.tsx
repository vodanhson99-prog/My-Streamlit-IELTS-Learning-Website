"use client"

import { Volume2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { UniversalQuestion, hasAnswer, optionIsCorrect, selectedOptionsMatch } from "@/lib/ielts"

interface ChoiceQuestionProps {
  question: UniversalQuestion
  value: number | number[] | string | undefined
  onChange: (value: number | number[]) => void
  disabled?: boolean
  isSubmitted?: boolean
  onListen?: () => void
}

export function ChoiceQuestion({ question, value, onChange, disabled, isSubmitted, onListen }: ChoiceQuestionProps) {
  const options = question.options || []
  const multiple = question.type === "multiple_choice"
  const selected = Array.isArray(value) ? value : typeof value === "number" ? [value] : []
  const wrong = Boolean(isSubmitted && hasAnswer(value) && (multiple ? !selectedOptionsMatch(selected, question.answer, options) : !optionIsCorrect(selected[0], question.answer, options)))

  const toggle = (index: number) => {
    const next = selected.includes(index) ? selected.filter((item) => item !== index) : [...selected, index]
    if (next.length <= (question.group?.maxAnswers || options.length)) onChange(next)
  }

  return (
    <div id={`question-wrapper-${question.id}`} className="flex flex-col gap-2 py-3 first:pt-0">
      <div className="flex items-start gap-1.5 text-xs font-medium leading-snug text-foreground">
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">Q{question.number}.</span>
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
            className="inline-flex items-center justify-center size-5 shrink-0 rounded-[2px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Volume2 className="size-3" />
          </button>
        )}
        <span>{question.prompt}</span>
      </div>
      {multiple && <p className="text-[10px] font-mono text-muted-foreground">Choose {question.group?.maxAnswers || "all that apply"}.</p>}
      {multiple ? (
        <div className="grid gap-1.5">
          {options.map((option, index) => {
            const checked = selected.includes(index)
            const correct = Boolean(isSubmitted && optionIsCorrect(index, question.answer, options))
            return (
              <label key={option} className={`flex cursor-pointer items-center gap-2.5 rounded-[2px] px-2.5 py-1.5 text-xs ${correct ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : checked && wrong ? "bg-destructive/10 text-destructive" : "hover:bg-muted/50"}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(index)} disabled={disabled} className="size-3.5 accent-primary" />
                <span>{option}</span>
              </label>
            )
          })}
        </div>
      ) : (
        <RadioGroup value={typeof value === "number" ? String(value) : ""} onValueChange={(next) => onChange(Number(next))} disabled={disabled} className="gap-1.5">
          {options.map((option, index) => {
            const checked = value === index
            const correct = Boolean(isSubmitted && optionIsCorrect(index, question.answer, options))
            return (
              <div key={option} className={`flex items-center gap-2.5 rounded-[2px] px-2.5 py-1.5 text-xs ${correct ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : checked && wrong ? "bg-destructive/10 text-destructive" : "hover:bg-muted/50"}`}>
                <RadioGroupItem value={String(index)} id={`${question.id}-${index}`} className="size-3.5" />
                <Label htmlFor={`${question.id}-${index}`} className="flex-1 cursor-pointer text-xs font-normal">{option}</Label>
              </div>
            )
          })}
        </RadioGroup>
      )}
    </div>
  )
}
