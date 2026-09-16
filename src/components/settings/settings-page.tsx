"use client"

import * as React from "react"
import { Settings as SettingsIcon } from "lucide-react"
import { LanguageSetting } from "./language-setting"
import { TutorSettings } from "./tutor-settings"
import { DataSettings } from "./data-settings"
import { useSettings } from "@/hooks/use-settings"

export function SettingsPageComponent() {
  const { t } = useSettings()

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Header */}
        <header className="mb-6 sm:mb-8 pb-4 border-b border-border/80">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="flex size-7 items-center justify-center rounded-[3px] bg-muted/60 text-foreground">
              <SettingsIcon className="size-4" aria-hidden="true" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {t("settings.title")}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("settings.description")}
          </p>
        </header>

        {/* Sections */}
        <div className="space-y-6">
          <LanguageSetting />
          <TutorSettings />
          <DataSettings />
        </div>
      </main>
    </div>
  )
}
