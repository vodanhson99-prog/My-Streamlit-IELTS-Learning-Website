# Reading Split-Pane and Passage Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Reading Passage 1 readable paragraph-by-paragraph with fetched images, improve Reading content fetching, and provide a resizable desktop Reading/Answering workspace with a convenient mobile fallback.

**Architecture:** Preserve passage structure as a small typed block model instead of flattening HTML into one string. Parse and sanitize upstream passage markup on the server, resolve image URLs through the existing trusted fetch boundary, and render blocks in the client ReadingView. Replace the current desktop grid with a native pointer-driven split pane that persists its width; retain the existing two-tab mobile experience and add compact question navigation.

**Tech Stack:** Next.js 16.3.5, React 19.2.8, TypeScript 5, Tailwind CSS v4, Vitest 5, existing `iot-session` fetch boundary, existing `PracticeTest` types.

**Spec:** No separate design document was created; approved in-chat design is the source: desktop/tablet landscape split-pane with draggable divider, mobile two tabs, persisted divider position with 50/50 reset, and passage headings/paragraphs/images/tables preserved.

## Global Constraints

- Do not add dependencies; use existing React, Tailwind, `lucide-react`, and native Pointer Events.
- Do not expose cookies or upstream credentials to the browser.
- Keep upstream fetching restricted by the existing `iot-session` HTTPS allowlist.
- Keep mobile as tabs; do not force a vertically stacked split pane.
- Do not add comments to application code.
- Existing unrelated Writing changes in the worktree must not be modified or staged.
- Verify with `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build`.

---

## File Map

- Modify `src/lib/ielts.ts`: extend the passage data shape with optional structured blocks while keeping `passageText` compatibility.
- Modify `src/lib/iot-parser.ts`: extract safe structured passage blocks, preserve paragraph/heading/list/table boundaries, discover image sources, and map passages by question ranges rather than only panel index.
- Modify `src/app/api/practice-tests/[quizId]/route.ts`: normalize/resolve passage image URLs through the server-side trusted fetch path and return structured passage data.
- Modify `src/components/ielts/reading-view.tsx`: render structured passage blocks, implement desktop resizable split pane, persist width, add 50/50 reset, and retain mobile tabs.
- Modify `src/components/ielts/reading-view.tsx` or the existing focused component files only where current boundaries require it; avoid unrelated refactors.
- Modify `tests/reading-parser.test.ts`: parser regression and structured-content tests.
- Create `tests/reading-layout.test.tsx` only if the repository test setup supports React component tests without adding dependencies; otherwise keep pure layout calculations in an existing testable utility.

---

### Task 1: Define Structured Passage Data

**Files:**
- Modify: `src/lib/ielts.ts` at the `PracticeSection`/passage type definitions
- Test: `tests/reading-parser.test.ts`

**Interfaces:**
- Produces `type ReadingPassageBlock = { type: "heading" | "paragraph" | "list" | "table" | "image"; text?: string; items?: string[]; rows?: string[][]; src?: string; alt?: string }`.
- Produces `PracticeSection.passageBlocks?: ReadingPassageBlock[]`.
- Keeps `PracticeSection.passageText?: string` for existing consumers and fallback data.

- [ ] **Step 1: Add failing type-level usage test**

Add a parser test fixture that expects `sections[0].passageBlocks` to contain heading, paragraph, and image block values. The test must compile against the exported `ReadingPassageBlock` type.

- [ ] **Step 2: Run focused test**

Run: `pnpm exec vitest run tests/reading-parser.test.ts`
Expected: FAIL because parser does not yet produce `passageBlocks`.

- [ ] **Step 3: Add the minimal optional type**

Add the union and optional `passageBlocks` field beside existing IELTS practice section types. Keep all fields optional except `type`, allowing parser blocks to omit irrelevant properties.

- [ ] **Step 4: Run typecheck and focused test**

