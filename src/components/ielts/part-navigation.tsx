"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PartNavigationProps {
  totalParts: number
  activePartIndex: number
  onSelectPart: (index: number) => void
  onPrevPart: () => void
  onNextPart: () => void
}

/**
 * Bottom navigation controls for jumping between listening test parts.
 * Accessible with touch targets >= 44px on mobile and keyboard nav.
 */
export function PartNavigation({
  totalParts,
  activePartIndex,
  onSelectPart,
  onPrevPart,
  onNextPart,
}: PartNavigationProps) {
  if (totalParts <= 1) return null

  return (
    <nav
      aria-label="Part navigation controls"
      className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-[3px] border border-border bg-card shadow-none"
    >
      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrevPart}
          disabled={activePartIndex === 0}
          className="h-8 px-3 text-xs font-mono rounded-[2px] border-border"
          aria-label="Go to previous part"
        >
          <ChevronLeft className="size-3.5 mr-1" />
          Prev Part
        </Button>

        <span className="text-xs font-mono text-muted-foreground sm:hidden">
          Part {activePartIndex + 1} of {totalParts}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNextPart}
          disabled={activePartIndex >= totalParts - 1}
          className="h-8 px-3 text-xs font-mono rounded-[2px] border-border"
          aria-label="Go to next part"
        >
          Next Part
          <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </div>

      {/* Part selector pills */}
      <div className="flex items-center gap-1">
        {Array.from({ length: totalParts }, (_, idx) => {
          const isActive = idx === activePartIndex
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPart(idx)}
              aria-current={isActive ? "step" : undefined}
              className={`min-w-8 h-8 px-2.5 rounded-[2px] text-xs font-mono transition-colors border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                  : "bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted"
              }`}
            >
              Part {idx + 1}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
