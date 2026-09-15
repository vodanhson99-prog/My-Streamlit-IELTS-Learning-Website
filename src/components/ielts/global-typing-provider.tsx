"use client"

import { useEffect } from "react"
import { triggerTypingElementMotion } from "@/lib/typing-motion"

const NON_TYPING_KEYS = new Set([
  "Alt",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "CapsLock",
  "Control",
  "Escape",
  "Meta",
  "PageDown",
  "PageUp",
  "Shift",
  "Tab",
])

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
])

function isTypableField(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target.tagName === "TEXTAREA") return true
  if (target.tagName !== "INPUT") return false
  const type = (target as HTMLInputElement).type?.toLowerCase() || "text"
  return !NON_TEXT_INPUT_TYPES.has(type)
}

export function GlobalTypingProvider() {
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || NON_TYPING_KEYS.has(event.key)) return
      if (!isTypableField(event.target)) return

      if (
        event.key === "Backspace" ||
        event.key === "Delete" ||
        event.key === "Enter" ||
        event.key === " " ||
        event.key.length === 1
      ) {
        triggerTypingElementMotion(event.target)
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true, passive: true })
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true })
    }
  }, [])

  return null
}
