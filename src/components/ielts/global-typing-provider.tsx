"use client"

import { useEffect } from "react"
import { useSettings } from "@/hooks/use-settings"
import { isTypingKey, isTypableField, triggerTypingElementMotion } from "@/lib/typing-motion"

export function GlobalTypingProvider() {
  const { settings } = useSettings()

  useEffect(() => {
    if (typeof document === "undefined") return
    if (settings.reducedMotion) {
      document.documentElement.classList.add("motion-reduce")
      document.documentElement.setAttribute("data-reduced-motion", "true")
    } else {
      document.documentElement.classList.remove("motion-reduce")
      document.documentElement.removeAttribute("data-reduced-motion")
    }
  }, [settings.reducedMotion])

  useEffect(() => {
    if (settings.reducedMotion) return

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (!isTypingKey(event) || !isTypableField(event.target)) return
      triggerTypingElementMotion(event.target, event.key)
    }

    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true, passive: true })
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true })
    }
  }, [settings.reducedMotion])

  return null
}
