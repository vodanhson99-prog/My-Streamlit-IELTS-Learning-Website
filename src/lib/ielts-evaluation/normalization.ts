const BLOCKER_TEXT_KEYS = [
  "reason",
  "issue",
  "blocker",
  "description",
  "action",
  "actionItem",
  "recommendation",
] as const

export function normalizeNextBandBlockers(value: unknown): unknown {
  if (!Array.isArray(value)) return value

  return value.map((item) => {
    if (typeof item === "string") return item.trim()
    if (!item || typeof item !== "object" || Array.isArray(item)) return item

    const record = item as Record<string, unknown>
    const preferred = BLOCKER_TEXT_KEYS.flatMap((key) => {
      const part = record[key]
      return typeof part === "string" && part.trim() ? [part.trim()] : []
    })
    const parts = preferred.length > 0 ? preferred : collectStringLeaves(item)
    return [...new Set(parts)].join(" — ") || item
  })
}

function collectStringLeaves(value: unknown, depth = 0): string[] {
  if (depth > 2 || value === null || value === undefined) return []
  if (typeof value === "string") return value.trim() ? [value.trim()] : []
  if (Array.isArray(value)) return value.flatMap((item) => collectStringLeaves(item, depth + 1))
  if (typeof value !== "object") return []
  return Object.values(value as Record<string, unknown>).flatMap((item) => collectStringLeaves(item, depth + 1))
}
