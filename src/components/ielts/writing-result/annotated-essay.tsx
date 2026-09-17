"use client"

import { useMemo } from "react"
import type { ResolvedAnnotation } from "@/lib/ielts-evaluation/contracts"

interface AnnotatedEssayProps {
  essay: string
  annotations: readonly ResolvedAnnotation[]
  onSelectAnnotation?: (annotationId: string) => void
  selectedAnnotationId?: string
}

export function AnnotatedEssay({
  essay,
  annotations,
  onSelectAnnotation,
  selectedAnnotationId,
}: AnnotatedEssayProps) {
  // Sort resolved annotations by startOffset
  const validAnnotations = useMemo(() => {
    return annotations
      .filter(
        (a) =>
          a.status === "resolved" &&
          a.startOffset !== undefined &&
          a.endOffset !== undefined &&
          a.startOffset >= 0 &&
          a.endOffset > a.startOffset &&
          a.endOffset <= essay.length,
      )
      .sort((a, b) => a.startOffset! - b.startOffset!)
  }, [annotations, essay])

  // Split essay into plain text segments and highlighted spans
  const segments = useMemo(() => {
    const res: { text: string; annotation?: ResolvedAnnotation }[] = []
    let cursor = 0

    for (const anno of validAnnotations) {
      const start = anno.startOffset!
      const end = anno.endOffset!

      if (start > cursor) {
        res.push({ text: essay.slice(cursor, start) })
      }

      if (start >= cursor) {
        res.push({ text: essay.slice(start, end), annotation: anno })
        cursor = Math.max(cursor, end)
      }
    }

    if (cursor < essay.length) {
      res.push({ text: essay.slice(cursor) })
    }

    return res
  }, [essay, validAnnotations])

  return (
    <div className="rounded-[3px] border border-border bg-card p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <h3 className="text-sm font-semibold text-foreground">Interactive Annotated Essay</h3>
        <span className="text-[10px] font-mono text-muted-foreground">Click highlights to inspect feedback</span>
      </div>

      <div className="font-serif text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
        {segments.map((seg, idx) => {
          if (!seg.annotation) {
            return <span key={idx}>{seg.text}</span>
          }

          const isSelected = seg.annotation.id === selectedAnnotationId
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectAnnotation?.(seg.annotation!.id)}
              className={`text-left inline px-0.5 transition-colors cursor-pointer border-b ${
                isSelected
                  ? "bg-amber-300 text-black border-amber-600"
                  : "bg-amber-100/80 hover:bg-amber-200 text-foreground border-amber-400/60"
              }`}
              title={`${seg.annotation.label}: ${seg.annotation.rationale}`}
            >
              {seg.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
