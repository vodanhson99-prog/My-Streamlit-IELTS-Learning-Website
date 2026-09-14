export type SkillType = "reading" | "listening" | "writing"
export type QuestionType = "single_choice" | "multiple_choice" | "true_false" | "fill_in_blank"
export type QuestionAnswer = string | number | string[] | number[]

export interface PracticeExample {
  prompt: string
  answer?: string
}

export interface PracticeGridRow {
  cells: string[]
  questionIds: (string | null)[]
}

export interface PracticeGrid {
  headers: string[]
  rows: PracticeGridRow[]
}

export interface QuestionGroup {
  minAnswers?: number
  maxAnswers?: number
  answerRange?: [number, number]
}

export function answerValues(answer: QuestionAnswer): string[] {
  return (Array.isArray(answer) ? answer : [answer]).map((value) => String(value).trim().toLowerCase())
}

export function answersMatch(actual: QuestionAnswer, expected: QuestionAnswer): boolean {
  const left = answerValues(actual).filter(Boolean).sort()
  const right = answerValues(expected).filter(Boolean).sort()
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export function hasAnswer(answer: QuestionAnswer | undefined): boolean {
  return Boolean(answer && (Array.isArray(answer) ? answer.length > 0 : String(answer).trim()))
}

export function answerCount(answer: QuestionAnswer | undefined): number {
  return Array.isArray(answer) ? answer.length : hasAnswer(answer) ? 1 : 0
}

export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index)
}

export function optionIndex(value: string | number, options: string[] = []): number {
  if (typeof value === "number") return value
  const normalized = value.trim().toLowerCase()
  const letterIndex = normalized.match(/^[a-z]$/)?.[0]
  if (letterIndex) return letterIndex.charCodeAt(0) - 97
  return options.findIndex((option) => option.toLowerCase().startsWith(normalized))
}

export function normalizeAnswerForOptions(answer: QuestionAnswer, options: string[] = []): number | number[] | string {
  if (Array.isArray(answer)) return answer.map((value) => optionIndex(value, options)).filter((value) => value >= 0)
  if (typeof answer === "number") return answer
  const index = optionIndex(answer, options)
  return index >= 0 ? index : answer
}

export function optionIsCorrect(index: number, answer: QuestionAnswer, options: string[] = []): boolean {
  const normalized = normalizeAnswerForOptions(answer, options)
  return Array.isArray(normalized) ? normalized.includes(index) : normalized === index
}

export function selectedOptionsMatch(selected: number[], answer: QuestionAnswer, options: string[] = []): boolean {
  const normalized = normalizeAnswerForOptions(answer, options)
  return Array.isArray(normalized) && answersMatch(selected, normalized)
}

export interface ReadingQuestion {
  id?: string
  q: string
  options: string[]
  answer: number
}

export interface UniversalQuestion {
  id: string
  number: number
  type: QuestionType
  prompt: string
  options?: string[]
  answer: QuestionAnswer
  audioTimestamp?: number
  group?: QuestionGroup
  example?: PracticeExample
}

export interface PracticeSection {
  id: string
  title: string
  instructions?: string
  passageText?: string
  audioUrl?: string
  audioTimestamp?: number
  questions: UniversalQuestion[]
  examples?: PracticeExample[]
  grid?: PracticeGrid
}

export interface PracticeTest {
  id: string
  slug: string
  title: string
  skill: SkillType
  module?: "academic" | "general_training"
  durationMinutes: number
  sourceUrl: string
  upstreamQuizId?: string
  questionsUrl?: string
  sections: PracticeSection[]
  writingTasks?: {
    task1Prompt?: string
    task2Prompt?: string
    task1MinWords?: number
    task2MinWords?: number
  }
}

export interface ReadingSessionData {
  answers: Record<string, number | number[] | string>
}

export interface ListeningSessionData {
  answers: Record<string, string | string[]>
}

export interface WritingSessionData {
  activeTask: "task1" | "task2"
  essay: string
}

