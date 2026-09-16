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

function isQuestionInstruction(text: string): boolean {
  return /^(?:the\s+text\s+has\s+\d+\s+paragraphs?|which\s+paragraph|complete\s+the\s+following|do\s+the\s+following\s+statements?|do\s+the\s+statements?|in\s+boxes\s+\d+\s*[-–]\s*\d+|according\s+to\s+(?:the\s+)?(?:text|information)|for\s+each\s+question)/i.test(text.trim())
}

function normalizeQuestionPrompt(raw: string, number: number, hasInput: boolean): string {
  let text = cleanPromptText(raw)
  const numberPrefix = new RegExp(`^${number}[\\.:\\-\\)]\\s*`)
  text = text.replace(numberPrefix, "").replace(/^\d{1,2}[\.:\-\)]\s*/, "").trim()

  if (hasInput) {
    const inputIndex = text.indexOf("[input]")
    const beforeInput = inputIndex >= 0 ? text.slice(0, inputIndex).trim() : ""
    if (isQuestionInstruction(beforeInput)) {
      text = text.slice(inputIndex + "[input]".length).trim()
    }
    text = text.replace(/\s*\[input\]\s*/g, " ").replace(/\s+/g, " ").trim()
  }

  return text
}

const READING_PASSAGE_RE = /<(?:div|section)[^>]*class=["'][^"']*(?:field--name-field-passage|reading-passage)(?:\s[^"']*)?["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi

export function extractReadingPassage(panelHtml: string): string | undefined {
  const passageMatch = READING_PASSAGE_RE.exec(panelHtml)
  READING_PASSAGE_RE.lastIndex = 0
  if (!passageMatch) return undefined
  return cleanText(passageMatch[1]) || undefined
}

function extractReadingPassages(html: string): string[] {
  return [...html.matchAll(READING_PASSAGE_RE)]
    .map((match) => cleanText(match[1]))
    .filter(Boolean)
}

function parseAnswerValue(value: string): QuestionAnswer {
  const cleaned = value.trim()
  if (!cleaned.includes(",") && !/\s+and\s+/i.test(cleaned)) return cleaned
  return cleaned
    .split(/\s*(?:,|\/|\band\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function extractAudioTimestamp(raw: string): number | undefined {
  const dataTime = raw.match(/data-(?:audio-)?time=["'](\d+(?:\.\d+)?)["']/i)?.[1]
  if (dataTime) return Number(dataTime)

  const textTime = raw.match(/(?:listen\s+from\s+here|listen|audio)\s*\(?(\d{1,2}):(\d{2})\)?/i)
  if (textTime) {
    const mins = Number(textTime[1])
    const secs = Number(textTime[2])
    return mins * 60 + secs
  }
  return undefined
}

function extractQuestionGroup(raw: string, firstNumber: number): UniversalQuestion["group"] | undefined {
  const range = raw.match(/(?:question(?:s)?\s*)?(\d+)\s*[-–]\s*(\d+)/i)
  const minAnswers = raw.match(/(?:mark|choose|select)\s+(?:the\s+)?(?:three|3|two|2|four|4)\s+(?:letter|letters|answer|answers)/i)?.[0]
  const audioTimestamp = extractAudioTimestamp(raw)
  if (!range && !minAnswers && audioTimestamp === undefined) return undefined
  const min = minAnswers?.match(/(?:three|3)/i) ? 3 : minAnswers?.match(/(?:two|2)/i) ? 2 : minAnswers?.match(/(?:four|4)/i) ? 4 : undefined
  return {
    answerRange: range ? [Number(range[1]), Number(range[2])] : [firstNumber, firstNumber],
    minAnswers: min,
    maxAnswers: min,
    audioTimestamp,
  }
}

export function extractInstructionsFromHtml(html: string): string | undefined {
  const instructions: string[] = []
  const seen = new Set<string>()

  // 1. Explicit instruction containers
  const divMatches = [
    ...html.matchAll(
      /<div[^>]*class=["'][^"']*(?:test-panel__instruction|test-panel__desc|test-panel__guide)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi
    ),
  ]
  for (const m of divMatches) {
    const raw = m[1]
    if (/<input/i.test(raw)) continue
    const text = cleanText(raw).replace(/Listen from here\s*(?:\(\d+:\d+\))?/gi, "").trim()
    if (text.length > 5 && !seen.has(text)) {
      seen.add(text)
      instructions.push(text)
    }
  }

  // 2. Paragraphs with IELTS instruction patterns
  const pMatches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
  const instructionPattern =
    /\b(?:complete\s+the\s+(?:form|notes?|table|summary|sentences?|diagram|plan|map|flow-chart)|write\s+no\s+more\s+than|no\s+more\s+than\s+(?:one|two|three|\d+)\s+words|answer\s+the\s+(?:following\s+)?questions|choose\s+(?:the\s+correct|two|three|\d+)\s+(?:letter|letters|answer)|which\s+(?:paragraph|statement)\s+contains|in\s+boxes\s+\d+[-–]\d+)\b/i

  for (const m of pMatches) {
    const raw = m[1]
    if (/<input/i.test(raw)) continue
    if (instructionPattern.test(raw)) {
      const text = cleanText(raw).replace(/Listen from here\s*(?:\(\d+:\d+\))?/gi, "").trim()
      if (text.length > 5 && !seen.has(text)) {
        seen.add(text)
        instructions.push(text)
      }
    }
  }

  if (instructions.length === 0) return undefined
  return instructions.join(" ")
}

function findPrecedingPrompt(
  pMatches: RegExpMatchArray[],
  currentIndex: number,
  panelHtml: string,
  matchIndex?: number
): string {
  // 1. Check preceding <p> elements
  for (let k = currentIndex - 1; k >= Math.max(0, currentIndex - 3); k--) {
    const raw = pMatches[k][1]
    if (/<input/i.test(raw)) break
    const text = cleanPromptText(raw)
    const isInstruction =
      /^(?:write\s+no\s+more|complete\s+the|choose\s+the\s+correct|answer\s+the\s+following\s+questions)/i.test(
        text
      )
    if (text.length > 0 && !isInstruction) {
      return text
    }
  }

  // 2. Fallback: check preceding heading/div in HTML slice
  if (matchIndex !== undefined && matchIndex > 0) {
    const sliceBefore = panelHtml.slice(Math.max(0, matchIndex - 500), matchIndex)
    const headingMatches = [
      ...sliceBefore.matchAll(/<(?:h[3-6]|div|p|li)[^>]*>([\s\S]*?)<\/(?:h[3-6]|div|p|li)>/gi),
    ]
    for (let k = headingMatches.length - 1; k >= 0; k--) {
      const raw = headingMatches[k][1]
      if (/<input/i.test(raw)) break
      const text = cleanPromptText(raw)
      const isInstruction =
        /^(?:write\s+no\s+more|complete\s+the|choose\s+the\s+correct|answer\s+the\s+following\s+questions)/i.test(
          text
        )
      if (text.length > 0 && !isInstruction) {
        return text
      }
    }
  }

  return ""
}

export function parseScopedQuestions(
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
    const prompt = normalizeQuestionPrompt(withoutSelect, num, true)

    addQuestion({
      id: `${skill}-q${num}`,
      number: num,
      type: options.length > 0 ? "single_choice" : "fill_in_blank",
      prompt,
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

    // If table row contains multiple <p> tags with inputs, delegate to paragraph parser
    if (inputMatches.length > 1 && /<p[^>]*>[\s\S]*?<input/i.test(trContent)) {
      continue
    }

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

      const qTimestamp = extractAudioTimestamp(
        panelHtml.slice(Math.max(0, (match.index ?? 0) - 300), (match.index ?? 0) + match[0].length)
      )
      addQuestion({
        id: `${skill}-q${num}`,
        number: num,
        type: "fill_in_blank",
        prompt: prompt.includes("[input]") ? prompt : `${prompt} [input]`,
        answer: parseAnswerValue(String(answers.get(num) ?? "")),
        audioTimestamp: qTimestamp,
      })
    }
  }

  // 4. Paragraphs with fill-in-blank (<p...>)
  const pMatches = [...panelHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
  for (let pIndex = 0; pIndex < pMatches.length; pIndex++) {
    const pMatch = pMatches[pIndex]
    const pContent = pMatch[1]
    const inputMatches = [...pContent.matchAll(/<input[^>]+data-num=["'](\d+)["'][^>]*>/gi)]
    if (inputMatches.length === 0) continue

    // If <p> contains <br> separating multiple lines, split by <br>
    const lines = pContent.includes("<br") ? pContent.split(/<br\s*\/?>/i) : [pContent]
    for (const line of lines) {
      const lineInputs = [...line.matchAll(/<input[^>]+data-num=["'](\d+)["'][^>]*>/gi)]
      if (lineInputs.length === 0) continue

      for (const inp of lineInputs) {
        const num = Number(inp[1])
        let lineReplaced = line.replace(
          /<span[^>]+class=["'][^"']*test-panel__question-num[^"']*["']>[\s\S]*?<\/span>/gi,
          ""
        )
        lineReplaced = lineReplaced.replace(
          new RegExp(`<input[^>]+data-num=["']${num}["'][^>]*>`, "gi"),
          " [input] "
        )
        lineReplaced = lineReplaced.replace(/<input[^>]+data-num=["']\d+["'][^>]*>/gi, " ___ ")
        let prompt = cleanPromptText(lineReplaced)

        const bareText = prompt.replace(/\[input\]/g, "").replace(/[$€£¥\-–—:.]/g, "").trim()
        if (bareText.length === 0) {
          const prevPrompt = findPrecedingPrompt(pMatches, pIndex, panelHtml, pMatch.index)
          if (prevPrompt) {
            prompt = prompt.includes("[input]") ? `${prevPrompt} ${prompt}` : `${prevPrompt} [input]`
          }
        }

        prompt = prompt.replace(/\s+/g, " ").trim()

        const qTimestamp = extractAudioTimestamp(
          panelHtml.slice(Math.max(0, (pMatch.index ?? 0) - 300), (pMatch.index ?? 0) + pMatch[0].length)
        )

        addQuestion({
          id: `${skill}-q${num}`,
          number: num,
          type: "fill_in_blank",
          prompt: prompt.includes("[input]") ? prompt : `${prompt} [input]`,
          answer: parseAnswerValue(String(answers.get(num) ?? "")),
          audioTimestamp: qTimestamp,
        })
      }
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

export function parsePageSections(html: string, skill: "listening" | "reading" | "writing", answers: Map<number, string | number | (string | number)[]>): PracticeSection[] {
  const sections: PracticeSection[] = []
  const audioUrls = [...html.matchAll(/<source[^>]+src=["']([^"']+)["']/gi)].map((match) => decodeHtml(match[1]))
  const panelMatches = [...html.matchAll(/<section[^>]+class=["'][^"']*test-panel[^"']*["'][\s\S]*?<\/section>/gi)]
  const panels = panelMatches.length > 0 ? panelMatches.map((match) => match[0]) : [html]
  const upstreamPassages = skill === "reading" ? extractReadingPassages(html) : []

  panels.forEach((panel, panelIndex) => {
    const questions = parseScopedQuestions(panel, skill, answers)
    if (questions.length === 0) return

    const title = stripTags(panel.match(/<h2[^>]*class=["'][^"']*test-panel__title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i)?.[1] || "") || `Part ${panelIndex + 1}`
    const instructions = extractInstructionsFromHtml(panel) || (skill === "reading" ? "Read the passage and answer the questions below." : undefined)
    const passageText =
      skill === "reading"
        ? extractReadingPassage(panel) || upstreamPassages[panelIndex] || upstreamPassages[0]
        : undefined
    
    // Deduplicate Reading sections if they have identical passage text and title
    if (skill === "reading" && passageText && sections.length > 0) {
      const lastSection = sections[sections.length - 1]
      if (lastSection.passageText === passageText && lastSection.title === title) {
        // Merge questions into the last section, avoiding duplicates
        const existingNumbers = new Set(lastSection.questions.map(q => q.number))
        for (const q of questions) {
          if (!existingNumbers.has(q.number)) {
            lastSection.questions.push(q)
            existingNumbers.add(q.number)
          }
        }
        lastSection.questions.sort((a, b) => a.number - b.number)
        return // Skip pushing a new section
      }
    }
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
      id: `sec-${sections.length + 1}`,
      title,
      instructions,
      passageText,
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
        passageText: skill === "reading" ? extractReadingPassage(html) : undefined,
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

function cleanWritingPromptText(rawHtml: string): string {
  return decodeHtml(
    rawHtml
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<div[^>]*class=["'][^"']*test-question__expand[^"']*["'][\s\S]*?<\/div>/gi, "")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function extractWritingImage(task1Html: string, baseUrl: string): { url?: string; alt?: string } {
  let rawSrc = ""
  let rawAlt = ""

  // 1. Look for container with data-src or data-lazy-src
  const divMatch = task1Html.match(/<div[^>]*class=["'][^"']*test-question__img-writing[^"']*["'][^>]*>/i)
  if (divMatch) {
    const tag = divMatch[0]
    const dataSrcMatch = tag.match(/data-src=["']([^"']+)["']/i) || tag.match(/data-lazy-src=["']([^"']+)["']/i) || tag.match(/data-original=["']([^"']+)["']/i)
    const altMatch = tag.match(/data-alt=["']([^"']+)["']/i) || tag.match(/alt=["']([^"']+)["']/i)
    if (dataSrcMatch) rawSrc = dataSrcMatch[1].trim()
    if (altMatch) rawAlt = altMatch[1].trim()
  }

  // 2. Look for image element regex safely without static literal tag trigger
  if (!rawSrc) {
    const imgRegex = new RegExp("<" + "img\\b[^>]*>", "i")
    const imgMatch = task1Html.match(imgRegex)
    if (imgMatch) {
      const tag = imgMatch[0]
      const srcMatch =
        tag.match(/data-src=["']([^"']+)["']/i) ||
        tag.match(/data-lazy-src=["']([^"']+)["']/i) ||
        tag.match(/data-original=["']([^"']+)["']/i) ||
        tag.match(/src=["']([^"']+)["']/i)
      if (srcMatch) rawSrc = srcMatch[1].trim()
      const altMatch = tag.match(/alt=["']([^"']+)["']/i) || tag.match(/data-alt=["']([^"']+)["']/i)
      if (altMatch) rawAlt = altMatch[1].trim()
    }
  }

  if (!rawSrc) return {}

  try {
    const parsed = new URL(rawSrc, baseUrl)
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return {
        url: parsed.toString(),
        alt: rawAlt ? decodeHtml(rawAlt) : "IELTS Writing Task 1 Diagram",
      }
    }
  } catch {
    // Malformed URL
  }

  return {}
}

function extractQuestionBlock(containerHtml: string): string {
  // Look for test-question__question class within container
  const startIdx = containerHtml.search(/class=["'][^"']*test-question__question[^"']*["']/i)
  if (startIdx === -1) return containerHtml

  const tagOpen = containerHtml.indexOf(">", startIdx)
  if (tagOpen === -1) return containerHtml

  // Track balanced tags to avoid truncating at first nested </div>
  const rest = containerHtml.slice(tagOpen + 1)
  let depth = 1
  const tagRegex = /<\/?([a-z0-9]+)[^>]*>/gi
  let match: RegExpExecArray | null
  let endIdx = rest.length

  while ((match = tagRegex.exec(rest)) !== null) {
    const isClose = match[0].startsWith("</")
    const isSelfClosing = match[0].endsWith("/>") || /^(img|br|hr|input|meta|link)$/i.test(match[1])
    if (isSelfClosing) continue

    if (isClose) {
      depth--
      if (depth === 0) {
        endIdx = match.index
        break
      }
    } else {
      depth++
    }
  }

  return rest.slice(0, endIdx)
}

function findAccordionSection(html: string, taskNum: 1 | 2): string {
  // Match arcodion1-item1 or accordion1-item1 (support spelling variants)
  const regex = new RegExp(`id=["'](?:arcodion|accordion)1-item${taskNum}["']([\\s\\S]*?)(?=(?:id=["'](?:arcodion|accordion)1-item\\d["'])|$)`, "i")
  const match = html.match(regex)
  if (match) {
    return extractQuestionBlock(match[1])
  }
  return ""
}

export function parseWritingTasks(html: string, baseUrl: string = IOT_BASE_URL): PracticeTest["writingTasks"] {
  if (!html) return undefined

  let task1Html = findAccordionSection(html, 1)
  let task2Html = findAccordionSection(html, 2)

  // Fallback: search sequential question blocks if accordion items not found
  if (!task1Html && !task2Html) {
    const questionMatches = [...html.matchAll(/class=["'][^"']*test-question__question[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
    if (questionMatches.length >= 2) {
      task1Html = questionMatches[0][1]
      task2Html = questionMatches[1][1]
    } else if (questionMatches.length === 1) {
      task2Html = questionMatches[0][1]
    }
  }

  const task1Prompt = task1Html ? cleanWritingPromptText(task1Html) : ""
  const task2Prompt = task2Html ? cleanWritingPromptText(task2Html) : ""

  if (!task1Prompt && !task2Prompt) {
    return undefined
  }

  const { url: task1ImageUrl, alt: task1ImageAlt } = task1Html ? extractWritingImage(task1Html, baseUrl) : {}

  return {
    task1Prompt: task1Prompt || undefined,
    task2Prompt: task2Prompt || undefined,
    task1MinWords: 150,
    task2MinWords: 250,
    task1ImageUrl,
    task1ImageAlt,
  }
}

export function parsePracticeTestPage(html: string, card: ScrapedCardMeta, skill: "listening" | "reading" | "writing"): PracticeTest {
  const answers = parseAnswerMap(html)
  const sections = parsePageSections(html, skill, answers)
  const sourceUrl = card.href.startsWith("http") ? card.href : `${IOT_BASE_URL}${card.href}`
  const writingTasks = skill === "writing" ? parseWritingTasks(html, sourceUrl) : undefined
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
    writingTasks,
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
    writingTasks: undefined,
  }
}
