# Task 1 Report

Status: Implemented Task 1 only.

Changes:
- Added exported `ReadingPassageBlock` type in `src/lib/ielts.ts`.
- Added optional `PracticeSection.passageBlocks?: ReadingPassageBlock[]`.
- Kept existing optional `passageText?: string` unchanged.
- Added typed structured-block fixture/assertions in `tests/reading-parser.test.ts` for heading, paragraph, and image values.

Verification:
- `pnpm exec tsc --noEmit` — passed.
- `pnpm exec vitest run tests/reading-parser.test.ts` — expected Task 1 behavior failure: 2 tests fail because parser population belongs to Task 2; 5 existing tests pass.

Commit: pending

Concerns:
- Test fixture intentionally fails until Task 2 populates `passageBlocks`.
- Existing unrelated Writing changes were not modified or staged.
