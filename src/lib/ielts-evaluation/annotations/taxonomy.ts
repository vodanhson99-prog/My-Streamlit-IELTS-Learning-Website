import { TASK_RESPONSE_ANNOTATION_TAXONOMY } from "../prompts/task-response"
import { COHERENCE_COHESION_ANNOTATION_TAXONOMY } from "../prompts/coherence-cohesion"
import { LEXICAL_RESOURCE_ANNOTATION_TAXONOMY } from "../prompts/lexical-resource"
import { GRAMMATICAL_RANGE_ACCURACY_ANNOTATION_TAXONOMY } from "../prompts/grammatical-range-accuracy"

export const CRITERION_TAXONOMIES: Record<string, readonly string[]> = {
  "task-response": TASK_RESPONSE_ANNOTATION_TAXONOMY,
  "task-achievement": TASK_RESPONSE_ANNOTATION_TAXONOMY, // reused or extended for Task 1
  "coherence-cohesion": COHERENCE_COHESION_ANNOTATION_TAXONOMY,
  "lexical-resource": LEXICAL_RESOURCE_ANNOTATION_TAXONOMY,
  "grammatical-range-accuracy": GRAMMATICAL_RANGE_ACCURACY_ANNOTATION_TAXONOMY,
}

export function isAllowedAnnotationLabel(criterionId: string, label: string): boolean {
  const allowed = CRITERION_TAXONOMIES[criterionId]
  if (!allowed) return true
  return allowed.includes(label)
}
