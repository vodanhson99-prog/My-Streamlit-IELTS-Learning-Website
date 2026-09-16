export const MIN_PANE_WIDTH = 30
export const MAX_PANE_WIDTH = 70
export const DEFAULT_PANE_WIDTH = 50

export function clampPaneWidth(width: number): number {
  if (isNaN(width) || !isFinite(width)) return DEFAULT_PANE_WIDTH
  return Math.min(MAX_PANE_WIDTH, Math.max(MIN_PANE_WIDTH, Math.round(width)))
}

export function parseStoredPaneWidth(raw: string | null): number {
  if (!raw) return DEFAULT_PANE_WIDTH
  const parsed = parseFloat(raw)
  if (isNaN(parsed) || !isFinite(parsed)) return DEFAULT_PANE_WIDTH
  return clampPaneWidth(parsed)
}
