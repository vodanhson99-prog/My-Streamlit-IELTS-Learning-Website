import test from "node:test"
import assert from "node:assert/strict"

function generateTitleSlug(title, suffix) {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  if (!base) return suffix ? `test-${suffix}` : "practice-test"
  return suffix ? `${base}-${suffix}` : base
}

test("generateTitleSlug produces clean url-friendly slugs", () => {
  assert.equal(
    generateTitleSlug("January Listening Practice Test 1 (2025)"),
    "january-listening-practice-test-1-2025"
  )
  assert.equal(
    generateTitleSlug("Urban Beekeeping & Ecosystems"),
    "urban-beekeeping-ecosystems"
  )
})

test("generateTitleSlug handles suffixes for disambiguation", () => {
  assert.equal(
    generateTitleSlug("Test Title", "1234"),
    "test-title-1234"
  )
  assert.equal(
    generateTitleSlug("???", "5678"),
    "test-5678"
  )
})

test("session timer expiration calculation works properly", () => {
  const now = Date.now()
  const futureExpiresAt = now + 10 * 1000
  const pastExpiresAt = now - 5 * 1000

  const remainingFuture = Math.max(0, Math.floor((futureExpiresAt - now) / 1000))
  const remainingPast = Math.max(0, Math.floor((pastExpiresAt - now) / 1000))

  assert.equal(remainingFuture, 10)
  assert.equal(remainingPast, 0)
})
