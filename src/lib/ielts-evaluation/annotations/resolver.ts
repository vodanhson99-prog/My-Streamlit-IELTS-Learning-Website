import type { AnnotationCandidate, ResolvedAnnotation } from "../contracts"
import { getParagraphOffsets } from "../validation/evidence"

function findOccurrences(text: string, search: string): number[] {
  const indices: number[] = []
  let startIndex = 0
  while (startIndex < text.length) {
    const index = text.indexOf(search, startIndex)
    if (index === -1) break
    indices.push(index)
    startIndex = index + search.length
  }
  return indices
}

export function resolveAnnotations(
  candidates: readonly AnnotationCandidate[],
  essay: string,
  criterionId: string,
): readonly ResolvedAnnotation[] {
  const paragraphOffsets = getParagraphOffsets(essay)

  return candidates.map((candidate, idx) => {
    const id = `${criterionId}-anno-${idx}`
    const quote = candidate.quote

    if (!quote.trim()) {
      return {
        id,
        criterionId,
        quote: candidate.quote,
        label: candidate.label,
        rationale: candidate.rationale,
        status: "unresolved",
      }
    }

    const occurrences = findOccurrences(essay, quote)

    if (occurrences.length === 0) {
      return {
        id,
        criterionId,
        quote,
        label: candidate.label,
        rationale: candidate.rationale,
        status: "unresolved",
      }
    }

    if (occurrences.length === 1) {
      const startOffset = occurrences[0]
      const endOffset = startOffset + quote.length
      return {
        id,
        criterionId,
        quote,
        label: candidate.label,
        rationale: candidate.rationale,
        status: "resolved",
        startOffset,
        endOffset,
      }
    }

    // Multiple occurrences: disambiguate using paragraphIndex or surroundingContext
    if (
      candidate.paragraphIndex !== undefined &&
      candidate.paragraphIndex >= 0 &&
      candidate.paragraphIndex < paragraphOffsets.length
    ) {
      const targetP = paragraphOffsets[candidate.paragraphIndex]
      const inParagraph = occurrences.filter((occ) => occ >= targetP.start && occ + quote.length <= targetP.end)
      if (inParagraph.length === 1) {
        const startOffset = inParagraph[0]
        const endOffset = startOffset + quote.length
        return {
          id,
          criterionId,
          quote,
          label: candidate.label,
          rationale: candidate.rationale,
          status: "resolved",
          startOffset,
          endOffset,
        }
      }
    }

    if (candidate.surroundingContext) {
      const ctx = candidate.surroundingContext
      const ctxOccurrences = findOccurrences(essay, ctx)
      if (ctxOccurrences.length === 1) {
        const ctxStart = ctxOccurrences[0]
        const relative = ctx.indexOf(quote)
        if (relative !== -1) {
          const startOffset = ctxStart + relative
          const endOffset = startOffset + quote.length
          return {
            id,
            criterionId,
            quote,
            label: candidate.label,
            rationale: candidate.rationale,
            status: "resolved",
            startOffset,
            endOffset,
          }
        }
      }
    }

    return {
      id,
      criterionId,
      quote,
      label: candidate.label,
      rationale: candidate.rationale,
      status: "ambiguous",
    }
  })
}
