import {
  PracticeTest,
  PracticeSection,
  UniversalQuestion,
  generateTitleSlug,
  type PracticeExample,
  type PracticeGrid,
  type QuestionAnswer,
} from "@/lib/ielts"

const IOT_BASE_URL = "https://ieltsonlinetests.com"

export interface ScrapedCardMeta {
  title: string
  href: string
  duration?: number
  quizId?: string
  mode?: string
  simulationMode?: string
  questionsUrl?: string
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
}

export function parseCardsFromHtml(html: string, skill: "listening" | "reading" | "writing"): ScrapedCardMeta[] {
  const cards: ScrapedCardMeta[] = []
  const buttonRegex = /<button[^>]*class=["'][^"']*practice-item[^"']*["'][^>]*>([\s\S]*?)<\/button>/gi
  let match: RegExpExecArray | null

  while ((match = buttonRegex.exec(html)) !== null) {
    const fullTag = match[0]
    const content = match[1]
    const hrefMatch = fullTag.match(/data-href=["']([^"']+)["']/i) || fullTag.match(/href=["']([^"']+)["']/i)
    const titleMatch = content.match(/<h[1-6][^>]*class=["'][^"']*pack-title[^"']*["'][^>]*>([^<]+)<\/h[1-6]>/i) || content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i)
    const durMatch = fullTag.match(/data-duration=["']([^"']+)["']/i)
    const quizMatch = fullTag.match(/data-get-questions=["']([^"']*)["']/i)

    if (titleMatch && hrefMatch) {
      const questionsUrl = quizMatch
        ? quizMatch[1].startsWith("http") ? quizMatch[1] : `${IOT_BASE_URL}${quizMatch[1]}`
        : undefined
      cards.push({
        title: stripTags(titleMatch[1]),
        href: hrefMatch[1].trim(),
        duration: durMatch ? parseInt(durMatch[1], 10) : undefined,
        quizId: questionsUrl?.match(/(\d+)$/)?.[1],
        questionsUrl,
        mode: skill,
      })
    }
  }

  if (cards.length === 0) {
    const linkRegex = /<a[^>]+href=["'](\/(?:ielts-mock-test|ielts-[^"']+practice-test)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1]
      const title = stripTags(match[2])
      if (title && !cards.some((card) => card.href === href)) {
        cards.push({
          title,
          href: href.startsWith("http") ? href : `${IOT_BASE_URL}${href}`,
          mode: skill,
        })
      }
    }
  }

  return cards
}

export function parsePaginationUrls(html: string, currentUrl: string): string[] {
  const urls: string[] = []
  const pageRegex = /<a[^>]+href=["']([^"']*(?:\?|&)page=\d+[^"']*)["']/gi
  let match: RegExpExecArray | null

  while ((match = pageRegex.exec(html)) !== null) {
    let target = match[1].replace(/&amp;/g, "&")
    if (target.startsWith("/")) target = `${IOT_BASE_URL}${target}`
    if (!urls.includes(target) && target !== currentUrl) urls.push(target)
  }

  return urls
}

export function parseAnswerMap(html: string): Map<number, string | number | (string | number)[]> {
  const answers = new Map<number, string | number | (string | number)[]>()

  // Pattern 1 (High precision from official solution markup):
  // <li class="list-answer-item..."><span class="number"> 1 </span> <span class="sys-answer">Keiko </span></li>
  const itemRegex =
    /<li[^>]*class=["'][^"']*list-answer-item[^"']*["'][\s\S]*?<span[^>]*class=["'][^"']*number[^"']*["']>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class=["'][^"']*sys-answer[^"']*["']>([\s\S]*?)<\/span>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(html)) !== null) {
    const numberText = stripTags(match[1])
    const val = stripTags(match[2])
    const range = numberText.match(/(\d+)\s*[-–]\s*(\d+)/)
    if (range && val) {
      const answer = val.split(/\s*(?:,|\/|\band\b)\s*/i).map((part) => part.trim()).filter(Boolean)
      const numbers = Array.from({ length: Number(range[2]) - Number(range[1]) + 1 }, (_, index) => Number(range[1]) + index)
      numbers.forEach((number) => answers.set(number, answer))
      continue
    }
    const num = Number(numberText)
    if (num > 0 && val && !answers.has(num)) answers.set(num, val)
  }

  // Pattern 2 (Fallback if solution list not present):
  if (answers.size === 0) {
    const text = stripTags(html)
    const patterns = [
      /(?:question\s*)?(\d{1,2})\s*(?:answer|correct answer)\s*[:\-]\s*([^\n]+?)(?=\s+(?:question\s*)?\d{1,2}\s*(?:answer|correct answer)\s*[:\-]|$)/gi,
      /(\d{1,2})\s*[:\-]\s*([A-D]|[^\n,]{1,80})/gi,
    ]

    for (const answerRegex of patterns) {
      let m: RegExpExecArray | null
      while ((m = answerRegex.exec(text)) !== null) {
        const number = Number(m[1])
        const value = m[2].trim()
        if (number > 0 && value && !answers.has(number)) answers.set(number, value)
      }
    }
  }

  return answers
}

function cleanText(raw: string): string {
  return decodeHtml(
    raw
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim()
}

function cleanPromptText(raw: string): string {
  const text = cleanText(raw)
  return text
    .replace(/^(?:Question\s*)?\d{1,2}[\.:\-\)]\s*/i, "")
    .replace(/^[A-D][\.:\-\)]\s*/, "")
    .trim()
}

