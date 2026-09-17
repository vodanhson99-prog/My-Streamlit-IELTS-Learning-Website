import { buildCriterionPrompt, type CriterionPromptInput } from "./shared"

export const COHERENCE_COHESION_ANNOTATION_TAXONOMY = [
  "logical_organisation",
  "overall_progression",
  "paragraphing",
  "topic_focus",
  "idea_relationship",
  "reference_substitution",
  "cohesive_device",
  "mechanical_linking",
  "overuse",
  "underuse",
] as const

export function buildCoherenceCohesionPrompt(
  input: Omit<CriterionPromptInput, "criterionId" | "criterionName" | "focus" | "exclusions" | "annotationTaxonomy">,
) {
  return buildCriterionPrompt({
    ...input,
    criterionId: "coherence-cohesion",
    criterionName: "Coherence & Cohesion",
    focus: ["logical organisation and progression", "paragraphing and topic focus", "relationships between ideas", "reference and substitution", "cohesive-device quality, including mechanical, over-, or under-use"],
    exclusions: ["linking-word counting", "grammar accuracy", "vocabulary range", "task position quality"],
    annotationTaxonomy: COHERENCE_COHESION_ANNOTATION_TAXONOMY,
  })
}
