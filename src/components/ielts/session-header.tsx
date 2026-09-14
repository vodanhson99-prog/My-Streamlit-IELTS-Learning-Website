"use client"

import { RotateCcw } from "lucide-react"
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
