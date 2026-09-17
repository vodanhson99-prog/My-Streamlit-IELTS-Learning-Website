"use client"

import { useTransition, useEffect, useState, type ReactNode } from "react"

interface PageTransitionProps {
  transitionKey: string
  children: ReactNode
  className?: string
}

export function PageTransition({
  transitionKey,
  children,
  className = "",
}: PageTransitionProps) {
  const [, startTransition] = useTransition()
  const [activeKey, setActiveKey] = useState(transitionKey)

  useEffect(() => {
    let frameId: number
    startTransition(() => {
      frameId = window.requestAnimationFrame(() => {
        setActiveKey(transitionKey)
      })
    })

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
    }
  }, [transitionKey])

  return (
    <div key={activeKey} className={`page-transition ${className}`.trim()}>
      {children}
    </div>
  )
}
