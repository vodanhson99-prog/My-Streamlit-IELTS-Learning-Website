import { cn } from "@/lib/utils"

interface PracticePageShellProps {
  children: React.ReactNode
  className?: string
}

/**
 * Shared container for catalog and library pages.
 * Aligns with RootLayout navbar and homepage (max-w-6xl, px-4 sm:px-6).
 */
export function PracticePageShell({ children, className }: PracticePageShellProps) {
  return (
    <main className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 pb-12", className)}>
      {children}
    </main>
  )
}
