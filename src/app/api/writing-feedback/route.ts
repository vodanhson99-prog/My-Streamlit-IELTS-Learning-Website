import { NextResponse } from "next/server"
import { createGroqProvider } from "@/lib/ai/provider"
import { evaluateTask2 } from "@/lib/ielts-evaluation/evaluate-task2"
import { evaluateTask1 } from "@/lib/ielts-evaluation/evaluate-task1"
import { resolveAnnotations } from "@/lib/ielts-evaluation/annotations/resolver"
import { generateCoaching } from "@/lib/ielts-evaluation/coaching/generate-coaching"
import { calculateIeltsHalfBand } from "@/lib/ielts-evaluation/scoring/aggregate"
import type { WritingFeedbackResult } from "@/lib/ielts"
import type { ResolvedAnnotation } from "@/lib/ielts-evaluation/contracts"

export const maxDuration = 600

export async function POST(request: Request) {
  const requestId = `eval_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  const startTime = Date.now()

  try {
    const body = await request.json().catch(() => ({}))
    const testType = body.testType === "general_training" ? "general_training" : "academic"
    const targetBand = typeof body.targetBand === "number" ? body.targetBand : undefined

    // Determine whether caller requested combined evaluation or legacy single task
    const isCombined = Boolean(body.task1Essay || body.task2Essay || body.taskType === "both")

    if (isCombined) {
      const task1Essay = String(body.task1Essay || "").trim()
      const task1Prompt = String(body.task1Prompt || "").trim()
      const task2Essay = String(body.task2Essay || "").trim()
      const task2Prompt = String(body.task2Prompt || "").trim()

      if (!task1Essay || task1Essay.length < 20) {
        return NextResponse.json({ error: "Task 1 response must contain at least 20 characters.", requestId }, { status: 400 })
      }
      if (!task2Essay || task2Essay.length < 20) {
        return NextResponse.json({ error: "Task 2 response must contain at least 20 characters.", requestId }, { status: 400 })
      }
      if (!task1Prompt || !task2Prompt) {
        return NextResponse.json({ error: "Both Task 1 and Task 2 prompts are required for evaluation.", requestId }, { status: 400 })
      }

      const apiKey = process.env.AI_API_KEY?.trim()
      if (!apiKey) {
        console.warn(`[writing-feedback][${requestId}] Failed: AI_API_KEY is not configured on server.`)
        return NextResponse.json(
          {
            error: "AI evaluation service is not configured (missing AI_API_KEY). Please configure API key to evaluate.",
            retryable: false,
            requestId,
          },
          { status: 503 },
        )
      }

      const provider = createGroqProvider({ apiKey })

      console.info(`[writing-feedback][${requestId}] Starting combined evaluation (testType=${testType})`)

      // Run both tasks in parallel with safe diagnostics
      const [t1Result, t2Result] = await Promise.all([
        evaluateTask1({
          task: { testType, prompt: task1Prompt },
          essay: task1Essay,
          provider,
        }).catch((err) => {
          console.error(`[writing-feedback][${requestId}] Task 1 evaluation thrown:`, err instanceof Error ? err.message : String(err))
          return { status: "failed" as const, error: "Task 1 evaluator encountered an internal failure." }
        }),
        evaluateTask2({
          task: { testType, prompt: task2Prompt },
          essay: task2Essay,
          provider,
        }).catch((err) => {
          console.error(`[writing-feedback][${requestId}] Task 2 evaluation thrown:`, err instanceof Error ? err.message : String(err))
          return { status: "failed" as const, error: "Task 2 evaluator encountered an internal failure." }
        }),
      ])

      const elapsedMs = Date.now() - startTime

      if (t1Result.status === "failed" || t2Result.status === "failed") {
        const failedPart =
          t1Result.status === "failed" && t2Result.status === "failed"
            ? "Task 1 and Task 2"
            : t1Result.status === "failed"
            ? "Task 1"
            : "Task 2"
        const errDetail =
          t1Result.status === "failed"
            ? t1Result.error
            : t2Result.status === "failed"
            ? t2Result.error
            : "Unknown evaluation error"
        console.warn(`[writing-feedback][${requestId}] Fail-closed: ${failedPart} failed in ${elapsedMs}ms: ${errDetail}`)

        return NextResponse.json(
          {
            error: `Evaluation could not complete for ${failedPart}. Please try submitting again.`,
            retryable: true,
            failedTask: failedPart,
            requestId,
          },
          { status: 502 },
        )
      }

      // Both tasks succeeded: resolve annotations and coaching
      const t1Annotations: ResolvedAnnotation[] = []
      for (const c of t1Result.criteria) {
        t1Annotations.push(...resolveAnnotations(c.annotationCandidates, task1Essay, c.criterionId))
      }
      const t1Coaching = generateCoaching(t1Result as unknown as Parameters<typeof generateCoaching>[0], t1Annotations, targetBand)

      const t2Annotations: ResolvedAnnotation[] = []
      for (const c of t2Result.criteria) {
        t2Annotations.push(...resolveAnnotations(c.annotationCandidates, task2Essay, c.criterionId))
      }
      const t2Coaching = generateCoaching(t2Result, t2Annotations, targetBand)

      // Official IELTS Writing formula: Task 2 has double the weight of Task 1 -> (Task 1 + 2 * Task 2) / 3
      const weightedOverall = calculateIeltsHalfBand((t1Result.overallBand + 2 * t2Result.overallBand) / 3)

      console.info(`[writing-feedback][${requestId}] Combined evaluation success in ${elapsedMs}ms: Task1=${t1Result.overallBand}, Task2=${t2Result.overallBand}, Overall=${weightedOverall}`)

      const criteriaSentences: [string, string][] = [
        ["task_1_overall", `Task 1 Band ${t1Result.overallBand}: ${t1Result.summary}`],
        ["task_2_overall", `Task 2 Band ${t2Result.overallBand}: ${t2Result.summary}`],
      ]

      const payload: WritingFeedbackResult = {
        source: "ai",
        band_estimate: weightedOverall,
        criterion_bands: {
          task_achievement_band: t1Result.criteria.find((c) => c.criterionId === "task-achievement")?.band ?? null,
          coherence_cohesion_band: t2Result.criteria.find((c) => c.criterionId === "coherence-cohesion")?.band ?? null,
          lexical_resource_band: t2Result.criteria.find((c) => c.criterionId === "lexical-resource")?.band ?? null,
          grammar_band: t2Result.criteria.find((c) => c.criterionId === "grammatical-range-accuracy")?.band ?? null,
        },
        criteria_sentences: criteriaSentences,
        overall_tip: t2Coaching.priorities[0]?.actionItem || t2Result.summary,
        taskType: "both",
        testType,
        evaluation: t2Result,
        resolvedAnnotations: [...t1Annotations, ...t2Annotations],
        coaching: t2Coaching,
        task1: {
          prompt: task1Prompt,
          essay: task1Essay,
          evaluation: t1Result,
          resolvedAnnotations: t1Annotations,
          coaching: t1Coaching,
        },
        task2: {
          prompt: task2Prompt,
          essay: task2Essay,
          evaluation: t2Result,
          resolvedAnnotations: t2Annotations,
          coaching: t2Coaching,
        },
        requestId,
      }

      return NextResponse.json(payload)
    }

    // Legacy single task evaluation route
    const essay = String(body.essay || "").trim()
    const prompt = String(body.prompt || "").trim()
    const taskType = body.taskType === "task1" ? "task1" : "task2"

    if (!essay || essay.length < 20) {
      return NextResponse.json({ error: "Essay must contain at least 20 characters.", requestId }, { status: 400 })
    }
    if (essay.length > 10000) {
      return NextResponse.json({ error: "Essay exceeds maximum allowed length of 10,000 characters.", requestId }, { status: 400 })
    }
    if (!prompt) {
      return NextResponse.json({ error: "Task prompt is required.", requestId }, { status: 400 })
    }
    if (prompt.length > 3000) {
      return NextResponse.json({ error: "Prompt exceeds maximum allowed length of 3,000 characters.", requestId }, { status: 400 })
    }

    const apiKey = process.env.AI_API_KEY?.trim()
    if (!apiKey) {
      console.warn(`[writing-feedback][${requestId}] Failed: AI_API_KEY is not configured on server.`)
      return NextResponse.json(
        {
          error: "AI evaluation service is not configured (missing AI_API_KEY). Please configure API key to evaluate.",
          retryable: false,
          requestId,
        },
        { status: 503 },
      )
    }

    const provider = createGroqProvider({ apiKey })

    console.info(`[writing-feedback][${requestId}] Single task evaluation (taskType=${taskType})`)

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

    const elapsedMs = Date.now() - startTime

    if (evaluation.status === "failed") {
      console.warn(`[writing-feedback][${requestId}] Evaluation failed closed in ${elapsedMs}ms: ${evaluation.error}`)
      return NextResponse.json(
        {
          error: evaluation.error,
          retryable: true,
          failedCriteria: evaluation.failedCriteria,
          requestId,
        },
        { status: 502 },
      )
    }

    console.info(`[writing-feedback][${requestId}] Single task evaluation succeeded in ${elapsedMs}ms (band=${evaluation.overallBand})`)

    const allResolvedAnnotations: ResolvedAnnotation[] = []
    for (const c of evaluation.criteria) {
      const resolved = resolveAnnotations(c.annotationCandidates, essay, c.criterionId)
      allResolvedAnnotations.push(...resolved)
    }

    const coaching = generateCoaching(
      evaluation as unknown as Parameters<typeof generateCoaching>[0],
      allResolvedAnnotations,
      targetBand,
    )

    const criteriaSentences: [string, string][] = evaluation.criteria.map((c) => {
      const topSupporting = c.supportingEvidence[0]?.rationale || ""
      return [c.criterionId, `Band ${c.band}: ${topSupporting || c.nextBandBlockers[0] || ""}`]
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
      taskType,
      testType,
      essay,
      prompt,
      evaluation,
      resolvedAnnotations: allResolvedAnnotations,
      coaching,
      requestId,
    }

    return NextResponse.json(legacyPayload)
  } catch (error: unknown) {
    const elapsedMs = Date.now() - startTime
    const msg = error instanceof Error ? error.message : "Unexpected evaluation server error"
    console.error(`[writing-feedback][${requestId}] Server error in ${elapsedMs}ms:`, msg)
    return NextResponse.json({ error: msg, retryable: true, requestId }, { status: 500 })
  }
}
