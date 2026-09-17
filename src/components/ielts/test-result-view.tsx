"use client"

import { TestResultPayload } from "@/lib/ielts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, RotateCcw, ArrowLeft, Calendar, Sparkles } from "lucide-react"

interface TestResultViewProps {
  result: TestResultPayload
  onRetake: () => void
  onBackToPanel: () => void
}

export function TestResultView({ result, onRetake, onBackToPanel }: TestResultViewProps) {
  const skillLabel = result.skill === "listening" ? "Listening" : result.skill === "reading" ? "Reading" : "Writing"

  return (
    <div className="max-w-2xl mx-auto my-6 flex flex-col gap-4">
      <Card className="rounded-[3px] border-border shadow-none">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-mono rounded-[2px] border-border capitalize">
              IELTS {skillLabel} Result
            </Badge>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <Calendar className="size-3" />
              <span>{new Date(result.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
          <CardTitle className="text-xl font-semibold mt-2">{result.title}</CardTitle>
          <CardDescription className="text-[11px]">
            Performance summary calculated according to official IELTS band rubrics.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 flex flex-col gap-4">
          {/* Main Band Display */}
          <div className="rounded-[2px] border border-border bg-muted/40 p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Final Estimated Band
              </span>
              <div className="text-3xl font-mono font-bold mt-0.5 tabular-nums">
                Band {result.band.toFixed(1)}
              </div>
              {result.total !== undefined && result.score !== undefined && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  Accuracy: {result.score} / {result.total} questions ({((result.score / result.total) * 100).toFixed(0)}%)
                </span>
              )}
            </div>
            <div className="size-8 rounded-[2px] bg-background border border-border flex items-center justify-center">
              <Sparkles className="size-4 text-foreground" />
            </div>
          </div>

          {/* Writing breakdown if present */}
          {result.overallTip && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[12px] font-medium">Examiner tip</h3>
              <div className="p-3 rounded-[2px] border border-border bg-muted/20 text-[11px] leading-relaxed whitespace-pre-wrap">
                {result.overallTip}
              </div>
            </div>
          )}

          {/* Tips / Guidance */}
          <div className="p-3 rounded-[2px] border border-border bg-muted/20 flex items-start gap-2.5">
            <CheckCircle2 className="size-3.5 text-foreground mt-0.5 shrink-0" />
            <div className="text-[11px]">
              <span className="font-semibold text-foreground block">Session recorded</span>
              <p className="text-muted-foreground mt-0.5 leading-normal">
                This result has been automatically stored in your browser history and incorporated into your progress analytics.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-t border-border pt-3 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToPanel}
            className="h-7 text-[11px] font-mono rounded-[2px] border-border"
          >
            <ArrowLeft className="size-3 mr-1.5" />
            Back to library
          </Button>

          <Button
            size="sm"
            onClick={onRetake}
            className="h-7 text-[11px] font-medium rounded-[2px]"
          >
            <RotateCcw className="size-3 mr-1.5" />
            Retake this test
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
