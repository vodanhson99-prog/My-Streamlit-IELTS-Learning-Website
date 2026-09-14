import { describe, expect, it } from "vitest"
import { POST } from "../../src/app/api/writing-feedback/route"

describe("POST /api/writing-feedback", () => {
  it("returns 400 when essay is too short", async () => {
    const req = new Request("http://localhost/api/writing-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ essay: "Short", prompt: "Prompt" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain("at least 20 characters")
  })

  it("returns 400 when prompt is missing", async () => {
    const req = new Request("http://localhost/api/writing-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ essay: "This is long enough to satisfy character requirements.", prompt: "" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain("Task prompt is required")
  })

  it("returns 503 when GROQ_API_KEY is not configured and does not return heuristic band", async () => {
    const original = process.env.GROQ_API_KEY
    delete process.env.GROQ_API_KEY
    try {
      const req = new Request("http://localhost/api/writing-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essay: "This is a full IELTS response discussing the effects of modern technology on societies worldwide.",
          prompt: "Discuss the advantages and disadvantages of technology.",
        }),
      })
      const res = await POST(req)
      expect(res.status).toBe(503)
      const data = await res.json()
      expect(data.error).toContain("missing GROQ_API_KEY")
      // Verify no heuristic band is returned
      expect(data.band_estimate).toBeUndefined()
    } finally {
      process.env.GROQ_API_KEY = original
    }
  })
})
