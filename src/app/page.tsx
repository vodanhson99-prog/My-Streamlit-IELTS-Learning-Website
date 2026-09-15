"use client"

import { useState, useEffect } from "react"
import { useProgress } from "@/hooks/use-progress"
import { usePracticeCatalog } from "@/hooks/use-practice-catalog"
import { HomeView } from "@/components/ielts/home-view"
import { SkillTestPanel } from "@/components/ielts/skill-test-panel"
import { useRouter } from "next/navigation"
import { saveSelectedSlug } from "@/lib/practice-session"
import { ExplainView } from "@/components/ielts/explain-view"
import { CoachView } from "@/components/ielts/coach-view"
import { ProgressView } from "@/components/ielts/progress-view"
import { PageTransition } from "@/components/ielts/page-transition"
import { Badge } from "@/components/ui/badge"

type TabType = "home" | "coach" | "listening" | "reading" | "writing" | "explain" | "progress"

export default function AppShell() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>("home")
  const { progress, isLoaded, clearProgress } = useProgress()
  const { source: catalogSource, isLoading: isCatalogLoading, getTestsBySkill, loadTestDetail } = usePracticeCatalog()
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setHasApiKey(Boolean(data.has_api_key)))
      .catch(() => setHasApiKey(false))
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-foreground selection:text-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[3px] focus:bg-foreground focus:px-3 focus:py-1.5 focus:text-background focus:text-xs font-mono shadow-xs"
      >
        Skip to main content
      </a>

      <main id="main-content" className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 pb-24 md:pb-8">
        <aside aria-label="System status" className="mb-4 hidden justify-end gap-2 md:flex">
          <Badge variant="outline" className="text-[10px] font-mono rounded-[3px] px-2 py-0.5 items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${catalogSource === "live" ? "bg-foreground" : "bg-muted-foreground"}`} />
            {catalogSource === "live" ? "Library: live" : catalogSource === "client-cached" ? "Library: cached" : isCatalogLoading ? "Library: syncing…" : "Library: fallback"}
          </Badge>
          <Badge variant={hasApiKey ? "default" : "secondary"} className="text-[10px] font-mono rounded-[3px] px-2 py-0.5">
            {hasApiKey === null ? "AI: checking…" : hasApiKey ? "AI: ready" : "AI: local"}
          </Badge>
        </aside>

        {!isLoaded ? (
          <div
            className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto py-20 text-center text-muted-foreground font-mono"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="relative size-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-border" />
              <div className="absolute inset-0 rounded-full border-t border-foreground animate-loader-orbit" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] tracking-tight">Loading local practice session…</p>
              <div className="h-0.5 w-24 overflow-hidden rounded-[1px] bg-muted relative">
                <div className="absolute inset-0 bg-foreground/70 animate-loader-shimmer" />
              </div>
            </div>
          </div>
        ) : (
          <PageTransition transitionKey={activeTab}>
            {activeTab === "home" && (
              <HomeView
                progress={progress}
                onNavigate={(tab) => setActiveTab(tab)}
                onStartTest={(skill, slug) => {
                  saveSelectedSlug(skill, slug)
                  router.push(`/${skill}/${slug}`)
                }}
                onLoadTest={loadTestDetail}
                listeningTests={getTestsBySkill("listening")}
                readingTests={getTestsBySkill("reading")}
                writingTests={getTestsBySkill("writing")}
              />
            )}
            {activeTab === "listening" && (
              <SkillTestPanel
                skill="listening"
                tests={getTestsBySkill("listening")}
                onStartTest={(slug) => {
                  saveSelectedSlug("listening", slug)
                  router.push(`/listening/${slug}`)
                }}
                catalogSource={catalogSource}
              />
            )}
            {activeTab === "reading" && (
              <SkillTestPanel
                skill="reading"
                tests={getTestsBySkill("reading")}
                onStartTest={(slug) => {
                  saveSelectedSlug("reading", slug)
                  router.push(`/reading/${slug}`)
                }}
                catalogSource={catalogSource}
              />
            )}
            {activeTab === "writing" && (
              <SkillTestPanel
                skill="writing"
                tests={getTestsBySkill("writing")}
                onStartTest={(slug) => {
                  saveSelectedSlug("writing", slug)
                  router.push(`/writing/${slug}`)
                }}
                catalogSource={catalogSource}
              />
            )}
            {activeTab === "explain" && <ExplainView />}
            {activeTab === "coach" && (
              <CoachView
                progress={progress}
                onNavigateToWriting={() => setActiveTab("writing")}
              />
            )}
            {activeTab === "progress" && (
              <ProgressView
                progress={progress}
                onClear={clearProgress}
                onNavigateToListening={() => setActiveTab("listening")}
                onNavigateToReading={() => setActiveTab("reading")}
                onNavigateToWriting={() => setActiveTab("writing")}
              />
            )}
          </PageTransition>
        )}
      </main>

    </div>
  )
}
