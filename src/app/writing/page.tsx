"use client"

import { useRouter } from "next/navigation"
import { usePracticeCatalog } from "@/hooks/use-practice-catalog"
import { SkillTestPanel } from "@/components/ielts/skill-test-panel"
import { SkillCatalogSkeleton } from "@/components/ielts/skill-catalog-skeleton"
import { PracticePageShell } from "@/components/ielts/practice-page-shell"
import { saveSelectedSlug } from "@/lib/practice-session"

export default function WritingIndexPage() {
  const router = useRouter()
  const { source, isLoading, getTestsBySkill, loadTestDetail } = usePracticeCatalog()
  const writingTests = getTestsBySkill("writing")

  const handleStart = (slug: string) => {
    saveSelectedSlug("writing", slug)
    router.push(`/writing/${slug}`)
  }

  if (isLoading && writingTests.length === 0) {
    return (
      <PracticePageShell>
        <SkillCatalogSkeleton skillLabel="Writing" />
      </PracticePageShell>
    )
  }

  return (
    <PracticePageShell>
      <SkillTestPanel
        skill="writing"
        tests={writingTests}
        onStartTest={handleStart}
        onLoadTest={loadTestDetail}
        catalogSource={source}
      />
    </PracticePageShell>
  )
}
