import { DEFAULT_USER_SETTINGS, type UserSettings } from "./contracts"

export const SETTINGS_STORAGE_KEY = "ielts_settings_v1"
export const SETTINGS_CHANGE_EVENT = "ielts_settings_change"

export function isValidUserSettings(value: unknown): value is UserSettings {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>

  return (
    candidate.version === 1 &&
    (candidate.locale === "en" || candidate.locale === "vi") &&
    typeof candidate.tutorAutoRetry === "boolean" &&
    typeof candidate.reducedMotion === "boolean"
  )
}

export function getStoredSettings(): UserSettings {
  if (typeof window === "undefined") {
    return DEFAULT_USER_SETTINGS
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_USER_SETTINGS

    const parsed = JSON.parse(raw)
    if (isValidUserSettings(parsed)) {
      return parsed
    }
    return DEFAULT_USER_SETTINGS
  } catch {
    return DEFAULT_USER_SETTINGS
  }
}

export function saveStoredSettings(partial: Partial<UserSettings>): UserSettings {
  const current = getStoredSettings()
  const next: UserSettings = {
    version: 1,
    locale: partial.locale === "vi" ? "vi" : partial.locale === "en" ? "en" : current.locale,
    tutorAutoRetry:
      typeof partial.tutorAutoRetry === "boolean" ? partial.tutorAutoRetry : current.tutorAutoRetry,
    reducedMotion:
      typeof partial.reducedMotion === "boolean" ? partial.reducedMotion : current.reducedMotion,
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: next }))
    } catch {
      // storage unavailable / quota exceeded - fail silently
    }
  }

  return next
}

export function clearTutorHistory(): void {
  if (typeof window === "undefined") return

  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith("ielts_tutor_v1:")) {
        keysToRemove.push(key)
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
}

export function clearAllLocalProgress(): void {
  if (typeof window === "undefined") return

  try {
    const prefixesToRemove = [
      "ielts_tutor_v1:",
      "ielts_progress_v",
      "ielts_session_v",
      "ielts_result_v",
      "ielts_selected_slug_v",
      "ielts_reading_pane_width",
      "ielts_reading_font_size",
      "ielts_practice_catalog_cache_",
      "ielts_test_detail_v",
    ]

    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key === SETTINGS_STORAGE_KEY) continue

      if (prefixesToRemove.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key)
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
}
