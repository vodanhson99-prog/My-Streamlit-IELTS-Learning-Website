import { buildCriterionPrompt, type CriterionPromptInput } from "./shared"

export const TASK_RESPONSE_ANNOTATION_TAXONOMY = [
  "prompt_coverage",
  "position",
  "relevance",
  "development",
  "support",
  "repetition",
  "irrelevant_content",
] as const

export function buildTaskResponsePrompt(
  input: Omit<CriterionPromptInput, "criterionId" | "criterionName" | "focus" | "exclusions" | "annotationTaxonomy">,
) {
  return buildCriterionPrompt({
    ...input,
    criterionId: "task-response",
    criterionName: "Task Response",
    focus: ["coverage of every prompt part", "clear position", "relevant ideas", "development and support", "repetition and irrelevant content"],
    exclusions: ["grammar quality", "vocabulary sophistication", "cohesive-device counting"],
    annotationTaxonomy: TASK_RESPONSE_ANNOTATION_TAXONOMY,
  })
}
