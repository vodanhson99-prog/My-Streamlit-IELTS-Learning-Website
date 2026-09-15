"use client"

import { useEffect, useRef, useState } from "react"
import { Maximize2, Minimize2, Highlighter, Eraser, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PracticeTest, answersMatch, hasAnswer, rawScoreToIeltsBand, selectedOptionsMatch } from "@/lib/ielts"
import { SessionHeader } from "./session-header"
import { ChoiceQuestion } from "./choice-question"
import { InlineQuestionPrompt } from "./inline-question-prompt"
import { UnifiedPartNavigator } from "./unified-part-navigator"
import {
  loadPracticeSession,
  savePracticeSession,
  clearPracticeSession,
} from "@/lib/practice-session"

const FONT_SIZES = {
  sm: { label: "A-", scale: "90%", class: "text-[12.5px] leading-relaxed" },
  base: { label: "A", scale: "100%", class: "text-[14px] leading-relaxed" },
  lg: { label: "A+", scale: "115%", class: "text-[16px] leading-relaxed" },
  xl: { label: "A++", scale: "130%", class: "text-[18px] leading-loose" },
} as const

type FontSizeKey = keyof typeof FONT_SIZES

interface ReadingViewProps {
  test: PracticeTest
  onComplete: (score: number, total: number, band: number) => void
  onNavigateToExplain?: () => void
}

