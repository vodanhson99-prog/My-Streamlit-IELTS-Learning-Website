import { PracticeSession, SkillType, TestResultPayload } from "./ielts"

const SESSION_PREFIX = "ielts_session_v1"
const SELECTED_PREFIX = "ielts_selected_slug_v1"
const RESULT_PREFIX = "ielts_result_v1"

function getSessionKey(skill: SkillType, slug: string): string {
  return `${SESSION_PREFIX}:${skill}:${slug}`
}

function getSelectedKey(skill: SkillType): string {
  return `${SELECTED_PREFIX}:${skill}`
}

function getResultKey(skill: SkillType, slug: string): string {
  return `${RESULT_PREFIX}:${skill}:${slug}`
}

export function savePracticeSession(session: PracticeSession): void {
  if (typeof window === "undefined") return
  try {
    const key = getSessionKey(session.skill, session.slug)
    localStorage.setItem(key, JSON.stringify(session))
    localStorage.setItem(getSelectedKey(session.skill), session.slug)
  } catch {
    // quota exceeded or private mode
  }
}

export function loadPracticeSession(skill: SkillType, slug: string): PracticeSession | null {
  if (typeof window === "undefined") return null
  try {
    const key = getSessionKey(skill, slug)
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PracticeSession>
    if (
      parsed &&
      parsed.skill === skill &&
      parsed.slug === slug &&
      typeof parsed.testId === "string" &&
      typeof parsed.expiresAt === "number"
    ) {
      return parsed as PracticeSession
    }
    return null
  } catch {
    return null
  }
}

export function clearPracticeSession(skill: SkillType, slug: string): void {
  if (typeof window === "undefined") return
  try {
    const key = getSessionKey(skill, slug)
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function saveSelectedSlug(skill: SkillType, slug: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(getSelectedKey(skill), slug)
  } catch {
    // ignore
  }
}

export function getSelectedSlug(skill: SkillType): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(getSelectedKey(skill))
  } catch {
    return null
  }
}

export function saveTestResult(result: TestResultPayload): void {
  if (typeof window === "undefined") return
  try {
    const key = getResultKey(result.skill, result.slug)
    localStorage.setItem(key, JSON.stringify(result))
  } catch {
    // ignore
  }
}

export function loadTestResult(skill: SkillType, slug: string): TestResultPayload | null {
  if (typeof window === "undefined") return null
  try {
    const key = getResultKey(skill, slug)
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as TestResultPayload
  } catch {
    return null
  }
}

export type TestProgressStatus = "idle" | "doing" | "done"

export function getTestProgressStatus(skill: SkillType, slug: string): TestProgressStatus {
  if (typeof window === "undefined") return "idle"

  const session = loadPracticeSession(skill, slug)
  const hasActiveDraft = Boolean(
    session &&
      ((skill === "reading" &&
        session.reading?.answers &&
        Object.keys(session.reading.answers).length > 0) ||
        (skill === "listening" &&
          session.listening?.answers &&
          Object.keys(session.listening.answers).length > 0) ||
        (skill === "writing" &&
          session.writing?.essay &&
          session.writing.essay.trim().length > 0))
  )

  // Doing wins over Done when user is actively retaking
  if (hasActiveDraft) {
    return "doing"
  }

  const result = loadTestResult(skill, slug)
  if (result) {
    return "done"
  }

  return "idle"
}

