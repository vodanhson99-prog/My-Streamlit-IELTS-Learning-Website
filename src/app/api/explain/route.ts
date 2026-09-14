import { NextResponse } from "next/server"
import { requestGroq } from "@/lib/ai"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const question = String(body.question || "").trim()
    const userAnswer = String(body.user_answer || "").trim()
    const correctAnswer = String(body.correct_answer || "").trim()

    if (!question || !correctAnswer) {
      return NextResponse.json(
        { error: "Fill in at least the question and the correct answer." },
        { status: 400 }
      )
    }

    const apiKey = process.env.GROQ_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI tutor is not configured on the server. Set GROQ_API_KEY." },
        { status: 503 }
      )
    }

    const systemPrompt =
      "You are an IELTS tutor. A student got a practice question wrong or wants to understand it better. " +
      "Explain briefly (under 300 words) why the correct answer is correct, and if relevant, why the student's " +
      "answer was wrong. Be encouraging and clear, not harsh."

    const userPrompt =
      `Question: ${question}\nStudent's answer: ${userAnswer}\nCorrect answer: ${correctAnswer}\n\n` +
      "Explain why the correct answer is right."

    const explanation = await requestGroq(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      400,
      0.4
    )

    return NextResponse.json({ explanation })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error generating explanation"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
