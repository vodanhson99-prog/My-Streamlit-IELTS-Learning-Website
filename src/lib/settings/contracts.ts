export type AppLocale = "en" | "vi"

export interface UserSettings {
  readonly version: 1
  readonly locale: AppLocale
  readonly tutorAutoRetry: boolean
  readonly reducedMotion: boolean
}

export const DEFAULT_USER_SETTINGS: UserSettings = Object.freeze({
  version: 1,
  locale: "en",
  tutorAutoRetry: true,
  reducedMotion: false,
})