Run: `pnpm exec tsc --noEmit; pnpm exec vitest run tests/reading-parser.test.ts`
Expected: Typecheck passes; behavior test still fails until Task 2.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ielts.ts tests/reading-parser.test.ts
git commit -m "feat: define structured reading passage blocks"
```

### Task 2: Parse Safe Passage Blocks and Images

**Files:**
- Modify: `src/lib/iot-parser.ts:141-194, 554-645`
- Modify: `tests/reading-parser.test.ts`

**Interfaces:**
- Consumes `ReadingPassageBlock` from `src/lib/ielts.ts`.
- Produces `extractReadingPassageBlocks(rawHtml: string): ReadingPassageBlock[]`.
- `parsePageSections` populates `passageBlocks` and derives compatibility `passageText` from text blocks.

- [ ] **Step 1: Write failing parser tests**

Add tests covering:

```ts
const blocks = extractReadingPassageBlocks(`
  <div class="reading-passage">
    <h3>Sleepy Students Perform Worse</h3>
    <p><strong>A.</strong> First paragraph.</p>
    <p><strong>B.</strong> Second paragraph.</p>
    <img src="/sites/default/files/passage.png" alt="Sleep study chart">
  </div>
`)
expect(blocks.map((block) => block.type)).toEqual(["heading", "paragraph", "paragraph", "image"])
expect(blocks[0]).toMatchObject({ type: "heading", text: "Sleepy Students Perform Worse" })
expect(blocks[3]).toMatchObject({ type: "image", src: "/sites/default/files/passage.png", alt: "Sleep study chart" })
```

Add tests proving nested markup does not truncate passage, scripts/styles are excluded, empty blocks are omitted, and `passageText` remains the joined paragraph text.

- [ ] **Step 2: Run tests to confirm failure**

Run: `pnpm exec vitest run tests/reading-parser.test.ts`
Expected: FAIL with missing export or empty structured blocks.

- [ ] **Step 3: Implement block extraction without a new dependency**

Use the existing HTML extraction approach only for locating the passage container, then scan direct content tags (`h1`-`h6`, `p`, `li`, `table`, `img`) and normalize text with existing decoding helpers. Ignore `script`, `style`, form controls, question containers, and unsupported tags. Convert relative image `src` values to a marker-preserving URL; do not fetch credentials in parser code. Keep fallback `cleanText` output when no recognized blocks exist.

- [ ] **Step 4: Populate sections and preserve compatibility**

In `parsePageSections`, assign blocks when reading passage HTML is available. Derive `passageText` by joining heading/paragraph/list text with single spaces, while retaining the current fallback passage extraction for old fixtures and incomplete upstream markup.

- [ ] **Step 5: Run focused tests**

Run: `pnpm exec vitest run tests/reading-parser.test.ts`
Expected: PASS, including all existing parser tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/iot-parser.ts tests/reading-parser.test.ts
git commit -m "feat: preserve reading passage structure"
```

### Task 3: Make Passage Mapping Reliable and Fetch Images Server-Side

**Files:**
- Modify: `src/lib/iot-parser.ts:554-645`
- Modify: `src/app/api/practice-tests/[quizId]/route.ts:52-143`
- Modify: `tests/reading-parser.test.ts`

**Interfaces:**
- Consumes `parsePageSections` structured sections and existing `fetchIot` allowlist.
- Produces sections mapped by passage/question number ranges.
- API response contains structured blocks with browser-safe image URLs only; credentials remain server-side.

- [ ] **Step 1: Write failing mapping/API contract tests**

Add parser coverage where upstream passage order differs from question panel order and assert question ranges select the matching passage. Add a fixture with Passage 1 image and assert API-facing normalization does not discard it. Add a missing-image-source test asserting the block is omitted rather than throwing.

- [ ] **Step 2: Run focused tests**

Run: `pnpm exec vitest run tests/reading-parser.test.ts`
Expected: FAIL for reordered passage mapping and image normalization.

- [ ] **Step 3: Map by numeric ranges**

Extract each question panel’s minimum and maximum question number. Match passage metadata containing the corresponding `Questions X-Y` range; use index only as a final fallback. Never reuse `upstreamPassages[0]` for multiple unmatched sections when another passage exists. Preserve each section title from upstream and use `Passage N` only when missing.

