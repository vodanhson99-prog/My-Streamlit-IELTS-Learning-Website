"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, BookOpen, Compass, History, PenTool, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"

const NAV_ITEMS = [
  { href: "/", label: "Plan", icon: Compass },
  { href: "/listening", label: "Listening", icon: Volume2 },
  { href: "/reading", label: "Reading", icon: BookOpen },
  { href: "/writing", label: "Writing", icon: PenTool },
  { href: "/progress", label: "Review", icon: History },
]

export function PracticeNavbar() {
  const pathname = usePathname()

  // Match /listening/[slug], /reading/[slug], /writing/[slug] but NOT index or /result
  const practiceMatch = pathname.match(/^\/(listening|reading|writing)\/([^/]+)$/)
  const isPracticeSession = Boolean(practiceMatch && practiceMatch[2] !== "result")

  if (isPracticeSession && practiceMatch) {
    const skill = practiceMatch[1]
    const skillLabel = skill.charAt(0).toUpperCase() + skill.slice(1)
    const libraryHref = `/${skill}`

    return (
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex min-h-11 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href={libraryHref}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[3px] px-2 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={`Exit to ${skillLabel} library`}
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span>{skillLabel} Library</span>
            </Link>

            <span className="h-3.5 w-px bg-border" aria-hidden="true" />

            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground uppercase tracking-wider truncate">
              Practice Session
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ModeToggle />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xs">
      <div className="mx-auto flex min-h-12 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="IELTS Prep plan"
          className="flex shrink-0 items-center gap-2 rounded-[3px] py-1.5 pr-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <span className="flex size-5 items-center justify-center rounded-[2px] bg-foreground font-mono text-[10px] font-semibold leading-none text-background">
            IE
          </span>
          <span className="text-[13px] font-semibold tracking-tight">IELTS Prep</span>
        </Link>

        <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />

        <nav
          aria-label="Main navigation"
          className="scrollbar-none flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain"
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-1.5 rounded-[3px] px-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-3" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
