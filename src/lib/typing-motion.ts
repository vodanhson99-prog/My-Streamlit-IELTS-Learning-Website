import type { KeyboardEvent } from "react"

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

export function triggerTypingElementMotion(element: HTMLElement) {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return
  }
  element.classList.remove("animate-typing-blur")
  void element.offsetWidth
  element.classList.add("animate-typing-blur")
  const onEnd = () => {
    element.classList.remove("animate-typing-blur")
    element.removeEventListener("animationend", onEnd)
  }
  element.addEventListener("animationend", onEnd, { once: true })
}

export function handleTypingMotion(event: KeyboardEvent<HTMLElement>) {
  if (event.defaultPrevented || event.nativeEvent?.isComposing || NON_TYPING_KEYS.has(event.key)) return
  if (
    event.key === "Backspace" ||
    event.key === "Delete" ||
    event.key === "Enter" ||
    event.key === " " ||
    event.key.length === 1
  ) {
    triggerTypingElementMotion(event.currentTarget)
  }
}
