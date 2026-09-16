/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  getStoredSettings,
  saveStoredSettings,
  clearTutorHistory,
  clearAllLocalProgress,
  SETTINGS_STORAGE_KEY,
} from "@/lib/settings/storage"
import { DEFAULT_USER_SETTINGS } from "@/lib/settings/contracts"

describe("settings storage", () => {
  const store: Record<string, string> = {}
  const listeners: Record<string, ((e: any) => void)[]> = {}

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key]
    for (const key of Object.keys(listeners)) delete listeners[key]

    const fakeLocalStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = String(val)
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        for (const key of Object.keys(store)) delete store[key]
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() {
        return Object.keys(store).length
      },
    }

    const fakeWindow = {
      localStorage: fakeLocalStorage,
      addEventListener: (type: string, listener: any) => {
        if (!listeners[type]) listeners[type] = []
        listeners[type].push(listener)
      },
      removeEventListener: (type: string, listener: any) => {
        if (!listeners[type]) return
        listeners[type] = listeners[type].filter((l) => l !== listener)
      },
      dispatchEvent: (event: any) => {
        const type = event.type
        if (listeners[type]) {
          for (const l of listeners[type]) l(event)
        }
        return true
      },
      CustomEvent: class CustomEvent {
        type: string
        detail: any
        constructor(type: string, init?: any) {
          this.type = type
          this.detail = init?.detail
        }
      },
    }

    // @ts-expect-error mock environment
    globalThis.window = fakeWindow
    globalThis.localStorage = fakeLocalStorage as any
    // @ts-expect-error mock environment
    globalThis.CustomEvent = fakeWindow.CustomEvent
  })

  afterEach(() => {
    // @ts-expect-error cleanup
    delete globalThis.window
    delete (globalThis as any).localStorage
    // @ts-expect-error cleanup
    delete globalThis.CustomEvent
    vi.restoreAllMocks()
  })

  it("returns DEFAULT_USER_SETTINGS when localStorage is empty", () => {
    const settings = getStoredSettings()
    expect(settings).toEqual(DEFAULT_USER_SETTINGS)
  })

  it("persists valid settings to localStorage and retrieves them", () => {
    const updated = saveStoredSettings({ locale: "vi", tutorAutoRetry: false, reducedMotion: true })
    expect(updated).toEqual({
      version: 1,
      locale: "vi",
      tutorAutoRetry: false,
      reducedMotion: true,
    })

    const retrieved = getStoredSettings()
    expect(retrieved).toEqual(updated)
    expect(JSON.parse(store[SETTINGS_STORAGE_KEY] || "{}")).toEqual(updated)
  })

  it("falls back to DEFAULT_USER_SETTINGS when localStorage has corrupted JSON", () => {
    store[SETTINGS_STORAGE_KEY] = "invalid-json{}}"
    const settings = getStoredSettings()
    expect(settings).toEqual(DEFAULT_USER_SETTINGS)
  })

  it("falls back to DEFAULT_USER_SETTINGS when schema version is invalid or unsupported", () => {
    store[SETTINGS_STORAGE_KEY] = JSON.stringify({ version: 99, locale: "vi", tutorAutoRetry: false })
    const settings = getStoredSettings()
    expect(settings).toEqual(DEFAULT_USER_SETTINGS)
  })

  it("falls back to DEFAULT_USER_SETTINGS when payload is not an object or has invalid types", () => {
    store[SETTINGS_STORAGE_KEY] = JSON.stringify("string-settings")
    expect(getStoredSettings()).toEqual(DEFAULT_USER_SETTINGS)

    store[SETTINGS_STORAGE_KEY] = JSON.stringify({ version: 1, locale: "fr", tutorAutoRetry: "no" })
    expect(getStoredSettings()).toEqual(DEFAULT_USER_SETTINGS)
  })

  it("merges partial updates cleanly with existing settings", () => {
    saveStoredSettings({ locale: "vi" })
    const secondUpdate = saveStoredSettings({ reducedMotion: true })

    expect(secondUpdate).toEqual({
      version: 1,
      locale: "vi",
      tutorAutoRetry: true,
      reducedMotion: true,
    })
    expect(getStoredSettings()).toEqual(secondUpdate)
  })

  it("dispatches storage and custom window events on save for reactive listeners", () => {
    const customListener = vi.fn()
    window.addEventListener("ielts_settings_change", customListener)

    saveStoredSettings({ locale: "vi" })
    expect(customListener).toHaveBeenCalledTimes(1)

    window.removeEventListener("ielts_settings_change", customListener)
  })

  it("clearTutorHistory removes all ielts_tutor_v1:* keys and preserves others", () => {
    store["ielts_tutor_v1:task-1"] = JSON.stringify([{ role: "user", content: "hi" }])
    store["ielts_tutor_v1:task-2"] = JSON.stringify([{ role: "assistant", content: "hello" }])
    store["ielts_progress_v2"] = JSON.stringify({ reading: [], writing: [], listening: [] })
    saveStoredSettings({ locale: "vi" })

    clearTutorHistory()

    expect(store["ielts_tutor_v1:task-1"]).toBeUndefined()
    expect(store["ielts_tutor_v1:task-2"]).toBeUndefined()
    expect(store["ielts_progress_v2"]).toBeDefined()
    expect(getStoredSettings().locale).toBe("vi")
  })

  it("clearAllLocalProgress clears evaluation/progress and tutor history while preserving UserSettings", () => {
    saveStoredSettings({ locale: "vi", reducedMotion: true })
    store["ielts_tutor_v1:slug1"] = "tutor-data"
    store["ielts_progress_v2"] = "progress-v2-data"
    store["ielts_progress_v1"] = "progress-v1-data"
    store["ielts_session_v2:test"] = "session-data"
    store["ielts_result_v2:test"] = "result-data"
    store["other_unrelated_key"] = "keep-or-not"

    clearAllLocalProgress()

    expect(store["ielts_tutor_v1:slug1"]).toBeUndefined()
    expect(store["ielts_progress_v2"]).toBeUndefined()
    expect(store["ielts_progress_v1"]).toBeUndefined()
    expect(store["ielts_session_v2:test"]).toBeUndefined()
    expect(store["ielts_result_v2:test"]).toBeUndefined()

    // User settings preserved
    const settings = getStoredSettings()
    expect(settings.locale).toBe("vi")
    expect(settings.reducedMotion).toBe(true)
  })
})
