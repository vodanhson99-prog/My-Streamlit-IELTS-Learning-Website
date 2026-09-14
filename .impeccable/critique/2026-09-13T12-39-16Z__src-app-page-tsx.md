---
target: dashboard
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\minhmice\\Documents\\projects\\My-Streamlit-IELTS-Learning-Website\\src\\app\\page.tsx"
target_fingerprint: "sha256:89171b5d8222b843d97169d5b7c498894e4eb921182fb96d9106e6dce6e92f3d"
target_path: "C:\\Users\\minhmice\\Documents\\projects\\My-Streamlit-IELTS-Learning-Website\\src\\app\\page.tsx"
timestamp: 2026-09-13T12-39-16Z
slug: src-app-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 2/4 | Async AI status, draft-save state, and progress continuity are unclear. |
| 2 | Match System / Real World | 3/4 | IELTS terms fit; “Heuristic Estimate” and “Academic benchmark” add jargon. |
| 3 | User Control and Freedom | 3/4 | Navigation, retake, and destructive confirmation work; no undo or draft recovery. |
| 4 | Consistency and Standards | 3/4 | UI vocabulary coherent; CTA labels vary across modules. |
| 5 | Error Prevention | 2/4 | Prompt changes can mismatch essay text; no minimum-word guard or draft protection. |
| 6 | Recognition Rather Than Recall | 3/4 | Labels and active nav help; Coach, Progress, and Explain Bot boundaries need explanation. |
| 7 | Flexibility and Efficiency | 1/4 | No resume flow, shortcuts, recent prompts, or expert accelerators. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Clean and readable, but hero, metrics, modules, and six nav items compete. |
| 9 | Error Recovery | 2/4 | Errors preserve input but expose raw API wording and provide no retry action. |
| 10 | Help and Documentation | 2/4 | Inline descriptions exist; first-session guidance and scoring-limit guidance do not. |
| **Total** | | **24/40** | **Acceptable; significant improvements needed** |

## Design Specificity Verdict

Category-interchangeable with light IELTS theming. Emerald dashboard palette, dark recommendation hero, metric cards, module cards, and shadcn controls could serve any coaching product. IELTS specificity appears mainly in labels and content, not in composition or interaction model.

Deterministic detector: CLI scan of `src/app/page.tsx` and `src/components/ielts` returned 0 findings. Browser overlay surfaced 5 labels: 1 mostly valid undersized 10px brand subtitle at `src/app/page.tsx:60-75`, 1 intentional palette signal, and 3 false-positive nested-card labels on module cards. Overlay injection succeeded; browser detector console also reported `[impeccable] scan failed {}`, so CLI result remains authoritative.

## Overall Impression

Solid functional shell. Clear visual baseline. Dashboard feels like polished prototype, not yet focused IELTS study workspace. Biggest opportunity: make one next study action unmistakable, then connect every result to that next action.

## What's Working

1. Restrained palette, readable type, consistent card geometry, and strong contrast support long study sessions.
2. Reading score, Writing band breakdown, Coach diagnosis, and Explain Bot continuation align with product purpose.
3. Skip link, semantic `main`/`nav`, visible labels, form labels, and focus styles establish good accessibility foundations.

## Priority Issues

### [P1] Dashboard has no dominant study path

- Why it matters: six tabs and several equal-weight cards make users choose before starting; this conflicts with the short practice-to-next-step product principle.
- Fix: make one “Next session” block primary with skill, reason, duration, and one CTA; group Coach, Progress, and Explain Bot under Review.
- Locations: `src/components/ielts/home-view.tsx:34-204`, `src/app/page.tsx:74-96`.
- Suggested command: `/impeccable distill`.

### [P1] Static target and generic diagnosis weaken trust

- Why it matters: “7.5+ Academic benchmark” and “minimum 2 essays per week” look learner-specific without tracking or editable goal state.
- Fix: remove them or label them as defaults; ground recommendations in attempt history; show “not enough data” when evidence is absent.
- Locations: `src/components/ielts/home-view.tsx:124-136`, `src/components/ielts/coach-view.tsx:105-116`.
- Suggested command: `/impeccable clarify`.

### [P1] Feedback does not consistently produce next action

- Why it matters: Reading has Explain Bot continuation; Writing ends at result display and breaks the highest-value learning loop.
- Fix: add “Revise this essay,” “Practice weakest criterion,” and “View progress”; preserve prompt and draft context.
- Locations: `src/components/ielts/writing-view.tsx:205-270`, `src/components/ielts/reading-view.tsx:174-216`.
- Suggested command: `/impeccable layout`.

### [P2] Navigation labels and module boundaries demand interpretation

- Why it matters: first-timers may not know when to use Coach, Progress, or Explain Bot; six mobile actions are cramped.
- Fix: make Practice primary, move Coach and Progress under Review, rename Explain Bot to task language, and add one-line first-use guidance.
- Locations: `src/app/page.tsx:22-31`, `src/app/page.tsx:74-96`, `src/app/page.tsx:165-188`.
- Suggested command: `/impeccable clarify`.

### [P2] Unfinished work has weak protection and recovery

- Why it matters: refresh or prompt changes can lose or misalign Writing work; API errors lack retry guidance.
- Fix: save drafts per prompt, warn before changing prompt with text, preserve essay during retry, and translate fallback/API failures into plain-language recovery text.
- Locations: `src/components/ielts/writing-view.tsx:30-74`, `src/components/ielts/writing-view.tsx:104-140`, `src/components/ielts/explain-view.tsx:20-54`.
- Suggested command: `/impeccable harden`.

## Persona Red Flags

### Alex — Power User

No keyboard shortcuts, resume state, or direct revision flow. Reading always loads `READING_PASSAGES[0]` at `src/components/ielts/reading-view.tsx:17`. Repeated writing practice requires full setup.

### Jordan — First-Timer

“Dashboard,” “Coach,” “Progress,” and “Explain Bot” lack task guidance. “Writing needs attention,” “Target Band 7.5+,” “Heuristic Estimate,” and “Academic benchmark” can feel judgmental or unclear. Explain Bot requires manually supplying question, user answer, and correct answer.

## Minor Observations

- `hasApiKey === null` renders “Local Mode” before `/api/config` resolves (`src/app/page.tsx:38-44`, `src/app/page.tsx:100-120`).
- Progress graph uses generic `aria-label="Progress graph"` without dates, axis meaning, or trend summary (`src/components/ielts/progress-view.tsx:65-110`).
- “~2 min read” implies timing without timed-practice behavior (`src/components/ielts/reading-view.tsx:55-62`).
- Writing’s 250-word recommendation does not explain scoring impact below target (`src/components/ielts/writing-view.tsx:152-174`).
- Six mobile navigation buttons use compact `py-1`/`text-[10px]` treatment and may fall below comfortable touch sizing (`src/app/page.tsx:165-188`).
- No reduced-motion override appears in `src/app/globals.css` despite product requirements.

## Questions to Consider

1. Should dashboard optimize for one recommended next session, or preserve equal access to all six destinations?
2. Should “Writing needs attention” stay direct and diagnostic, or become warmer and confidence-building?
3. Should first pass fix top three issues, or address navigation, trust language, feedback continuity, and draft recovery together?
