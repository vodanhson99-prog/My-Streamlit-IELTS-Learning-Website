import { NextResponse } from "next/server"

export async function GET() {
  const hasApiKey = Boolean(process.env.GROQ_API_KEY?.trim())
  const model = process.env.AI_MODEL || "llama-3.3-70b-versatile"
  return NextResponse.json({
    has_api_key: hasApiKey,
    model,
  })
}
