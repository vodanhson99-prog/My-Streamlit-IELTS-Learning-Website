import { NextResponse } from "next/server"
import { FALLBACK_PRACTICE_TESTS } from "@/lib/fallback-catalog"
import { parseCardsFromHtml, parsePaginationUrls, cardToPracticeTest } from "@/lib/iot-parser"
import { PracticeTest, SkillType } from "@/lib/ielts"
import { IotSessionError, fetchIot, IOT_BASE_URL } from "@/lib/iot-session"

const SKILLS: SkillType[] = ["listening", "reading", "writing"]

async function fetchPage(url: string): Promise<string | null> {
  const response = await fetchIot(url)
  return response.ok ? response.text() : null
}

async function fetchSkill(skill: SkillType): Promise<PracticeTest[]> {
  const startUrl = `${IOT_BASE_URL}/ielts-exam-library?skill=${skill}`
  const html = await fetchPage(startUrl)
  if (!html) return []

  const pages = await Promise.all(
    parsePaginationUrls(html, startUrl)
      .slice(0, 3)
      .map((url) => fetchPage(url))
  )

  const cards = [html, ...pages.filter((page): page is string => Boolean(page))]
    .flatMap((page) => parseCardsFromHtml(page, skill))
  const unique = new Map<string, PracticeTest>()

  for (const card of cards) {
    const test = cardToPracticeTest(card, skill)
    unique.set(test.sourceUrl, test)
  }

  return [...unique.values()]
}

export async function GET() {
  try {
    const skillResults = await Promise.all(SKILLS.map(fetchSkill))
    const scrapedAll = skillResults.flat()

    if (scrapedAll.length === 0) {
      return NextResponse.json({
        source: "cache-fallback",
        timestamp: new Date().toISOString(),
        tests: FALLBACK_PRACTICE_TESTS,
        notice: "Live library returned no practice tests. Served cached authentic tests.",
      })
    }

    const mergedTests: PracticeTest[] = [...scrapedAll]
    for (const fallback of FALLBACK_PRACTICE_TESTS) {
      const existingIdx = mergedTests.findIndex((test) => test.id === fallback.id || test.title === fallback.title)
      if (existingIdx >= 0) {
        mergedTests[existingIdx] = { ...fallback, ...mergedTests[existingIdx], sections: fallback.sections }
      } else {
        mergedTests.unshift(fallback)
      }
    }

    return NextResponse.json({
      source: "live",
      timestamp: new Date().toISOString(),
      tests: mergedTests,
    })
  } catch (error) {
    if (error instanceof IotSessionError && (error.code === "missing" || error.code === "expired")) {
      return NextResponse.json({
        source: "auth-required",
        authenticated: false,
        timestamp: new Date().toISOString(),
        tests: FALLBACK_PRACTICE_TESTS,
        notice: error.message,
      }, { status: 401 })
    }

    return NextResponse.json({
      source: "cache-fallback",
      timestamp: new Date().toISOString(),
      tests: FALLBACK_PRACTICE_TESTS,
      notice: error instanceof Error ? error.message : "Live library unavailable. Served cached authentic tests.",
    })
  }
}
