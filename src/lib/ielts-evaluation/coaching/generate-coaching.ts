import type {
  CriterionEvaluation,
  IeltsHalfBand,
  LockedTask2Evaluation,
  ResolvedAnnotation,
} from "../contracts"
import type { LockedTask1Evaluation, Task1CriterionEvaluation } from "../task1/contracts"

export interface CoachingPriority {
  readonly criterionId: string
  readonly title: string
  readonly rationale: string
  readonly actionItem: string
}

export interface VocabularySuggestion {
  readonly original: string
  readonly suggested: string
  readonly contextSentence: string
  readonly reason: string
}

export interface GrammarSuggestion {
  readonly issue: string
  readonly original: string
  readonly correction: string
  readonly ruleExplanation: string
}

export interface WritingCoaching {
  readonly strengths: readonly string[]
  readonly priorities: readonly CoachingPriority[]
  readonly nextBandBlockers: readonly string[]
  readonly vocabularySuggestions: readonly VocabularySuggestion[]
  readonly grammarSuggestions: readonly GrammarSuggestion[]
  readonly targetBandPlan?: {
    readonly currentBand: IeltsHalfBand
    readonly targetBand: IeltsHalfBand
    readonly keyMilestones: readonly string[]
  }
}

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

  // ponytail: until occurrence/severity metadata exists, band gap and observed limitations approximate learning impact.
  const priorityScore = (criterion: CriterionEvaluation | Task1CriterionEvaluation) => {
    const bandGap = 9 - criterion.band
    const errorFrequency = Math.max(1, criterion.limitingEvidence.length)
    const severity = criterion.band <= 5 ? 2 : criterion.band <= 7 ? 1.5 : 1
    const recurrence = Math.max(1, new Set(criterion.limitingEvidence.map((item) => item.rationale)).size)
    const learningImpact = criterion.nextBandBlockers.length > 0 ? 2 : 1
    return bandGap * errorFrequency * severity * recurrence * learningImpact
  }

  const sortedByPriority = criteria
    .filter((criterion) => criterion.nextBandBlockers.length > 0 || criterion.limitingEvidence.length > 0)
    .sort((a, b) => priorityScore(b) - priorityScore(a))
  const priorities: CoachingPriority[] = sortedByPriority.slice(0, 3).map((c) => ({
    criterionId: c.criterionId,
    title: `Improve ${c.criterionId} (Band ${c.band})`,
    rationale: c.nextBandBlockers[0] || c.limitingEvidence[0]?.rationale || `Current performance is limited by descriptor ${c.descriptorId}`,
    actionItem: `Focus on overcoming: ${c.nextBandBlockers[0] || c.limitingEvidence[0]?.rationale || "accuracy and consistency"} in your next draft.`,
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
  if (targetBand && targetBand > lockedEval.overallBand && sortedByPriority.length > 0) {
    targetBandPlan = {
      currentBand: lockedEval.overallBand,
      targetBand,
      keyMilestones: [
        `Elevate ${sortedByPriority[0].criterionId} from Band ${sortedByPriority[0].band} to ${Math.min(9, sortedByPriority[0].band + 1)}`,
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
