"use client"

import * as React from "react"
import { Database, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useSettings } from "@/hooks/use-settings"

interface DataSettingsProps {
  readonly onClearTutorHistory?: () => void
  readonly onClearAllProgress?: () => void
}

export function DataSettings({
  onClearTutorHistory,
  onClearAllProgress,
}: DataSettingsProps) {
  const { clearTutorHistory, clearAllLocalProgress, t } = useSettings()
  const [tutorCleared, setTutorCleared] = React.useState(false)
  const [allCleared, setAllCleared] = React.useState(false)

  const handleClearTutor = () => {
    if (onClearTutorHistory) {
      onClearTutorHistory()
    } else {
      clearTutorHistory()
    }
    setTutorCleared(true)
    setTimeout(() => setTutorCleared(false), 3000)
  }

  const handleClearAll = () => {
    if (onClearAllProgress) {
      onClearAllProgress()
    } else {
      clearAllLocalProgress()
    }
    setAllCleared(true)
    setTimeout(() => setAllCleared(false), 3000)
  }

  return (
    <section className="rounded-[4px] border border-border/80 bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2.5 mb-1.5">
        <Database className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
          {t("settings.data.title")}
        </h2>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">
        {t("settings.data.description")}
      </p>

      <div className="space-y-3">
        {/* Clear Tutor History Item */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[3px] border border-border/60 bg-background/50">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-medium text-foreground">
              {t("settings.data.clearTutor")}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {t("settings.data.clearTutorConfirm")}
            </span>
            {tutorCleared && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                <CheckCircle2 className="size-3" />
                {t("settings.data.clearTutorSuccess")}
              </span>
            )}
          </div>

          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
              {t("settings.data.clearTutor")}
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <div className="flex items-center gap-2 text-destructive mb-1">
                  <AlertTriangle className="size-4" />
                  <AlertDialogTitle className="text-sm font-semibold">
                    {t("settings.data.clearTutor")}
                  </AlertDialogTitle>
                </div>
                <AlertDialogDescription className="text-xs text-muted-foreground">
                  {t("settings.data.clearTutorConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  size="sm"
                  onClick={handleClearTutor}
                >
                  Confirm Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Clear All Progress Item */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[3px] border border-destructive/30 bg-destructive/5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-medium text-destructive">
              {t("settings.data.clearAll")}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {t("settings.data.clearAllConfirm")}
            </span>
            {allCleared && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                <CheckCircle2 className="size-3" />
                {t("settings.data.clearAllSuccess")}
              </span>
            )}
          </div>

          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
              {t("settings.data.clearAll")}
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <div className="flex items-center gap-2 text-destructive mb-1">
                  <AlertTriangle className="size-4" />
                  <AlertDialogTitle className="text-sm font-semibold">
                    {t("settings.data.clearAll")}
                  </AlertDialogTitle>
                </div>
                <AlertDialogDescription className="text-xs text-muted-foreground">
                  {t("settings.data.clearAllConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  size="sm"
                  onClick={handleClearAll}
                >
                  Reset All Progress
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </section>
  )
}
