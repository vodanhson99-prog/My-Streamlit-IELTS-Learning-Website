import { NextResponse } from "next/server"

export async function GET() {
  const hasApiKey = Boolean(process.env.AI_API_KEY?.trim())
  const model = process.env.AI_MODEL || "coding-rbs"
  return NextResponse.json({
    has_api_key: hasApiKey,
    model,
  })
}
