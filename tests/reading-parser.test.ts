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

  it("scopes select prompts to each question paragraph", () => {
    const html = `
      <section class="test-panel">
        <h2 class="test-panel__title">Part 1</h2>
        <div class="test-panel__item">
          <div class="test-panel__question">
            <h4 class="test-panel__question-title">Questions 1-2</h4>
          </div>
          <div class="test-panel__answers-wrap">
            <p><em>The text has 5 paragraphs (A - E).</em></p>
            <p>Which paragraph contains each piece of information?</p>
            <p><b class="iot-question-number">1.</b><select data-num="1"><option value="A">A</option><option value="B">B</option></select> The first question prompt</p>
            <p><b class="iot-question-number">2.</b><select data-num="2"><option value="A">A</option><option value="B">B</option></select> The second question prompt</p>
          </div>
        </div>
      </section>
    `

    const questions = parseScopedQuestions(html, "reading", new Map())

    expect(questions.map((question) => question.prompt)).toEqual([
      "The first question prompt",
      "The second question prompt",
    ])
  })

  it("keeps true-false prompt free of preceding instructions", () => {
    const html = `
      <section class="test-panel">
        <h2 class="test-panel__title">Part 1</h2>
        <div class="test-panel__item">
          <h4 class="test-panel__question-title">Questions 9-13</h4>
          <div class="test-panel__answers-wrap">
            <p>Do the statements agree with the information given in Reading Passage 1?</p>
            <p>In boxes 9 - 13 on your answer sheet, write TRUE, FALSE or NOT GIVEN.</p>
            <p><b class="iot-question-number">9.</b><select data-num="9"><option value="TRUE">TRUE</option><option value="FALSE">FALSE</option><option value="NOT GIVEN">NOT GIVEN</option></select> Other countries are looking at Thailand.</p>
          </div>
        </div>
      </section>
    `

    const questions = parseScopedQuestions(html, "reading", new Map())

    expect(questions[0].prompt).toBe("Other countries are looking at Thailand.")
    expect(questions[0].options).toEqual(["TRUE", "FALSE", "NOT GIVEN"])
  })

  it("pairs upstream passage sections with question panels", () => {
    const passageSections = [1, 2, 3].map((part) => `
      <section id="part-${part}" class="test-contents ckeditor-wrapper">
        <div class="test-contents__paragragh">
          <h1 class="test-contents__title">Part ${part}</h1>
          <div class="field field--name-field-passage-desc"><h1>Reading Passage ${part}</h1><p>Questions ${part === 1 ? "1 -13" : part === 2 ? "14 - 26" : "27 - 40"}</p></div>
          <h2 class="subtitle"><div class="field--name-field-subtitle-section">Passage title ${part}</div></h2>
          <div class="field field--name-field-passage field--type-text-long field--label-hidden field--item">
            <p><strong>A.</strong> Actual passage text for part ${part}.</p>
            <p><strong>B.</strong> More passage text for part ${part}.</p>
          </div>
        </div>
      </section>
    `).join("")
    const questionPanels = [[1, 13], [14, 26], [27, 40]].map(([from, to], partIndex) => `
      <section class="test-panel">
        <h2 class="test-panel__title">Part ${partIndex + 1}</h2>
        <div class="test-panel__item">
          <h4 class="test-panel__question-title">Questions ${from}-${to}</h4>
          ${Array.from({ length: to - from + 1 }, (_, index) => {
            const number = from + index
            return `<p><b class="iot-question-number">${number}.</b><select data-num="${number}"><option value=""> </option><option value="A">A</option></select> Prompt for question ${number}</p>`
          }).join("")}
        </div>
      </section>
    `).join("")
    const upstreamReadingHtml = `<div id="split-one">${passageSections}</div><div id="split-two">${questionPanels}</div>`

    const sections = parsePageSections(upstreamReadingHtml, "reading", new Map())

    expect(sections).toHaveLength(3)
    expect(sections[0].passageText).toBe("A. Actual passage text for part 1. B. More passage text for part 1.")
    expect(sections[0].passageText).not.toContain("Questions")
    expect(sections[0].questions.map((question) => question.number)).toEqual(
      Array.from({ length: 13 }, (_, index) => index + 1)
    )
    expect(sections[0].questions[0].prompt).toBe("Prompt for question 1")
    expect(sections[1].questions[0].number).toBe(14)
    expect(sections[2].questions.at(-1)?.number).toBe(40)
  })
})
