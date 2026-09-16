"use client"

import { useSyncExternalStore, useCallback } from "react"
import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/lib/settings/contracts"
import {
  getStoredSettings,
  saveStoredSettings,
  clearTutorHistory as storageClearTutor,
  clearAllLocalProgress as storageClearAll,
  SETTINGS_CHANGE_EVENT,
} from "@/lib/settings/storage"
import { getMessages, t as translateHelper, type MessageKey } from "@/lib/i18n/messages"
import type { I18nDictionary } from "@/lib/i18n/contracts"

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === "ielts_settings_v1") {
      callback()
    }
  }

  window.addEventListener(SETTINGS_CHANGE_EVENT, callback)
  window.addEventListener("storage", handleStorage)

  return () => {
    window.removeEventListener(SETTINGS_CHANGE_EVENT, callback)
    window.removeEventListener("storage", handleStorage)
  }
}

function getServerSnapshot(): UserSettings {
  return DEFAULT_USER_SETTINGS
}

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getStoredSettings, getServerSnapshot)

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    return saveStoredSettings(partial)
  }, [])

  const clearTutorHistory = useCallback(() => {
    storageClearTutor()
  }, [])

  const clearAllLocalProgress = useCallback(() => {
    storageClearAll()
  }, [])

  const messages: I18nDictionary = getMessages(settings.locale)

  const t = useCallback(
    (key: MessageKey): string => {
      return translateHelper(settings.locale, key)
    },
    [settings.locale]
  )

  return {
    settings,
    updateSettings,
    clearTutorHistory,
    clearAllLocalProgress,
    messages,
    t,
  }
}
