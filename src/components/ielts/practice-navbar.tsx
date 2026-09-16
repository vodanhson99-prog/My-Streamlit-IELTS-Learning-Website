"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ArrowLeft, BookOpen, Compass, History, PenTool, Settings, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"

const NAV_ITEMS = [
  { href: "/", label: "Plan", icon: Compass },
  { href: "/listening", label: "Listening", icon: Volume2 },
  { href: "/reading", label: "Reading", icon: BookOpen },
  { href: "/writing", label: "Writing", icon: PenTool },
  { href: "/progress", label: "Review", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function PracticeNavbar() {
  const rawPathname = usePathname()
  const pathname = rawPathname || "/"
  const navRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())
  const [indicator, setIndicator] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  })

  // Match /listening/[slug], /reading/[slug], /writing/[slug] but NOT index or /result
  const practiceMatch = pathname.match(/^\/(listening|reading|writing)\/([^/]+)$/)
  const isPracticeSession = Boolean(practiceMatch && practiceMatch[2] !== "result")

  // Determine current active item
  const activeItem = NAV_ITEMS.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  )
  const activeHref = activeItem?.href || "/"

  // ponytail: hardware-accelerated sliding indicator via translate3d
  useEffect(() => {
    if (isPracticeSession) return

    const updateIndicator = () => {
      const el = itemRefs.current.get(activeHref)
      if (el && navRef.current) {
        setIndicator({
          left: el.offsetLeft,
          width: el.offsetWidth,
          ready: true,
        })
      }
    }

    updateIndicator()

    window.addEventListener("resize", updateIndicator, { passive: true })
    return () => window.removeEventListener("resize", updateIndicator)
  }, [activeHref, isPracticeSession])

  if (isPracticeSession && practiceMatch) {
    const skill = practiceMatch[1]
    const skillLabel = skill.charAt(0).toUpperCase() + skill.slice(1)
    const libraryHref = `/${skill}`

    return (
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-12 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href={libraryHref}
              className="group inline-flex min-h-8 items-center gap-1.5 rounded-[3px] border border-border/70 bg-muted/30 px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground hover:border-foreground/30 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={`Exit to ${skillLabel} library`}
            >
              <ArrowLeft className="size-3.5 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-1" aria-hidden="true" />
              <span>{skillLabel} Library</span>
            </Link>

            <span className="h-3.5 w-px bg-border" aria-hidden="true" />

            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground uppercase tracking-wider truncate">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
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
    <>
      {/* Top Header for Desktop & Mobile */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex min-h-12 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/"
            aria-label="ielts with rbs plan"
            className="group flex shrink-0 items-center gap-2.5 rounded-[3px] py-1 text-left transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Image
              src="/Logo/RBS%20Logo.svg"
              alt="RBS Logo"
              width={24}
              height={18}
              className="h-4.5 w-auto object-contain dark:invert transition-transform duration-200 group-hover:scale-105"
              priority
            />
            <span className="text-[13px] font-semibold tracking-tight text-foreground">ielts with rbs</span>
          </Link>

          {/* Desktop Segmented Navigation with Sliding Pill */}
          <nav
            ref={navRef}
            aria-label="Main navigation"
            className="relative hidden md:flex items-center gap-1 rounded-[3px] border border-border/70 bg-muted/40 p-1 shadow-2xs"
          >
            {/* Sliding Active Pill */}
            {indicator.ready && (
              <div
                className="pointer-events-none absolute top-1 bottom-1 rounded-[2px] bg-foreground shadow-xs transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                style={{
                  transform: `translate3d(${indicator.left}px, 0, 0)`,
                  width: `${indicator.width}px`,
                }}
                aria-hidden="true"
              />
            )}

            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = href === activeHref
              return (
                <Link
                  key={href}
                  ref={(el) => {
                    if (el) itemRefs.current.set(href, el)
                    else itemRefs.current.delete(href)
                  }}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative z-10 flex h-7.5 items-center gap-1.5 rounded-[2px] px-3 text-[11px] font-medium transition-colors duration-500 select-none active:scale-[0.97]",
                    isActive
                      ? indicator.ready
                        ? "text-background font-semibold"
                        : "bg-foreground text-background font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("size-3.5 transition-transform duration-500", isActive && "scale-105")} aria-hidden="true" />
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

      {/* Mobile Bottom Navigation Dock */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-background/92 backdrop-blur-lg md:hidden px-3 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-lg transition-transform duration-200"
      >
        <div className="flex items-center justify-around">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === activeHref
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-[3px] transition-all duration-200 ease-out active:scale-90",
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center size-7 rounded-[3px] transition-all duration-200",
                    isActive
                      ? "bg-foreground text-background shadow-xs scale-105"
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                </div>
                <span className="text-[10px] font-mono tracking-tight leading-none">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
