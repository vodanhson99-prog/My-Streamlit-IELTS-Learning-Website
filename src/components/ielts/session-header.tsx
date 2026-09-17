"use client"

import { useEffect, useState } from "react"
import { RotateCcw, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PracticeTimer } from "./practice-timer"

interface SessionHeaderProps {
  skillLabel: string
  title: string
  expiresAt: number
  isRunning: boolean
  onExpire: () => void
  onReset?: () => void
  showReset?: boolean
  metaText?: string
}

export function SessionHeader({
  skillLabel,
  title,
  expiresAt,
  isRunning,
  onExpire,
  onReset,
  showReset = false,
  metaText,
}: SessionHeaderProps) {
  const [isExamMode, setIsExamMode] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement)
      setIsExamMode(isFull)
      if (isFull) {
        document.documentElement.classList.add("exam-mode")
      } else {
        document.documentElement.classList.remove("exam-mode")
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.documentElement.classList.remove("exam-mode")
    }
  }, [])

  const toggleExamMode = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.()
        setIsExamMode(true)
        document.documentElement.classList.add("exam-mode")
      } else {
        await document.exitFullscreen?.()
        setIsExamMode(false)
        document.documentElement.classList.remove("exam-mode")
      }
    } catch {
      // Fallback for browsers or embedded frames blocking native fullscreen
      setIsExamMode((prev) => {
        const next = !prev
        if (next) document.documentElement.classList.add("exam-mode")
        else document.documentElement.classList.remove("exam-mode")
        return next
      })
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
            {skillLabel}
          </span>
          {metaText && (
            <>
              <span className="text-muted-foreground/40" aria-hidden="true">·</span>
              <span className="text-[11px] font-mono text-muted-foreground">{metaText}</span>
            </>
          )}
        </div>
        <h1 className="text-xl font-semibold tracking-tight mt-0.5 truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={toggleExamMode}
          className={`min-h-[38px] px-2.5 rounded-[2px] border text-[11px] font-mono flex items-center gap-1.5 transition-colors select-none ${
            isExamMode
              ? "bg-foreground text-background border-foreground font-semibold"
              : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title={isExamMode ? "Exit Exam Mode (Esc)" : "Enter Exam Mode (Fullscreen)"}
          aria-label={isExamMode ? "Exit Exam Mode" : "Enter Exam Mode"}
        >
          {isExamMode ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          <span className="hidden xs:inline">{isExamMode ? "Exit Exam" : "Exam Mode"}</span>
        </button>

        <PracticeTimer
          expiresAt={expiresAt}
          isRunning={isRunning}
          onExpire={onExpire}
          label="Remaining"
        />

        {showReset && onReset && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="min-h-[38px] text-[11px] font-mono rounded-[2px] border-border"
          >
            <RotateCcw className="size-3 mr-1.5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}
