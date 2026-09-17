export const DETAIL_TTL_MS = 24 * 60 * 60 * 1000

export interface CachedDetailEnvelope<T = unknown> {
  test: T
  cachedAt: number
}

export function isDetailExpired(cachedAt: number, now = Date.now()): boolean {
  return now - cachedAt > DETAIL_TTL_MS
}

export function parseCachedEnvelope<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && "cachedAt" in parsed && "test" in parsed) {
      if (typeof parsed.cachedAt === "number" && isDetailExpired(parsed.cachedAt)) {
        return null
      }
      return (parsed.test ?? null) as T | null
    }
    return parsed as T
  } catch {
    return null
  }
}

export function createCachedEnvelope<T>(test: T): string {
  const envelope: CachedDetailEnvelope<T> = {
    test,
    cachedAt: Date.now(),
  }
  return JSON.stringify(envelope)
}
