"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PracticeTimerProps {
  expiresAt: number
  isRunning: boolean
  onExpire?: () => void
  label?: string
}

export function PracticeTimer({
  expiresAt,
  isRunning,
  onExpire,
  label = "Remaining",
}: PracticeTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  })

  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        onExpire?.()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, isRunning, onExpire])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const isLowTime = secondsLeft < 300 // under 5 mins

  return (
    <div className="flex items-center gap-1.5">
      <Badge
        variant={isLowTime ? "destructive" : "secondary"}
        className="font-mono text-xs px-2.5 py-1 flex items-center gap-1.5"
      >
        <Clock className="size-3.5" />
        <span className="text-[11px] font-medium text-muted-foreground mr-0.5">{label}:</span>
        <span className="font-bold" suppressHydrationWarning>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </span>
      </Badge>
    </div>
  )
}
