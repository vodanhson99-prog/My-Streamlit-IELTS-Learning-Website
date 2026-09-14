"use client"

import { useEffect, useState } from "react"

interface TypingTextProps {
  text: string
  speedMs?: number
  className?: string
  showCaret?: boolean
  onComplete?: () => void
}

/**
 * Reusable character-by-character typing animation.
 * Features:
 * - Reduced motion support (immediate display)
 * - Accessible screen reader structure (hidden full text for assistive tech, visual animated span)
 * - Safe reset when text prop changes
 */
export function TypingText({
  text,
  speedMs = 18,
  className = "",
  showCaret = true,
  onComplete,
}: TypingTextProps) {
  const [displayedCount, setDisplayedCount] = useState(() => {
    if (!text) return 0
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return text.length
    }
    return 0
  })

  useEffect(() => {
    if (!text) return

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (prefersReducedMotion) {
      onComplete?.()
      return
    }

    const interval = setInterval(() => {
      setDisplayedCount((prev) => {
        if (prev >= text.length) {
          clearInterval(interval)
          onComplete?.()
          return prev
        }
        return prev + 1
      })
    }, Math.max(10, speedMs))

    return () => clearInterval(interval)
  }, [text, speedMs, onComplete])

  const isComplete = displayedCount >= text.length

  return (
    <span className={className}>
      {/* Screen reader always reads full uninterrupted text immediately */}
      <span className="sr-only">{text}</span>
      {/* Visual representation */}
      <span aria-hidden="true">
        {text.slice(0, displayedCount)}
        {showCaret && !isComplete && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-primary animate-typing-caret" />
        )}
      </span>
    </span>
  )
}
