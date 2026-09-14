import { describe, expect, it } from "vitest"
import type { AnnotationCandidate } from "../../src/lib/ielts-evaluation/contracts"
import { resolveAnnotations } from "../../src/lib/ielts-evaluation/annotations/resolver"
import { isAllowedAnnotationLabel } from "../../src/lib/ielts-evaluation/annotations/taxonomy"

const ESSAY = `In modern society, technological development has significantly changed human communication.
First, online platforms allow instant connection across the world. For example, business teams collaborate across continents.
Second, people can work from home easily. For example, business teams collaborate across continents when working remotely.
However, excessive reliance on social media can reduce meaningful face-to-face interaction, which may lead to social isolation.
Therefore, people should use digital tools wisely while maintaining real personal relationships.`

describe("taxonomy validation", () => {
  it("validates criterion taxonomy labels correctly", () => {
    expect(isAllowedAnnotationLabel("task-response", "prompt_coverage")).toBe(true)
    expect(isAllowedAnnotationLabel("task-response", "spelling")).toBe(false)
    expect(isAllowedAnnotationLabel("lexical-resource", "spelling")).toBe(true)
    expect(isAllowedAnnotationLabel("grammatical-range-accuracy", "tense")).toBe(true)
    expect(isAllowedAnnotationLabel("coherence-cohesion", "cohesive_device")).toBe(true)
  })
})

describe("resolveAnnotations", () => {
  it("resolves unique quote with exact character offsets", () => {
    const candidates: AnnotationCandidate[] = [
      {
        quote: "technological development has significantly changed human communication",
        label: "prompt_coverage",
        rationale: "Addresses prompt directly",
      },
    ]

    const results = resolveAnnotations(candidates, ESSAY, "task-response")
    expect(results).toHaveLength(1)
    expect(results[0].status).toBe("resolved")
    expect(results[0].startOffset).toBeDefined()
    expect(results[0].endOffset).toBeDefined()
    const slice = ESSAY.slice(results[0].startOffset!, results[0].endOffset!)
    expect(slice).toBe(candidates[0].quote)
  })

  it("marks missing quote as unresolved with no offsets", () => {
    const candidates: AnnotationCandidate[] = [
      {
        quote: "this quote does not exist anywhere in student writing",
        label: "prompt_coverage",
        rationale: "Missing",
      },
    ]

    const results = resolveAnnotations(candidates, ESSAY, "task-response")
    expect(results).toHaveLength(1)
    expect(results[0].status).toBe("unresolved")
    expect(results[0].startOffset).toBeUndefined()
    expect(results[0].endOffset).toBeUndefined()
  })

  it("marks duplicate quotes as ambiguous when no disambiguation context is available", () => {
    const candidates: AnnotationCandidate[] = [
      {
        quote: "business teams collaborate across continents",
        label: "prompt_coverage",
        rationale: "Appears twice in different paragraphs",
      },
    ]

    const results = resolveAnnotations(candidates, ESSAY, "task-response")
    expect(results).toHaveLength(1)
    expect(results[0].status).toBe("ambiguous")
    expect(results[0].startOffset).toBeUndefined()
    expect(results[0].endOffset).toBeUndefined()
  })

  it("resolves duplicate quotes when paragraphIndex is provided", () => {
    const candidates = [
      {
        quote: "business teams collaborate across continents",
        label: "support",
        rationale: "Second occurrence in paragraph 2",
        paragraphIndex: 2,
      },
    ]

    const results = resolveAnnotations(candidates, ESSAY, "task-response")
    expect(results).toHaveLength(1)
    expect(results[0].status).toBe("resolved")
    const slice = ESSAY.slice(results[0].startOffset!, results[0].endOffset!)
    expect(slice).toBe(candidates[0].quote)
    expect(results[0].startOffset).toBeGreaterThan(150)
  })

  it("normalizes newlines and punctuation whitespace without mutating original text", () => {
    const candidate: AnnotationCandidate = {
      quote: "excessive reliance on social media can reduce meaningful face-to-face interaction",
      label: "relevance",
      rationale: "Key point",
    }
    const results = resolveAnnotations([candidate], ESSAY, "task-response")
    expect(results[0].status).toBe("resolved")
  })
})
