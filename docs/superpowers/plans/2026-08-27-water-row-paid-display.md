# Water Row Paid Display Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Auto-show ✓ on each water line in “Nước của bạn” from confirmed payment coverage + FIFO leftover.

**Architecture:** Fix sign-safe coverage check in `buildPersonalWaterSessionRows`; mark session + ticket water rows; FIFO-allocate remaining water covered amount oldest-first; keep PickleballOverview popup styling.

**Tech Stack:** React + Vite, Vitest, `useScreenData.js`

## Global Constraints

- View-only — no new actions/toggles in the water sheet
- Reuse existing `buildPaidItemCoverageMap` / payable keys
- Surgical: prefer `useScreenData.js` + tests; UI only if renderer broken

---

### Task 1: Coverage sign + paid on water rows + FIFO

**Files:**
- Modify: `src/hooks/useScreenData.js`
- Modify: `src/hooks/useScreenData.test.js`

- [x] **Step 1:** Failing tests — ticket water covered with negative coverage marks `paid: true`; FIFO leftover marks oldest unpaid rows; `coveredAmount` equals sum of paid rows
- [x] **Step 2:** Run tests — expect fail
- [x] **Step 3:** Implement sign-safe cover check for water rows; set `paid` on session rows; FIFO allocate water covered remainder
- [x] **Step 4:** Run targeted vitest — pass
- [x] **Step 5:** Confirm popup already renders `row.paid` (no UI change unless broken)

---

### Task 2: Verify

- [x] Targeted water tests pass; full `useScreenData.test.js` has 1 pre-existing unrelated fail (`explicit pickleball covered items still apply after same-month checkpoint`)
