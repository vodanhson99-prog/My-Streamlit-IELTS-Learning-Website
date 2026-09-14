"use client"

import { useSyncExternalStore } from "react"
import {
  type AppProgress,
  type ReadingProgressRecord,
  type WritingProgressRecord,
  type ListeningProgressRecord,
  defaultProgress,
} from "@/lib/ielts"

const STORAGE_KEY = "ielts_progress_v2"
const OLD_STORAGE_KEY = "ielts_progress_v1"

function validateProgress(raw: unknown): AppProgress {
  if (!raw || typeof raw !== "object") return defaultProgress()
  const candidate = raw as Partial<AppProgress>
  
  const reading = Array.isArray(candidate.reading)
    ? candidate.reading.filter((item): item is ReadingProgressRecord => {
        return (
          typeof item?.timestamp === "string" &&
          (typeof item?.passage_id === "string" || typeof item?.test_id === "string") &&
          typeof item?.score === "number" &&
          typeof item?.total === "number"
        )
      })
    : []

  const writing = Array.isArray(candidate.writing)
    ? candidate.writing.filter((item): item is WritingProgressRecord => {
        return (
          typeof item?.timestamp === "string" &&
          typeof item?.band_estimate === "number" &&
          (item?.source === "ai" || item?.source === "heuristic")
        )
      })
    : []

  const listening = Array.isArray(candidate.listening)
    ? candidate.listening.filter((item): item is ListeningProgressRecord => {
        return (
          typeof item?.timestamp === "string" &&
          typeof item?.test_id === "string" &&
          typeof item?.score === "number" &&
          typeof item?.total === "number" &&
          typeof item?.band === "number"
        )
      })
    : []

  return { reading, writing, listening }
}

const DEFAULT_PROGRESS_SNAPSHOT: AppProgress = Object.freeze({
  reading: [],
  writing: [],
  listening: [],
})

let memorySnapshot: AppProgress = DEFAULT_PROGRESS_SNAPSHOT
let memoryLoaded = false

function getSnapshot(): AppProgress {
  if (typeof window === "undefined") {
    return DEFAULT_PROGRESS_SNAPSHOT
  }
  if (!memoryLoaded) {
    try {
      // 1. Try modern storage key
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        memorySnapshot = validateProgress(JSON.parse(stored))
      } else {
        // 2. Fallback migrate old key if present
        const oldStored = localStorage.getItem(OLD_STORAGE_KEY)
        if (oldStored) {
          const oldData = JSON.parse(oldStored)
          memorySnapshot = validateProgress({
            reading: oldData.reading || [],
            writing: oldData.writing || [],
            listening: [],
          })
          localStorage.setItem(STORAGE_KEY, JSON.stringify(memorySnapshot))
        }
      }
    } catch {
      memorySnapshot = DEFAULT_PROGRESS_SNAPSHOT
    }
    memoryLoaded = true
  }
  return memorySnapshot
}

function getServerSnapshot(): AppProgress {
  return DEFAULT_PROGRESS_SNAPSHOT
}

const listeners = new Set<() => void>()

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function notify() {
  for (const listener of listeners) {
    listener()
  }
}

export function useProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const saveProgress = (updater: (prev: AppProgress) => AppProgress) => {
    const next = updater(memorySnapshot)
    memorySnapshot = next
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      }
    } catch (e) {
      console.error("Failed to save progress to localStorage", e)
    }
    notify()
  }

  const addReadingRecord = (
    score: number,
    total: number,
    passageId: string,
    band?: number,
    title?: string,
    slug?: string
  ) => {
    const record: ReadingProgressRecord = {
      timestamp: new Date().toISOString(),
      passage_id: passageId,
      test_id: passageId,
      slug,
      title,
      score,
      total,
      band,
    }
    saveProgress((prev) => ({
      ...prev,
      reading: [...prev.reading, record],
    }))
  }

  const addListeningRecord = (
    score: number,
    total: number,
    testId: string,
    band: number,
    title?: string,
    slug?: string
  ) => {
    const record: ListeningProgressRecord = {
      timestamp: new Date().toISOString(),
      test_id: testId,
      slug,
      title,
      score,
      total,
      band,
    }
    saveProgress((prev) => ({
      ...prev,
      listening: [...prev.listening, record],
    }))
  }

  const addWritingRecord = (
    record: Omit<WritingProgressRecord, "timestamp">,
    testId?: string,
    title?: string,
    slug?: string
  ) => {
    const fullRecord: WritingProgressRecord = {
      ...record,
      test_id: testId || record.test_id,
      title: title || record.title,
      slug: slug || record.slug,
      timestamp: new Date().toISOString(),
    }
    saveProgress((prev) => ({
      ...prev,
      writing: [...prev.writing, fullRecord],
    }))
  }

  const clearProgress = () => {
    memorySnapshot = defaultProgress()
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(OLD_STORAGE_KEY)
      }
    } catch {
      // ignore
    }
    notify()
  }

  const subscribeLoaded = () => () => {}
  const isLoaded = useSyncExternalStore(subscribeLoaded, () => true, () => false)

  return {
    progress,
    isLoaded,
    addReadingRecord,
    addListeningRecord,
    addWritingRecord,
    clearProgress,
  }
}