function parseAnswerValue(value: string): QuestionAnswer {
  const cleaned = value.trim()
  if (!cleaned.includes(",") && !/\s+and\s+/i.test(cleaned)) return cleaned
  return cleaned
    .split(/\s*(?:,|\/|\band\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean)
}

function extractAudioTimestamp(raw: string): number | undefined {
  const value = raw.match(/data-time=["'](\d+(?:\.\d+)?)["']/i)?.[1]
  return value ? Number(value) : undefined
}

function extractQuestionGroup(raw: string, firstNumber: number): UniversalQuestion["group"] | undefined {
  const range = raw.match(/(?:question(?:s)?\s*)?(\d+)\s*[-–]\s*(\d+)/i)
  const minAnswers = raw.match(/(?:mark|choose|select)\s+(?:the\s+)?(?:three|3|two|2|four|4)\s+(?:letter|letters|answer|answers)/i)?.[0]
  if (!range && !minAnswers) return undefined
  const min = minAnswers?.match(/(?:three|3)/i) ? 3 : minAnswers?.match(/(?:two|2)/i) ? 2 : minAnswers?.match(/(?:four|4)/i) ? 4 : undefined
  return {
    answerRange: range ? [Number(range[1]), Number(range[2])] : [firstNumber, firstNumber],
    minAnswers: min,
    maxAnswers: min,
  }
}

function parseScopedQuestions(
  panelHtml: string,
  skill: "listening" | "reading" | "writing",
  answers: Map<number, string | number | (string | number)[]>
): UniversalQuestion[] {
  const questions: UniversalQuestion[] = []
  const seenNumbers = new Set<number>()

  function addQuestion(q: UniversalQuestion) {
    if (!q || q.number <= 0 || seenNumbers.has(q.number)) return
    seenNumbers.add(q.number)
    questions.push(q)
  }

  // 1. Multiple choice groups: test-panel__question-sm-group
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
    const answer = parseAnswerValue(String(answers.get(num) ?? ""))

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
      type: Array.isArray(answer) ? "multiple_choice" : options.some((option) => /\b(?:true|false|not given|yes|no)\b/i.test(option)) ? "true_false" : "single_choice",
      prompt,
      options: options.length > 0 ? options : undefined,
      answer,
      audioTimestamp: extractAudioTimestamp(block),
      group: extractQuestionGroup(`${titleMatch?.[1] || ""} ${block}`, num),
    })
  }

  // 2. Dropdown / select questions (<select data-num="X">)
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
      answer: parseAnswerValue(String(answers.get(num) ?? "")),
    })
  }

  // 3. Table rows with fill-in-blank (<tr...>)
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
        answer: parseAnswerValue(String(answers.get(num) ?? "")),
      })
    }
  }

  // 4. Paragraphs with fill-in-blank (<p...>)
  const pMatches = [...panelHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
  for (const match of pMatches) {
    const pContent = match[1]
    const inputMatches = [...pContent.matchAll(/<input[^>]+data-num=["'](\d+)["'][^>]*>/gi)]
    if (inputMatches.length === 0) continue

    for (const inp of inputMatches) {
      const num = Number(inp[1])
      let pReplaced = pContent.replace(
        /<span[^>]+class=["'][^"']*test-panel__question-num[^"']*["']>[\s\S]*?<\/span>/gi,
        ""
      )
      pReplaced = pReplaced.replace(
        new RegExp(`<input[^>]+data-num=["']${num}["'][^>]*>`, "gi"),
        " [input] "
      )
      pReplaced = pReplaced.replace(/<input[^>]+data-num=["']\d+["'][^>]*>/gi, " ___ ")
      const prompt = cleanPromptText(pReplaced)

      addQuestion({
        id: `${skill}-q${num}`,
        number: num,
        type: "fill_in_blank",
        prompt: prompt.includes("[input]") ? prompt : `${prompt} [input]`,
        answer: parseAnswerValue(String(answers.get(num) ?? "")),
      })
    }
  }

  // 5. Checkbox questions (e.g. data-num="6" or data-num="28-30" or data-num="18-22")
  const cbMatches = [
    ...panelHtml.matchAll(/<input[^>]+type=["']checkbox["'][^>]*data-num=["']([^"']+)["'][^>]*>/gi),
  ]
  for (const match of cbMatches) {
    const numRaw = match[1]
    const numParts = numRaw.split("-").map(Number)
    const startNum = numParts[0]
    const endNum = numParts.length > 1 ? numParts[1] : startNum

    const itemBlockMatch = panelHtml.match(
      new RegExp(
        `<div[^>]+class=["'][^"']*test-panel__item[^"']*["'][\\s\\S]*?data-num=["']${numRaw}["'][\\s\\S]*?(?=<div[^>]+class=["'][^"']*test-panel__item|<\\/section|$)`,
        "i"
      )
    )
    const itemBlock = itemBlockMatch ? itemBlockMatch[0] : ""
    const titleMatch = itemBlock.match(
      /<h[1-6][^>]*class=["'][^"']*test-panel__question-title[^"']*["']>([\s\S]*?)<\/h[1-6]>/i
    )
    const descMatch = itemBlock.match(
      /<div[^>]+class=["'][^"']*test-panel__question-desc[^"']*["']>([\s\S]*?)<\/div>/i
    )
    const prompt = cleanPromptText(
      `${titleMatch ? titleMatch[1] : ""} ${descMatch ? descMatch[1] : ""}`
    )

    const optionMatches = [
      ...itemBlock.matchAll(
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

    const groupAnswer = parseAnswerValue(String(answers.get(startNum) ?? ""))
    const group = { answerRange: [startNum, endNum] as [number, number], minAnswers: endNum - startNum + 1, maxAnswers: endNum - startNum + 1 }
    for (let num = startNum; num <= endNum; num++) {
      if (seenNumbers.has(num)) continue
      addQuestion({
        id: `${skill}-q${num}`,
        number: num,
        type: startNum === endNum ? "single_choice" : "multiple_choice",
        prompt: prompt || `Question ${num}`,
        options: options.length > 0 ? options : undefined,
        answer: answers.has(num) ? parseAnswerValue(String(answers.get(num))) : groupAnswer,
        audioTimestamp: extractAudioTimestamp(itemBlock),
        group,
      })
    }
  }

  return questions.sort((a, b) => a.number - b.number)
}

function parsePageSections(html: string, skill: "listening" | "reading" | "writing", answers: Map<number, string | number | (string | number)[]>): PracticeSection[] {
  const sections: PracticeSection[] = []
  const audioUrls = [...html.matchAll(/<source[^>]+src=["']([^"']+)["']/gi)].map((match) => decodeHtml(match[1]))
  const panelMatches = [...html.matchAll(/<section[^>]+class=["'][^"']*test-panel[^"']*["'][\s\S]*?<\/section>/gi)]
  const panels = panelMatches.length > 0 ? panelMatches.map((match) => match[0]) : [html]

  panels.forEach((panel, panelIndex) => {
    const questions = parseScopedQuestions(panel, skill, answers)
    if (questions.length === 0) return

    const title = stripTags(panel.match(/<h2[^>]*class=["'][^"']*test-panel__title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i)?.[1] || "") || `Part ${panelIndex + 1}`
    const examples: PracticeExample[] = [...panel.matchAll(/<p[^>]*>\s*(?:example|sample)\s*:?\s*([\s\S]*?)<\/p>/gi)]
      .map((match) => ({ prompt: cleanText(match[1]) }))
      .filter((example) => example.prompt)
    const gridRows = [...panel.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((match) => [...match[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => ({
        text: cleanText(cell[1].replace(/<input[^>]*>/gi, " [input] ")),
        number: Number(cell[1].match(/data-num=["'](\d+)["']/i)?.[1]) || null,
      })))
      .filter((row) => row.length > 0)
    const grid: PracticeGrid | undefined = gridRows.length > 1
      ? {
          headers: gridRows[0].map((cell) => cell.text),
          rows: gridRows.slice(1).map((row) => ({
            cells: row.map((cell) => cell.text),
            questionIds: row.map((cell) => cell.number ? `${skill}-q${cell.number}` : null),
          })),
        }
      : undefined
    sections.push({
      id: `sec-${panelIndex + 1}`,
      title,
      instructions: stripTags(panel).slice(0, 500),
      passageText: skill === "reading" ? stripTags(panel) : undefined,
      audioUrl: audioUrls[panelIndex] || audioUrls[0],
      audioTimestamp: extractAudioTimestamp(panel),
      examples: examples.length > 0 ? examples : undefined,
      grid,
      questions,
    })
  })

  if (sections.length === 0) {
    const numbers = [...html.matchAll(/data-num=["'](\d+)["']/gi)]
      .map((match) => Number(match[1]))
      .filter((number, index, values) => number > 0 && values.indexOf(number) === index)
      .sort((a, b) => a - b)
    if (numbers.length) {
      sections.push({
        id: "sec-1",
        title: skill === "listening" ? "Listening test" : "Reading passage",
        instructions: "Complete all questions.",
        passageText: skill === "reading" ? stripTags(html).slice(0, 5000) : undefined,
        audioUrl: audioUrls[0],
        questions: numbers.map((number) => ({
          id: `${skill}-q${number}`,
          number,
          type: "fill_in_blank" as const,
          prompt: `Question ${number} [input]`,
          answer: (answers.get(number) ?? "") as QuestionAnswer,
        })),
      })
    }
  }

  return sections
}

export function parsePracticeTestPage(html: string, card: ScrapedCardMeta, skill: "listening" | "reading" | "writing"): PracticeTest {
  const answers = parseAnswerMap(html)
  const sections = parsePageSections(html, skill, answers)
  const sourceUrl = card.href.startsWith("http") ? card.href : `${IOT_BASE_URL}${card.href}`
  return {
    id: `iot-${skill}-${card.quizId || encodeURIComponent(card.title.toLowerCase().replace(/\s+/g, "-"))}`,
    slug: generateTitleSlug(card.title, card.quizId),
    title: card.title,
    skill,
    durationMinutes: card.duration || (skill === "listening" ? 30 : 60),
    sourceUrl,
    upstreamQuizId: card.quizId,
    questionsUrl: card.questionsUrl,
    sections,
  }
}

export function cardToPracticeTest(card: ScrapedCardMeta, skill: "listening" | "reading" | "writing"): PracticeTest {
  const test = parsePracticeTestPage("", card, skill)
  return {
    ...test,
    sections: [{
      id: "sec-1",
      title: `${card.title} - Practice Section`,
      instructions: `Authentic IELTS Practice mode for ${skill}. Standard official time applies.`,
      questions: [],
    }],
    writingTasks: skill === "writing" ? {
      task1Prompt: `Academic / General Training Task 1 for ${card.title}. (Summarise information, 150 words minimum).`,
      task2Prompt: `Task 2 Essay for ${card.title}. (Present arguments and conclusions, 250 words minimum).`,
      task1MinWords: 150,
      task2MinWords: 250,
    } : undefined,
  }
}
