import { describe, it, expect } from "vitest"
import { clampPaneWidth, parseStoredPaneWidth, MIN_PANE_WIDTH, MAX_PANE_WIDTH, DEFAULT_PANE_WIDTH } from "../src/lib/reading-layout"

describe("Reading layout pane helpers", () => {
  it("clamps width between min (30%) and max (70%)", () => {
    expect(clampPaneWidth(10)).toBe(MIN_PANE_WIDTH)
    expect(clampPaneWidth(30)).toBe(30)
    expect(clampPaneWidth(50)).toBe(50)
    expect(clampPaneWidth(70)).toBe(70)
    expect(clampPaneWidth(90)).toBe(MAX_PANE_WIDTH)
    expect(clampPaneWidth(NaN)).toBe(DEFAULT_PANE_WIDTH)
    expect(clampPaneWidth(Infinity)).toBe(DEFAULT_PANE_WIDTH)
  })

  it("parses stored width from localStorage and falls back to 50%", () => {
    expect(parseStoredPaneWidth("45")).toBe(45)
    expect(parseStoredPaneWidth("20")).toBe(MIN_PANE_WIDTH)
    expect(parseStoredPaneWidth("85")).toBe(MAX_PANE_WIDTH)
    expect(parseStoredPaneWidth(null)).toBe(DEFAULT_PANE_WIDTH)
    expect(parseStoredPaneWidth("invalid")).toBe(DEFAULT_PANE_WIDTH)
  })
})
