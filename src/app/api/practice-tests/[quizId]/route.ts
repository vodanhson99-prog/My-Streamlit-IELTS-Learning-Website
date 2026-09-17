import { NextResponse } from "next/server"
import { FALLBACK_PRACTICE_TESTS } from "@/lib/fallback-catalog"
import { fetchIot, IotSessionError, IOT_BASE_URL } from "@/lib/iot-session"
import { normalizePassageImageUrls, parseAnswerMap, parsePracticeTestPage, parseWritingTasks } from "@/lib/iot-parser"
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
    test = normalizePassageImageUrls(test, url.origin)

    if (skill === "writing") {
      let writingTasks = test.writingTasks
      // If source page lacked task1 or task2 prompts, attempt fetching questionsUrl fallback
      if (!writingTasks || !writingTasks.task1Prompt || !writingTasks.task2Prompt) {
        const questionsEndpoint = `${IOT_BASE_URL}/quiz-get-questions/${quizId}`
        try {
          const qResponse = await fetchIot(questionsEndpoint, { headers: { Accept: "text/html,application/json" } })
          if (qResponse.ok) {
            const rawBody = await qResponse.text()
            let questionHtml = rawBody
            try {
              const json = JSON.parse(rawBody)
              if (json && typeof json.html === "string") questionHtml = json.html
              else if (json && typeof json.data === "string") questionHtml = json.data
            } catch {
              // Plain HTML string
            }
            const fallbackTasks = parseWritingTasks(questionHtml, url.toString())
            if (fallbackTasks) {
              writingTasks = {
                task1Prompt: writingTasks?.task1Prompt || fallbackTasks.task1Prompt,
                task2Prompt: writingTasks?.task2Prompt || fallbackTasks.task2Prompt,
                task1MinWords: 150,
                task2MinWords: 250,
                task1ImageUrl: writingTasks?.task1ImageUrl || fallbackTasks.task1ImageUrl,
                task1ImageAlt: writingTasks?.task1ImageAlt || fallbackTasks.task1ImageAlt,
              }
            }
          }
        } catch {
          // Questions endpoint is optional fallback
        }
      }

      if (!writingTasks || (!writingTasks.task1Prompt && !writingTasks.task2Prompt)) {
        return NextResponse.json({ error: "Upstream writing test contains no parseable prompts." }, { status: 422 })
      }

      return NextResponse.json({
        source: "live",
        test: {
          ...test,
          writingTasks,
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

    const hasAnyAnswers = test.sections.some((section) =>
      section.questions.some((q) => q.answer !== "" && q.answer !== undefined && (!Array.isArray(q.answer) || q.answer.length > 0))
    )

    if (!hasAnyAnswers) {
      const fallback = findFallback(quizId)
      if (fallback) return NextResponse.json({ source: "fallback", test: fallback })
      return NextResponse.json({ error: "Upstream test answer keys are unavailable." }, { status: 422 })
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
