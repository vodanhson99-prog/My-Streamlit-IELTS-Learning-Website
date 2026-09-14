"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { usePracticeCatalog } from "@/hooks/use-practice-catalog"
import { useProgress } from "@/hooks/use-progress"
import { ListeningView } from "@/components/ielts/listening-view"
import { SkillLoadingState } from "@/components/ielts/skill-loading-state"
import { ClientHydration } from "@/components/ielts/client-hydration"
import { saveTestResult } from "@/lib/practice-session"
import type { PracticeTest } from "@/lib/ielts"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function ListeningSlugPage({ params }: PageProps) {
  const router = useRouter()
  const { slug } = use(params)
  const { getTestBySkillAndSlug, loadTestDetail, isLoading } = usePracticeCatalog()
  const { addListeningRecord } = useProgress()
  const catalogTest = getTestBySkillAndSlug("listening", slug)
  const [test, setTest] = useState<PracticeTest | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  useEffect(() => {
    if (!catalogTest) return
    let cancelled = false
    loadTestDetail(catalogTest)
      .then((detailed) => {
        if (!cancelled) setTest(detailed)
      })
      .catch((error: Error) => {
        if (!cancelled) setDetailError(error.message)
      })
    return () => {
      cancelled = true
    }
    // Intentionally keyed by id/slug to avoid remount loops when catalog object identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogTest?.id, catalogTest?.slug])

  if ((isLoading && !catalogTest) || (catalogTest && !test && !detailError)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <SkillLoadingState
          label="Loading listening session…"
          sublabel="Fetching test questions and audio track"
        />
      </div>
    )
  }

  if (!catalogTest || !test) {
    return (
      <div className="max-w-md mx-auto py-16 text-center flex flex-col gap-4">
        <h2 className="text-lg font-bold">Practice test not found</h2>
        <p className="text-xs text-muted-foreground">
          {detailError || (
            <>
              Could not find a listening test for slug: <span className="font-mono">{slug}</span>
            </>
          )}
        </p>
        <button
          onClick={() => router.push("/listening")}
          className="text-xs text-emerald-700 underline font-medium"
        >
          Return to Listening Library
        </button>
      </div>
    )
  }

  return (
    <>
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        <ClientHydration>
          <ListeningView
            test={test}
            onComplete={(score, total, band) => {
              addListeningRecord(score, total, test.id, band, test.title, test.slug)
              saveTestResult({
                skill: "listening",
                slug: test.slug,
                testId: test.id,
                title: test.title,
                completedAt: new Date().toISOString(),
                score,
                total,
                band,
                source: "direct",
              })
              router.replace(`/listening/${test.slug}/result`)
            }}
          />
        </ClientHydration>
      </main>
    </>
  )
}
