# Collapsed Settled History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide completed collection rows behind a collapsed history inside each treasurer member card.

**Architecture:** Partition existing member items at render time. Keep actionable and refund items in the current source groups; render paid non-refund items in one local collapsed history without changing row data or actions.

**Tech Stack:** React, inline styles, Node test runner, Vitest, Vite

---

### Task 1: Collapse Settled Member Items

**Files:**
- Modify: `src/screens/Home.jsx`
- Test: `src/screens/HomePaymentSheet.test.mjs`

- [x] **Step 1: Write the failing regression test**

Add a source regression test asserting:

```js
assert.match(rowSource, /const \[settledExpanded, setSettledExpanded\] = useState\(false\)/);
assert.match(rowSource, /const settledItems = row\.items\.filter\(item => item\.paid && item\.kind !== 'refund'\)/);
assert.match(rowSource, /Đã chốt trước đây/);
assert.match(rowSource, /setSettledExpanded\(value => !value\)/);
```

- [x] **Step 2: Verify red**

Run:

```bash
node --test src/screens/HomePaymentSheet.test.mjs
```

Expected: new settled-history test fails because state and label do not exist.

- [x] **Step 3: Add minimal render partition**

In `TreasurerMemberPaymentRow`:

```js
const [settledExpanded, setSettledExpanded] = useState(false);
const settledItems = row.items.filter(item => item.paid && item.kind !== 'refund');
const activeItems = row.items.filter(item => !item.paid || item.kind === 'refund');
const groupedItems = groupPaymentItemsBySource(activeItems);
const settledGroups = groupPaymentItemsBySource(settledItems);
const settledCount = settledItems.reduce((sum, item) => sum + (Number(item.itemCount) || 1), 0);
const settledAmount = paymentItemsAmountDue(settledItems);
```

Render `Đã chốt trước đây · N khoản · X đ` after actionable groups. Keep history closed by default; when open, show existing month, amount, `Đã nhận`, and `Hoàn tác` controls.

- [x] **Step 4: Verify green and regression suite**

Run:

```bash
node --test src/screens/HomePaymentSheet.test.mjs
npm test
npm run build
```

Expected: all focused tests and Vitest pass; Vite build exits 0.

- [x] **Step 5: Browser verification**

At mobile width, open treasurer payment sheet and expand a member with paid history. Confirm actionable rows remain visible, history is collapsed by default, and opening history reveals completed months plus `Hoàn tác`.

- [x] **Step 6: Scope audit and commit**

Run:

```bash
npx gitnexus detect-changes -r Spliteasy-boss
git add src/screens/Home.jsx src/screens/HomePaymentSheet.test.mjs docs/superpowers/plans/2026-07-16-collapsed-settled-history.md
git commit -m "feat: collapse settled payment history"
```
