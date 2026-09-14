import type { AIProvider } from "../../ai/contracts"
import {
  buildGrammaticalRangeAccuracyPrompt,
  GRAMMATICAL_RANGE_ACCURACY_ANNOTATION_TAXONOMY,
} from "../prompts/grammatical-range-accuracy"
import { createCriterionGrader } from "./shared"

export function createGrammaticalRangeAccuracyGrader(provider: AIProvider) {
  return createCriterionGrader(
    provider,
    "grammatical-range-accuracy",
    GRAMMATICAL_RANGE_ACCURACY_ANNOTATION_TAXONOMY,
    buildGrammaticalRangeAccuracyPrompt,
  )
}
