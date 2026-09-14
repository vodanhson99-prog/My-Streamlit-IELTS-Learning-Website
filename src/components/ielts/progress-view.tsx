"use client"

import Link from "next/link"
import {
  BookOpen,
  PenTool,
  Volume2,
  Calendar,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { type AppProgress } from "@/lib/ielts"

interface ProgressViewProps {
  progress: AppProgress
  onClear: () => void
  onNavigateToReading: () => void
  onNavigateToWriting: () => void
  onNavigateToListening?: () => void
}

function SimpleSparkline({
  values,
  max = 100,
  label,
}: {
  values: number[]
  max?: number
  label: string
}) {
  if (values.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-[11px] font-mono text-muted-foreground border border-dashed border-border rounded-[2px]">
        No logged attempts
      </div>
    )
  }

  const width = 400
  const height = 90
  const padding = 12

  const points = values
    .map((v, i) => {
      const x =
        values.length === 1
          ? width / 2
          : padding + (i * (width - padding * 2)) / (values.length - 1)
      const clamped = Math.max(0, Math.min(v, max))
      const y = height - padding - (clamped / max) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(" ")

  return (
    <div className="w-full h-24 flex flex-col justify-end">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        role="img"
        aria-label={`${label}. ${values.length} recorded values. Latest ${values[values.length - 1]?.toFixed(1) ?? "not available"}.`}
      >
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="currentColor"
          className="text-border"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <polyline
          points={points}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {values.map((v, i) => {
          const x =
            values.length === 1
              ? width / 2
              : padding + (i * (width - padding * 2)) / (values.length - 1)
          const clamped = Math.max(0, Math.min(v, max))
          const y = height - padding - (clamped / max) * (height - padding * 2)
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2.5"
              fill="var(--background)"
              stroke="var(--foreground)"
              strokeWidth="1.5"
            />
          )
        })}
      </svg>
    </div>
  )
}

export function ProgressView({
  progress,
  onClear,
  onNavigateToReading,
  onNavigateToWriting,
  onNavigateToListening,
}: ProgressViewProps) {
  const readings = progress.reading || []
  const writings = progress.writing || []
  const listenings = progress.listening || []

  const readingPercentages = readings.map((r) => (r.score / r.total) * 100)
  const writingBands = writings.map((w) => Number(w.band_estimate)).filter(Number.isFinite)
  const listeningBands = listenings.map((l) => Number(l.band || 0)).filter(Number.isFinite)

  const hasAnyData = readings.length > 0 || writings.length > 0 || listenings.length > 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono rounded-[2px] border-border">
              Session Analytics
            </Badge>
            <span className="text-[11px] font-mono text-muted-foreground">Historical session data in localStorage</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight mt-1">Practice Tracker</h1>
        </div>

        {hasAnyData && (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="outline" size="sm" className="h-7 text-[11px] font-mono rounded-[2px] border-border text-muted-foreground hover:text-foreground">
                  <Trash2 className="size-3 mr-1" />
                  Clear data
                </Button>
              }
            />
            <AlertDialogContent className="rounded-[3px] border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base font-semibold">Reset session history?</AlertDialogTitle>
                <AlertDialogDescription className="text-[12px]">
                  This will clear listening, reading, and writing records from localStorage. This action cannot be reversed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-8 text-[11px] font-mono rounded-[2px]">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClear} className="h-8 text-[11px] font-mono rounded-[2px]">
                  Confirm reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Sparkline Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-[3px] border-border shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[13px] font-medium flex items-center gap-1.5">
                  <Volume2 className="size-3.5 text-foreground" />
                  Listening trajectory
                </CardTitle>
                <CardDescription className="text-[10px] font-mono mt-0.5">
                  Band conversion trend
                </CardDescription>
              </div>
              {onNavigateToListening && (
                <Button variant="ghost" size="sm" onClick={onNavigateToListening} className="text-[10px] font-mono h-6 px-1.5">
                  Practice
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-mono font-bold tabular-nums">
                {listeningBands.length
                  ? `Band ${listeningBands[listeningBands.length - 1].toFixed(1)}`
                  : "—"}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {listeningBands.length ? "Latest attempt" : "No logs"}
              </span>
            </div>
            <SimpleSparkline
              values={listeningBands}
              max={9}
              label="Listening band trend, scale 0 to 9"
            />
          </CardContent>
        </Card>

        <Card className="rounded-[3px] border-border shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[13px] font-medium flex items-center gap-1.5">
                  <BookOpen className="size-3.5 text-foreground" />
                  Reading trajectory
                </CardTitle>
                <CardDescription className="text-[10px] font-mono mt-0.5">
                  Accuracy percentage
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onNavigateToReading} className="text-[10px] font-mono h-6 px-1.5">
                Practice
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-mono font-bold tabular-nums">
                {readingPercentages.length
                  ? `${readingPercentages[readingPercentages.length - 1].toFixed(0)}%`
                  : "—"}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {readingPercentages.length ? "Latest attempt" : "No logs"}
              </span>
            </div>
            <SimpleSparkline
              values={readingPercentages}
              max={100}
              label="Reading accuracy trend, percentage scale from 0 to 100"
            />
          </CardContent>
        </Card>

        <Card className="rounded-[3px] border-border shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[13px] font-medium flex items-center gap-1.5">
                  <PenTool className="size-3.5 text-foreground" />
                  Writing trajectory
                </CardTitle>
                <CardDescription className="text-[10px] font-mono mt-0.5">
                  Estimated band score
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onNavigateToWriting} className="text-[10px] font-mono h-6 px-1.5">
                Practice
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-mono font-bold tabular-nums">
                {writingBands.length ? `Band ${writingBands[writingBands.length - 1].toFixed(1)}` : "—"}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {writingBands.length ? "Latest submission" : "No logs"}
              </span>
            </div>
            <SimpleSparkline
              values={writingBands}
              max={9}
              label="Writing band trend, band scale from 0 to 9"
            />
          </CardContent>
        </Card>
      </div>

      {/* Logged Sessions List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-[3px] border-border shadow-none">
          <CardHeader className="pb-2 border-b border-border">
            <CardTitle className="text-[12px] font-medium">Listening ({listenings.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {listenings.length === 0 ? (
              <p className="text-[11px] font-mono text-muted-foreground text-center py-5">
                No sessions recorded.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                {listenings.slice(-10).reverse().map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] font-mono p-2 rounded-[2px] border border-border bg-muted/20">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="size-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(l.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {l.slug ? (
                        <Link href={`/listening/${l.slug}/result`} className="font-medium truncate max-w-24 hover:underline text-emerald-700 dark:text-emerald-400">
                          {l.title || l.test_id}
                        </Link>
                      ) : (
                        <span className="font-medium truncate max-w-24">{l.title || l.test_id}</span>
                      )}
                    </div>
                    <Badge variant="default" className="font-mono text-[9px] h-4 py-0 px-1.5 rounded-[2px]">
                      {l.band.toFixed(1)} ({l.score}/{l.total})
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[3px] border-border shadow-none">
          <CardHeader className="pb-2 border-b border-border">
            <CardTitle className="text-[12px] font-medium">Reading ({readings.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {readings.length === 0 ? (
              <p className="text-[11px] font-mono text-muted-foreground text-center py-5">
                No sessions recorded.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                {readings.slice(-10).reverse().map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] font-mono p-2 rounded-[2px] border border-border bg-muted/20">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="size-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {r.slug ? (
                        <Link href={`/reading/${r.slug}/result`} className="font-medium truncate max-w-24 hover:underline text-emerald-700 dark:text-emerald-400">
                          {r.title || r.passage_id}
                        </Link>
                      ) : (
                        <span className="font-medium truncate max-w-24">{r.title || r.passage_id}</span>
                      )}
                    </div>
                    <Badge variant="secondary" className="font-mono text-[9px] h-4 py-0 px-1.5 rounded-[2px]">
                      {r.score}/{r.total} ({((r.score / r.total) * 100).toFixed(0)}%)
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[3px] border-border shadow-none">
          <CardHeader className="pb-2 border-b border-border">
            <CardTitle className="text-[12px] font-medium">Writing ({writings.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {writings.length === 0 ? (
              <p className="text-[11px] font-mono text-muted-foreground text-center py-5">
                No sessions recorded.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                {writings.slice(-10).reverse().map((w, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] font-mono p-2 rounded-[2px] border border-border bg-muted/20">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="size-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(w.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {w.slug ? (
                        <Link href={`/writing/${w.slug}/result`} className="truncate max-w-24 text-muted-foreground hover:underline text-emerald-700 dark:text-emerald-400">
                          ({w.title || w.source})
                        </Link>
                      ) : (
                        <span className="truncate max-w-24 text-muted-foreground">({w.title || w.source})</span>
                      )}
                    </div>
                    <Badge variant="default" className="font-mono text-[9px] h-4 py-0 px-1.5 rounded-[2px]">
                      Band {Number(w.band_estimate).toFixed(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
