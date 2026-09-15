import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { loadPracticeSession, savePracticeSession, clearPracticeSession } from "@/lib/practice-session"

describe("Writing Session Multi-Phase Storage", () => {
  const store: Record<string, string> = {}

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key]
    const fakeLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = val
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        for (const key of Object.keys(store)) delete store[key]
      },
    }
    // @ts-expect-error test mock
    globalThis.window = { localStorage: fakeLocalStorage }
    // @ts-expect-error test mock
    globalThis.localStorage = fakeLocalStorage
  })

  afterEach(() => {
    // @ts-expect-error test teardown
    delete globalThis.window
    // @ts-expect-error test teardown
    delete globalThis.localStorage
  })

  it("persists Task 1 and Task 2 drafts independently without bleeding", () => {
    const slug = "test-writing-session-isolation"
    clearPracticeSession("writing", slug)

    savePracticeSession({
      skill: "writing",
      slug,
      testId: "test_1",
      title: "Test Writing",
      startedAt: new Date().toISOString(),
      expiresAt: Date.now() + 3600000,
      durationMinutes: 60,
      writing: {
        activeTask: "task1",
        phase: "task1",
        task1Essay: "Draft for Task 1 report with charts.",
        task2Essay: "",
      },
    })

    let session = loadPracticeSession("writing", slug)
    expect(session?.writing?.task1Essay).toBe("Draft for Task 1 report with charts.")
    expect(session?.writing?.task2Essay).toBe("")

    // Advance to Task 2 and save Task 2 draft
    savePracticeSession({
      skill: "writing",
      slug,
      testId: "test_1",
      title: "Test Writing",
      startedAt: session!.startedAt,
      expiresAt: session!.expiresAt,
      durationMinutes: 60,
      writing: {
        activeTask: "task2",
        phase: "task2",
        task1Essay: "Draft for Task 1 report with charts.",
        task2Essay: "Draft for Task 2 discussion essay.",
      },
    })

    session = loadPracticeSession("writing", slug)
    expect(session?.writing?.task1Essay).toBe("Draft for Task 1 report with charts.")
    expect(session?.writing?.task2Essay).toBe("Draft for Task 2 discussion essay.")
    expect(session?.writing?.activeTask).toBe("task2")

    clearPracticeSession("writing", slug)
    expect(loadPracticeSession("writing", slug)).toBeNull()
  })

  it("migrates legacy v1 single-essay session gracefully", () => {
    const slug = "legacy-v1-session-migration"
    globalThis.localStorage.setItem(
      `ielts_session_v1:writing:${slug}`,
      JSON.stringify({
        skill: "writing",
        slug,
        testId: "legacy_test",
        title: "Legacy Writing",
        startedAt: new Date().toISOString(),
        expiresAt: Date.now() + 3600000,
        durationMinutes: 60,
        writing: {
          activeTask: "task1",
          essay: "Legacy single essay text",
        },
      }),
    )

    const session = loadPracticeSession("writing", slug)
    expect(session).not.toBeNull()
    expect(session?.writing?.task1Essay).toBe("Legacy single essay text")
    expect(session?.writing?.phase).toBe("task1")

    clearPracticeSession("writing", slug)
  })
})
