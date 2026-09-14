"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { setTheme, theme } = useTheme()
  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="relative inline-flex size-6 shrink-0 items-center justify-center rounded-[2px] border border-transparent bg-clip-padding text-[11px] font-medium text-foreground whitespace-nowrap transition-colors outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        aria-label="Toggle theme"
      >
        <Sun className="size-3.5 scale-100 rotate-0 transition-transform duration-150 dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute size-3.5 scale-0 rotate-90 transition-transform duration-150 dark:scale-100 dark:rotate-0" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          data-active={theme === "light"}
          onClick={() => {
            setTheme("light")
            setOpen(false)
          }}
        >
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          data-active={theme === "dark"}
          onClick={() => {
            setTheme("dark")
            setOpen(false)
          }}
        >
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          data-active={theme === "system"}
          onClick={() => {
            setTheme("system")
            setOpen(false)
          }}
        >
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