export interface PracticeSession {
  skill: SkillType
  slug: string
  testId: string
  title: string
  startedAt: string
  expiresAt: number
  durationMinutes: number
  reading?: ReadingSessionData
  listening?: ListeningSessionData
  writing?: WritingSessionData
}

export interface TestResultPayload {
  skill: SkillType
  slug: string
  testId: string
  title: string
  completedAt: string
  score?: number
  total?: number
  band: number
  criterionBands?: CriterionBands | null
  criteriaSentences?: [string, string][]
  overallTip?: string
  source?: "ai" | "heuristic" | "direct"
  writingDetails?: WritingDetailsPayload
}

export function generateTitleSlug(title: string, suffix?: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  if (!base) return suffix ? `test-${suffix}` : "practice-test"
  return suffix ? `${base}-${suffix}` : base
}

export interface ReadingPassage {
  id: string
  title: string
  level: string
  text: string
  questions: ReadingQuestion[]
}

export interface ReadingProgressRecord {
  timestamp: string
  passage_id: string
  test_id?: string
  slug?: string
  title?: string
  score: number
  total: number
  band?: number
}

export interface ListeningProgressRecord {
  timestamp: string
  test_id: string
  slug?: string
  title?: string
  score: number
  total: number
  band: number
}

export interface CriterionBands {
  task_achievement_band?: number | null
  coherence_cohesion_band?: number | null
  lexical_resource_band?: number | null
  grammar_band?: number | null
}

import type { LockedTask2Evaluation, ResolvedAnnotation } from "@/lib/ielts-evaluation/contracts"
import type { LockedTask1Evaluation } from "@/lib/ielts-evaluation/task1/contracts"
import type { WritingCoaching } from "@/lib/ielts-evaluation/coaching/generate-coaching"

export interface WritingDetailsPayload {
  taskType?: "task1" | "task2"
  testType?: "academic" | "general_training"
  essay?: string
  prompt?: string
  evaluation?: LockedTask2Evaluation | LockedTask1Evaluation
  resolvedAnnotations?: readonly ResolvedAnnotation[]
  coaching?: WritingCoaching
}

export interface WritingProgressRecord extends CriterionBands {
  timestamp: string
  band_estimate: number
  source: "ai" | "heuristic"
  test_id?: string
  slug?: string
  title?: string
}

export interface AppProgress {
  reading: ReadingProgressRecord[]
  writing: WritingProgressRecord[]
  listening: ListeningProgressRecord[]
}

export interface WritingFeedbackResult {
  source: "ai" | "heuristic"
  band_estimate: number
  criterion_bands: CriterionBands | null
  criteria_sentences: [string, string][]
  overall_tip: string
  fallback_error?: string | null
  taskType?: "task1" | "task2"
  testType?: "academic" | "general_training"
  essay?: string
  prompt?: string
  evaluation?: LockedTask2Evaluation | LockedTask1Evaluation
  resolvedAnnotations?: readonly ResolvedAnnotation[]
  coaching?: WritingCoaching
}

export interface HeuristicAnalysis {
  band_estimate: number
  notes: string[]
  word_count: number
  sentence_count: number
}

export const READING_PASSAGES: ReadingPassage[] = [
  {
    id: "r1",
    title: "The Rise of Urban Beekeeping",
    level: "Academic Reading · Passage 01",
    text:
      "Over the past decade, city dwellers across the world have taken up beekeeping as a hobby and, increasingly, as a small business. Rooftops in cities such as London, New York and Tokyo now host thousands of hives. Proponents argue that urban bees are often healthier than their rural counterparts, since cities tend to have a greater diversity of flowering plants and lower pesticide use than industrial farmland. Critics, however, warn that packing too many hives into a small area can lead to competition for nectar, potentially harming wild pollinator populations that were already under pressure.",
    questions: [
      {
        q: "According to the passage, why might urban bees be healthier than rural bees?",
        options: [
          "Cities have fewer flowering plants",
          "Cities often have lower pesticide use and more plant diversity",
          "Urban beekeepers use more medication",
          "Rural areas have more predators",
        ],
        answer: 1,
      },
      {
        q: "What concern do critics raise about urban beekeeping?",
        options: [
          "It is too expensive",
          "It requires too much space",
          "Too many hives may compete with wild pollinators",
          "Honey quality is lower in cities",
        ],
        answer: 2,
      },
    ],
  },
]

