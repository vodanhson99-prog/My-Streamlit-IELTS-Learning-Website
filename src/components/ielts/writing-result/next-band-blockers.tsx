import type { WritingCoaching } from "@/lib/ielts-evaluation/coaching/generate-coaching"
import { Target, ArrowUpRight } from "lucide-react"

interface NextBandBlockersProps {
  coaching?: WritingCoaching
}

export function NextBandBlockers({ coaching }: NextBandBlockersProps) {
  if (!coaching) return null

  return (
    <div className="rounded-[3px] border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Actionable Guidance & Next Band Plan</h3>
        </div>
        {coaching.targetBandPlan && (
          <span className="text-[10px] font-mono text-muted-foreground">
            Target: Band {coaching.targetBandPlan.targetBand}
          </span>
        )}
      </div>

      {/* Top 3 priorities */}
      <div className="flex flex-col gap-2.5">
        <span className="text-[10px] font-mono uppercase text-muted-foreground">Top Priorities</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {coaching.priorities.map((p, idx) => (
            <div key={idx} className="p-3 rounded-[2px] border border-border bg-muted/20 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold text-foreground">Priority #{idx + 1}</span>
                <ArrowUpRight className="size-3 text-muted-foreground" />
              </div>
              <p className="text-xs font-semibold text-foreground">{p.title}</p>
              <p className="text-xs text-muted-foreground leading-normal">{p.actionItem}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Direct blockers list */}
      {coaching.nextBandBlockers.length > 0 && (
        <div className="pt-2 border-t border-border flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase text-muted-foreground">Key Descriptors Holding Band Back</span>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
            {coaching.nextBandBlockers.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
