import { Badge } from "@/components/ui/badge"
import { Sparkles, ShieldCheck, AlertCircle } from "lucide-react"

interface ScoreOverviewProps {
  taskType?: "task1" | "task2" | "both"
  overallBand: number
  task1Band?: number
  task2Band?: number
  stability?: "high" | "medium" | "low"
  summary?: string
}

export function ScoreOverview({
  taskType = "both",
  overallBand,
  task1Band,
  task2Band,
  stability = "high",
  summary,
}: ScoreOverviewProps) {
  const taskLabel = taskType === "both" ? "Tasks 1 & 2 Combined" : taskType === "task1" ? "Task 1" : "Task 2"

  return (
    <div className="rounded-[3px] border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
            Estimated Writing Evaluation
          </span>
          <h2 className="text-sm font-semibold text-foreground mt-0.5">
            Estimated {taskLabel} Band
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {stability === "high" ? (
            <Badge variant="outline" className="text-[10px] font-mono border-border gap-1 text-emerald-600 bg-emerald-500/10">
              <ShieldCheck className="size-3" /> High Stability
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] font-mono border-border gap-1 text-amber-600 bg-amber-500/10">
              <AlertCircle className="size-3" /> Adjudicated Score
            </Badge>
          )}
        </div>
      </div>

      <div className="rounded-[2px] border border-border bg-muted/30 p-4 flex items-center justify-between">
        <div>
          <div className="text-3xl font-mono font-bold tabular-nums">
            Band {overallBand.toFixed(1)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-lg leading-relaxed">
            {summary || `Estimated score based on four IELTS ${taskLabel} criteria.`}
            {taskType === "both" && (task1Band !== undefined || task2Band !== undefined) && (
              <span className="block mt-1">
                {task1Band !== undefined && `Estimated Task 1 Band ${task1Band.toFixed(1)}`}
                {task1Band !== undefined && task2Band !== undefined && " · "}
                {task2Band !== undefined && `Estimated Task 2 Band ${task2Band.toFixed(1)}`}
              </span>
            )}
          </p>
        </div>
        <div className="size-9 rounded-[2px] bg-background border border-border flex items-center justify-center shrink-0">
          <Sparkles className="size-4 text-foreground" />
        </div>
      </div>
    </div>
  )
}