export const WRITING_PROMPTS: string[] = [
  "Some people believe that unpaid community service should be a compulsory part of high school education. To what extent do you agree or disagree?",
  "The chart below shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features.",
]

export const CRITERION_KEYS: [keyof CriterionBands, string, string][] = [
  ["task_achievement_band", "Task Achievement", "TA"],
  ["coherence_cohesion_band", "Coherence & Cohesion", "CC"],
  ["lexical_resource_band", "Lexical Resource", "LR"],
  ["grammar_band", "Grammar", "GRA"],
]

export function defaultProgress(): AppProgress {
  return { reading: [], writing: [], listening: [] }
}

export function rawScoreToIeltsBand(rawScore: number, totalQuestions: number, skill: "reading" | "listening" = "reading"): number {
  if (totalQuestions <= 0) return 0
  const normalized40 = Math.round((rawScore / totalQuestions) * 40)

  if (skill === "listening") {
    if (normalized40 >= 39) return 9.0
    if (normalized40 >= 37) return 8.5
    if (normalized40 >= 35) return 8.0
    if (normalized40 >= 32) return 7.5
    if (normalized40 >= 30) return 7.0
    if (normalized40 >= 26) return 6.5
    if (normalized40 >= 23) return 6.0
    if (normalized40 >= 18) return 5.5
    if (normalized40 >= 16) return 5.0
    if (normalized40 >= 13) return 4.5
    if (normalized40 >= 10) return 4.0
    if (normalized40 >= 7) return 3.5
    if (normalized40 >= 5) return 3.0
    return 2.5
  }

  // Academic Reading
  if (normalized40 >= 39) return 9.0
  if (normalized40 >= 37) return 8.5
  if (normalized40 >= 35) return 8.0
  if (normalized40 >= 33) return 7.5
  if (normalized40 >= 30) return 7.0
  if (normalized40 >= 27) return 6.5
  if (normalized40 >= 23) return 6.0
  if (normalized40 >= 19) return 5.5
  if (normalized40 >= 15) return 5.0
  if (normalized40 >= 13) return 4.5
  if (normalized40 >= 10) return 4.0
  if (normalized40 >= 8) return 3.5
  if (normalized40 >= 6) return 3.0
  return 2.5
}

export function heuristicWritingFeedback(essay: string, taskType: "task1" | "task2" = "task2"): HeuristicAnalysis {
  const words = essay.match(/\b\w+\b/g) || []
  const wordCount = words.length
  const sentences = essay
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const sentenceCount = sentences.length
  const avgSentenceLen = sentenceCount ? wordCount / sentenceCount : 0
  const minWords = taskType === "task2" ? 250 : 150
  const notes: string[] = []

  if (wordCount < minWords) {
    notes.push(`Word count is ${wordCount}; aim for at least ${minWords}.`)
  } else {
    notes.push(`Word count OK (${wordCount} words).`)
  }

  if (avgSentenceLen < 8) {
    notes.push("Sentences look short/simple on average — try combining ideas with linking words.")
  } else if (avgSentenceLen > 30) {
    notes.push("Average sentence length is very high — check for run-on sentences.")
  } else {
    notes.push("Sentence length variation looks reasonable.")
  }

  const linkingWords = [
    "however",
    "therefore",
    "furthermore",
    "moreover",
    "in contrast",
    "as a result",
    "for example",
    "in addition",
    "on the other hand",
  ]
  const lowerEssay = essay.toLowerCase()
  const usedLinks = linkingWords.filter((w) => lowerEssay.includes(w))
  if (usedLinks.length >= 2) {
    notes.push(`Good use of cohesive devices (${usedLinks.join(", ")}).`)
  } else {
    notes.push("Try using more linking phrases to improve coherence and cohesion.")
  }

  let bandEstimate = 5.0
  if (wordCount >= minWords) bandEstimate += 0.5
  if (avgSentenceLen >= 8 && avgSentenceLen <= 25) bandEstimate += 0.5
  if (usedLinks.length >= 2) bandEstimate += 1.0

  return {
    band_estimate: Number(Math.min(bandEstimate, 8.0).toFixed(1)),
    notes,
    word_count: wordCount,
    sentence_count: sentenceCount,
  }
}

