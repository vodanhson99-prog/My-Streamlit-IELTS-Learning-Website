"use client"

import { useRouter } from "next/navigation"
import { usePracticeCatalog } from "@/hooks/use-practice-catalog"
import { SkillTestPanel } from "@/components/ielts/skill-test-panel"
import { SkillCatalogSkeleton } from "@/components/ielts/skill-catalog-skeleton"
import { PracticePageShell } from "@/components/ielts/practice-page-shell"
import { saveSelectedSlug } from "@/lib/practice-session"

export default function ListeningIndexPage() {
  const router = useRouter()
  const { source, isLoading, getTestsBySkill, loadTestDetail } = usePracticeCatalog()
  const listeningTests = getTestsBySkill("listening")

  const handleStart = (slug: string) => {
    saveSelectedSlug("listening", slug)
    router.push(`/listening/${slug}`)
  }

  if (isLoading && listeningTests.length === 0) {
    return (
      <PracticePageShell>
        <SkillCatalogSkeleton skillLabel="Listening" />
      </PracticePageShell>
    )
  }

  return (
    <PracticePageShell>
      <SkillTestPanel
        skill="listening"
        tests={listeningTests}
        onStartTest={handleStart}
        onLoadTest={loadTestDetail}
        catalogSource={source}
      />
    </PracticePageShell>
  )
}
