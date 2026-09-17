import { describe, it, expect } from "vitest"
import { extractInstructionsFromHtml, parseScopedQuestions, parsePageSections, extractAudioTimestamp } from "@/lib/iot-parser"

describe("Listening Part 1 parser enhancements", () => {
  const samplePart1Html = `
    <section class="test-panel" data-panel="1">
      <div class="test-panel__heading"><h2 class="test-panel__title">Part 1</h2></div>
      <div class="test-panel__audio-btn"><button>Listen from here (00:00)</button></div>
      <div class="test-panel__item">
        <div class="test-panel__instruction">
          <p><em>Complete the form below.</em></p>
          <p><em>Write <span style="color:#ff0000;"><strong>NO MORE THAN TWO WORDS AND/OR A NUMBER</strong></span> for each answer.</em></p>
        </div>
        <table style="width:100%;">
          <tbody>
            <tr>
              <td>
                <p><strong>Southern Rental Car – booking</strong></p>
                <p><strong>Name:</strong> William <span class="test-panel__iotquestion"><span class="test-panel__question-num">1</span><input type="text" data-num="1" id="q-1"></span></p>
                <p><strong>Address:</strong> 10 <span class="test-panel__iotquestion"><span class="test-panel__question-num">2</span><input type="text" data-num="2" id="q-2"></span> Nelson</p>
                <p><strong>Contact number:</strong> 07 <span class="test-panel__iotquestion"><span class="test-panel__question-num">3</span><input type="text" data-num="3" id="q-3"></span></p>
                <p><strong>Payment by credit card type:</strong> <span class="test-panel__iotquestion"><span class="test-panel__question-num">4</span><input type="text" data-num="4" id="q-4"></span> card.</p>
                <p><strong>Card No.</strong> 4550 1392 8309 3221</p>
                <p><strong>Expiry date:</strong> 07/22</p>
                <p><strong>Rental period:</strong> <span class="test-panel__iotquestion"><span class="test-panel__question-num">5</span><input type="text" data-num="5" id="q-5"></span> days</p>
                <p><strong>Pick-up date:</strong> 15th July</p>
                <p><strong>Pick-up time:</strong> 9:00 am</p>
                <p><strong>Extra equipment:</strong> Child car seat</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="test-panel__item">
        <div class="test-panel__instruction">
          <p><em>Answer the following questions <span style="color:#ff0000;"><strong>USING NO MORE THAN TWO WORDS OR A NUMBER</strong></span></em></p>
        </div>
        <p>How much is the car per day?</p>
        <p><span class="test-panel__iotquestion"><span class="test-panel__question-num">6</span><input type="text" data-num="6" id="q-6"></span></p>
        <p>What does the price include?</p>
        <p><span class="test-panel__iotquestion"><span class="test-panel__question-num">7</span><input type="text" data-num="7" id="q-7"></span></p>
        <p>Who will he be visiting?</p>
        <p><span class="test-panel__iotquestion"><span class="test-panel__question-num">8</span><input type="text" data-num="8" id="q-8"></span></p>
        <p>What kind of car does the agent recommend?</p>
        <p><span class="test-panel__iotquestion"><span class="test-panel__question-num">9</span><input type="text" data-num="9" id="q-9"></span></p>
        <p>What does he need to collect the car?</p>
        <p><span class="test-panel__iotquestion"><span class="test-panel__question-num">10</span><input type="text" data-num="10" id="q-10"></span></p>
      </div>
    </section>
  `

  it("extractInstructionsFromHtml extracts clean instructions without audio buttons or questions", () => {
    const instructions = extractInstructionsFromHtml(samplePart1Html)
    expect(instructions).toBeDefined()
    expect(instructions).toContain("Complete the form below")
    expect(instructions).toContain("NO MORE THAN TWO WORDS AND/OR A NUMBER")
    expect(instructions).toContain("Answer the following questions")

    // Must NOT contain audio button or test form content
    expect(instructions).not.toContain("Listen from here")
    expect(instructions).not.toContain("Southern Rental Car")
    expect(instructions).not.toContain("William")
    expect(instructions).not.toContain("4550 1392")
  })

  it("parseScopedQuestions parses form-style questions 1-5 line by line without repeating entire form", () => {
    const answers = new Map<number, string>([
      [1, "Davis"],
      [2, "Green"],
      [3, "7654321"],
      [4, "Visa"],
      [5, "3"],
      [6, "$40"],
      [7, "insurance"],
      [8, "family"],
      [9, "economy"],
      [10, "license"],
    ])

    const questions = parseScopedQuestions(samplePart1Html, "listening", answers)
    expect(questions).toHaveLength(10)

    // Questions 1 to 5: verify individual line prompts
    expect(questions[0].number).toBe(1)
    expect(questions[0].prompt).toBe("Name: William [input]")
    expect(questions[0].prompt).not.toContain("Address:")
    expect(questions[0].prompt).not.toContain("Southern Rental Car")

    expect(questions[1].number).toBe(2)
    expect(questions[1].prompt).toBe("Address: 10 [input] Nelson")
    expect(questions[1].prompt).not.toContain("Name:")

    expect(questions[2].number).toBe(3)
    expect(questions[2].prompt).toBe("Contact number: 07 [input]")

    expect(questions[3].number).toBe(4)
    expect(questions[3].prompt).toBe("Payment by credit card type: [input] card.")

    expect(questions[4].number).toBe(5)
    expect(questions[4].prompt).toBe("Rental period: [input] days")

    // Questions 6 to 10: verify preceding paragraph prompt association
    expect(questions[5].number).toBe(6)
    expect(questions[5].prompt).toBe("How much is the car per day? [input]")

    expect(questions[6].number).toBe(7)
    expect(questions[6].prompt).toBe("What does the price include? [input]")

    expect(questions[7].number).toBe(8)
    expect(questions[7].prompt).toBe("Who will he be visiting? [input]")

    expect(questions[8].number).toBe(9)
    expect(questions[8].prompt).toBe("What kind of car does the agent recommend? [input]")

    expect(questions[9].number).toBe(10)
    expect(questions[9].prompt).toBe("What does he need to collect the car? [input]")
  })

  it("parsePageSections creates clean section with concise instruction", () => {
    const answers = new Map<number, string>()
    const sections = parsePageSections(samplePart1Html, "listening", answers)

    expect(sections).toHaveLength(1)
    expect(sections[0].title).toBe("Part 1")
    expect(sections[0].instructions).toBeDefined()
    expect(sections[0].instructions).not.toContain("Listen from here")
    expect(sections[0].instructions).not.toContain("Southern Rental Car")
    expect(sections[0].questions).toHaveLength(10)
  })

  it("extractAudioTimestamp parses data-time attributes and Listen from here (MM:SS) strings", () => {
    expect(extractAudioTimestamp('<button data-time="125">Listen</button>')).toBe(125)
    expect(extractAudioTimestamp('<span data-audio-time="90">Audio</span>')).toBe(90)
    expect(extractAudioTimestamp("<button>Listen from here (02:15)</button>")).toBe(135)
    expect(extractAudioTimestamp("<p>Audio (00:00)</p>")).toBe(0)
    expect(extractAudioTimestamp("<p>No audio reference</p>")).toBeUndefined()
  })
})
