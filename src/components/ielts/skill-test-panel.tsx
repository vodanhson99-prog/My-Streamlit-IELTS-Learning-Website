"use client"

import { useSyncExternalStore } from "react"
import { PracticeTest, SkillType } from "@/lib/ielts"
import { getTestProgressStatus, type TestProgressStatus } from "@/lib/practice-session"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Clock, ExternalLink, Play, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react"

const emptySubscribe = () => () => {}

interface SkillTestPanelProps {
  skill: SkillType
  tests: PracticeTest[]
  onStartTest: (slug: string) => void
  onLoadTest?: (test: PracticeTest) => Promise<PracticeTest | null>
  catalogSource?: string
}

export function SkillTestPanel({
  skill,
  tests,
  onStartTest,
  onLoadTest,
  catalogSource,
}: SkillTestPanelProps) {
  const skillLabel = skill === "listening" ? "Listening" : skill === "reading" ? "Reading" : "Writing"

  // Check client hydration via useSyncExternalStore (SSR=false, Client=true) to prevent mismatch
  const isHydrated = useSyncExternalStore(emptySubscribe, () => true, () => false)

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono rounded-[2px] border-border capitalize">
              IELTS {skillLabel}
            </Badge>
            <span className="text-[11px] font-mono text-muted-foreground">
              {tests.length} authentic test{tests.length === 1 ? "" : "s"} available
            </span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight mt-1">Practice Library</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Start a test. Progress saves on this device.
          </p>
        </div>

        {catalogSource && (
          <Badge variant="secondary" className="text-[10px] font-mono rounded-[2px] self-start sm:self-auto">
            {catalogSource === "live" ? "iot: live" : "iot: cached"}
          </Badge>
        )}
      </div>

      {/* Cards listing */}
      {tests.length === 0 ? (
        <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-[3px]">
          No practice tests found for this section.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tests.map((t) => {
            const status: TestProgressStatus = isHydrated ? getTestProgressStatus(skill, t.slug) : "idle"
            const isDoing = status === "doing"
            const isDone = status === "done"

            const totalQuestions =
              t.sections?.reduce((acc, s) => acc + (s.questions?.length || 0), 0) || 0

            return (
              <Card
                key={t.slug || t.id}
                className="flex flex-col justify-between rounded-[3px] transition-colors border-border hover:border-border/80 bg-card"
              >
                <CardHeader className="pb-3 border-b border-border/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                      {t.module ? `${t.module}` : "Academic"}
                    </span>

                    {/* Progress indicator badge */}
                    {isDoing && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] font-mono px-1.5 py-0 h-4.5 bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 gap-1"
                      >
                        <span className="size-1.5 rounded-full bg-amber-600 dark:bg-amber-400 animate-pulse" />
                        Doing
                      </Badge>
                    )}
                    {isDone && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] font-mono px-1.5 py-0 h-4.5 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 gap-1"
                      >
                        <CheckCircle2 className="size-2.5" />
                        Done
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm font-semibold leading-snug line-clamp-2 mt-1">
                    {t.title}
                  </CardTitle>
                  <CardDescription className="text-[11px] font-mono text-muted-foreground flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="flex items-center gap-1 text-foreground">
                      <Clock className="size-3 text-muted-foreground" />
                      {t.durationMinutes || (skill === "listening" ? 30 : 60)}m
                    </span>
                    <span>·</span>
                    <span>
                      {t.sections?.length || 0} {skill === "listening" ? "parts" : "sections"}
                    </span>
                    {totalQuestions > 0 ? (
                      <>
                        <span>·</span>
                        <span>{totalQuestions} questions</span>
                      </>
                    ) : (
                      <>
                        <span>·</span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">Catalog preview</span>
                      </>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-3 pb-2 flex flex-col gap-2">
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {t.sections?.[0]?.instructions ||
                      "IELTS practice test with timed session and automated score conversion."}
                  </p>
                </CardContent>

                <CardFooter className="pt-2 pb-3 border-t border-border/60 flex items-center justify-between gap-2">
                  {t.sourceUrl ? (
                    <a
                      href={t.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-[1px] p-0.5"
                    >
                      <span>source</span>
                      <ExternalLink className="size-2.5" />
                    </a>
                  ) : (
                    <span />
                  )}

                  <Button
                    size="sm"
                    onClick={() => {
                      void (onLoadTest ? onLoadTest(t).then(() => onStartTest(t.slug)) : onStartTest(t.slug))
                    }}
                    className="min-h-9 sm:min-h-8 text-[11px] font-medium rounded-[2px] px-3 bg-foreground text-background hover:bg-foreground/90"
                  >
                    {isDoing ? (
                      <>
                        Continue
                        <ArrowRight className="size-3 ml-1" />
                      </>
                    ) : isDone ? (
                      <>
                        <RotateCcw className="size-3 mr-1" />
                        Retake
                      </>
                    ) : (
                      <>
                        <Play className="size-3 mr-1" />
                        Start Test
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