export function computeReadingScore(passageId: string, answers: number[]): { score: number; total: number } {
  const passage = READING_PASSAGES.find((p) => p.id === passageId) || READING_PASSAGES[0]
  const score = passage.questions.reduce((acc, q, idx) => {
    return acc + (answers[idx] === q.answer ? 1 : 0)
  }, 0)
  return { score, total: passage.questions.length }
}

export function averageReadingScore(reading: ReadingProgressRecord[]): number | null {
  if (!reading.length) return null
  const totalPercentage = reading.reduce((sum, r) => sum + (r.score / r.total) * 100, 0)
  return totalPercentage / reading.length
}

export function averageListeningBand(listening: ListeningProgressRecord[] = []): number | null {
  if (!listening?.length) return null
  const totalBand = listening.reduce((sum, l) => sum + Number(l.band || 0), 0)
  return totalBand / listening.length
}

export function averageWritingBand(writing: WritingProgressRecord[]): number | null {
  if (!writing.length) return null
  const totalBand = writing.reduce((sum, w) => sum + Number(w.band_estimate), 0)
  return totalBand / writing.length
}

export function getDiagnosis(
  reading: ReadingProgressRecord[],
  writing: WritingProgressRecord[],
  listening: ListeningProgressRecord[] = []
) {
  const rAvg = averageReadingScore(reading)
  const wAvg = averageWritingBand(writing)
  const lAvg = averageListeningBand(listening)

  if (rAvg === null && wAvg === null && lAvg === null) {
    return {
      title: "Establish your IELTS baseline.",
      suggestion: "Start with one practice test in Listening or Reading to calibrate your current score.",
      action: "Start Listening",
      target: "listening" as const,
    }
  }

  if (lAvg === null) {
    return {
      title: "Add Listening practice to your profile.",
      suggestion: "Complete a full 30-minute standard IELTS Listening practice test.",
      action: "Start Listening",
      target: "listening" as const,
    }
  }

  if (rAvg === null) {
    return {
      title: "Establish your Reading baseline.",
      suggestion: "Complete one Reading passage to enable comparison across skills.",
      action: "Start Reading",
      target: "reading" as const,
    }
  }

  if (wAvg === null) {
    return {
      title: "Try one Writing task next.",
      suggestion: "Submit an essay so the coach can evaluate your band across all criteria.",
      action: "Start Writing",
      target: "writing" as const,
    }
  }

  const readingBand = (rAvg / 100) * 9
  const lowestBand = Math.min(readingBand, wAvg, lAvg)

  if (lowestBand === lAvg && lAvg < Math.min(readingBand, wAvg) - 0.4) {
    return {
      title: "Listening is currently your weaker skill.",
      suggestion: `Your Listening band (${lAvg.toFixed(1)}) trails Reading and Writing. Try another Listening section.`,
      action: "Practise Listening",
      target: "listening" as const,
    }
  }

  if (lowestBand === readingBand && readingBand < Math.min(lAvg, wAvg) - 0.4) {
    return {
      title: "Reading is currently your weaker skill.",
      suggestion: `Your Reading performance (${rAvg.toFixed(0)}%) trails other skills. Practise another passage.`,
      action: "Practise Reading",
      target: "reading" as const,
    }
  }

  if (lowestBand === wAvg && wAvg < Math.min(readingBand, lAvg) - 0.4) {
    return {
      title: "Writing is currently your weaker skill.",
      suggestion: `Writing band (${wAvg.toFixed(1)}) trails your receptive skills. Revise weak criteria.`,
      action: "Practise Writing",
      target: "writing" as const,
    }
  }

  return {
    title: "Your skills look balanced.",
    suggestion: `Listening ${lAvg.toFixed(1)} · Reading ${rAvg.toFixed(0)}% · Writing ${wAvg.toFixed(1)}. Keep practicing regularly.`,
    action: "Review Progress",
    target: "progress" as const,
  }
}

