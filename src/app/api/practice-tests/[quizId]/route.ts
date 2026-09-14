import { NextResponse } from "next/server"
import { FALLBACK_PRACTICE_TESTS } from "@/lib/fallback-catalog"
import { fetchIot, IotSessionError, IOT_BASE_URL } from "@/lib/iot-session"
import { parseAnswerMap, parsePracticeTestPage } from "@/lib/iot-parser"
import type { PracticeTest, SkillType } from "@/lib/ielts"
import type { QuestionAnswer } from "@/lib/ielts"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ quizId: string }> }

function findFallback(quizId: string) {
  return FALLBACK_PRACTICE_TESTS.find((test) => test.upstreamQuizId === quizId || test.id.includes(quizId))
}

function mergeAnswers(test: PracticeTest, answers: Map<number, string | number | (string | number)[]>): PracticeTest {
  return {
    ...test,
    sections: test.sections.map((section) => ({
      ...section,
      questions: section.questions.map((question) => ({
        ...question,
        answer: (answers.get(question.number) ?? question.answer) as QuestionAnswer,
      })),
    })),
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { quizId } = await context.params
  if (!/^\d+$/.test(quizId)) {
    return NextResponse.json({ error: "Invalid quiz ID." }, { status: 400 })
  }

  const searchParams = new URL(request.url).searchParams
  const sourceUrl = searchParams.get("sourceUrl")
  const skill = searchParams.get("skill") as SkillType | null
  if (!sourceUrl || !skill || !["listening", "reading", "writing"].includes(skill)) {
    return NextResponse.json({ error: "sourceUrl and valid skill are required." }, { status: 400 })
  }

  let url: URL
  try {
    url = new URL(sourceUrl)
  } catch {
    return NextResponse.json({ error: "Invalid source URL." }, { status: 400 })
  }
  if (url.origin !== IOT_BASE_URL) {
    return NextResponse.json({ error: "Source URL is not allowlisted." }, { status: 400 })
  }

  try {
    const pageResponse = await fetchIot(url.toString(), { headers: { Accept: "text/html" } })
    if (!pageResponse.ok) {
      return NextResponse.json({ error: `Upstream returned ${pageResponse.status}.` }, { status: 502 })
    }

    const html = await pageResponse.text()
    let test = parsePracticeTestPage(
      html,
      {
        title: `IELTS ${skill} test ${quizId}`,
        href: url.toString(),
        quizId,
        questionsUrl: `${IOT_BASE_URL}/quiz-get-questions/${quizId}`,
      },
      skill
    )

    if (skill === "writing") {
      return NextResponse.json({
        source: "live",
        test: {
          ...test,
          writingTasks: test.writingTasks || {
            task1Prompt: "Complete Academic/General Training Task 1.",
            task2Prompt: "Complete Task 2 essay.",
            task1MinWords: 150,
            task2MinWords: 250,
          },
        },
      })
    }

    const solutionUrl = `${url.origin}${url.pathname.replace(/\/$/, "")}/solution`
    try {
      const solutionResponse = await fetchIot(solutionUrl, { headers: { Accept: "text/html" } })
      if (solutionResponse.ok) {
        const solutionHtml = await solutionResponse.text()
        test = mergeAnswers(test, parseAnswerMap(solutionHtml))
      }
    } catch {
      // Solution page is optional; keep questions even without keys.
    }

    if (!test.sections.length || !test.sections.some((section) => section.questions.length)) {
      return NextResponse.json({ error: "Upstream test contains no parseable questions." }, { status: 422 })
    }

    return NextResponse.json({ source: "live", test })
  } catch (error) {
    if (error instanceof IotSessionError && (error.code === "missing" || error.code === "expired")) {
      return NextResponse.json({ authenticated: false, error: error.message }, { status: 401 })
    }

    const fallback = findFallback(quizId)
    if (fallback) return NextResponse.json({ source: "fallback", test: fallback })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load practice test." },
      { status: 502 }
    )
  }
}
