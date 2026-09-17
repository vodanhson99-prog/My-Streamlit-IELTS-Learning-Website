import type { AIProvider } from "../../ai/contracts"
import { buildCoherenceCohesionPrompt, COHERENCE_COHESION_ANNOTATION_TAXONOMY } from "../prompts/coherence-cohesion"
import { createCriterionGrader } from "./shared"

export function createCoherenceCohesionGrader(provider: AIProvider) {
  return createCriterionGrader(provider, "coherence-cohesion", COHERENCE_COHESION_ANNOTATION_TAXONOMY, buildCoherenceCohesionPrompt)
}
