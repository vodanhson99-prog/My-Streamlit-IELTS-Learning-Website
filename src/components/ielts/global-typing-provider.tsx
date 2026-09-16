"use client"

import { useEffect } from "react"
import { isTypingKey, isTypableField, triggerTypingElementMotion } from "@/lib/typing-motion"

export function GlobalTypingProvider() {
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (!isTypingKey(event) || !isTypableField(event.target)) return
      triggerTypingElementMotion(event.target, event.key)
    }

    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true, passive: true })
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true })
    }
  }, [])

  return null
}
