import { describe, it, expect } from "vitest"
import { parsePracticeTestPage } from "@/lib/iot-parser"
import { createGroqProvider } from "@/lib/ai/provider"

const AUTHENTIC_WRITING_HTML = `
<div class="panel-group" id="accordion1">
  <div id="arcodion1-item1" class="panel-collapse collapse in">
    <div class="panel-body">
      <div class="test-question__question">
        <p>You should spend about <strong>20 minutes</strong> on this task.</p>
        <p class="Indent1">The diagram below shows how ethanol fuel is produced from corn.</p>
        <p>Summarise the information by selecting and reporting the main features and make comparisons where relevant.</p>
        <p>You should write <strong>at least 150 words.</strong></p>
        <div class="test-question__img-writing" data-src="/sites/default/files/2020-01/2_0.jpg" data-alt="Writing Task 1"></div>
      </div>
    </div>
  </div>
  <div id="arcodion1-item2" class="panel-collapse collapse">
    <div class="panel-body">
      <div class="test-question__question">
        <p>You should spend about <strong>40 minutes</strong> on this task.</p>
        <p class="Indent1">Some people think that physical strength is important for success in sport, while other people think that mental strength is more important. Discuss both views and give your own opinion.</p>
        <p>You should write <strong>at least 250 words.</strong></p>
      </div>
    </div>
  </div>
</div>
`

describe("Writing prompt extraction from authentic HTML", () => {
  const card = {
    title: "January Writing Practice Test 1",
    href: "https://ieltsonlinetests.com/ielts-mock-test-2025-january-writing-practice-test-1",
    quizId: "19009709",
    duration: 60,
  }

  it("extracts real Task 1 and Task 2 prompts from upstream writing HTML", () => {
    const testObj = parsePracticeTestPage(AUTHENTIC_WRITING_HTML, card, "writing")
    expect(testObj.writingTasks).toBeDefined()
    expect(testObj.writingTasks?.task1Prompt).toContain("The diagram below shows how ethanol fuel is produced from corn")
    expect(testObj.writingTasks?.task2Prompt).toContain("physical strength is important for success in sport")
    expect(testObj.writingTasks?.task2Prompt).not.toContain("Task 2 Essay for January Writing Practice Test 1")
    expect(testObj.writingTasks?.task1Prompt).not.toContain("Academic / General Training Task 1 for")
    expect(testObj.writingTasks?.task1ImageUrl).toBe("https://ieltsonlinetests.com/sites/default/files/2020-01/2_0.jpg")
    expect(testObj.writingTasks?.task1ImageAlt).toBe("Writing Task 1")
  })

  it("handles accordion spelling variant and nested img tags", () => {
    const htmlVariant = `
      <div id="accordion1-item1">
        <div class="test-question__question">
          <p>Task 1 text here with nested elements.</p>
          <img src="/sites/default/files/custom.png" alt="Custom Chart" />
        </div>
      </div>
      <div id="accordion1-item2">
        <div class="test-question__question">
          <p>Task 2 prompt text here.</p>
        </div>
      </div>
    `
    const testObj = parsePracticeTestPage(htmlVariant, card, "writing")
    expect(testObj.writingTasks?.task1Prompt).toContain("Task 1 text here")
    expect(testObj.writingTasks?.task2Prompt).toContain("Task 2 prompt text here")
    expect(testObj.writingTasks?.task1ImageUrl).toBe("https://ieltsonlinetests.com/sites/default/files/custom.png")
    expect(testObj.writingTasks?.task1ImageAlt).toBe("Custom Chart")
  })

  it("rejects generic placeholder strings as valid authentic prompts", () => {
    const emptyHtml = "<div>No test content</div>"
    const testObj = parsePracticeTestPage(emptyHtml, card, "writing")
    expect(testObj.writingTasks).toBeUndefined()
  })
})

describe("Practice tests route Writing handling", () => {
  it("rejects writing tests when upstream HTML has no parseable prompts", async () => {
    const { GET } = await import("@/app/api/practice-tests/[quizId]/route")
    const request = new Request("http://localhost:3000/api/practice-tests/19009709?skill=writing&sourceUrl=https://invalid-non-iot-url.com")
    const context = { params: Promise.resolve({ quizId: "19009709" }) }
    const response = await GET(request, context)
    expect(response.status).toBe(400)
  })
})

describe("Configurable AI Provider boundary", () => {
  it("supports custom OpenAI-compatible endpoint, model, and headers", async () => {
    let capturedUrl = ""
    let capturedHeaders: Record<string, string> = {}
    let capturedBody: Record<string, unknown> = {}

    const mockFetcher = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedHeaders = Object.fromEntries(new Headers(init?.headers).entries())
      capturedBody = JSON.parse(String(init?.body || "{}"))
      return new Response(JSON.stringify({ choices: [{ message: { content: "Graded: Band 7.5" } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }) as typeof fetch

    const provider = createGroqProvider({
      apiKey: "test-token-123",
      apiUrl: "https://9router.minhmice.com/v1/chat/completions",
      model: "coding-rbs",
      fetcher: mockFetcher,
    })

    const result = await provider.complete({
      messages: [{ role: "user", content: "Evaluate essay" }],
      maxTokens: 500,
      temperature: 0.2,
    })

    expect(capturedUrl).toBe("https://9router.minhmice.com/v1/chat/completions")
    expect(capturedHeaders.authorization).toBe("Bearer test-token-123")
    expect(capturedBody.model).toBe("coding-rbs")
    expect(result.text).toBe("Graded: Band 7.5")
    expect(result.provider).toBe("openai-compatible")
  })
})
