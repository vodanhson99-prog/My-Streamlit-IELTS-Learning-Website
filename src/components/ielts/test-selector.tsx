"use client"

import { PracticeTest, SkillType } from "@/lib/ielts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Clock, ExternalLink } from "lucide-react"

interface TestSelectorProps {
  skill: SkillType
  tests: PracticeTest[]
  selectedTestId?: string
  selectedSlug?: string
  onSelect?: (test: PracticeTest) => void
  onSelectSlug?: (slug: string) => void
  catalogSource?: string
}

export function TestSelector({
  skill,
  tests,
  selectedTestId,
  selectedSlug,
  onSelect,
  onSelectSlug,
  catalogSource,
}: TestSelectorProps) {
  const currentTest =
    tests.find((t) => (selectedSlug ? t.slug === selectedSlug : t.id === selectedTestId)) || tests[0]

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 bg-muted/40 rounded-[3px] border border-border mb-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Test:
        </span>
        <div className="min-w-60">
          <Select
            value={currentTest?.slug || currentTest?.id || ""}
            onValueChange={(val) => {
              const match = tests.find((t) => t.slug === val || t.id === val)
              if (match) {
                onSelect?.(match)
                onSelectSlug?.(match.slug)
              }
            }}
          >
            <SelectTrigger className="h-7 text-[11px] font-medium bg-background rounded-[2px] border-border">
              <SelectValue placeholder="Select a practice test" />
            </SelectTrigger>
            <SelectContent className="rounded-[2px] border-border">
              {tests.map((t) => (
                <SelectItem key={t.slug || t.id} value={t.slug || t.id} className="text-[11px] rounded-[1px]">
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
        <div className="flex items-center gap-1 font-medium text-foreground">
          <Clock className="size-3 text-muted-foreground" />
          <span>{currentTest?.durationMinutes || (skill === "listening" ? 30 : 60)}m</span>
        </div>

        {catalogSource && (
          <Badge variant="outline" className="text-[9px] font-mono py-0 px-1.5 h-4 rounded-[2px] border-border">
            {catalogSource === "live" ? "iot: live" : "iot: cached"}
          </Badge>
        )}

        {currentTest?.sourceUrl && (
          <a
            href={currentTest.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-foreground flex items-center gap-0.5 text-muted-foreground"
            title="View original on IELTS Online Tests"
          >
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </div>
  )
}
