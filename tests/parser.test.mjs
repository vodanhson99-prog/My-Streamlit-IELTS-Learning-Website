import test from "node:test"
import assert from "node:assert/strict"

export function parseCardsFromHtml(html, skill) {
  const cards = []
  const buttonRegex = /<button[^>]*class=["'][^"']*practice-item[^"']*["'][^>]*>([\s\S]*?)<\/button>/gi
  let match

  while ((match = buttonRegex.exec(html)) !== null) {
    const fullTag = match[0]
    const content = match[1]

    const hrefMatch = fullTag.match(/data-href=["']([^"']+)["']/i) || fullTag.match(/href=["']([^"']+)["']/i)
    const titleMatch = content.match(/<h[1-6][^>]*class=["'][^"']*pack-title[^"']*["'][^>]*>([^<]+)<\/h[1-6]>/i) || content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i)
    const durMatch = fullTag.match(/data-duration=["']([^"']+)["']/i)
    const quizIdMatch = fullTag.match(/data-get-questions=["'][^"']*\/(\d+)["']/i)

    if (titleMatch && hrefMatch) {
      cards.push({
        title: titleMatch[1].trim(),
        href: hrefMatch[1].trim(),
        duration: durMatch ? parseInt(durMatch[1], 10) : undefined,
        quizId: quizIdMatch ? quizIdMatch[1] : undefined,
        mode: skill,
      })
    }
  }

  return cards
}

export function parsePaginationUrls(html, currentUrl) {
  const urls = []
  const pageRegex = /<a[^>]+href=["']([^"']*(?:\?|&)page=\d+[^"']*)["']/gi
  let match

  while ((match = pageRegex.exec(html)) !== null) {
    let target = match[1].replace(/&amp;/g, "&")
    if (target.startsWith("/")) {
      target = `https://ieltsonlinetests.com${target}`
    }
    if (!urls.includes(target) && target !== currentUrl) {
      urls.push(target)
    }
  }

  return urls
}

export function cardToPracticeTest(card, skill) {
  const durationMinutes =
    card.duration || (skill === "listening" ? 30 : skill === "reading" ? 60 : 60)

  return {
    id: `iot-${skill}-${card.quizId || encodeURIComponent(card.title.toLowerCase().replace(/\s+/g, "-"))}`,
    title: card.title,
    skill,
    durationMinutes,
    sourceUrl: card.href.startsWith("http") ? card.href : `https://ieltsonlinetests.com${card.href}`,
  }
}

const SAMPLE_HTML = `
<div>
  <button data-get-questions="https://ieltsonlinetests.com/quiz-get-questions/19009683"
    data-mode="listening"
    data-href="https://ieltsonlinetests.com/ielts-mock-test-2025-january-listening-practice-test-1"
    data-duration="32"
    data-simulation-mode="1"
    class="practice-item__btn mocktest-card__pack -listening">
    <div class="mocktest-card__pack-details">
      <h6 class="mocktest-card__pack-title">January Listening Practice Test 1</h6>
      <div class="mocktest-card__pack-taken">1,044,818 tests taken</div>
    </div>
  </button>
  <div class="pagination">
    <a href="/ielts-exam-library?skill=listening&page=1">Page 2</a>
    <a href="/ielts-exam-library?skill=listening&page=2">Page 3</a>
  </div>
</div>
`

test("Parser extracts authentic practice cards and excludes simulations", () => {
  const cards = parseCardsFromHtml(SAMPLE_HTML, "listening")
  assert.equal(cards.length, 1)
  assert.equal(cards[0].title, "January Listening Practice Test 1")
  assert.equal(cards[0].quizId, "19009683")
  assert.equal(cards[0].duration, 32)
})

test("Parser parses pagination urls correctly", () => {
  const current = "https://ieltsonlinetests.com/ielts-exam-library?skill=listening"
  const pages = parsePaginationUrls(SAMPLE_HTML, current)
  assert.ok(pages.length >= 2)
  assert.ok(pages[0].includes("page=1"))
})

test("cardToPracticeTest maps to unified practice test shape", () => {
  const card = {
    title: "January Listening Practice Test 1",
    href: "https://ieltsonlinetests.com/ielts-mock-test-2025-january-listening-practice-test-1",
    duration: 32,
    quizId: "19009683",
  }
  const testObj = cardToPracticeTest(card, "listening")
  assert.equal(testObj.id, "iot-listening-19009683")
  assert.equal(testObj.skill, "listening")
  assert.equal(testObj.durationMinutes, 32)
})
