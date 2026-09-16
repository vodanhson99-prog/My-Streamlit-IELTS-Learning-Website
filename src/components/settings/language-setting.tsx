"use client"

import * as React from "react"
import { Check, Languages } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AppLocale } from "@/lib/settings/contracts"
import { useSettings } from "@/hooks/use-settings"

import { getMessages } from "@/lib/i18n/messages"
import type { MessageKey } from "@/lib/i18n/contracts"

interface LanguageSettingProps {
  readonly locale?: AppLocale
  readonly onSelectLocale?: (locale: AppLocale) => void
}

const LANGUAGES: readonly { code: AppLocale; labelKey: "settings.language.en" | "settings.language.vi" }[] = [
  { code: "en", labelKey: "settings.language.en" },
  { code: "vi", labelKey: "settings.language.vi" },
]

export function LanguageSetting({ locale: propLocale, onSelectLocale }: LanguageSettingProps) {
  const { settings, updateSettings, t: defaultT } = useSettings()
  const currentLocale = propLocale ?? settings.locale
  const messages = propLocale ? getMessages(propLocale) : null
  const t = (key: MessageKey) => messages ? messages[key] || defaultT(key) : defaultT(key)

  const handleSelect = (code: AppLocale) => {
    if (onSelectLocale) {
      onSelectLocale(code)
    } else {
      updateSettings({ locale: code })
    }
  }

  return (
    <section className="rounded-[4px] border border-border/80 bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2.5 mb-1.5">
        <Languages className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
          {t("settings.language.title")}
        </h2>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">
        {t("settings.language.description")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {LANGUAGES.map(({ code, labelKey }) => {
          const isActive = currentLocale === code
          return (
            <button
              key={code}
              type="button"
              data-active={isActive ? "true" : "false"}
              onClick={() => handleSelect(code)}
              className={cn(
                "group relative flex items-center justify-between p-3 rounded-[3px] border text-left transition-all duration-150 cursor-pointer",
                isActive
                  ? "border-foreground/40 bg-muted/50 font-medium text-foreground ring-1 ring-border/50"
                  : "border-border/60 bg-background/50 hover:bg-muted/30 text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] leading-none">{t(labelKey)}</span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">{code}</span>
              </div>
              {isActive && (
                <Check className="size-3.5 text-foreground" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
