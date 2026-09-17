import test from "node:test"
import assert from "node:assert/strict"

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
}

function cleanText(raw) {
  return decodeHtml(
    raw
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim()
}

function cleanPromptText(raw) {
  const text = cleanText(raw)
  return text
    .replace(/^(?:Question\s*)?\d{1,2}[\.:\-\)]\s*/i, "")
    .replace(/^[A-D][\.:\-\)]\s*/, "")
    .trim()
}

function parseScopedQuestions(panelHtml, skill, answers) {
  const questions = []
  const seenNumbers = new Set()

  function addQuestion(q) {
    if (!q || q.number <= 0 || seenNumbers.has(q.number)) return
    seenNumbers.add(q.number)
    questions.push(q)
  }

  const smGroups = [
    ...panelHtml.matchAll(
      /<div[^>]+class=["'][^"']*test-panel__question-sm-group[^"']*["'][^>]*data-num=["'](\d+)["'][\s\S]*?(?=<div[^>]+class=["'][^"']*test-panel__question-sm-group|<div[^>]+class=["'][^"']*test-panel__item|<\/section|$)/gi
    ),
  ]
  for (const match of smGroups) {
    const num = Number(match[1])
    const block = match[0]
    const titleMatch = block.match(
      /<div[^>]+class=["'][^"']*test-panel__question-sm-title[^"']*["']>([\s\S]*?)<\/div>/i
    )
    const prompt = titleMatch ? cleanPromptText(titleMatch[1]) : `Question ${num}`

    const optionMatches = [
      ...block.matchAll(
        /<div[^>]+class=["'][^"']*test-panel__answer-item[^"']*["']>([\s\S]*?)<\/div>/gi
      ),
    ]
    const options = optionMatches
      .map((m) => {
        const optCode = m[1]
          .match(/<span[^>]+class=["'][^"']*test-panel__answer-option[^"']*["']>([^<]+)<\/span>/i)?.[1]
          ?.trim()
        const text = cleanText(
          m[1].replace(/<span[^>]+class=["'][^"']*test-panel__answer-option[^"']*[\s\S]*?<\/span>/i, "")
        )
        return optCode ? `${optCode}. ${text}` : text
      })
      .filter(Boolean)

    addQuestion({
      id: `${skill}-q${num}`,
      number: num,
      type: "single_choice",
      prompt,
      options: options.length > 0 ? options : undefined,
      answer: answers.get(num) ?? "",
    })
  }

  const selectMatches = [
    ...panelHtml.matchAll(/<p[^>]*>([\s\S]*?<select[^>]+data-num=["'](\d+)["'][\s\S]*?)<\/p>/gi),
  ]
  for (const match of selectMatches) {
    const pContent = match[1]
    const num = Number(match[2])
    const selectTag = pContent.match(/<select[\s\S]*?<\/select>/i)?.[0] || ""
    const optMatches = [
      ...selectTag.matchAll(/<option[^>]*value=["']([^"']+)["'][^>]*>([\s\S]*?)<\/option>/gi),
    ]
    const options = optMatches.map((m) => m[1].trim()).filter((val) => val.length > 0)
    const withoutSelect = pContent.replace(/<select[\s\S]*?<\/select>/gi, " [input] ")
    const prompt = cleanPromptText(withoutSelect)

    addQuestion({
      id: `${skill}-q${num}`,
      number: num,
      type: options.length > 0 ? "single_choice" : "fill_in_blank",
      prompt: prompt.includes("[input]") ? prompt : `${prompt} [input]`,
      options: options.length > 0 ? options : undefined,
      answer: answers.get(num) ?? "",
    })
  }

  const trMatches = [...panelHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  for (const match of trMatches) {
    const trContent = match[1]
    const inputMatches = [...trContent.matchAll(/<input[^>]+data-num=["'](\d+)["'][^>]*>/gi)]
    if (inputMatches.length === 0) continue

    for (const inp of inputMatches) {
      const num = Number(inp[1])
      let rowReplaced = trContent.replace(
        /<span[^>]+class=["'][^"']*test-panel__question-num[^"']*["']>[\s\S]*?<\/span>/gi,
        ""
      )
      rowReplaced = rowReplaced.replace(
        new RegExp(`<input[^>]+data-num=["']${num}["'][^>]*>`, "gi"),
        " [input] "
      )
      rowReplaced = rowReplaced.replace(/<input[^>]+data-num=["']\d+["'][^>]*>/gi, " ___ ")
      const prompt = cleanPromptText(rowReplaced)

      addQuestion({
        id: `${skill}-q${num}`,
        number: num,
        type: "fill_in_blank",
        prompt: prompt.includes("[input]") ? prompt : `${prompt} [input]`,
        answer: answers.get(num) ?? "",
      })
    }
  }

  return questions.sort((a, b) => a.number - b.number)
}

test("parseScopedQuestions creates clean prompt with [input] and without raw HTML or leaked tags", () => {
  const sampleTableHtml = `
    <table style="width:100%;">
      <tr>
        <td valign="top"><p>First name</p></td>
        <td valign="top"><p><span class="test-panel__iotquestion"> <span class="test-panel__question-num">1</span> <input type="text" class="iot-question" data-num="1" id="q-1"></span></p></td>
      </tr>
      <tr>
        <td valign="top"><p>Passport number</p></td>
        <td valign="top"><p><span class="test-panel__iotquestion"> <span class="test-panel__question-num">2</span> <input type="text" class="iot-question" data-num="2" id="q-2"></span></p></td>
      </tr>
    </table>
  `
  const answers = new Map([[1, "Keiko"], [2, "JO6337"]])
  const questions = parseScopedQuestions(sampleTableHtml, "listening", answers)

  assert.equal(questions.length, 2)
  assert.equal(questions[0].number, 1)
  assert.equal(questions[0].prompt, "First name [input]")
  assert.equal(questions[0].answer, "Keiko")
  assert.ok(!questions[0].prompt.includes("<input"))
  assert.ok(!questions[0].prompt.includes("test-panel"))

  assert.equal(questions[1].number, 2)
  assert.equal(questions[1].prompt, "Passport number [input]")
  assert.equal(questions[1].answer, "JO6337")
})

test("parseScopedQuestions extracts choice questions without polluting prompt", () => {
  const sampleChoiceHtml = `
    <div class="test-panel__question-sm-group" data-num="31">
      <div class="test-panel__question-sm-title">31. What does the lecturer provide for extra reading?</div>
      <div class="test-panel__answer">
        <div class="test-panel__answer-item"><span class="test-panel__answer-option">A</span> Personal contacts</div>
        <div class="test-panel__answer-item"><span class="test-panel__answer-option">B</span> Reading list</div>
      </div>
    </div>
  `
  const answers = new Map([[31, "B"]])
  const questions = parseScopedQuestions(sampleChoiceHtml, "listening", answers)

  assert.equal(questions.length, 1)
  assert.equal(questions[0].number, 31)
  assert.equal(questions[0].type, "single_choice")
  assert.equal(questions[0].prompt, "What does the lecturer provide for extra reading?")
  assert.deepEqual(questions[0].options, ["A. Personal contacts", "B. Reading list"])
  assert.equal(questions[0].answer, "B")
})
