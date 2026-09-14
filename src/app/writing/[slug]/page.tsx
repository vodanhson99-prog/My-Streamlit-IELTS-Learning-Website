"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { usePracticeCatalog } from "@/hooks/use-practice-catalog"
import { useProgress } from "@/hooks/use-progress"
import { WritingView } from "@/components/ielts/writing-view"
import { SkillLoadingState } from "@/components/ielts/skill-loading-state"
import { ClientHydration } from "@/components/ielts/client-hydration"
import { saveTestResult } from "@/lib/practice-session"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function WritingSlugPage({ params }: PageProps) {
  const router = useRouter()
  const { slug } = use(params)
  const { getTestBySkillAndSlug, isLoading } = usePracticeCatalog()
  const { addWritingRecord } = useProgress()

  const test = getTestBySkillAndSlug("writing", slug)

  if (isLoading && !test) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <SkillLoadingState
          label="Preparing writing test…"
          sublabel="Loading task prompt"
        />
      </div>
    )
  }

  if (!test) {
    return (
      <div className="max-w-md mx-auto py-16 text-center flex flex-col items-center gap-3">
        <h2 className="text-base font-semibold">Test not found</h2>
        <p className="text-xs text-muted-foreground">
          This writing test is not in the current catalog.
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
          <WritingView
            test={test}
            onComplete={(feedback) => {
              addWritingRecord(feedback, test.id, test.title, test.slug)
              saveTestResult({
                skill: "writing",
                slug: test.slug,
                testId: test.id,
                title: test.title,
                completedAt: new Date().toISOString(),
                band: feedback.band_estimate,
                criterionBands: feedback.criterion_bands,
                criteriaSentences: feedback.criteria_sentences,
                overallTip: feedback.overall_tip,
                source: feedback.source,
                writingDetails: (feedback as any).evaluation
                  ? {
                      taskType: (feedback as any).taskType,
                      testType: (feedback as any).testType,
                      essay: (feedback as any).essay,
                      prompt: (feedback as any).prompt,
                      evaluation: (feedback as any).evaluation,
                      resolvedAnnotations: (feedback as any).resolvedAnnotations,
                      coaching: (feedback as any).coaching,
                    }
                  : undefined,
              })
              router.replace(`/writing/${test.slug}/result`)
            }}
          />
        </ClientHydration>
      </main>
    </>
  )
}


