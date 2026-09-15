"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

const emptySubscribe = () => () => {}

export function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const mounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false)

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const isDark = resolvedTheme === "dark"
    const nextTheme = isDark ? "light" : "dark"

    // Check for View Transition API support and user motion preference
    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => {
        ready: Promise<void>
        finished: Promise<void>
      }
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (!doc.startViewTransition || prefersReducedMotion) {
      setTheme(nextTheme)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const transition = doc.startViewTransition(() => {
      setTheme(nextTheme)
    })

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
          filter: [
            "blur(8px) contrast(1.15)",
            "blur(0px) contrast(1)",
          ],
        },
        {
          duration: 1200,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      )
    })
  }

  // Prevent SSR flash
  if (!mounted) {
    return (
      <div
        className="size-7 rounded-[3px] border border-border/70 bg-muted/40"
        aria-hidden="true"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group relative inline-flex size-7 shrink-0 items-center justify-center rounded-[3px] border border-border/70 bg-muted/40 text-foreground transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-foreground/40 hover:bg-muted hover:shadow-2xs active:scale-90 active:rotate-12 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring select-none"
      aria-label="Toggle light and dark mode"
      title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun className="size-3.5 rotate-0 scale-100 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-45 dark:-rotate-90 dark:scale-0 dark:opacity-0" />
      <Moon className="absolute size-3.5 rotate-90 scale-0 opacity-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-12 dark:rotate-0 dark:scale-100 dark:opacity-100" />
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
