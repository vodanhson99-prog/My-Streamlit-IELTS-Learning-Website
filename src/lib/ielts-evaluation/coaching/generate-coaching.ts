import type {
  CoachingPriority,
  CoachingPriorityFactors,
  CriterionEvaluation,
  GrammarSuggestion,
  IeltsHalfBand,
  LockedTask2Evaluation,
  ResolvedAnnotation,
  VocabularySuggestion,
  WritingCoaching,
} from "../contracts"
export type { CoachingPriority, CoachingPriorityFactors, GrammarSuggestion, VocabularySuggestion, WritingCoaching }
import type { LockedTask1Evaluation, Task1CriterionEvaluation } from "../task1/contracts"

type AnyLockedEvaluation = LockedTask2Evaluation | LockedTask1Evaluation

export function generateCoaching(
  lockedEval: AnyLockedEvaluation,
  resolvedAnnotations: readonly ResolvedAnnotation[] = [],
  targetBand?: IeltsHalfBand,
): WritingCoaching {
  // Defensive immutability check
  if (!lockedEval.locked) {
    throw new Error("Cannot generate coaching on unlocked or incomplete evaluation")
  }

  const criteria: readonly (CriterionEvaluation | Task1CriterionEvaluation)[] = lockedEval.criteria
  const strengths: string[] = []
  const blockers: string[] = []

  for (const c of criteria) {
    if (c.supportingEvidence.length > 0) {
      strengths.push(`${c.criterionId}: ${c.supportingEvidence[0].rationale}`)
    }
    blockers.push(...c.nextBandBlockers)
  }

  const getPriorityScoreAndFactors = (criterion: CriterionEvaluation | Task1CriterionEvaluation): { score: number; factors: CoachingPriorityFactors } => {
    const bandGap = 9 - criterion.band
    const annotationCount = resolvedAnnotations.filter(
      (a) => a.criterionId === criterion.criterionId && a.status === "resolved",
    ).length
    // ponytail: use explicit annotation count when available, fallback to limiting evidence length
    const errorFrequency = annotationCount > 0 ? annotationCount : Math.max(1, criterion.limitingEvidence.length)
    const severity = criterion.band <= 5 ? 2 : criterion.band <= 7 ? 1.5 : 1
    const recurrence = Math.max(1, new Set(criterion.limitingEvidence.map((item) => item.rationale)).size)
    const learningImpact = criterion.nextBandBlockers.length > 0 ? 2 : 1
    
    const totalScore = bandGap * errorFrequency * severity * recurrence * learningImpact
    return {
      score: totalScore,
      factors: { bandGap, errorFrequency, severity, recurrence, learningImpact, totalScore },
    }
  }

  const scoredCriteria = criteria
    .filter((criterion) => criterion.nextBandBlockers.length > 0 || criterion.limitingEvidence.length > 0)
    .map((criterion) => ({ criterion, ...getPriorityScoreAndFactors(criterion) }))
    .sort((a, b) => b.score - a.score)

  const priorities: CoachingPriority[] = scoredCriteria.slice(0, 3).map(({ criterion: c, factors }) => ({
    criterionId: c.criterionId,
    title: `Improve ${c.criterionId} (Band ${c.band})`,
    rationale: c.nextBandBlockers[0] || c.limitingEvidence[0]?.rationale || `Current performance is limited by descriptor ${c.descriptorId}`,
    actionItem: `Focus on overcoming: ${c.nextBandBlockers[0] || c.limitingEvidence[0]?.rationale || "accuracy and consistency"} in your next draft.`,
    factors,
  }))

  // 3. Derive contextual vocabulary suggestions from resolved lexical annotations
  const lexicalAnnotations = resolvedAnnotations.filter(
    (a) => a.criterionId === "lexical-resource" && a.status === "resolved",
  )
  const vocabularySuggestions: VocabularySuggestion[] = lexicalAnnotations.slice(0, 3).map((a) => ({
    original: a.quote,
    suggested: `Accurate collocation/academic alternative for "${a.quote}"`,
    contextSentence: `Context around "${a.quote}"`,
    reason: a.rationale,
  }))

  // 4. Derive grammar suggestions from grammatical annotations
  const grammarAnnotations = resolvedAnnotations.filter(
    (a) => a.criterionId === "grammatical-range-accuracy" && a.status === "resolved",
  )
  const grammarSuggestions: GrammarSuggestion[] = grammarAnnotations.slice(0, 3).map((a) => ({
    issue: a.label,
    original: a.quote,
    correction: `Corrected clause containing "${a.quote}"`,
    ruleExplanation: a.rationale,
  }))

  let targetBandPlan: WritingCoaching["targetBandPlan"] = undefined
  if (targetBand && targetBand > lockedEval.overallBand && scoredCriteria.length > 0) {
    targetBandPlan = {
      currentBand: lockedEval.overallBand,
      targetBand,
      keyMilestones: [
        `Elevate ${scoredCriteria[0].criterion.criterionId} from Band ${scoredCriteria[0].criterion.band} to ${Math.min(9, scoredCriteria[0].criterion.band + 1)}`,
        `Address priority blockers: ${blockers.slice(0, 2).join("; ")}`,
      ],
    }
  }

  return Object.freeze({
    strengths: Object.freeze(strengths.slice(0, 3)),
    priorities: Object.freeze(priorities),
    nextBandBlockers: Object.freeze([...new Set(blockers)].slice(0, 5)),
    vocabularySuggestions: Object.freeze(vocabularySuggestions),
    grammarSuggestions: Object.freeze(grammarSuggestions),
    targetBandPlan: targetBandPlan ? Object.freeze(targetBandPlan) : undefined,
  })
}
