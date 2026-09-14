"use client"

import { useEffect, useState } from "react"
import { PracticeTest, SkillType, generateTitleSlug } from "@/lib/ielts"
import { FALLBACK_PRACTICE_TESTS } from "@/lib/fallback-catalog"
import { getSelectedSlug } from "@/lib/practice-session"

const CATALOG_STORAGE_KEY = "ielts_practice_catalog_cache_v2"
const DETAIL_STORAGE_PREFIX = "ielts_test_detail_v1:"

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

export interface PracticeCatalogState {
  tests: PracticeTest[]
  source: "live" | "cache-fallback" | "client-cached" | "auth-required" | "loading"
  timestamp: string | null
  isLoading: boolean
  error: string | null
}

export function usePracticeCatalog() {
  const [state, setState] = useState<PracticeCatalogState>({
    tests: FALLBACK_PRACTICE_TESTS,
    source: "loading",
    timestamp: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    let cachedTests: PracticeTest[] | null = null
    try {
      const stored = localStorage.getItem(CATALOG_STORAGE_KEY) || localStorage.getItem("ielts_practice_catalog_cache_v1")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed?.tests) && parsed.tests.length > 0) cachedTests = ensureTestSlugs(parsed.tests)
      }
    } catch {
      // Ignore malformed local cache.
    }

    fetch("/api/practice-catalog")
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
        const rawTests = Array.isArray(data.tests) && data.tests.length > 0 ? data.tests : FALLBACK_PRACTICE_TESTS
        const tests = ensureTestSlugs(rawTests)
        const nextState: PracticeCatalogState = {
          tests,
          source: data.source === "live" ? "live" : "cache-fallback",
          timestamp: data.timestamp || new Date().toISOString(),
          isLoading: false,
          error: null,
        }
        setState(nextState)
        try {
          localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify({ tests, timestamp: nextState.timestamp }))
        } catch {
          // Ignore restricted or full local storage.
        }
      })
      .catch((error: Error & { code?: string }) => {
        setState({
          tests: cachedTests || ensureTestSlugs(FALLBACK_PRACTICE_TESTS),
          source: error.code === "auth-required" ? "auth-required" : cachedTests ? "client-cached" : "cache-fallback",
          timestamp: null,
          isLoading: false,
          error: error.message || "Unable to load practice catalog.",
        })
      })
  }, [])

  const loadTestDetail = async (test: PracticeTest): Promise<PracticeTest | null> => {
    if (test.skill === "writing") return test
    if (test.sections.some((section) => section.questions.length > 0)) return test

    const cached = readCachedDetail(test.skill, test.slug)
    if (cached && cached.sections.some((section) => section.questions.length > 0)) {
      setState((prev) => ({
        ...prev,
        tests: prev.tests.map((item) => (item.slug === cached.slug ? cached : item)),
      }))
      return cached
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
