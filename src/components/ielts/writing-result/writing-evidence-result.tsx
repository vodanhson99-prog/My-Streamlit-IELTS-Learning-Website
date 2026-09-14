"use client"

import { useState } from "react"
import type { TestResultPayload, WritingDetailsPayload } from "@/lib/ielts"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RotateCcw, Bot } from "lucide-react"
import { ScoreOverview } from "./score-overview"
import { CriterionCard } from "./criterion-card"
import { AnnotatedEssay } from "./annotated-essay"
import { AnnotationDetail } from "./annotation-detail"
import { NextBandBlockers } from "./next-band-blockers"
import { TutorPanel } from "../tutor/tutor-panel"
import type { ResolvedAnnotation } from "@/lib/ielts-evaluation/contracts"

interface WritingEvidenceResultProps {
  result: TestResultPayload
  onRetake: () => void
  onBackToPanel: () => void
  onAskTutor?: (annotationId: string) => void
}

export function WritingEvidenceResult({
  result,
  onRetake,
  onBackToPanel,
}: WritingEvidenceResultProps) {
  const details: WritingDetailsPayload | undefined = result.writingDetails
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | undefined>(undefined)
  const [isTutorOpen, setIsTutorOpen] = useState(false)
  const [focusedTutorAnnotationId, setFocusedTutorAnnotationId] = useState<string | undefined>(undefined)

  const selectedAnnotation = details?.resolvedAnnotations?.find(
    (a: ResolvedAnnotation) => a.id === selectedAnnotationId,
  )

  const criteria = details?.evaluation?.criteria || []

  const handleAskTutor = (annotationId: string) => {
    setFocusedTutorAnnotationId(annotationId)
    setIsTutorOpen(true)
  }

  return (
    <div className="flex flex-col gap-5 my-6 relative">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onBackToPanel}
          className="h-8 text-xs font-mono rounded-[2px] border-border"
        >
          <ArrowLeft className="size-3.5 mr-1.5" /> Back to library
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTutorOpen(true)}
            className="h-8 text-xs font-mono rounded-[2px] border-border gap-1.5"
          >
            <Bot className="size-3.5" /> Ask IELTS Tutor
          </Button>
          <Button
            size="sm"
            onClick={onRetake}
            className="h-8 text-xs font-medium rounded-[2px]"
          >
            <RotateCcw className="size-3.5 mr-1.5" /> Retake this test
          </Button>
        </div>
      </div>

      {/* Main Score Overview */}
      <ScoreOverview
        taskType={details?.taskType}
        overallBand={result.band}
        stability={details?.evaluation?.stability}
        summary={details?.evaluation?.summary}
      />

      {/* Next Band Guidance */}
      {details?.coaching && <NextBandBlockers coaching={details.coaching} />}

      {/* Annotated Essay + Annotation Details */}
      {details?.essay && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2">
            <AnnotatedEssay
              essay={details.essay}
              annotations={details.resolvedAnnotations || []}
              selectedAnnotationId={selectedAnnotationId}
              onSelectAnnotation={setSelectedAnnotationId}
            />
          </div>
          <div className="lg:col-span-1">
            <AnnotationDetail
              annotation={selectedAnnotation}
              onAskTutor={handleAskTutor}
            />
          </div>
        </div>
      )}

      {/* 4 Criterion Cards */}
      {criteria.length > 0 && (
        <div className="flex flex-col gap-3 pt-2">
          <h3 className="text-sm font-semibold text-foreground">Detailed Criterion Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criteria.map((c) => (
              <CriterionCard
                key={c.criterionId}
                criterionId={c.criterionId}
                band={c.band}
                descriptorId={c.descriptorId}
                evidence={c.evidence || []}
                blockers={c.blockers || []}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tutor Panel Drawer */}
      <TutorPanel
        slug={result.slug}
        writingDetails={details}
        isOpen={isTutorOpen}
        onClose={() => setIsTutorOpen(false)}
        focusedAnnotationId={focusedTutorAnnotationId}
      />
    </div>
  )
}
