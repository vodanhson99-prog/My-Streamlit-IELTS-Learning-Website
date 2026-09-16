import { describe, it, expect } from "vitest"
import {
  isDetailExpired,
  parseCachedEnvelope,
  createCachedEnvelope,
  DETAIL_TTL_MS,
} from "../src/lib/practice-detail-cache"

describe("Practice detail cache helpers", () => {
  it("detects expired cache entries based on timestamp", () => {
    const now = 1000000000000
    expect(isDetailExpired(now - DETAIL_TTL_MS - 1, now)).toBe(true)
    expect(isDetailExpired(now - DETAIL_TTL_MS + 1000, now)).toBe(false)
  })

  it("parses valid envelope and rejects expired envelope", () => {
    const testData = { id: "test-1", slug: "test-1", skill: "reading" }
    const raw = createCachedEnvelope(testData)
    expect(parseCachedEnvelope(raw)).toEqual(testData)

    const expiredEnvelope = JSON.stringify({
      test: testData,
      cachedAt: Date.now() - DETAIL_TTL_MS - 5000,
    })
    expect(parseCachedEnvelope(expiredEnvelope)).toBeNull()
  })

  it("falls back gracefully for legacy un-enveloped cache", () => {
    const legacy = { id: "legacy-1", slug: "legacy-1", skill: "reading" }
    expect(parseCachedEnvelope(JSON.stringify(legacy))).toEqual(legacy)
    expect(parseCachedEnvelope(null)).toBeNull()
    expect(parseCachedEnvelope("not json")).toBeNull()
  })
})
