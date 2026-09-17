"use client"

import { useRouter } from "next/navigation"
import { usePracticeCatalog } from "@/hooks/use-practice-catalog"
import { SkillTestPanel } from "@/components/ielts/skill-test-panel"
import { SkillCatalogSkeleton } from "@/components/ielts/skill-catalog-skeleton"
import { PracticePageShell } from "@/components/ielts/practice-page-shell"
import { saveSelectedSlug } from "@/lib/practice-session"

export default function ReadingIndexPage() {
  const router = useRouter()
  const { source, isLoading, getTestsBySkill, loadTestDetail } = usePracticeCatalog()
  const readingTests = getTestsBySkill("reading")

  const handleStart = (slug: string) => {
    saveSelectedSlug("reading", slug)
    router.push(`/reading/${slug}`)
  }

  if (isLoading && readingTests.length === 0) {
    return (
      <PracticePageShell>
        <SkillCatalogSkeleton skillLabel="Reading" />
      </PracticePageShell>
    )
  }

  return (
    <PracticePageShell>
      <SkillTestPanel
        skill="reading"
        tests={readingTests}
        onStartTest={handleStart}
        onLoadTest={loadTestDetail}
        catalogSource={source}
      />
    </PracticePageShell>
  )
}
