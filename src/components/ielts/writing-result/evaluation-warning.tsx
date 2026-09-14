import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface EvaluationWarningProps {
  message: string
}

export function EvaluationWarning({ message }: EvaluationWarningProps) {
  return (
    <Alert variant="destructive" className="rounded-[2px]">
      <AlertCircle className="size-4" />
      <AlertTitle className="text-xs font-mono">Evaluation Issue</AlertTitle>
      <AlertDescription className="text-xs">{message}</AlertDescription>
    </Alert>
  )
}
