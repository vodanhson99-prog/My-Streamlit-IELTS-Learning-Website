---
name: ielts with rbs
description: Focused, local-first IELTS practice workspace
colors:
  paper: "#ffffff"
  ink: "#000000"
  muted: "#f4f4f5"
  quiet-ink: "#52525b"
  rule: "#e4e4e7"
typography:
  display:
    fontFamily: "var(--font-alumni-sans), system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  body:
    fontFamily: "var(--font-albert-sans), system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "var(--font-jetbrains-mono), monospace"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.12em"
rounded:
  sm: "1px"
  md: "2px"
  lg: "3px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  ruled-task-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "0px"
    padding: "20px"
---

# Design System: ielts with rbs

## Overview

**Creative North Star: "The Study Sheet"**

ielts with rbs uses a focused working surface for learners who want to begin practice without navigating a noisy dashboard. The homepage uses paper-white space, black ink, ruled divisions, condensed display type, and quiet monospaced measurements. Structure carries emphasis; decoration stays out of the way.

The visual system is restrained and high-contrast. Full-width practice rows create the main action surface, while progress and review remain supporting evidence. Interaction uses clear filled, outlined, and tonal states with visible keyboard focus.

**Key Characteristics:**
- Ruled, full-width task rows instead of a wall of floating cards.
- Black-and-white hierarchy with muted gray support tones.
- Condensed headings paired with readable sans body text and mono data.
- Flat surfaces and 1px rules; no decorative depth.

## Colors

The palette is paper, ink, and quiet rules. Contrast belongs to the task hierarchy, not accent noise.

### Primary
- **Ink** (#000000): Primary actions, active navigation, and the selected Reading task row.

### Neutral
- **Paper** (#ffffff): Page and component surfaces.
- **Muted** (#f4f4f5): Hover and secondary surface state.
- **Quiet Ink** (#52525b): Supporting copy and metadata.
- **Rule** (#e4e4e7): Dividers and field boundaries.

**The Ink-and-Paper Rule.** Let black ink identify action and paper preserve reading calm; do not add competing accent colors without a product reason.

## Typography

**Display Font:** Alumni Sans (with system sans fallback)
**Body Font:** Albert Sans (with system sans fallback)
**Label/Mono Font:** JetBrains Mono

**Character:** Display headings are condensed and assertive. Body copy remains compact but readable; mono is reserved for scores, labels, status, and measurement.

### Hierarchy
- **Display** (600, 36–48px, 0.95 line-height, -0.04em): Homepage and major page headings.
- **Title** (600, 24px, natural line-height, -0.03em): Section headings such as practice and review.
- **Body** (400, 12–13px, 1.45 line-height): Explanations and task descriptions, kept to readable measures.
- **Label** (400, 10–11px, tracked, often uppercase): Scores, status, metadata, and action hints.

**The One Voice Rule.** Use condensed type for hierarchy, sans for explanation, and mono only where data or system state is present.

## Layout

The homepage follows Orient → Act → Reflect. The opening band introduces the workspace and puts the score register beside the title on wide screens. The practice sheet follows immediately, with Reading as the strongest action and Listening/Writing as adjacent ruled rows. Activity and record summary form a supporting two-column region on wide screens; review tools close the page.

The content container is capped at 1152px with 16px gutters, expanding to 24px from the small breakpoint. Major bands use generous 40px separation; internal groups use 12–24px gaps. On narrow screens, the DOM order stays linear: title, score register, practice rows, activity, record, review. Rows reflow without changing task order or reducing touch targets.

## Elevation & Depth

The system is flat by default. Depth comes from tonal changes, ruled boundaries, and the single filled primary task row. Cards remain useful for the chart's semantic grouping but do not carry shadows.

**The Flat Surface Rule.** No shadow should compete with a practice action; use a border or tonal state first.

## Shapes

Corners stay nearly square: 1px to 3px radius for controls and compact components. Long task rows use square edges and 1px horizontal rules. Focus uses a high-contrast ring and inset treatment so keyboard state remains visible without changing layout.

## Components

### Buttons
- **Shape:** Nearly square (2px radius).
- **Primary:** Ink background, paper text, 40px homepage height, compact horizontal padding.
- **Hover / Focus:** Slight tonal change; high-contrast visible focus ring.
- **Secondary / Ghost:** Paper or transparent surface with rule or muted hover state.

### Cards / Containers
- **Corner Style:** 3px default; chart presentation can remove side corners where it joins the page rhythm.
- **Background:** Paper with rule boundaries.
- **Shadow Strategy:** Flat; no resting shadow.
- **Border:** 1px neutral rule, or black for major section boundaries.
- **Internal Padding:** 12px to 20px.

### Navigation
- **Style:** Sticky, compact horizontal navigation with icon plus label.
- **Active:** Ink background with paper text.
- **Mobile:** Horizontal overflow preserves access to all routes; links retain comfortable minimum height.

### Ruled Task Rows
Full-width buttons represent skill choices. Reading uses the primary ink treatment; Listening and Writing use paper with neutral rules and muted hover. Each row keeps icon, title, description, and action affordance aligned and keyboard reachable.

## Do's and Don'ts

### Do:
- **Do** lead homepage with practice selection, not analytics.
- **Do** use proximity and horizontal rules to group tasks.
- **Do** keep scores and status in JetBrains Mono.
- **Do** preserve visible focus and reduced-motion behavior.
- **Do** keep mobile order identical to desktop reading order.

### Don't:
- **Don't** turn every homepage region into a rounded card.
- **Don't** use decorative gradients, gamified progress treatments, or competing accent colors.
- **Don't** use monospace as the display voice for explanatory copy.
- **Don't** hide empty score states behind an ambiguous dash.
