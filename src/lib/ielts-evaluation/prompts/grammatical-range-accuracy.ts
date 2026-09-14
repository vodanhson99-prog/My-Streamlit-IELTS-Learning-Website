import { buildCriterionPrompt, type CriterionPromptInput } from "./shared"

export const GRAMMATICAL_RANGE_ACCURACY_ANNOTATION_TAXONOMY = [
  "subject_verb_agreement",
  "article",
  "tense",
  "preposition",
  "pronoun",
  "word_order",
  "fragment",
  "run_on",
  "punctuation",
  "modifier",
  "clause_structure",
  "relative_clause",
  "conditional",
  "sentence_boundary",
  "other_grammar",
  "strong_structure",
] as const

export function buildGrammaticalRangeAccuracyPrompt(
  input: Omit<CriterionPromptInput, "criterionId" | "criterionName" | "focus" | "exclusions" | "annotationTaxonomy">,
) {
  return buildCriterionPrompt({
    ...input,
    criterionId: "grammatical-range-accuracy",
    criterionName: "Grammatical Range & Accuracy",
    focus: ["sentence-form range", "complex-structure flexibility", "grammar accuracy", "punctuation accuracy", "error frequency and impact on communication"],
    exclusions: ["error-free simple sentences as broad range", "vocabulary sophistication", "argument development", "paragraph organisation"],
    annotationTaxonomy: GRAMMATICAL_RANGE_ACCURACY_ANNOTATION_TAXONOMY,
  })
}
