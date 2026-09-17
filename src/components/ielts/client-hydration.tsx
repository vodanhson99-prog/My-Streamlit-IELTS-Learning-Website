"use client"

import { useSyncExternalStore } from "react"

const emptySubscribe = () => () => {}

export function ClientHydration({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false)

  if (!hydrated) {
    return (
      <div className="flex min-h-32 items-center justify-center text-xs text-muted-foreground" aria-live="polite">
        Loading local session…
      </div>
    )
  }

  return children
}
