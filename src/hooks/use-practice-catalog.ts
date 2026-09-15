"use client"

import { useEffect, useState } from "react"
import { PracticeTest, SkillType, generateTitleSlug } from "@/lib/ielts"
import { getSelectedSlug } from "@/lib/practice-session"

const CATALOG_STORAGE_KEY = "ielts_practice_catalog_cache_v2"
const DETAIL_STORAGE_PREFIX = "ielts_test_detail_v2:"
// ponytail: 7-day TTL cache for catalog scan to avoid constant upstream scraping on page transitions
const CATALOG_SCAN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

// In-memory module cache to eliminate redundant localStorage parses and sync across page switches
let inMemoryCatalog: { tests: PracticeTest[]; timestamp: string | null } | null = null
let inFlightCatalogPromise: Promise<PracticeCatalogState> | null = null

// Legacy mock test identifiers purged to prevent re-caching
const MOCK_TEST_IDENTIFIERS = new Set([
  "iot-listening-2025-jan-1",
  "iot-reading-2025-urban-bees",
  "iot-writing-2025-task-pack",
  "january-listening-practice-test-1-2025",
  "urban-beekeeping-ecosystems",
  "ielts-practice-writing-task-1-task-2",
])

function isMockTest(test: PracticeTest): boolean {
  return MOCK_TEST_IDENTIFIERS.has(test.id) || MOCK_TEST_IDENTIFIERS.has(test.slug)
}

function ensureTestSlugs(tests: PracticeTest[]): PracticeTest[] {
  return tests.map((test) => ({ ...test, slug: test.slug || generateTitleSlug(test.title, test.id) }))
}

function detailKey(skill: SkillType, slug: string) {
  return `${DETAIL_STORAGE_PREFIX}${skill}:${slug}`
}

function readCachedDetail(skill: SkillType, slug: string): PracticeTest | null {
  try {
    const raw = sessionStorage.getItem(detailKey(skill, slug))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PracticeTest
    return parsed?.slug ? parsed : null
  } catch {
    return null
  }
}

function writeCachedDetail(test: PracticeTest) {
  try {
    sessionStorage.setItem(detailKey(test.skill, test.slug), JSON.stringify(test))
  } catch {
    // Ignore quota / private mode.
  }
}

function readStoredCatalog(): { tests: PracticeTest[]; timestamp: string | null } | null {
  if (inMemoryCatalog) return inMemoryCatalog

  try {
    const stored = localStorage.getItem(CATALOG_STORAGE_KEY) || localStorage.getItem("ielts_practice_catalog_cache_v1")
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed?.tests) && parsed.tests.length > 0) {
        const tests = ensureTestSlugs(parsed.tests).filter((t) => !isMockTest(t))
        const timestamp = typeof parsed.timestamp === "string" ? parsed.timestamp : null
        inMemoryCatalog = { tests, timestamp }
        return inMemoryCatalog
      }
    }
  } catch {
    // Ignore malformed local cache.
  }
  return null
}

export interface PracticeCatalogState {
  tests: PracticeTest[]
  source: "live" | "cache-fallback" | "client-cached" | "auth-required" | "loading"
  timestamp: string | null
  isLoading: boolean
  error: string | null
}

