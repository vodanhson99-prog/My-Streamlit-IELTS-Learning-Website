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

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function isTextField(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement {
  if (!(target instanceof HTMLElement)) return false
  if (target.tagName === "TEXTAREA") return true
  if (target.tagName !== "INPUT") return false
  const type = (target as HTMLInputElement).type?.toLowerCase() || "text"
  return !NON_TEXT_INPUT_TYPES.has(type)
}

export function isTypingKey(event: KeyboardEvent) {
  return (
    !event.defaultPrevented &&
    !event.isComposing &&
    !NON_TYPING_KEYS.has(event.key) &&
    (event.key === "Backspace" ||
      event.key === "Delete" ||
      event.key === "Enter" ||
      event.key === " " ||
      event.key.length === 1)
  )
}

function pulseCaret(element: HTMLElement) {
  element.classList.remove("animate-typing-caret")
  void element.offsetWidth
  element.classList.add("animate-typing-caret")
  element.addEventListener(
    "animationend",
    () => element.classList.remove("animate-typing-caret"),
    { once: true },
  )
}

function measureCaretPoint(field: HTMLInputElement | HTMLTextAreaElement) {
  const value = field.value
  const caret = field.selectionStart ?? value.length
  const styles = window.getComputedStyle(field)
  const mirror = document.createElement("div")
  const span = document.createElement("span")
  const marker = document.createElement("span")

  const properties = [
    "boxSizing",
    "width",
    "height",
    "overflow",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "fontFamily",
    "lineHeight",
    "letterSpacing",
    "textTransform",
    "textAlign",
    "textIndent",
    "whiteSpace",
    "wordBreak",
    "wordSpacing",
    "wordWrap",
    "direction",
  ] as const

  mirror.setAttribute("aria-hidden", "true")
  Object.assign(mirror.style, {
    position: "absolute",
    visibility: "hidden",
    top: "0",
    left: "-9999px",
    whiteSpace: field.tagName === "TEXTAREA" ? "pre-wrap" : "pre",
    wordWrap: "break-word",
    overflowWrap: "break-word",
  })

  for (const property of properties) {
    mirror.style[property] = styles[property]
  }

  if (field.tagName === "INPUT") {
    mirror.style.height = styles.height
    mirror.style.overflow = "hidden"
    mirror.style.whiteSpace = "pre"
  }

  span.textContent = value.slice(0, caret)
  marker.textContent = "\u200b"
  mirror.append(span, marker)
  document.body.append(mirror)

  const fieldRect = field.getBoundingClientRect()
  const markerRect = marker.getBoundingClientRect()
  const mirrorRect = mirror.getBoundingClientRect()
  const left =
    fieldRect.left +
    (markerRect.left - mirrorRect.left) -
    field.scrollLeft +
    window.scrollX
  const top =
    fieldRect.top +
    (markerRect.top - mirrorRect.top) -
    field.scrollTop +
    window.scrollY

  mirror.remove()
  return { left, top, fontSize: styles.fontSize, fontFamily: styles.fontFamily, color: styles.color, lineHeight: styles.lineHeight }
}

function spawnTypedGlyph(field: HTMLInputElement | HTMLTextAreaElement, char: string) {
  if (!char || char === "\n" || char === "\r") return

  const point = measureCaretPoint(field)
  const glyph = document.createElement("span")
  glyph.className = "typing-glyph"
  glyph.textContent = char === " " ? "·" : char
  Object.assign(glyph.style, {
    position: "absolute",
    left: `${point.left}px`,
    top: `${point.top}px`,
    fontSize: point.fontSize,
    fontFamily: point.fontFamily,
    lineHeight: point.lineHeight,
    color: point.color,
    pointerEvents: "none",
    zIndex: "60",
    whiteSpace: "pre",
  })
  document.body.append(glyph)
  glyph.addEventListener("animationend", () => glyph.remove(), { once: true })
}

export function triggerTypingElementMotion(element: HTMLElement, key?: string) {
  if (prefersReducedMotion()) return

  pulseCaret(element)

  if (!isTextField(element)) return
  if (!key || key.length !== 1) return
  // Measure caret on keydown before insert — that is where the new glyph lands.
  spawnTypedGlyph(element, key)
}

export function isTypableField(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return isTextField(target)
}
