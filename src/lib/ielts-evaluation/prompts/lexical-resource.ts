import { buildCriterionPrompt, type CriterionPromptInput } from "./shared"

export const LEXICAL_RESOURCE_ANNOTATION_TAXONOMY = [
  "lexical_repetition",
  "imprecise_word",
  "incorrect_word",
  "wrong_collocation",
  "unnatural_collocation",
  "register",
  "word_form",
  "spelling",
  "overuse",
  "strong_usage",
] as const

export function buildLexicalResourcePrompt(
  input: Omit<CriterionPromptInput, "criterionId" | "criterionName" | "focus" | "exclusions" | "annotationTaxonomy">,
) {
  return buildCriterionPrompt({
    ...input,
    criterionId: "lexical-resource",
    criterionName: "Lexical Resource",
    focus: ["range and flexibility", "precision and appropriacy", "collocation and register", "repetition", "word formation and spelling"],
    exclusions: ["rare word equals good vocabulary", "grammar range", "argument quality", "paragraph organisation"],
    annotationTaxonomy: LEXICAL_RESOURCE_ANNOTATION_TAXONOMY,
  })
}