export function usePracticeCatalog() {
  const initialCache = typeof window !== "undefined" ? readStoredCatalog() : null

  const [state, setState] = useState<PracticeCatalogState>(() => {
    if (initialCache && initialCache.tests.length > 0) {
      return {
        tests: initialCache.tests,
        source: "client-cached",
        timestamp: initialCache.timestamp,
        isLoading: false,
        error: null,
      }
    }
    return {
      tests: [],
      source: "loading",
      timestamp: null,
      isLoading: true,
      error: null,
    }
  })

  useEffect(() => {
    const cached = readStoredCatalog()
    const cachedTests = cached?.tests || []
    const cachedTimestamp = cached?.timestamp || null

    if (cachedTests.length > 0 && state.tests.length === 0) {
      setState({
        tests: cachedTests,
        source: "client-cached",
        timestamp: cachedTimestamp,
        isLoading: false,
        error: null,
      })
    }

    // Check if cache is still fresh within 7-day window
    const lastScanTime = cachedTimestamp ? new Date(cachedTimestamp).getTime() : 0
    const isCacheFresh =
      cachedTests.length > 0 &&
      !isNaN(lastScanTime) &&
      lastScanTime > 0 &&
      Date.now() - lastScanTime < CATALOG_SCAN_INTERVAL_MS

    // Skip expensive background scan if already cached and within 7 days
    if (isCacheFresh) {
      return
    }

    // Deduplicate in-flight fetch across concurrent page components
    if (!inFlightCatalogPromise) {
      inFlightCatalogPromise = fetch("/api/practice-catalog")
        .then(async (res) => {
          const data = await res.json()
          if (!res.ok) {
            const error = new Error(data.notice || `HTTP error ${res.status}`) as Error & { code?: string }
            error.code = data.source === "auth-required" ? "auth-required" : undefined
            throw error
          }
          return data
        })
        .then((data) => {
          const rawTests = Array.isArray(data.tests) ? data.tests : []
          const fetchedTests = ensureTestSlugs(rawTests).filter((t) => !isMockTest(t))
          // ponytail: merge incoming catalog with cached tests by slug/id so older tests stay in library
          const seen = new Set(fetchedTests.map((t) => t.slug || t.id))
          const existingToKeep = cachedTests.filter((t) => !seen.has(t.slug || t.id) && !isMockTest(t))
          const merged = [...fetchedTests, ...existingToKeep]

          const timestamp = data.timestamp || new Date().toISOString()
          inMemoryCatalog = { tests: merged, timestamp }

          try {
            localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify({ tests: merged, timestamp }))
          } catch {
            // Ignore restricted or full local storage.
          }

          return {
            tests: merged,
            source: data.source === "live" ? ("live" as const) : ("cache-fallback" as const),
            timestamp,
            isLoading: false,
            error: null,
          }
        })
        .catch((error: Error & { code?: string }) => {
          const fallback = cachedTests.filter((t) => !isMockTest(t))
          return {
            tests: fallback,
            source: error.code === "auth-required" ? ("auth-required" as const) : fallback.length > 0 ? ("client-cached" as const) : ("cache-fallback" as const),
            timestamp: cachedTimestamp,
            isLoading: false,
            error: error.message || "Unable to load practice catalog.",
          }
        })
        .finally(() => {
          inFlightCatalogPromise = null
        })
    }

    let active = true
    inFlightCatalogPromise.then((nextState) => {
      if (active) {
        setState(nextState)
      }
    })

    return () => {
      active = false
    }
  }, [state.tests.length])

  const loadTestDetail = async (test: PracticeTest): Promise<PracticeTest | null> => {
    if (test.skill === "writing") {
      // Complete writing detail requires task prompts. If task1 has image upstream, require task1ImageUrl.
      const hasPrompts = Boolean(test.writingTasks?.task1Prompt && test.writingTasks?.task2Prompt)
      if (hasPrompts) return test

      const cached = readCachedDetail(test.skill, test.slug)
      if (cached?.writingTasks?.task1Prompt && cached.writingTasks?.task2Prompt) {
        setState((prev) => ({
          ...prev,
          tests: prev.tests.map((item) => (item.slug === cached.slug ? cached : item)),
        }))
        return cached
      }
    } else {
      if (test.sections.some((section) => section.questions.length > 0)) return test
      const cached = readCachedDetail(test.skill, test.slug)
      if (cached && cached.sections.some((section) => section.questions.length > 0)) {
        setState((prev) => ({
          ...prev,
          tests: prev.tests.map((item) => (item.slug === cached.slug ? cached : item)),
        }))
        return cached
      }
    }

    if (!test.upstreamQuizId) return test

    const params = new URLSearchParams({ skill: test.skill, sourceUrl: test.sourceUrl })
    const response = await fetch(`/api/practice-tests/${encodeURIComponent(test.upstreamQuizId)}?${params}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || `Unable to load ${test.title}.`)
    const detailed = { ...data.test, slug: test.slug, title: test.title } as PracticeTest
    writeCachedDetail(detailed)
    setState((prev) => ({
      ...prev,
      tests: prev.tests.map((item) => (item.slug === detailed.slug ? detailed : item)),
    }))
    return detailed
  }

  const getTestsBySkill = (skill: SkillType) => state.tests.filter((test) => test.skill === skill)
  const getTestBySkillAndSlug = (skill: SkillType, slug: string) => {
    const skillTests = getTestsBySkill(skill)
    return skillTests.find((test) => test.slug === slug) || skillTests.find((test) => test.id === slug)
  }
  const getDefaultTest = (skill: SkillType) => {
    const skillTests = getTestsBySkill(skill)
    if (!skillTests.length) return undefined
    const savedSlug = getSelectedSlug(skill)
    return skillTests.find((test) => test.slug === savedSlug || test.id === savedSlug) || skillTests[0]
  }

  return { ...state, getTestsBySkill, getTestBySkillAndSlug, getDefaultTest, loadTestDetail }
}
