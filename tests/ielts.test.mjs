import test from "node:test"
import assert from "node:assert/strict"

function heuristicWritingFeedback(essay, taskType = "task2") {
  const words = essay.match(/\b\w+\b/g) || []
  const wordCount = words.length
  const sentences = essay.split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
  const sentenceCount = sentences.length
  const avgSentenceLen = sentenceCount ? wordCount / sentenceCount : 0
  const minWords = taskType === "task2" ? 250 : 150

  const linkingWords = [
    "however", "therefore", "furthermore", "moreover", "in contrast",
    "as a result", "for example", "in addition", "on the other hand"
  ]
  const lowerEssay = essay.toLowerCase()
  const usedLinks = linkingWords.filter(w => lowerEssay.includes(w))

  let bandEstimate = 5.0
  if (wordCount >= minWords) bandEstimate += 0.5
  if (avgSentenceLen >= 8 && avgSentenceLen <= 25) bandEstimate += 0.5
  if (usedLinks.length >= 2) bandEstimate += 1.0

  return {
    band_estimate: Number(Math.min(bandEstimate, 8.0).toFixed(1)),
    word_count: wordCount,
    sentence_count: sentenceCount,
  }
}

function rawScoreToIeltsBand(rawScore, totalQuestions, skill = "reading") {
  if (totalQuestions <= 0) return 0
  const normalized40 = Math.round((rawScore / totalQuestions) * 40)
  if (skill === "listening") {
    if (normalized40 >= 39) return 9.0
    if (normalized40 >= 35) return 8.0
    if (normalized40 >= 30) return 7.0
    if (normalized40 >= 23) return 6.0
    if (normalized40 >= 16) return 5.0
    return 4.0
  }
  if (normalized40 >= 39) return 9.0
  if (normalized40 >= 35) return 8.0
  if (normalized40 >= 30) return 7.0
  if (normalized40 >= 23) return 6.0
  if (normalized40 >= 15) return 5.0
  return 4.0
}

test("IELTS band conversion calculates expected scores for reading and listening", () => {
  assert.equal(rawScoreToIeltsBand(40, 40, "reading"), 9.0)
  assert.equal(rawScoreToIeltsBand(30, 40, "reading"), 7.0)
  assert.equal(rawScoreToIeltsBand(30, 40, "listening"), 7.0)
  assert.equal(rawScoreToIeltsBand(23, 40, "listening"), 6.0)
})

test("Task 1 minimum word threshold is 150 words", () => {
  const sentence = "However, this chart shows clear growth. Therefore, we observe that output increased rapidly."
  const words180 = Array(13).fill(sentence).join(" ")

  const res1 = heuristicWritingFeedback(words180, "task1")
  assert.ok(res1.word_count >= 150)
  assert.ok(res1.word_count < 250)

  const res2 = heuristicWritingFeedback(words180, "task2")
  assert.equal(res1.band_estimate - res2.band_estimate, 0.5)
})

function validateListeningCompleteness(test) {
  if (!test || test.skill !== "listening") {
    return { isComplete: false, missingDetails: ["Test not found or not listening."] }
  }
  const sections = test.sections || []
  const allQuestions = sections.flatMap((s) => s.questions || [])
  const hasFourParts = sections.length === 4
  const hasFortyQuestions = allQuestions.length === 40
  const hasAudioInAllParts = sections.length > 0 && sections.every((s) => Boolean(s.audioUrl && s.audioUrl.trim()))
  const hasAnswersInAllQuestions =
    allQuestions.length > 0 &&
    allQuestions.every((q) => q.answer !== undefined && q.answer !== null && String(q.answer).trim().length > 0)

  let isContiguouslyNumbered = hasFortyQuestions
  if (isContiguouslyNumbered) {
    for (let i = 0; i < 40; i++) {
      if (allQuestions[i].number !== i + 1) {
        isContiguouslyNumbered = false
        break
      }
    }
  }

  const isComplete =
    hasFourParts &&
    hasFortyQuestions &&
    isContiguouslyNumbered &&
    hasAudioInAllParts &&
    hasAnswersInAllQuestions

  return {
    isComplete,
    totalSections: sections.length,
    totalQuestions: allQuestions.length,
    hasFourParts,
    hasFortyQuestions,
    isContiguouslyNumbered,
    hasAudioInAllParts,
    hasAnswersInAllQuestions,
  }
}

test("validateListeningCompleteness accurately identifies complete vs incomplete tests", () => {
  // Incomplete test (e.g. current fallback: 2 sections, 7 questions)
  const incompleteTest = {
    skill: "listening",
    sections: [
      { id: "p1", audioUrl: "https://example.com/audio.mp3", questions: [{ id: "1", number: 1, answer: "a" }] },
      { id: "p2", audioUrl: "https://example.com/audio.mp3", questions: [{ id: "2", number: 2, answer: "b" }] },
    ],
  }
  const reportInc = validateListeningCompleteness(incompleteTest)
  assert.equal(reportInc.isComplete, false)
  assert.equal(reportInc.hasFourParts, false)
  assert.equal(reportInc.hasFortyQuestions, false)

  // Complete test (4 parts, 10 questions each, numbered 1..40, with audio and answers)
  const completeSections = [1, 2, 3, 4].map((partNum) => ({
    id: `part-${partNum}`,
    audioUrl: `https://example.com/part${partNum}.mp3`,
    questions: Array.from({ length: 10 }, (_, idx) => {
      const qNum = (partNum - 1) * 10 + idx + 1
      return {
        id: `q-${qNum}`,
        number: qNum,
        prompt: `Question ${qNum}`,
        answer: `answer-${qNum}`,
      }
    }),
  }))

  const completeTest = {
    skill: "listening",
    sections: completeSections,
  }
  const reportComp = validateListeningCompleteness(completeTest)
  assert.equal(reportComp.isComplete, true)
  assert.equal(reportComp.hasFourParts, true)
  assert.equal(reportComp.hasFortyQuestions, true)
  assert.equal(reportComp.isContiguouslyNumbered, true)
  assert.equal(reportComp.hasAudioInAllParts, true)
  assert.equal(reportComp.hasAnswersInAllQuestions, true)
})

