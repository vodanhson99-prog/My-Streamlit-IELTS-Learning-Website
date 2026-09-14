import type { AIProvider } from "../../ai/contracts"
import { buildTaskResponsePrompt, TASK_RESPONSE_ANNOTATION_TAXONOMY } from "../prompts/task-response"
import { createCriterionGrader } from "./shared"

export function createTaskResponseGrader(provider: AIProvider) {
  return createCriterionGrader(provider, "task-response", TASK_RESPONSE_ANNOTATION_TAXONOMY, buildTaskResponsePrompt)
}