- [ ] **Step 4: Add server-side image URL resolution**

In the API route, resolve relative image paths against the trusted upstream origin. For remote image URLs, allow only the same approved upstream hostname. Return normalized URLs for the browser; do not proxy arbitrary hosts and do not include cookie headers in the response. If image resolution fails, return passage text/blocks without that image and keep the test usable.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm exec vitest run tests/reading-parser.test.ts; pnpm exec tsc --noEmit`
Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/iot-parser.ts "src/app/api/practice-tests/[quizId]/route.ts" tests/reading-parser.test.ts
git commit -m "fix: map reading passages and retain images"
```

### Task 4: Render Structured Passage Content

**Files:**
- Modify: `src/components/ielts/reading-view.tsx:332-450`
- Test: `tests/reading-parser.test.ts` or component test setup already present

**Interfaces:**
- Consumes `currentSection.passageBlocks` and existing `passageText` fallback.
- Produces accessible passage rendering: headings, separated paragraphs, lists, tables, and responsive images within `articleRef`.

- [ ] **Step 1: Add rendering acceptance test or testable block-render helper**

Assert structured blocks produce separate paragraph nodes, an image with its `alt`, and a table with header/body semantics where data exists. Assert fallback `passageText` still renders when `passageBlocks` is absent.

- [ ] **Step 2: Run test to confirm failure**

Run: `pnpm exec vitest run`
Expected: FAIL because ReadingView currently renders only `passageText` as flattened content.

- [ ] **Step 3: Implement minimal block renderer**

Render `passageBlocks` in order inside the existing article/ref boundary. Use semantic `h3`, `p`, `ul`/`li`, `table`/`tbody`/`tr`/`td`, and `img` with `alt`, `loading="lazy"`, and constrained responsive sizing. Render `passageText` as a single paragraph only when blocks are unavailable. Keep selection/highlighting attached to the article element.

- [ ] **Step 4: Run focused tests and lint**

Run: `pnpm exec vitest run; pnpm lint`
Expected: PASS with no lint errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ielts/reading-view.tsx tests
 git commit -m "feat: render readable structured passages"
```

### Task 5: Add Resizable Desktop Reading/Answering Workspace

**Files:**
- Modify: `src/components/ielts/reading-view.tsx:40-46, 332-541`
- Test: `tests/reading-layout.test.tsx` or a pure helper test in `tests/reading-parser.test.ts`

**Interfaces:**
- Produces `paneWidth: number` constrained to `30..70` percent.
- Produces native pointer drag behavior with `aria-label="Resize reading and answering panes"`.
- Persists width under `ielts_reading_pane_width`; exposes a visible 50/50 reset control.

- [ ] **Step 1: Write failing width constraint tests**

Test the pure width calculation used by the divider:

```ts
expect(clampPaneWidth(10)).toBe(30)
expect(clampPaneWidth(50)).toBe(50)
expect(clampPaneWidth(90)).toBe(70)
```

Also test invalid localStorage values fall back to `50`.

- [ ] **Step 2: Run test to confirm failure**

Run: `pnpm exec vitest run tests/reading-layout.test.tsx`
Expected: FAIL because helper and pane state do not exist.

- [ ] **Step 3: Implement native resizable split pane**

Use `useState` initialized from localStorage, `useRef` for the workspace element, and `onPointerDown`/`onPointerMove`/`onPointerUp` with pointer capture. Clamp the left pane to 30–70%. Render passage and questions as two desktop panes separated by a narrow keyboard-focusable divider. Use CSS grid columns based on the width; keep the existing mobile visibility classes and tabs below `lg`.

- [ ] **Step 4: Add keyboard and reset behavior**

Give divider `role="separator"`, `aria-orientation="vertical"`, `aria-valuemin="30"`, `aria-valuemax="70"`, `aria-valuenow`, and ArrowLeft/ArrowRight adjustments of 5 percentage points. Add a “50/50” button that resets and persists width. Persist only valid finite values.

- [ ] **Step 5: Keep navigation convenient**

Retain passage/question tabs on mobile. In the question pane, keep the existing navigator and add/retain previous/next question focus controls using current question IDs; when jumping, set the questions tab on mobile and scroll/focus the target input.

- [ ] **Step 6: Run focused test, lint, and typecheck**

Run: `pnpm exec vitest run; pnpm lint; pnpm exec tsc --noEmit`
Expected: PASS with no lint or type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/ielts/reading-view.tsx tests
git commit -m "feat: add resizable reading workspace"
```

