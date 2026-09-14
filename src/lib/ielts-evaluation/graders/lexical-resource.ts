import type { AIProvider } from "../../ai/contracts"
import { buildLexicalResourcePrompt, LEXICAL_RESOURCE_ANNOTATION_TAXONOMY } from "../prompts/lexical-resource"
import { createCriterionGrader } from "./shared"

export function createLexicalResourceGrader(provider: AIProvider) {
  return createCriterionGrader(provider, "lexical-resource", LEXICAL_RESOURCE_ANNOTATION_TAXONOMY, buildLexicalResourcePrompt)
}
