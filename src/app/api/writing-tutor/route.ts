import { NextResponse } from "next/server"
import { AIProviderError, createGroqProvider } from "@/lib/ai/provider"
import { askTutor } from "@/lib/ielts-tutor/answer"
import type { TutorErrorKind, TutorErrorResponse, TutorRequestInput } from "@/lib/ielts-tutor/contracts"

function errorResponse(
  kind: TutorErrorKind,
  error: string,
  status: number,
  retryable: boolean,
  requestId: string,
): NextResponse<TutorErrorResponse> {
  return NextResponse.json(
    {
      error,
      kind,
      requestId,
      retryable,
    },
    { status },
  )
}

function classifyError(error: unknown): { kind: TutorErrorKind; status: number; retryable: boolean; message: string } {
  if (error instanceof AIProviderError) {
    switch (error.code) {
      case "authentication":
        return {
          kind: "authentication_failed",
          status: 502,
          retryable: false,
          message: "AI service authentication failed.",
        }
      case "rate_limited":
        return {
          kind: "rate_limited",
          status: 429,
          retryable: true,
          message: "AI service rate limit exceeded. Please try again shortly.",
        }
      case "timeout":
        return {
          kind: "timeout",
          status: 504,
          retryable: true,
          message: "AI service timed out. Please try again.",
        }
      case "network":
        return {
          kind: "network_error",
          status: 502,
          retryable: true,
          message: "Network error connecting to AI service. Please retry.",
        }
      case "invalid_response":
        return {
          kind: "invalid_response",
          status: 502,
          retryable: error.retryable,
          message: "AI service returned an invalid response.",
        }
      case "configuration":
        return {
          kind: "missing_configuration",
          status: 503,
          retryable: false,
          message: "Tutor service configuration missing.",
        }
      default:
        return {
          kind: "internal_error",
          status: 500,
          retryable: false,
          message: "AI provider service error.",
        }
    }
  }

  return {
    kind: "internal_error",
    status: 500,
    retryable: false,
    message: "An internal server error occurred.",
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(
      "invalid_request",
      "Malformed JSON request body.",
      400,
      false,
      requestId,
    )
  }

  try {
    const { evaluation, essay, prompt, history, userMessage, selectedAnnotation } =
      (body && typeof body === "object" ? body : {}) as Record<string, unknown>

    if (!evaluation || typeof evaluation !== "object" || !(evaluation as { locked?: boolean }).locked) {
      return errorResponse(
        "invalid_request",
        "Locked evaluation is required to consult the tutor.",
        400,
        false,
        requestId,
      )
    }

    if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
      return errorResponse(
        "invalid_request",
        "Question or message is required.",
        400,
        false,
        requestId,
      )
    }

    if (userMessage.length > 2000) {
      return errorResponse(
        "invalid_request",
        "Message exceeds maximum length of 2,000 characters.",
        400,
        false,
        requestId,
      )
    }

    const apiKey = process.env.AI_API_KEY?.trim()
    if (!apiKey) {
      return errorResponse(
        "missing_configuration",
        "Tutor service requires AI_API_KEY to be configured.",
        503,
        false,
        requestId,
      )
    }

    const provider = createGroqProvider({ apiKey })

    const tutorInput: TutorRequestInput = {
      evaluation: evaluation as TutorRequestInput["evaluation"],
      essay: String(essay || ""),
      prompt: String(prompt || ""),
      history: Array.isArray(history) ? history.slice(-8) : [],
      userMessage: userMessage.trim(),
      selectedAnnotation: selectedAnnotation as TutorRequestInput["selectedAnnotation"],
    }

    const response = await askTutor(provider, tutorInput)
    return NextResponse.json({ ...response, requestId })
  } catch (error: unknown) {
    const classified = classifyError(error)
    return errorResponse(
      classified.kind,
      classified.message,
      classified.status,
      classified.retryable,
      requestId,
    )
  }
}
