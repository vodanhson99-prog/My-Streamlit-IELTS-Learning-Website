"use client"

import * as React from "react"
import { Bot, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserSettings } from "@/lib/settings/contracts"
import { useSettings } from "@/hooks/use-settings"

interface TutorSettingsProps {
  readonly tutorAutoRetry?: boolean
  readonly reducedMotion?: boolean
  readonly onUpdateSettings?: (partial: Partial<UserSettings>) => void
}

export function TutorSettings({
  tutorAutoRetry: propRetry,
  reducedMotion: propMotion,
  onUpdateSettings,
}: TutorSettingsProps) {
  const { settings, updateSettings, t } = useSettings()

  const autoRetry = propRetry ?? settings.tutorAutoRetry
  const motionReduced = propMotion ?? settings.reducedMotion

  const handleToggleRetry = () => {
    const nextVal = !autoRetry
    if (onUpdateSettings) {
      onUpdateSettings({ tutorAutoRetry: nextVal })
    } else {
      updateSettings({ tutorAutoRetry: nextVal })
    }
  }

  const handleToggleMotion = () => {
    const nextVal = !motionReduced
    if (onUpdateSettings) {
      onUpdateSettings({ reducedMotion: nextVal })
    } else {
      updateSettings({ reducedMotion: nextVal })
    }
  }

  return (
    <div className="space-y-4">
      {/* AI Writing Tutor Section */}
      <section className="rounded-[4px] border border-border/80 bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2.5 mb-1.5">
          <Bot className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
            {t("settings.tutor.title")}
          </h2>
        </div>
        <p className="text-[11px] text-muted-foreground mb-4">
          {t("settings.tutor.retryDescription")}
        </p>

        <div className="flex items-center justify-between p-3 rounded-[3px] border border-border/60 bg-background/50">
          <div className="flex flex-col gap-0.5 pr-4">
            <span className="text-[12px] font-medium text-foreground">
              {t("settings.tutor.retryLabel")}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {t("settings.tutor.retryDescription")}
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoRetry}
            onClick={handleToggleRetry}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              autoRetry ? "bg-foreground" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block size-4 rounded-full bg-background shadow-sm ring-0 transition duration-200 ease-in-out",
                autoRetry ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
        </div>
      </section>

      {/* Display & Motion Section */}
      <section className="rounded-[4px] border border-border/80 bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2.5 mb-1.5">
          <Sparkles className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
            {t("settings.motion.title")}
          </h2>
        </div>
        <p className="text-[11px] text-muted-foreground mb-4">
          {t("settings.motion.reduceDescription")}
        </p>

        <div className="flex items-center justify-between p-3 rounded-[3px] border border-border/60 bg-background/50">
          <div className="flex flex-col gap-0.5 pr-4">
            <span className="text-[12px] font-medium text-foreground">
              {t("settings.motion.reduceLabel")}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {t("settings.motion.reduceDescription")}
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={motionReduced}
            onClick={handleToggleMotion}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              motionReduced ? "bg-foreground" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block size-4 rounded-full bg-background shadow-sm ring-0 transition duration-200 ease-in-out",
                motionReduced ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
        </div>
      </section>
    </div>
  )
}
