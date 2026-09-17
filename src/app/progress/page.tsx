"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useProgress } from "@/hooks/use-progress"
import { ProgressView } from "@/components/ielts/progress-view"

export default function ProgressPage() {
  const router = useRouter()
  const { progress, clearProgress } = useProgress()

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-[3px] px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to overview
        </Link>
        <ProgressView
          progress={progress}
          onClear={clearProgress}
          onNavigateToListening={() => router.push("/listening")}
          onNavigateToReading={() => router.push("/reading")}
          onNavigateToWriting={() => router.push("/writing")}
        />
      </div>
    </main>
  )
}
