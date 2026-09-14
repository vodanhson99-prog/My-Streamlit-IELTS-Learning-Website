import { Badge } from "@/components/ui/badge"
import type { ResolvedAnnotation } from "@/lib/ielts-evaluation/contracts"

interface AnnotationDetailProps {
  annotation?: ResolvedAnnotation
  onAskTutor?: (annotationId: string) => void
}

export function AnnotationDetail({ annotation, onAskTutor }: AnnotationDetailProps) {
  if (!annotation) {
    return (
      <div className="rounded-[3px] border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        Select a highlighted phrase in the essay above to inspect examiner feedback.
      </div>
    )
  }

  return (
    <div className="rounded-[3px] border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-[10px] font-mono uppercase text-muted-foreground">Annotation Detail</span>
        <Badge variant="outline" className="text-[10px] font-mono border-border">
          {annotation.label}
        </Badge>
      </div>

      <div>
        <p className="text-xs font-serif italic text-foreground">&ldquo;{annotation.quote}&rdquo;</p>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{annotation.rationale}</p>
      </div>

      {onAskTutor && (
        <div className="pt-2 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={() => onAskTutor(annotation.id)}
            className="text-xs font-mono text-foreground underline hover:text-muted-foreground"
          >
            Ask Tutor about this highlight &rarr;
          </button>
        </div>
      )}
    </div>
  )
}
