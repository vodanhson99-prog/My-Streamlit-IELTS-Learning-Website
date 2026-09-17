"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { usePracticeCatalog } from "@/hooks/use-practice-catalog"
import { WritingView } from "@/components/ielts/writing-view"
import { SkillLoadingState } from "@/components/ielts/skill-loading-state"
import { ClientHydration } from "@/components/ielts/client-hydration"
import type { PracticeTest } from "@/lib/ielts"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function WritingSlugPage({ params }: PageProps) {
  const router = useRouter()
  const { slug } = use(params)
  const { getTestBySkillAndSlug, loadTestDetail, isLoading } = usePracticeCatalog()

  const catalogTest = getTestBySkillAndSlug("writing", slug)
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
          label="Preparing writing test…"
          sublabel="Loading task prompt"
        />
      </div>
    )
  }

  if (!catalogTest || !test) {
    return (
      <div className="max-w-md mx-auto py-16 text-center flex flex-col items-center gap-3">
        <h2 className="text-base font-semibold">Test not found</h2>
        <p className="text-xs text-muted-foreground">
          {detailError || "This writing test is not in the current catalog."}
        </p>
        <button
          onClick={() => router.push("/writing")}
          className="text-xs text-foreground underline font-medium hover:text-muted-foreground transition-colors pt-2"
        >
          Return to Writing Library
        </button>
      </div>
    )
  }

  return (
    <>
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        <ClientHydration>
          <WritingView test={test} />
        </ClientHydration>
      </main>
    </>
  )
}


