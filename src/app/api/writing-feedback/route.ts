import { NextResponse } from "next/server"
import { requestGroq } from "@/lib/ai"
import { heuristicWritingFeedback, type WritingFeedbackResult } from "@/lib/ielts"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const essay = String(body.essay || "").trim()
    const prompt = String(body.prompt || "").trim()
    const taskType = body.taskType === "task1" ? "task1" : "task2"

    if (!essay) {
      return NextResponse.json({ error: "Write something first." }, { status: 400 })
    }

    const hasApiKey = Boolean(process.env.GROQ_API_KEY?.trim())

    if (hasApiKey) {
      try {
        const systemPrompt =
          `You are an official IELTS Writing examiner evaluating an IELTS ${taskType.toUpperCase()} response. Grade the essay against the four IELTS band criteria: ` +
          "Task Achievement, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy. " +
          "Respond ONLY in raw JSON, no markdown fences, no preamble, in this exact shape: " +
          '{"band_estimate": <number 1-9, one decimal place>, ' +
          '"task_achievement_band": <number 1-9, one decimal place>, ' +
          '"coherence_cohesion_band": <number 1-9, one decimal place>, ' +
          '"lexical_resource_band": <number 1-9, one decimal place>, ' +
          '"grammar_band": <number 1-9, one decimal place>, ' +
          '"task_achievement": "<one sentence>", "coherence_cohesion": "<one sentence>", ' +
          '"lexical_resource": "<one sentence>", "grammar": "<one sentence>", ' +
          '"overall_tip": "<one sentence, the single most useful thing to fix next>"}'

        const raw = await requestGroq(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Prompt: ${prompt}\n\nEssay:\n${essay}` },
          ],
          500,
          0.3
        )

        const sanitized = raw
          .trim()
          .replace(/^```json/i, "")
          .replace(/^```/, "")
          .replace(/```$/, "")
          .trim()

        const ai = JSON.parse(sanitized)

        const result: WritingFeedbackResult = {
          source: "ai",
          band_estimate: Number(ai.band_estimate) || 5.0,
          criterion_bands: {
            task_achievement_band: Number(ai.task_achievement_band) || null,
            coherence_cohesion_band: Number(ai.coherence_cohesion_band) || null,
            lexical_resource_band: Number(ai.lexical_resource_band) || null,
            grammar_band: Number(ai.grammar_band) || null,
          },
          criteria_sentences: [
            ["Task Achievement", String(ai.task_achievement || "")],
            ["Coherence & Cohesion", String(ai.coherence_cohesion || "")],
            ["Lexical Resource", String(ai.lexical_resource || "")],
            ["Grammar", String(ai.grammar || "")],
          ],
          overall_tip: String(ai.overall_tip || "Apply examiner advice to your next draft."),
        }

        return NextResponse.json(result)
      } catch (err: unknown) {
        const fallback = heuristicWritingFeedback(essay, taskType)
        const errorMsg = err instanceof Error ? err.message : "AI evaluation failed"
        const result: WritingFeedbackResult = {
          source: "heuristic",
          band_estimate: fallback.band_estimate,
          criterion_bands: null,
          criteria_sentences: [
            ["Word count", `${fallback.word_count} words (${fallback.sentence_count} sentences)`],
            ["Heuristic notes", fallback.notes.join(" · ")],
          ],
          overall_tip: "Heuristic is rough — server AI grading provides full IELTS-criteria feedback.",
          fallback_error: errorMsg,
        }
        return NextResponse.json(result)
      }
    }

    const heuristic = heuristicWritingFeedback(essay, taskType)
    const result: WritingFeedbackResult = {
      source: "heuristic",
      band_estimate: heuristic.band_estimate,
      criterion_bands: null,
      criteria_sentences: [
        ["Word count", `${heuristic.word_count} words (${heuristic.sentence_count} sentences)`],
        ["Heuristic notes", heuristic.notes.join(" · ")],
      ],
      overall_tip: "Heuristic is rough — configure GROQ_API_KEY for full examiner-level feedback.",
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unexpected server error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
