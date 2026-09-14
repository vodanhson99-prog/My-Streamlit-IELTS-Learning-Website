"use client"

import * as React from "react"
import {
  ArrowRight,
  BookOpen,
  Calendar,
  GraduationCap,
  MessageSquare,
  PenTool,
  TrendingUp,
  Volume2,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  type AppProgress,
  averageReadingScore,
  averageWritingBand,
  averageListeningBand,
} from "@/lib/ielts"

interface HomeViewProps {
  progress: AppProgress
  onNavigate: (tab: "home" | "coach" | "listening" | "reading" | "writing" | "explain" | "progress") => void
}

interface DailyActivityPoint {
  dateKey: string
  day: string
  shortDate: string
  sessions: number
  listening: number
  reading: number
  writing: number
}

const activityChartConfig = {
  sessions: {
    label: "Total sessions",
    color: "var(--chart-1)",
  },
  listening: {
    label: "Listening",
    color: "var(--chart-2)",
  },
  reading: {
    label: "Reading",
    color: "var(--chart-3)",
  },
  writing: {
    label: "Writing",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

function formatLocalIsoDay(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function buildLast7DaysActivity(progress: AppProgress): DailyActivityPoint[] {
  const points: DailyActivityPoint[] = []
  const today = new Date()

  for (let i = 6; i >= 0; i -= 1) {
    const target = new Date(today)
    target.setDate(today.getDate() - i)
    target.setHours(0, 0, 0, 0)
    const dateKey = formatLocalIsoDay(target)
    const day = target.toLocaleDateString("en-US", { weekday: "short" })
    const shortDate = target.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    points.push({
      dateKey,
      day,
      shortDate,
      sessions: 0,
      listening: 0,
      reading: 0,
      writing: 0,
    })
  }

  const pointMap = new Map<string, DailyActivityPoint>()
  for (const point of points) {
    pointMap.set(point.dateKey, point)
  }

  const tallyRecords = (records: Array<{ timestamp: string }>, key: "listening" | "reading" | "writing") => {
    for (const item of records) {
      if (!item?.timestamp) continue
      const itemDate = new Date(item.timestamp)
      if (Number.isNaN(itemDate.getTime())) continue
      const targetKey = formatLocalIsoDay(itemDate)
      const targetPoint = pointMap.get(targetKey)
      if (targetPoint) {
        targetPoint[key] += 1
        targetPoint.sessions += 1
      }
    }
  }

  tallyRecords(progress.listening || [], "listening")
  tallyRecords(progress.reading || [], "reading")
  tallyRecords(progress.writing || [], "writing")

  return points
}

export function HomeView({ progress, onNavigate }: HomeViewProps) {
  const readingAvg = averageReadingScore(progress.reading || [])
  const writingAvg = averageWritingBand(progress.writing || [])
  const listeningAvg = averageListeningBand(progress.listening || [])
  const totalSessions =
    (progress.reading?.length || 0) +
    (progress.writing?.length || 0) +
    (progress.listening?.length || 0)

  const activityData = React.useMemo(() => buildLast7DaysActivity(progress), [progress])
  const activePastWeekSessions = React.useMemo(
    () => activityData.reduce((acc, curr) => acc + curr.sessions, 0),
    [activityData]
  )
  const maxDailySessions = React.useMemo(
    () => Math.max(1, ...activityData.map((d) => d.sessions)),
    [activityData]
  )

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="welcome-heading" className="border-b border-foreground pb-7">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div>
            <h1 id="welcome-heading" className="max-w-3xl text-4xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-5xl">
              IELTS Practice Dashboard
            </h1>
            <p className="mt-5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              Complete targeted listening, academic reading passages, and criteria-graded writing tasks.
              Your study records and daily consistency are kept locally in your browser.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => onNavigate("reading")}
                className="h-10 rounded-[2px] px-4 text-[11px] font-medium"
              >
                Choose a reading test
                <ArrowRight className="ml-2 size-3.5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigate("writing")}
                className="h-10 rounded-[2px] px-4 text-[11px] font-medium"
              >
                Practice writing
              </Button>
            </div>
          </div>

          <dl className="grid grid-cols-4 border-y border-border sm:grid-cols-4 lg:grid-cols-2">
            <div className="border-r border-border py-3 pr-3 lg:border-b">
              <dt className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">Listening</dt>
              <dd className="mt-1 text-xl font-mono font-medium tabular-nums">{listeningAvg !== null ? listeningAvg.toFixed(1) : "No score"}</dd>
            </div>
            <div className="border-r border-border py-3 px-3 lg:border-b lg:border-r-0">
              <dt className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">Reading</dt>
              <dd className="mt-1 text-xl font-mono font-medium tabular-nums">{readingAvg !== null ? `${readingAvg.toFixed(0)}%` : "No score"}</dd>
            </div>
            <div className="border-r border-border py-3 pr-3 pl-0 sm:pl-3 lg:border-r lg:pl-0">
              <dt className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">Writing</dt>
              <dd className="mt-1 text-xl font-mono font-medium tabular-nums">{writingAvg !== null ? writingAvg.toFixed(1) : "No score"}</dd>
            </div>
            <div className="py-3 pl-3 sm:pl-3">
              <dt className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">Sessions</dt>
              <dd className="mt-1 text-xl font-mono font-medium tabular-nums">{totalSessions}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="practice-heading">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="practice-heading" className="text-2xl font-semibold tracking-[-0.03em]">Choose your next practice</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">Pick one skill. Feedback appears as soon as you finish.</p>
          </div>
        </div>

        <div className="border-y border-foreground">
          <button
            type="button"
            onClick={() => onNavigate("reading")}
            className="group grid min-h-28 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-foreground px-4 py-5 text-left text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-background sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-[16px] font-medium tracking-tight">
                <BookOpen className="size-4" aria-hidden="true" />
                Reading practice
              </span>
              <span className="mt-1 block max-w-xl text-[11px] leading-relaxed text-background/65">Academic reading passages with 60m timer and answer review.</span>
            </span>
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-background/70">Start <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("listening")}
            className="group grid min-h-24 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-4 py-5 text-left transition-colors hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-[15px] font-medium tracking-tight"><Volume2 className="size-4" aria-hidden="true" />Listening practice</span>
              <span className="mt-1 block max-w-xl text-[11px] leading-relaxed text-muted-foreground">Standard 30m audio track with automated band computation.</span>
            </span>
            <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("writing")}
            className="group grid min-h-24 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-5 text-left transition-colors hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-[15px] font-medium tracking-tight"><PenTool className="size-4" aria-hidden="true" />Writing practice</span>
              <span className="mt-1 block max-w-xl text-[11px] leading-relaxed text-muted-foreground">Task 1 and Task 2 drafting with local auto-save and criteria analysis.</span>
            </span>
            <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>
      </section>

      <section aria-labelledby="activity-heading" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
        <Card className="rounded-none border-x-0 border-b border-t border-foreground py-0 shadow-none">
          <CardHeader className="border-b border-border px-0 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-0">
            <div>
              <CardTitle id="activity-heading" className="text-[15px] font-semibold tracking-tight">7-Day Practice Activity</CardTitle>
              <CardDescription className="mt-1 text-[11px]">Completed sessions across Listening, Reading, and Writing over the last 7 calendar days.</CardDescription>
            </div>
            <div className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground sm:mt-0">
              <Calendar className="size-3.5" aria-hidden="true" />
              <span>{activePastWeekSessions} session{activePastWeekSessions === 1 ? "" : "s"} logged</span>
            </div>
          </CardHeader>
          <CardContent className="px-0 py-4">
            <ChartContainer config={activityChartConfig} className="aspect-auto h-44 w-full">
              <BarChart accessibilityLayer data={activityData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="day" tickLine={false} tickMargin={8} axisLine={false} className="text-[11px] font-mono fill-muted-foreground" />
                <YAxis allowDecimals={false} domain={[0, Math.max(4, maxDailySessions)]} tickLine={false} axisLine={false} tickMargin={6} className="text-[10px] font-mono fill-muted-foreground" />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const point = payload?.[0]?.payload as DailyActivityPoint | undefined
                        return point ? `${point.shortDate} (${point.day})` : "Date"
                      }}
                      formatter={(val, name) => [
                        <span key="val" className="font-mono tabular-nums font-semibold">{val} session{Number(val) === 1 ? "" : "s"}</span>,
                        activityChartConfig[name as keyof typeof activityChartConfig]?.label ?? name,
                      ]}
                    />
                  }
                />
                <Bar dataKey="sessions" fill="var(--color-sessions)" radius={[2, 2, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex flex-col items-start justify-between gap-2 border-t border-border px-0 py-3 text-[11px] text-muted-foreground sm:flex-row sm:items-center">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-[1px] bg-foreground" aria-hidden="true" />
              {activePastWeekSessions > 0 ? `${activePastWeekSessions} total recorded practice tasks in the last 7 days` : "No practice logged in the last 7 days. Complete any test to track your streak."}
            </span>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("progress")} className="h-7 px-0 text-[11px] font-mono text-muted-foreground hover:text-foreground">
              View detailed progress <TrendingUp className="ml-1 size-3" />
            </Button>
          </CardFooter>
        </Card>

        <aside className="border-t border-foreground pt-4" aria-label="Practice record summary">
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{totalSessions}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">completed practice session{totalSessions === 1 ? "" : "s"} saved in this browser.</p>
          <Button variant="outline" size="sm" onClick={() => onNavigate("progress")} className="mt-5 h-8 rounded-[2px] px-3 text-[10px] font-mono uppercase tracking-[0.08em]">Open history</Button>
        </aside>
      </section>

      <section aria-labelledby="review-heading" className="border-t border-foreground pt-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="review-heading" className="text-2xl font-semibold tracking-[-0.03em]">Review tools</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">Use your results to decide what to practice next.</p>
          </div>
        </div>
        <div className="mt-4 grid border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-border">
          <button type="button" onClick={() => onNavigate("coach")} className="group flex min-h-24 items-center gap-3 border-b border-border py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground sm:border-b-0 sm:pr-6">
            <GraduationCap className="size-4 shrink-0" aria-hidden="true" />
            <span><span className="block text-[12px] font-medium">Writing criteria diagnosis</span><span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">Identify weakest scoring criterion across past drafts.</span></span>
            <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onNavigate("explain")} className="group flex min-h-24 items-center gap-3 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground sm:pl-6">
            <MessageSquare className="size-4 shrink-0" aria-hidden="true" />
            <span><span className="block text-[12px] font-medium">Answer explanation lookup</span><span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">Query detailed rationale for specific reading questions.</span></span>
            <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  )
}
