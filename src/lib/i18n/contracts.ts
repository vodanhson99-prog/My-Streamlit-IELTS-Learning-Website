export interface I18nDictionary {
  // Settings page
  "settings.title": string
  "settings.description": string
  "settings.language.title": string
  "settings.language.description": string
  "settings.language.en": string
  "settings.language.vi": string
  "settings.tutor.title": string
  "settings.tutor.retryLabel": string
  "settings.tutor.retryDescription": string
  "settings.motion.title": string
  "settings.motion.reduceLabel": string
  "settings.motion.reduceDescription": string
  "settings.data.title": string
  "settings.data.description": string
  "settings.data.clearTutor": string
  "settings.data.clearTutorConfirm": string
  "settings.data.clearTutorSuccess": string
  "settings.data.clearAll": string
  "settings.data.clearAllConfirm": string
  "settings.data.clearAllSuccess": string

  // Tutor Chrome
  "tutor.title": string
  "tutor.subtitle": string
  "tutor.send": string
  "tutor.thinking": string
  "tutor.tryAgain": string
  "tutor.close": string
  "tutor.askPlaceholder": string
  "tutor.emptyStateTitle": string
  "tutor.emptyStateDescription": string
  "tutor.suggestedFollowUps": string
  "tutor.errorGeneric": string
}

export type MessageKey = keyof I18nDictionary
