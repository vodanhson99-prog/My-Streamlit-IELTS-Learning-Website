import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EvaluationWarningProps {
  error?: string
  onRetry: () => void
  retryLabel?: string
}

export function EvaluationWarning({ error, onRetry, retryLabel = "Retry" }: EvaluationWarningProps) {
  return (
    <div role="alert" className="rounded-[3px] border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
      <AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />
      <div className="flex-1 text-xs">
        <p className="font-semibold text-foreground">Writing evaluation failed</p>
        <p className="text-muted-foreground mt-1">{error || "No band estimate was produced. Retry evaluation to try again."}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onRetry} className="h-7 text-[11px] rounded-[2px]">
        {retryLabel}
      </Button>
    </div>
  )
}