export function calculateTrend(values: number[]): "Improving" | "Needs attention" | "Steady" | "Not enough data" {
  if (values.length < 2) return "Not enough data"
  const diff = values[values.length - 1] - values[values.length - 2]
  if (diff > 0.15) return "Improving"
  if (diff < -0.15) return "Needs attention"
  return "Steady"
}

export interface ListeningCompletenessReport {
  isComplete: boolean
  totalSections: number
  totalQuestions: number
  hasFourParts: boolean
  hasFortyQuestions: boolean
  isContiguouslyNumbered: boolean
  hasAudioInAllParts: boolean
  hasAnswersInAllQuestions: boolean
  missingDetails: string[]
}

export function validateListeningCompleteness(test?: PracticeTest | null): ListeningCompletenessReport {
  if (!test || test.skill !== "listening") {
    return {
      isComplete: false,
      totalSections: 0,
      totalQuestions: 0,
      hasFourParts: false,
      hasFortyQuestions: false,
      isContiguouslyNumbered: false,
      hasAudioInAllParts: false,
      hasAnswersInAllQuestions: false,
      missingDetails: ["Test not found or not a listening test."],
    }
  }

  const sections = test.sections || []
  const totalSections = sections.length
  const allQuestions = sections.flatMap((s) => s.questions || [])
  const totalQuestions = allQuestions.length

  const hasFourParts = totalSections === 4
  const hasFortyQuestions = totalQuestions === 40
  const hasAudioInAllParts = totalSections > 0 && sections.every((s) => Boolean(s.audioUrl && s.audioUrl.trim()))
  const hasAnswersInAllQuestions = totalQuestions > 0 && allQuestions.every((q) => hasAnswer(q.answer))

  // Validate numbering 1..40 strictly in order
  let isContiguouslyNumbered = totalQuestions === 40
  if (isContiguouslyNumbered) {
    for (let i = 0; i < 40; i++) {
      if (allQuestions[i].number !== i + 1) {
        isContiguouslyNumbered = false
        break
      }
    }
  }

  const missingDetails: string[] = []
  if (!hasFourParts) {
    missingDetails.push(`Contains ${totalSections}/4 parts.`)
  }
  if (!hasFortyQuestions) {
    missingDetails.push(`Contains ${totalQuestions}/40 questions.`)
  } else if (!isContiguouslyNumbered) {
    missingDetails.push("Questions are not consecutively numbered 1 to 40.")
  }
  if (!hasAudioInAllParts) {
    missingDetails.push("Missing audio stream URL in one or more parts.")
  }
  if (!hasAnswersInAllQuestions) {
    missingDetails.push("Missing answer keys for one or more questions.")
  }

  const isComplete =
    hasFourParts &&
    hasFortyQuestions &&
    isContiguouslyNumbered &&
    hasAudioInAllParts &&
    hasAnswersInAllQuestions

  return {
    isComplete,
    totalSections,
    totalQuestions,
    hasFourParts,
    hasFortyQuestions,
    isContiguouslyNumbered,
    hasAudioInAllParts,
    hasAnswersInAllQuestions,
    missingDetails,
  }
}

