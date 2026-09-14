import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle } from "lucide-react"

interface CriterionCardProps {
  criterionId: string
  band: number
  descriptorId?: string
  evidence: readonly { readonly type: "positive" | "negative"; readonly quote: string; readonly rationale: string }[]
  blockers: readonly string[]
}

export function CriterionCard({
  criterionId,
  band,
  evidence,
  blockers,
}: CriterionCardProps) {
  const formattedName = criterionId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")

  return (
    <div className="rounded-[3px] border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <h3 className="text-sm font-semibold text-foreground">{formattedName}</h3>
        <Badge variant="outline" className="font-mono text-xs border-border">
          Band {band}
        </Badge>
      </div>

      {/* Evidence list */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase text-muted-foreground">Direct Evidence Quotes</span>
        {evidence.map((ev, i) => (
          <div
            key={i}
            className={`p-2.5 rounded-[2px] border text-xs leading-relaxed ${
              ev.type === "positive"
                ? "bg-emerald-500/5 border-emerald-500/20 text-foreground"
                : "bg-amber-500/5 border-amber-500/20 text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 font-mono text-[10px]">
              {ev.type === "positive" ? (
                <CheckCircle2 className="size-3 text-emerald-600" />
              ) : (
                <XCircle className="size-3 text-amber-600" />
              )}
              <span className={ev.type === "positive" ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                {ev.type === "positive" ? "Strength" : "Limitation"}
              </span>
            </div>
            <p className="italic font-serif">&ldquo;{ev.quote}&rdquo;</p>
            <p className="text-[10px] text-muted-foreground mt-1">{ev.rationale}</p>
          </div>
        ))}
      </div>

      {/* Next band blockers */}
      {blockers.length > 0 && (
        <div className="flex flex-col gap-1 pt-2 border-t border-border">
          <span className="text-[10px] font-mono uppercase text-muted-foreground">Blockers for Next Band</span>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
            {blockers.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