export function ReadingView({
  test,
  onComplete,
}: ReadingViewProps) {
  const sections = test?.sections || []
  const allQuestions = sections.flatMap((s) => s.questions || [])
  const totalQuestions = allQuestions.length

  const articleRef = useRef<HTMLElement | null>(null)
  const [activePassageIndex, setActivePassageIndex] = useState<number>(0)
  const [mobileTab, setMobileTab] = useState<"passage" | "questions">("passage")
  const [isPassageExpanded, setIsPassageExpanded] = useState<boolean>(false)
  const [hasHighlights, setHasHighlights] = useState(false)
  const [selectionPopup, setSelectionPopup] = useState<{ top: number; left: number } | null>(null)
  const [reviewFilter, setReviewFilter] = useState<"all" | "mistakes">("all")

  const [fontSize, setFontSize] = useState<FontSizeKey>(() => {
    if (typeof window === "undefined") return "base"
    try {
      return (localStorage.getItem("ielts_reading_font_size") as FontSizeKey) || "base"
    } catch {
      return "base"
    }
  })

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

  // Dismiss highlight popup on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest?.(".highlight-popup")) return
      setSelectionPopup(null)
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [])

  const handleFontSizeChange = (key: FontSizeKey) => {
    setFontSize(key)
    try {
      localStorage.setItem("ielts_reading_font_size", key)
    } catch {
      // Ignore storage restrictions
    }
  }

  const handlePassageSelect = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !articleRef.current) {
      setSelectionPopup(null)
      return
    }

    const text = sel.toString().trim()
    if (!text || text.length === 0) {
      setSelectionPopup(null)
      return
    }

    if (!articleRef.current.contains(sel.anchorNode)) {
      setSelectionPopup(null)
      return
    }

    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    setSelectionPopup({
      top: Math.max(12, rect.top - 42),
      left: Math.max(16, rect.left + rect.width / 2),
    })
  }

  const applyHighlight = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      setSelectionPopup(null)
      return
    }

    try {
      const range = sel.getRangeAt(0)
      const mark = document.createElement("mark")
      mark.className = "bg-amber-300/60 dark:bg-amber-500/40 text-inherit rounded-[2px] px-0.5"
      range.surroundContents(mark)
      setHasHighlights(true)
    } catch {
      try {
        document.execCommand("hiliteColor", false, "#fef08a")
        setHasHighlights(true)
      } catch {
        // Fallback silently
      }
    }

    sel.removeAllRanges()
    setSelectionPopup(null)
  }

  const clearHighlights = () => {
    if (!articleRef.current) return
    const marks = articleRef.current.querySelectorAll("mark")
    marks.forEach((m) => {
      const parent = m.parentNode
      while (m.firstChild) {
        parent?.insertBefore(m.firstChild, m)
      }
      m.remove()
    })
    setHasHighlights(false)
    setSelectionPopup(null)
  }

  const currentSection = sections[activePassageIndex] || sections[0]
  const currentQuestions = currentSection?.questions || []
  const passageNumber = activePassageIndex + 1
  const passageLabel = `Passage ${passageNumber}`

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (totalQuestions === 0) return

    let correctCount = 0
    allQuestions.forEach((q) => {
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
    setActivePassageIndex(0)
    setReviewFilter("all")
    clearHighlights()
    savePracticeSession({
      skill: "reading",
      slug: test.slug,
      testId: test.id,
      title: test.title,
      startedAt: new Date().toISOString(),
      expiresAt,
      durationMinutes: test.durationMinutes || 60,
      reading: { answers: {} },
    })
  }

  const handleQuestionJump = (questionId: string, sectionIndex: number) => {
    setActivePassageIndex(sectionIndex)
    setMobileTab("questions")
    setTimeout(() => {
      const el = document.getElementById(`question-wrapper-${questionId}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        const input = el.querySelector("input") as HTMLElement | null
        input?.focus()
      }
    }, 60)
  }

  const answeredCount = Object.keys(selectedAnswers).filter((k) => hasAnswer(selectedAnswers[k])).length

  const passageMistakesCount = currentQuestions.filter((q) => {
    const userAns = selectedAnswers[q.id]
    return isSubmitted && hasAnswer(userAns) && !answersMatch(userAns, q.answer)
  }).length

  const displayedQuestions =
    isSubmitted && reviewFilter === "mistakes"
      ? currentQuestions.filter((q) => {
          const userAns = selectedAnswers[q.id]
          return hasAnswer(userAns) && !answersMatch(userAns, q.answer)
        })
      : currentQuestions

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

      {/* Floating Highlight Pill */}
      {selectionPopup && (
        <div
          className="highlight-popup fixed z-50 -translate-x-1/2 flex items-center gap-1 rounded-[2px] border border-border/90 bg-popover/95 backdrop-blur-md p-1 shadow-md"
          style={{ top: `${selectionPopup.top}px`, left: `${selectionPopup.left}px` }}
        >
          <button
            type="button"
            onClick={applyHighlight}
            className="flex items-center gap-1 px-2 py-1 rounded-[1px] bg-amber-400/90 text-amber-950 hover:bg-amber-400 text-xs font-mono font-medium select-none transition-colors"
          >
            <Highlighter className="size-3" />
            <span>Highlight</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectionPopup(null)}
            className="p-1 rounded-[1px] text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Dismiss"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

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
          {passageLabel} Text
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

      {/* Main Worksurface: Passage & Questions */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Passage */}
        <section
          aria-label="Reading passage text"
          className={`flex flex-col gap-3 rounded-[3px] border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-14 transition-all duration-300 ${
            isPassageExpanded
              ? "lg:col-span-8 xl:col-span-9"
              : "lg:col-span-7"
          } ${mobileTab === "questions" ? "hidden lg:flex" : "flex"}`}
        >
          {/* Passage Header Bar with Reader Tools */}
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded-[2px] bg-foreground text-background text-[11px] font-mono font-bold shrink-0">
                {passageLabel}
              </span>
              <h2 className="text-sm font-semibold text-foreground truncate">
                {currentSection?.title || "Reading Passage"}
              </h2>
            </div>

            {/* Reader Tools: Font Size Zoom & Focus Expand */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Clear Highlights button if active */}
              {hasHighlights && (
                <button
                  type="button"
                  onClick={clearHighlights}
                  className="h-6 px-1.5 rounded-[1px] font-mono text-[10px] text-muted-foreground hover:text-foreground border border-dashed border-border/80 hover:border-foreground/40 flex items-center gap-1 transition-colors"
                  title="Clear all highlights"
                >
                  <Eraser className="size-2.5" />
                  <span>Clear</span>
                </button>
              )}

              {/* Font Size Zoomer */}
              <div
                className="flex items-center rounded-[2px] border border-border/80 bg-muted/40 p-0.5"
                role="group"
                aria-label="Font size controls"
              >
                {(["sm", "base", "lg", "xl"] as FontSizeKey[]).map((key) => {
                  const isCur = fontSize === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleFontSizeChange(key)}
                      title={`Font size ${FONT_SIZES[key].scale}`}
                      className={`h-6 px-1.5 rounded-[1px] font-mono text-[10px] transition-colors select-none ${
                        isCur
                          ? "bg-background text-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      aria-pressed={isCur}
                    >
                      {FONT_SIZES[key].label}
                    </button>
                  )
                })}
              </div>

              {/* Expand / Collapse Passage Width Toggle (Desktop only) */}
              <button
                type="button"
                onClick={() => setIsPassageExpanded((prev) => !prev)}
                className="hidden lg:inline-flex size-7 items-center justify-center rounded-[2px] border border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={isPassageExpanded ? "Restore split view" : "Expand passage reading area"}
                aria-label={isPassageExpanded ? "Restore split view" : "Expand passage reading area"}
              >
                {isPassageExpanded ? (
                  <Minimize2 className="size-3.5" />
                ) : (
                  <Maximize2 className="size-3.5" />
                )}
              </button>

              <span className="text-[11px] font-mono text-muted-foreground pl-1 border-l border-border hidden sm:inline">
                {currentSection?.passageText ? `${currentSection.passageText.split(/\s+/).length} words` : "Text"}
              </span>
            </div>
          </div>

          <article
            ref={articleRef}
            onMouseUp={handlePassageSelect}
            onTouchEnd={handlePassageSelect}
            className={`prose prose-sm dark:prose-invert max-w-none text-foreground/90 font-serif leading-relaxed whitespace-pre-line lg:max-h-[calc(100vh-190px)] lg:overflow-y-auto pr-1 transition-all ${FONT_SIZES[fontSize].class}`}
          >
            {currentSection?.passageText || "No text available for this section."}
          </article>
        </section>

        {/* Right Column: Questions */}
        <section
          aria-label="Questions list"
          className={`flex flex-col gap-4 rounded-[3px] border border-border bg-card p-4 sm:p-5 transition-all duration-300 ${
            isPassageExpanded
              ? "lg:col-span-4 xl:col-span-3"
              : "lg:col-span-5"
          } ${mobileTab === "passage" ? "hidden lg:flex" : "flex"}`}
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-semibold text-foreground">
              {passageLabel} Questions
            </h2>
            {isSubmitted ? (
              <div className="flex items-center gap-1 p-0.5 rounded-[2px] bg-muted/60 border border-border text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setReviewFilter("all")}
                  className={`px-2 py-0.5 rounded-[1px] transition-colors ${
                    reviewFilter === "all"
                      ? "bg-background text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({currentQuestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter("mistakes")}
                  className={`px-2 py-0.5 rounded-[1px] transition-colors ${
                    reviewFilter === "mistakes"
                      ? "bg-destructive text-destructive-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Mistakes ({passageMistakesCount})
                </button>
              </div>
            ) : (
              <span className="text-[11px] font-mono text-muted-foreground">
                {answeredCount}/{totalQuestions} Answered
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4 divide-y divide-border/60">
            {displayedQuestions.length === 0 ? (
              <div className="rounded-[2px] border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                {isSubmitted && reviewFilter === "mistakes"
                  ? "No mistakes in this passage! Excellent accuracy."
                  : "No questions currently loaded for this passage."}
              </div>
            ) : (
              displayedQuestions.map((q) => {
                const isAnswered = hasAnswer(selectedAnswers[q.id])
                const isWrong = isSubmitted && isAnswered && !answersMatch(selectedAnswers[q.id], q.answer)

                if (q.options?.length) {
                  return (
                    <ChoiceQuestion
                      key={q.id}
                      question={q}
                      value={selectedAnswers[q.id]}
                      onChange={(answer) => handleSelectOption(q.id, answer)}
                      disabled={isSubmitted}
                      isSubmitted={isSubmitted}
                    />
                  )
                }

                return (
                  <InlineQuestionPrompt
                    key={q.id}
                    question={q}
                    value={String(selectedAnswers[q.id] ?? "")}
                    onChange={(answer) =>
                      handleSelectOption(q.id, Array.isArray(answer) ? answer.join(", ") : answer)
                    }
                    disabled={isSubmitted}
                    isSubmitted={isSubmitted}
                    isCorrect={isSubmitted && answersMatch(selectedAnswers[q.id] ?? "", q.answer)}
                    isWrong={isWrong}
                  />
                )
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

      {/* Unified Bottom Question Navigator Dock for Reading */}
      {sections.length > 0 && (
        <UnifiedPartNavigator
          sections={sections}
          activePartIndex={activePassageIndex}
          onSelectPart={setActivePassageIndex}
          userAnswers={selectedAnswers}
          onQuestionClick={handleQuestionJump}
          isSubmitted={isSubmitted}
          partPrefix="Passage"
        />
      )}
    </div>
  )
}
