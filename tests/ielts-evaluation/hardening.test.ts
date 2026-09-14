import { describe, expect, it } from "vitest"
import { POST as feedbackPost } from "../../src/app/api/writing-feedback/route"
import { POST as tutorPost } from "../../src/app/api/writing-tutor/route"

describe("Hardening & Limits", () => {
  it("rejects oversized essay inputs in writing-feedback", async () => {
    const hugeEssay = "a".repeat(12000)
    const req = new Request("http://localhost/api/writing-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ essay: hugeEssay, prompt: "Prompt" }),
    })
    const res = await feedbackPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain("maximum allowed length")
  })

  it("rejects oversized messages in writing-tutor", async () => {
    const hugeMsg = "q".repeat(2500)
    const req = new Request("http://localhost/api/writing-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evaluation: { locked: true },
        essay: "Essay",
        prompt: "Prompt",
        history: [],
        userMessage: hugeMsg,
      }),
    })
    const res = await tutorPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain("maximum length")
  })
})