### Task 6: Harden Session and Fetching Edge Cases

**Files:**
- Modify: `src/components/ielts/reading-view.tsx:178-236`
- Modify: `src/hooks/use-practice-catalog.ts:38-54, 215-273`
- Modify: `src/app/api/practice-tests/[quizId]/route.ts:117-143`
- Test: existing parser/API/session test locations

**Interfaces:**
- Keeps answers until result save/navigation succeeds.
- Reset saves the newly calculated `expiresAt`.
- Missing answer key returns an explicit non-success API state or prevents scoring as valid content, following the existing API response convention.
- Detail cache entries expire according to an explicit timestamp.

- [ ] **Step 1: Add failing regression tests**

Cover reset persistence using the newly calculated expiry, answer/session retention when completion fails, detail-cache expiration, and missing answer-key behavior. Use existing test utilities and mocked fetch/storage patterns; do not add a test framework.

- [ ] **Step 2: Run targeted tests**

Run: `pnpm test`
Expected: FAIL on the newly added regressions.

- [ ] **Step 3: Fix smallest unsafe behaviors**

Pass `exp` into reset persistence. Move session clearing after successful `onComplete` handling or make completion return a success signal before clearing. Add timestamp validation to detail cache. Make answer-key absence explicit and prevent silently presenting a scorable test with every answer marked wrong.

- [ ] **Step 4: Run full verification**

Run: `pnpm test; pnpm lint; pnpm exec tsc --noEmit; pnpm build`
Expected: all commands pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ielts/reading-view.tsx src/hooks/use-practice-catalog.ts "src/app/api/practice-tests/[quizId]/route.ts" tests
git commit -m "fix: harden reading session and fetch states"
```

### Task 7: Manual Responsive Verification

**Files:**
- Modify only files needed for verified defects from Tasks 1–6

- [ ] **Step 1: Start the app**

Run: `pnpm dev`

- [ ] **Step 2: Verify desktop behavior**

Open a Reading test at `/reading/[slug]`. Confirm Passage 1 shows separate paragraphs, fetched image, and no question text; drag divider across its range; reload and confirm width persists; activate divider with keyboard; click “50/50”.

- [ ] **Step 3: Verify mobile behavior**

Use a narrow viewport. Confirm tabs switch cleanly, question jump opens Questions tab and focuses the target, images do not overflow, tables scroll horizontally, and passage selection/highlighting remains inside the article.

- [ ] **Step 4: Run final commands**

Run: `pnpm test; pnpm lint; pnpm exec tsc --noEmit; pnpm build`
Expected: PASS.

- [ ] **Step 5: Inspect worktree**

Run: `git status --short`
Expected: only intended Reading/parser/API/test files are changed; unrelated existing Writing modifications remain untouched and unstaged.

---

## Self-Review

- Structured paragraph/heading/image/table rendering: Tasks 1–4.
- Server-safe image fetching and trusted host handling: Task 3.
- Passage mapping correctness: Task 3.
- Desktop draggable split pane and persisted reset: Task 5.
- Mobile convenience and question navigation: Task 5.
- Session/cache/answer-key reliability: Task 6.
- Automated and manual verification: Tasks 1–7.
- No new dependencies or credential exposure: Global Constraints and Task 3.
- No `TODO`, `TBD`, or unspecified implementation steps remain.

Plan complete and saved to `docs/superpowers/plans/2026-09-17-reading-split-pane-passage-rendering.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks.
2. **Inline Execution** — execute tasks in this session with checkpoints.

Which approach?
