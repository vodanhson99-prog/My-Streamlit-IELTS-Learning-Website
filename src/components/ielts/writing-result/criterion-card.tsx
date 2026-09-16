import { Badge } from "@/components/ui/badge"
import type { EvaluationEvidence } from "@/lib/ielts-evaluation/contracts"
import { CheckCircle2, XCircle } from "lucide-react"

interface CriterionCardProps {
  criterionId: string
  band: number
  descriptorId?: string
  supportingEvidence: readonly EvaluationEvidence[]
  limitingEvidence: readonly EvaluationEvidence[]
  blockers: readonly string[]
}

function anchorLabel(evidence: EvaluationEvidence): string {
  if (evidence.anchor.type === "span") return `“${evidence.anchor.quote}”`
  if (evidence.anchor.type === "paragraph") return `Paragraph ${evidence.anchor.paragraphIndex + 1}`
  return "Whole response"
}

export function CriterionCard({
  criterionId,
  band,
  supportingEvidence,
  limitingEvidence,
  blockers,
}: CriterionCardProps) {
  const formattedName = criterionId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
  const evidence = [
    ...supportingEvidence.map((item) => ({ item, kind: "supporting" as const })),
    ...limitingEvidence.map((item) => ({ item, kind: "limiting" as const })),
  ]

  return (
    <div className="rounded-[3px] border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <h3 className="text-sm font-semibold text-foreground">{formattedName}</h3>
        <Badge variant="outline" className="font-mono text-xs border-border">
          Band {band}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase text-muted-foreground">Descriptor Evidence</span>
        {evidence.map(({ item, kind }, index) => (
          <div
            key={`${kind}-${index}`}
            className={`p-2.5 rounded-[2px] border text-xs leading-relaxed ${
              kind === "supporting"
                ? "bg-emerald-500/5 border-emerald-500/20 text-foreground"
                : "bg-amber-500/5 border-amber-500/20 text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 font-mono text-[10px]">
              {kind === "supporting" ? (
                <CheckCircle2 className="size-3 text-emerald-600" />
              ) : (
                <XCircle className="size-3 text-amber-600" />
              )}
              <span className={kind === "supporting" ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                {kind === "supporting" ? "Strength" : "Limitation"}
              </span>
            </div>
            <p className="italic font-serif">{anchorLabel(item)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{item.rationale}</p>
          </div>
        ))}
      </div>

      {blockers.length > 0 ? (
        <div className="flex flex-col gap-1 pt-2 border-t border-border">
          <span className="text-[10px] font-mono uppercase text-muted-foreground">Blockers for Next Band</span>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
            {blockers.map((blocker, index) => (
              <li key={index}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
