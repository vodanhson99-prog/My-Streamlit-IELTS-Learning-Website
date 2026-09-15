import { describe, it, expect } from "vitest"
import { extractReadingPassage, parseScopedQuestions, parsePageSections } from "../src/lib/iot-parser"

describe("Reading parser enhancements", () => {
  const sampleReadingHtml = `
    <section class="test-panel" data-panel="1">
      <div class="test-panel__heading"><h2 class="test-panel__title">Passage 1</h2></div>
      <div class="reading-passage">
        <p>This is the actual reading passage about M-Pesa.</p>
        <p>It has 262 words and multiple paragraphs.</p>
      </div>
      <div class="test-panel__item">
        <div class="test-panel__instruction"><p>Questions 1-4</p><p>Which paragraph contains...</p></div>
        <p>1. <span class="test-panel__iotquestion"><span class="test-panel__question-num">1</span><input type="text" data-num="1" id="q-1"></span> A possible security problem</p>
      </div>
      <div class="test-panel__item">
        <div class="test-panel__instruction"><p>Questions 5-8</p><p>Complete the sentences...</p></div>
        <p>Safaricom is the <span class="test-panel__iotquestion"><span class="test-panel__question-num">5</span><input type="text" data-num="5" id="q-5"></span> mobile phone company.</p>
      </div>
      <div class="test-panel__item">
        <div class="test-panel__instruction"><p>Questions 9-13</p><p>Do the statements agree...</p></div>
        <div class="test-panel__question-sm-group" data-num="9">
          <div class="test-panel__question-sm-title">9. Most Kenyans working in urban areas have relatives in rural areas.</div>
          <div class="test-panel__answer">
            <div class="test-panel__answer-item"><span class="test-panel__answer-option">A</span> TRUE</div>
            <div class="test-panel__answer-item"><span class="test-panel__answer-option">B</span> FALSE</div>
          </div>
        </div>
      </div>
    </section>
  `

  it("extracts clean reading passage without questions", () => {
    const passage = extractReadingPassage(sampleReadingHtml)
    expect(passage).toBeDefined()
    expect(passage).toContain("This is the actual reading passage about M-Pesa.")
    expect(passage).not.toContain("Questions 1-4")
    expect(passage).not.toContain("Most Kenyans working in urban areas")
    expect(passage).not.toContain("TRUE FALSE")
    expect(passage).not.toContain("input")
  })

  it("deduplicates questions and prevents mixing UI from instructions", () => {
    const answers = new Map<number, string | number | (string | number)[]>([
      [1, "B"], [5, "largest"], [9, "TRUE"]
    ])
    const questions = parseScopedQuestions(sampleReadingHtml, "reading", answers)
    
    // Q1, Q5, Q9
    expect(questions.length).toBe(3)
    
    expect(questions[0].number).toBe(1)
    expect(questions[0].prompt).toBe("[input] A possible security problem")
    
    expect(questions[1].number).toBe(5)
    expect(questions[1].prompt).toBe("Safaricom is the [input] mobile phone company.")
    
    expect(questions[2].number).toBe(9)
    expect(questions[2].prompt).toBe("Most Kenyans working in urban areas have relatives in rural areas.")
  })

  it("normalizes page sections without duplicate titles", () => {
    const answers = new Map<number, string | number | (string | number)[]>([
      [1, "B"], [5, "largest"], [9, "TRUE"]
    ])
    const sections = parsePageSections(sampleReadingHtml, "reading", answers)
    
    expect(sections.length).toBe(1)
    expect(sections[0].title).toBe("Passage 1")
    expect(sections[0].passageText).toBe("This is the actual reading passage about M-Pesa. It has 262 words and multiple paragraphs.")
    expect(sections[0].questions.length).toBe(3)
  })
})
