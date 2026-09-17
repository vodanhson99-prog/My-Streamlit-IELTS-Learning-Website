"use client"

import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  type AppProgress,
  CRITERION_KEYS,
  averageWritingBand,
  calculateTrend,
} from "@/lib/ielts"

interface CoachViewProps {
  progress: AppProgress
  onNavigateToWriting: () => void
}

const CRITERION_TIPS: Record<string, string> = {
  task_achievement_band:
    "Address all prompt instructions directly with supporting evidence. Avoid broad unsupported assertions.",
  coherence_cohesion_band:
    "Organize in 4 discrete paragraphs. Use logical topic sentences and precise transitional devices.",
  lexical_resource_band:
    "Incorporate academic topic collocations and deliberate paraphrasing rather than direct repetition.",
  grammar_band:
    "Vary complex and simple sentence structures. Audit subject-verb agreement and punctuation on clauses.",
}

export function CoachView({ progress, onNavigateToWriting }: CoachViewProps) {
  const writings = progress.writing
  const bands = writings.map((w) => Number(w.band_estimate)).filter(Number.isFinite)
  const avgBand = averageWritingBand(writings)
  const trend = calculateTrend(bands)

  const criteriaStats = CRITERION_KEYS.map(([key, label, short]) => {
    const validScores = writings
      .map((w) => Number(w[key]))
      .filter((val) => Number.isFinite(val) && val > 0)

    const avg = validScores.length
      ? validScores.reduce((a, b) => a + b, 0) / validScores.length
      : null

    return {
      key,
      label,
      short,
      avg,
      count: validScores.length,
    }
  })

  const availableCriteria = criteriaStats.filter((c) => c.avg !== null)
  const weakest = availableCriteria.length
    ? [...availableCriteria].sort((a, b) => a.avg! - b.avg!)[0]
    : null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono rounded-[2px] border-border">
              Review · Analytics
            </Badge>
            <span className="text-[11px] font-mono text-muted-foreground">Writing performance insights</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight mt-1">Examiner Insights</h1>
        </div>

        <Button
          onClick={onNavigateToWriting}
          className="h-8 rounded-[2px] text-[11px] font-medium self-start"
        >
          <span>Practice Task 2</span>
          <ArrowRight className="size-3 ml-1.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Main Directive Card */}
        <Card className="md:col-span-8 bg-card rounded-[3px] border-border shadow-none flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Coaching Focus
                </span>
                <CardTitle className="text-lg font-semibold mt-1">
                  {weakest
                    ? `${weakest.label} requires targeted revision`
                    : bands.length
                    ? "Criterion-level data expanding"
                    : "Complete initial writing submission"}
                </CardTitle>
              </div>
              <div className="size-8 rounded-[2px] bg-muted flex items-center justify-center shrink-0">
                <Sparkles className="size-4 text-foreground" />
              </div>
            </div>
            <CardDescription className="text-[12px] mt-2 leading-relaxed text-muted-foreground">
              {weakest
                ? CRITERION_TIPS[weakest.key]
                : bands.length
                ? "More criterion-level results are needed before one weakness can be identified reliably."
                : "No scored writing data yet. Submit one essay to measure Task Achievement, Coherence, Vocabulary, and Grammar."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 p-2.5 rounded-[2px] bg-muted/40 border border-border text-[11px] font-mono">
              <CheckCircle2 className="size-3.5 text-foreground shrink-0" />
              <span>
                {weakest
                  ? "Apply the criterion guidance above in your next revision."
                  : "Next evidence needed: one complete Task 2 submission."}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Aggregate Band Metrics */}
        <Card className="md:col-span-4 rounded-[3px] border-border shadow-none">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Aggregate Writing</span>
            <CardTitle className="text-3xl font-mono font-bold mt-1 tabular-nums">
              {avgBand !== null ? avgBand.toFixed(1) : "—"}
            </CardTitle>
            <CardDescription className="text-[11px] font-mono">
              {trend ? `${trend} trajectory across ${writings.length} submissions` : `${writings.length} submissions recorded`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex flex-col gap-2 border-t border-border">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-muted-foreground">Recorded drafts:</span>
              <span className="font-semibold tabular-nums">{writings.length}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-muted-foreground">Criteria tracking:</span>
              <span className="font-semibold">{availableCriteria.length} / 4</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Criteria Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-1">
        {criteriaStats.map((item) => {
          const pct = item.avg !== null ? (item.avg / 9.0) * 100 : 0
          return (
            <Card key={item.key} className="rounded-[3px] border-border shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{item.short}</span>
                  <Badge variant="outline" className="text-[9px] font-mono py-0 h-4 px-1 rounded-[2px] border-border">
                    {item.count} samples
                  </Badge>
                </div>
                <CardTitle className="text-[13px] font-medium mt-1">{item.label}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-mono font-bold tabular-nums">
                  {item.avg !== null ? item.avg.toFixed(1) : "—"}
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <Progress value={pct} className="h-1.5 rounded-[1px]" />
                  <span className="text-[9px] font-mono text-muted-foreground self-end">
                    {item.avg !== null ? `${pct.toFixed(0)}% of Band 9` : "No data"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
