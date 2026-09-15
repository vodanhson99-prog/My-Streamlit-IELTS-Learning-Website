import { NextResponse } from "next/server"
import { createGroqProvider } from "@/lib/ai/provider"
import { askTutor } from "@/lib/ielts-tutor/answer"
import type { TutorRequestInput } from "@/lib/ielts-tutor/contracts"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { evaluation, essay, prompt, history, userMessage, selectedAnnotation } = body

    if (!evaluation || !evaluation.locked) {
      return NextResponse.json(
        { error: "Locked evaluation is required to consult the tutor." },
        { status: 400 },
      )
    }

    if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
      return NextResponse.json(
        { error: "Question or message is required." },
        { status: 400 },
      )
    }

    if (userMessage.length > 2000) {
      return NextResponse.json(
        { error: "Message exceeds maximum length of 2,000 characters." },
        { status: 400 },
      )
    }

    const apiKey = process.env.AI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        { error: "Tutor service requires AI_API_KEY to be configured." },
        { status: 503 },
      )
    }

    const provider = createGroqProvider({ apiKey })

    const tutorInput: TutorRequestInput = {
      evaluation,
      essay: String(essay || ""),
      prompt: String(prompt || ""),
      history: Array.isArray(history) ? history.slice(-8) : [],
      userMessage: userMessage.trim(),
      selectedAnnotation,
    }

    const response = await askTutor(provider, tutorInput)
    return NextResponse.json(response)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Tutor agent error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
