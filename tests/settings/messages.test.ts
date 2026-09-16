import { describe, it, expect } from "vitest"
import { enMessages, viMessages, getMessages, t, type MessageKey } from "@/lib/i18n/messages"
import type { I18nDictionary } from "@/lib/i18n/contracts"

describe("i18n messages and dictionary", () => {
  it("en and vi have identical keys (100% key parity)", () => {
    const enKeys = Object.keys(enMessages).sort()
    const viKeys = Object.keys(viMessages).sort()

    expect(enKeys).toEqual(viKeys)
  })

  it("all message values are non-empty strings in both en and vi", () => {
    for (const [key, value] of Object.entries(enMessages)) {
      expect(typeof value, `en[${key}] must be string`).toBe("string")
      expect((value as string).trim().length, `en[${key}] must not be empty`).toBeGreaterThan(0)
    }

    for (const [key, value] of Object.entries(viMessages)) {
      expect(typeof value, `vi[${key}] must be string`).toBe("string")
      expect((value as string).trim().length, `vi[${key}] must not be empty`).toBeGreaterThan(0)
    }
  })

  it("getMessages returns corresponding dictionary for locale", () => {
    expect(getMessages("en")).toBe(enMessages)
    expect(getMessages("vi")).toBe(viMessages)
  })

  it("t helper returns translated string for given key and locale", () => {
    expect(t("en", "settings.title")).toBe(enMessages["settings.title"])
    expect(t("vi", "settings.title")).toBe(viMessages["settings.title"])
    expect(t("vi", "settings.title")).not.toEqual(enMessages["settings.title"])
  })

  it("contains necessary keys for Settings page and Tutor chrome", () => {
    const requiredKeys: MessageKey[] = [
      "settings.title",
      "settings.description",
      "settings.language.title",
      "settings.language.description",
      "settings.tutor.title",
      "settings.tutor.retryLabel",
      "settings.tutor.retryDescription",
      "settings.motion.title",
      "settings.motion.reduceLabel",
      "settings.motion.reduceDescription",
      "settings.data.title",
      "settings.data.clearTutor",
      "settings.data.clearTutorConfirm",
      "settings.data.clearAll",
      "settings.data.clearAllConfirm",
      "tutor.title",
      "tutor.thinking",
      "tutor.tryAgain",
      "tutor.close",
      "tutor.askPlaceholder",
      "tutor.emptyStateTitle",
      "tutor.emptyStateDescription",
      "tutor.suggestedFollowUps",
    ]

    for (const key of requiredKeys) {
      expect(enMessages[key]).toBeDefined()
      expect(viMessages[key]).toBeDefined()
    }
  })
})
