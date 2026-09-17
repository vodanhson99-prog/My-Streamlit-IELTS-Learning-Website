"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { loadTestResult, clearPracticeSession } from "@/lib/practice-session"
import { TestResultPayload } from "@/lib/ielts"
import { TestResultView } from "@/components/ielts/test-result-view"
import { ClientHydration } from "@/components/ielts/client-hydration"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function ReadingResultPage({ params }: PageProps) {
  const router = useRouter()
  const { slug } = use(params)

  return (
    <ClientHydration>
      <ReadingResultContent slug={slug} router={router} />
    </ClientHydration>
  )
}

function ReadingResultContent({
  slug,
  router,
}: {
  slug: string
  router: ReturnType<typeof useRouter>
}) {
  const result = loadTestResult("reading", slug) as TestResultPayload | null

  if (!result) {
    return (
      <div className="max-w-md mx-auto py-16 text-center flex flex-col items-center gap-3">
        <h2 className="text-base font-semibold">No test result available</h2>
        <p className="text-xs text-muted-foreground">
          You haven&apos;t submitted this test yet or your session was cleared.
        </p>
        <button
          onClick={() => router.push(`/reading/${slug}`)}
          className="text-xs text-foreground underline font-medium hover:text-muted-foreground transition-colors pt-2"
        >
          Go to Practice Test
        </button>
      </div>
    )
  }

  return (
    <>
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        <TestResultView
          result={result}
          onBackToPanel={() => router.push("/reading")}
          onRetake={() => {
            clearPracticeSession("reading", slug)
            router.push(`/reading/${slug}`)
          }}
        />
      </main>
    </>
  )
}


