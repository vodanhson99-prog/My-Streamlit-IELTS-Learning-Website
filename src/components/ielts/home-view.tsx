"use client"

import * as React from "react"
import { useSyncExternalStore } from "react"
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  PenTool,
  Play,
  Volume2,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  type AppProgress,
  type PracticeTest,
  type SkillType,
  averageReadingScore,
  averageWritingBand,
  averageListeningBand,
} from "@/lib/ielts"
import { getTestProgressStatus } from "@/lib/practice-session"

interface HomeViewProps {
  progress: AppProgress
  onNavigate: (tab: "home" | "coach" | "listening" | "reading" | "writing" | "explain" | "progress") => void
  onStartTest: (skill: SkillType, slug: string) => void
  onLoadTest?: (test: PracticeTest) => Promise<PracticeTest | null>
  listeningTests?: PracticeTest[]
  readingTests?: PracticeTest[]
  writingTests?: PracticeTest[]
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

const emptySubscribe = () => () => {}

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

interface SkillColumnProps {
  title: string
  skill: SkillType
  icon: React.ComponentType<{ className?: string }>
  tests: PracticeTest[]
  isHydrated: boolean
  loadingSlug: string | null
  onStart: (skill: SkillType, test: PracticeTest) => void
  onNavigate: (tab: "home" | "coach" | "listening" | "reading" | "writing" | "explain" | "progress") => void
}

const INITIAL_HOME_TESTS = 10

function SkillColumn({
  title,
  skill,
  icon: Icon,
  tests,
  isHydrated,
  loadingSlug,
  onStart,
  onNavigate,
}: SkillColumnProps) {
  const [visibleCount, setVisibleCount] = React.useState(INITIAL_HOME_TESTS)

  // ponytail: filter out tests that are doing or done so only fresh exercises appear
  const newTests = React.useMemo(() => {
    if (!isHydrated) return tests
    return tests.filter((t) => getTestProgressStatus(skill, t.slug) === "idle")
  }, [tests, skill, isHydrated])

  const visibleTests = React.useMemo(() => {
    return newTests.slice(0, visibleCount)
  }, [newTests, visibleCount])

  const hasMore = visibleCount < newTests.length
  const remainingCount = newTests.length - visibleCount

  return (
    <div className="flex flex-col gap-3 rounded-[3px] border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-4.5 rounded-[2px]">
            {newTests.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate(skill)}
          className="h-7 px-2 font-mono text-[10px] uppercase text-muted-foreground hover:text-foreground"
        >
          All tests <ArrowRight className="ml-1 size-3" />
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {newTests.length === 0 ? (
          <div className="rounded-[2px] border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
            No new exercises available.
          </div>
        ) : (
          <>
            {visibleTests.map((test) => {
              const isLoadingThis = loadingSlug === test.slug
              const duration = test.durationMinutes || (skill === "listening" ? 30 : 60)

              return (
                <Card
                  key={test.slug || test.id}
                  className="rounded-[2px] border-border/70 bg-background transition-colors hover:border-border"
                >
                  <CardHeader className="p-3 pb-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase">
                      <span>{test.module || "Academic"}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {duration}m
                      </span>
                    </div>
                    <CardTitle className="text-[13px] font-medium leading-snug line-clamp-2 pt-1">
                      {test.title}
                    </CardTitle>
                  </CardHeader>

                  <CardFooter className="p-3 pt-2 flex items-center justify-end border-t border-border/40">
                    <Button
                      size="sm"
                      disabled={Boolean(loadingSlug)}
                      onClick={() => onStart(skill, test)}
                      className="h-7 rounded-[2px] px-2.5 text-[11px] font-medium font-mono"
                    >
                      {isLoadingThis ? (
                        <>
                          <Loader2 className="mr-1.5 size-3 animate-spin" />
                          Loading…
                        </>
                      ) : (
                        <>
                          <Play className="mr-1.5 size-3" />
                          Start
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}

            {/* Load more "Xem tiếp" without pagination controls */}
            {hasMore ? (
              <div className="pt-2 flex flex-col items-center gap-1.5 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount((prev) => prev + INITIAL_HOME_TESTS)}
                  className="w-full h-8 rounded-[2px] text-[11px] font-mono border-dashed hover:border-foreground/40 gap-1"
                >
                  <span>Xem tiếp (+{Math.min(INITIAL_HOME_TESTS, remainingCount)} bài)</span>
                  <ChevronDown className="size-3" />
                </Button>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Đang hiện {visibleTests.length} / {newTests.length} bài mới
                </span>
              </div>
            ) : newTests.length > INITIAL_HOME_TESTS ? (
              <div className="pt-2 flex items-center justify-between border-t border-border/40 text-[10px] font-mono text-muted-foreground">
                <span>Đã hiển thị đủ {newTests.length} bài</span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setVisibleCount(INITIAL_HOME_TESTS)}
                  className="h-5 px-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground gap-1"
                >
                  <span>Thu gọn</span>
                  <ChevronUp className="size-2.5" />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export function HomeView({
  progress,
  onNavigate,
  onStartTest,
  onLoadTest,
  listeningTests = [],
  readingTests = [],
  writingTests = [],
}: HomeViewProps) {
  const isHydrated = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const [loadingSlug, setLoadingSlug] = React.useState<string | null>(null)

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

  const handleStart = async (skill: SkillType, test: PracticeTest) => {
    setLoadingSlug(test.slug)
    try {
      if (onLoadTest) {
        await onLoadTest(test)
      }
      onStartTest(skill, test.slug)
    } finally {
      setLoadingSlug(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          IELTS Practice Dashboard
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Progress and test library synchronized locally on this device.
        </p>
      </div>

      {/* 7-Day Chart (75%) + 4 Score Cards (25%) */}
      <section aria-label="Practice Activity and Scores" className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: 7-Day Chart (~75%) */}
        <Card className="lg:col-span-9 rounded-[3px] border border-border shadow-none flex flex-col justify-between">
          <CardHeader className="border-b border-border/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight">7-Day Practice Activity</CardTitle>
              <CardDescription className="text-[11px]">Sessions completed across Listening, Reading, and Writing.</CardDescription>
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground sm:mt-0">
              <Calendar className="size-3" aria-hidden="true" />
              <span>{activePastWeekSessions} session{activePastWeekSessions === 1 ? "" : "s"} logged</span>
            </div>
          </CardHeader>
          <CardContent className="px-3 pt-3 pb-1">
            <ChartContainer config={activityChartConfig} className="aspect-auto h-36 w-full">
              <BarChart accessibilityLayer data={activityData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="day" tickLine={false} tickMargin={6} axisLine={false} className="text-[10px] font-mono fill-muted-foreground" />
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
                <Bar dataKey="sessions" fill="var(--color-sessions)" radius={[2, 2, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="border-t border-border/80 px-4 py-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>Streak: {activePastWeekSessions} past 7d</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("progress")}
              className="h-6 px-1 text-[10px] font-mono hover:text-foreground"
            >
              History <ArrowRight className="ml-1 size-2.5" />
            </Button>
          </CardFooter>
        </Card>

        {/* Right: 4 Score Rectangles (~25%) */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-2.5">
          <div className="flex flex-col justify-center rounded-[3px] border border-border bg-card p-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">Listening</span>
            <span className="mt-0.5 text-xl font-mono font-medium tabular-nums">
              {listeningAvg !== null ? listeningAvg.toFixed(1) : "—"}
            </span>
          </div>

          <div className="flex flex-col justify-center rounded-[3px] border border-border bg-card p-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">Reading</span>
            <span className="mt-0.5 text-xl font-mono font-medium tabular-nums">
              {readingAvg !== null ? `${readingAvg.toFixed(0)}%` : "—"}
            </span>
          </div>

          <div className="flex flex-col justify-center rounded-[3px] border border-border bg-card p-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">Writing</span>
            <span className="mt-0.5 text-xl font-mono font-medium tabular-nums">
              {writingAvg !== null ? writingAvg.toFixed(1) : "—"}
            </span>
          </div>

          <div className="flex flex-col justify-center rounded-[3px] border border-border bg-card p-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">Sessions</span>
            <span className="mt-0.5 text-xl font-mono font-medium tabular-nums">
              {totalSessions}
            </span>
          </div>
        </div>
      </section>

      {/* 3 Columns: New exercises per skill */}
      <section aria-label="New Practice Tests" className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <SkillColumn
          title="Listening"
          skill="listening"
          icon={Volume2}
          tests={listeningTests}
          isHydrated={isHydrated}
          loadingSlug={loadingSlug}
          onStart={handleStart}
          onNavigate={onNavigate}
        />

        <SkillColumn
          title="Reading"
          skill="reading"
          icon={BookOpen}
          tests={readingTests}
          isHydrated={isHydrated}
          loadingSlug={loadingSlug}
          onStart={handleStart}
          onNavigate={onNavigate}
        />

        <SkillColumn
          title="Writing"
          skill="writing"
          icon={PenTool}
          tests={writingTests}
          isHydrated={isHydrated}
          loadingSlug={loadingSlug}
          onStart={handleStart}
          onNavigate={onNavigate}
        />
      </section>
    </div>
  )
}
