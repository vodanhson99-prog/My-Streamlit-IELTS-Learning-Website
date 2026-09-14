import { NextResponse } from "next/server"
import { createGroqProvider } from "@/lib/ai/provider"
import { evaluateTask2 } from "@/lib/ielts-evaluation/evaluate-task2"
import { evaluateTask1 } from "@/lib/ielts-evaluation/evaluate-task1"
import { resolveAnnotations } from "@/lib/ielts-evaluation/annotations/resolver"
import { generateCoaching } from "@/lib/ielts-evaluation/coaching/generate-coaching"
import type { WritingFeedbackResult } from "@/lib/ielts"
import type { ResolvedAnnotation } from "@/lib/ielts-evaluation/contracts"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const essay = String(body.essay || "").trim()
    const prompt = String(body.prompt || "").trim()
    const taskType = body.taskType === "task1" ? "task1" : "task2"
    const testType = body.testType === "general_training" ? "general_training" : "academic"
    const targetBand = typeof body.targetBand === "number" ? body.targetBand : undefined

    if (!essay || essay.length < 20) {
      return NextResponse.json(
        { error: "Essay must contain at least 20 characters." },
        { status: 400 },
      )
    }

    if (essay.length > 10000) {
      return NextResponse.json(
        { error: "Essay exceeds maximum allowed length of 10,000 characters." },
        { status: 400 },
      )
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Task prompt is required." },
        { status: 400 },
      )
    }

    if (prompt.length > 3000) {
      return NextResponse.json(
        { error: "Prompt exceeds maximum allowed length of 3,000 characters." },
        { status: 400 },
      )
    }

    const apiKey = process.env.GROQ_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "AI evaluation service is not configured (missing GROQ_API_KEY). Please configure API key to evaluate.",
          retryable: false,
        },
        { status: 503 },
      )
    }

    const provider = createGroqProvider({ apiKey })

    const evaluation =
      taskType === "task1"
        ? await evaluateTask1({
            task: { testType, prompt },
            essay,
            provider,
          })
        : await evaluateTask2({
            task: { testType, prompt },
            essay,
            provider,
          })

    if (evaluation.status === "failed") {
      return NextResponse.json(
        {
          error: evaluation.error,
          retryable: true,
          failedCriteria: evaluation.failedCriteria,
        },
        { status: 502 },
      )
    }

    // Resolve annotations server-side
    const allResolvedAnnotations: ResolvedAnnotation[] = []
    for (const c of evaluation.criteria) {
      const resolved = resolveAnnotations(c.annotationCandidates, essay, c.criterionId)
      allResolvedAnnotations.push(...resolved)
    }

    // Generate post-lock coaching
    const coaching = generateCoaching(evaluation, allResolvedAnnotations, targetBand)

    // Build backward-compatible fields + rich V1 fields
    const criteriaSentences: [string, string][] = evaluation.criteria.map((c) => {
      const topPositive = c.evidence.find((e) => e.type === "positive")?.rationale || ""
      return [c.criterionId, `Band ${c.band}: ${topPositive || c.blockers[0] || ""}`]
    })

    const criterionBandsObj: Record<string, number> = {}
    for (const c of evaluation.criteria) {
      criterionBandsObj[`${c.criterionId.replace(/-/g, "_")}_band`] = c.band
    }

    const legacyPayload: WritingFeedbackResult = {
      source: "ai",
      band_estimate: evaluation.overallBand,
      criterion_bands: {
        task_achievement_band:
          criterionBandsObj["task_achievement_band"] || criterionBandsObj["task_response_band"] || null,
        coherence_cohesion_band: criterionBandsObj["coherence_cohesion_band"] || null,
        lexical_resource_band: criterionBandsObj["lexical_resource_band"] || null,
        grammar_band: criterionBandsObj["grammatical_range_accuracy_band"] || null,
      },
      criteria_sentences: criteriaSentences,
      overall_tip: coaching.priorities[0]?.actionItem || evaluation.summary,
    }

    return NextResponse.json({
      ...legacyPayload,
      version: "writing-evaluation-v1",
      taskType,
      testType,
      evaluation,
      resolvedAnnotations: allResolvedAnnotations,
      coaching,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unexpected evaluation server error"
    return NextResponse.json({ error: msg, retryable: true }, { status: 500 })
  }
}
