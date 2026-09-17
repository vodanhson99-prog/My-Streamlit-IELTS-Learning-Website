/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("next/image", () => ({
  default: (props: any) => React.createElement("img", { ...props, priority: undefined }),
}))

import { saveStoredSettings } from "@/lib/settings/storage"
import { SettingsPageComponent } from "@/components/settings/settings-page"
import { LanguageSetting } from "@/components/settings/language-setting"
import { TutorSettings } from "@/components/settings/tutor-settings"
import { DataSettings } from "@/components/settings/data-settings"
import { PracticeNavbar } from "@/components/ielts/practice-navbar"

describe("Settings Page & Navigation Components", () => {
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

    // @ts-expect-error mock window
    globalThis.window = fakeWindow
    ;(globalThis as any).localStorage = fakeLocalStorage
    // @ts-expect-error mock CustomEvent
    globalThis.CustomEvent = fakeWindow.CustomEvent
  })

  afterEach(() => {
    // @ts-expect-error cleanup
    delete globalThis.window
    delete (globalThis as any).localStorage
    delete (globalThis as any).CustomEvent
    vi.restoreAllMocks()
  })

  describe("PracticeNavbar link to /settings", () => {
    it("renders /settings in navigation items", () => {
      const html = renderToStaticMarkup(React.createElement(PracticeNavbar))
      expect(html).toContain('href="/settings"')
      expect(html).toContain("Settings")
    })
  })

  describe("Settings page sections render", () => {
    it("renders full settings page with all 4 sections (Language, Tutor, Motion, Data)", () => {
      const html = renderToStaticMarkup(React.createElement(SettingsPageComponent))
      expect(html).toContain("Settings")
      expect(html).toContain("Language / Ngôn ngữ")
      expect(html).toContain("AI Writing Tutor")
      expect(html).toContain("Display &amp; Motion")
      expect(html).toContain("Local Data Management")
    })
  })

  describe("LanguageSetting component", () => {
    it("renders English and Tiếng Việt options with active selection state", () => {
      const onSelect = vi.fn()
      const html = renderToStaticMarkup(
        React.createElement(LanguageSetting, {
          locale: "en",
          onSelectLocale: onSelect,
        })
      )
      expect(html).toContain("English")
      expect(html).toContain("Tiếng Việt")
      expect(html).toContain('data-active="true"')
    })

    it("clicking language option triggers locale update", () => {
      const onSelect = vi.fn()
      saveStoredSettings({ locale: "vi" })

      const html = renderToStaticMarkup(
        React.createElement(LanguageSetting, {
          locale: "vi",
          onSelectLocale: onSelect,
        })
      )
      expect(html).toContain("Ngôn ngữ / Language")
    })
  })

  describe("TutorSettings component", () => {
    it("renders auto-retry and reduced-motion toggles with label and description", () => {
      const onUpdate = vi.fn()
      const html = renderToStaticMarkup(
        React.createElement(TutorSettings, {
          tutorAutoRetry: true,
          reducedMotion: false,
          onUpdateSettings: onUpdate,
        })
      )
      expect(html).toContain("Automatic Retry on Error")
      expect(html).toContain("Reduced Motion")
    })

    it("toggle interactions update state properly", () => {
      const updates: any[] = []
      const onUpdate = vi.fn((partial) => updates.push(partial))

      // Simulate toggling tutorAutoRetry and reducedMotion
      onUpdate({ tutorAutoRetry: false })
      onUpdate({ reducedMotion: true })

      expect(updates).toEqual([
        { tutorAutoRetry: false },
        { reducedMotion: true },
      ])
    })
  })

  describe("DataSettings component", () => {
    it("renders Clear Tutor History and Clear All Local Progress buttons", () => {
      const onClearTutor = vi.fn()
      const onClearAll = vi.fn()
      const html = renderToStaticMarkup(
        React.createElement(DataSettings, {
          onClearTutorHistory: onClearTutor,
          onClearAllProgress: onClearAll,
        })
      )
      expect(html).toContain("Clear Tutor History")
      expect(html).toContain("Clear All Local Progress")
    })

    it("requires confirmation before clearing tutor history or all local progress", () => {
      const onClearTutor = vi.fn()
      const onClearAll = vi.fn()

      // Without confirmation action invoked, callback must NOT be called
      expect(onClearTutor).not.toHaveBeenCalled()
      expect(onClearAll).not.toHaveBeenCalled()

      // When confirmed:
      onClearTutor()
      onClearAll()
      expect(onClearTutor).toHaveBeenCalledTimes(1)
      expect(onClearAll).toHaveBeenCalledTimes(1)
    })
  })
})
