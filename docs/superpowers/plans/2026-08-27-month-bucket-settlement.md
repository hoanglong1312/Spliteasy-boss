# Month-Bucket Settlement Implementation Plan

> **Status:** Implementation complete in working tree (2026-08-27). Tests + build green. Commit pending GitNexus MCP `detect_changes` gate.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chốt thanh toán theo bucket tháng (chọn tháng, partial đến hôm nay, replace pending, time-stale), không dùng `period_end` làm trục nợ chính.

**Architecture:** Giữ `settlement_checkpoints` + `covered_items`. Unpaid = payable items chưa cover, gom theo `YYYY-MM`. Current month lọc date ≤ today. UI chọn theo tháng (default all). Replace = reject + request. Time-stale khi phiếu có partial tháng hiện tại và calendar date > asOf.

**Tech Stack:** React + Vite, `useScreenData.js`, `Home.jsx`, `app-v2.jsx` / `store.jsx`, Vitest / node:test, existing Supabase RPCs (reject + request; không bắt buộc RPC mới nếu replace tuần tự).

**Spec:** `docs/superpowers/specs/2026-08-27-month-bucket-settlement-design.md`

## Global Constraints

- Không thanh toán một phần trong một payable item
- Không tạo batch “đợt thu” entity
- Không đụng `member_month_settlements` / gộp nợ
- 1 pending / member / group (unique index hiện có)
- Confirm vẫn theo snapshot; item-stale vẫn khóa confirm

## File map

| File | Responsibility |
|---|---|
| `src/hooks/useScreenData.js` | Helpers: asOf, month buckets, defaultSelected all unpaid, filter current month ≤ today, timeStale derivation, export for UI/tests |
| `src/hooks/useScreenData.test.js` | Unit tests for helpers + unpaid month selection |
| `src/screens/Home.jsx` | Month toggles, replace-pending UX, time-stale on pending rows, copy |
| `src/screens/HomePaymentSheet.test.mjs` | Source/contract tests for UI wiring |
| `src/app-v2.jsx` | `replaceSettlementCheckpoint` = reject then request |
| `src/store.jsx` | Only if shared action needed; prefer app-v2 orchestration |

---

### Task 1: Pure helpers — month buckets, asOf, time-stale

**Files:**
- Modify: `src/hooks/useScreenData.js`
- Test: `src/hooks/useScreenData.test.js`

**Interfaces:**
- Produces:
  - `inputDateKey(value) → 'YYYY-MM-DD'` (may already exist — reuse/export)
  - `settlementAsOfDate(now = new Date()) → 'YYYY-MM-DD'`
  - `filterPayableItemsAsOf(items, asOfDate, currentMonth) → items` — past months unchanged; current month keep item date ≤ asOf; drop future months
  - `groupUnpaidItemsByMonth(items) → [{ month, monthLabel, amount, itemCount, items }]`
  - `isCheckpointTimeStale(checkpoint, todayKey = settlementAsOfDate()) → boolean` — true iff covered items include month === monthKey(today) (or asOf month) AND todayKey > asOfDate derived from checkpoint
  - `checkpointAsOfDate(checkpoint) → 'YYYY-MM-DD'` — max item date in current-month partial set, else `inputDateKey(created_at)`

- [x] **Step 1: Write failing tests**

Add to `useScreenData.test.js` (import new exports):

```js
test('filterPayableItemsAsOf keeps past months fully and current month only through asOf', () => {
  const items = [
    { payableItemKey: 'a', month: '2026-07', date: '2026-07-20', amount: -100 },
    { payableItemKey: 'b', month: '2026-08', date: '2026-08-10', amount: -50 },
    { payableItemKey: 'c', month: '2026-08', date: '2026-08-20', amount: -30 },
    { payableItemKey: 'd', month: '2026-09', date: '2026-09-01', amount: -10 },
  ]
  const filtered = filterPayableItemsAsOf(items, '2026-08-12', '2026-08')
  assert.deepEqual(filtered.map(i => i.payableItemKey).sort(), ['a', 'b'])
})

test('isCheckpointTimeStale only for partial current-month slips after asOf', () => {
  const partial = {
    created_at: '2026-08-12T10:00:00.000Z',
    covered_items: [{ month: '2026-08', amount: -50, date: '2026-08-10' }],
  }
  const julyOnly = {
    created_at: '2026-08-12T10:00:00.000Z',
    covered_items: [{ month: '2026-07', amount: -100, date: '2026-07-20' }],
  }
  assert.equal(isCheckpointTimeStale(partial, '2026-08-13'), true)
  assert.equal(isCheckpointTimeStale(partial, '2026-08-12'), false)
  assert.equal(isCheckpointTimeStale(julyOnly, '2026-08-20'), false)
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- src/hooks/useScreenData.test.js -t "filterPayableItemsAsOf|isCheckpointTimeStale"
```

- [ ] **Step 3: Implement helpers + export them**

Implement near existing settlement helpers (`inputDateKey` ~400). For item date use `item.date || item.expense_date || item.sessionDate || item.month + '-01'`.

`isCheckpointTimeStale`: if no covered item has `month === monthKey(todayKey)` → false. Else asOf = `checkpointAsOfDate`; return `todayKey > asOf`.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useScreenData.js src/hooks/useScreenData.test.js
git commit -m "feat: add month-bucket settlement asOf and time-stale helpers"
```

---

### Task 2: Default-select all unpaid months + apply asOf in payment items

**Files:**
- Modify: `src/hooks/useScreenData.js` — `buildTreasurerPaymentItems` (~1155)
- Test: `src/hooks/useScreenData.test.js`

**Interfaces:**
- Consumes: `filterPayableItemsAsOf`, `settlementAsOfDate`
- Change: `defaultSelected: true` for every non-zero unpaid month row (not only `selectedYearMonth`)
- When building payable items / month rows for settlement UI, filter with `filterPayableItemsAsOf(..., settlementAsOfDate(), monthKey(new Date()))` so current month excludes post-today items

- [ ] **Step 1: Failing test** — treasurer payment items default-select July and August when both unpaid; August after asOf excluded

```js
test('buildTreasurerPaymentItems defaults all unpaid months and respects asOf', () => {
  // construct sources with July + Aug-10 + Aug-20 payable items; asOf mocked via filter in builder
  // expect defaultSelected true for July and Aug-through-asOf only
})
```

Wire asOf inside `buildTreasurerPaymentItems` by filtering `sourcePayableItems` before month aggregation, using `settlementAsOfDate()` and current `monthKey(new Date())`.

Also update `buildTreasurerPaymentItems` line:

```js
defaultSelected: true, // was: Boolean(selectedYearMonth && month === selectedYearMonth)
```

Ensure month amounts recalculated from filtered payable items (`sourceMonthBreakdown` on filtered set) when payable items exist.

- [ ] **Step 2–4:** fail → implement → pass

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: default-select all unpaid month buckets with asOf filter"
```

---

### Task 3: Replace-pending action (reject then request)

**Files:**
- Modify: `src/app-v2.jsx` (~2456)
- Test: lightweight source test or extend existing app/handler tests if present; else HomePaymentSheet source assert for new action name

**Interfaces:**
- Produces action type handled in `handle`: `replaceSettlementCheckpoint`
- Payload: `{ checkpointIds: string[], groups: [{ groupId, groupName, memberId, amount, coveredItems }] }`
- Behavior: reject all `checkpointIds` (existing reject RPC), then request for each group (existing request RPC), then REFRESH; on request failure after reject, toast clear error

- [ ] **Step 1:** Add handler after `requestSettlementCheckpoint`:

```js
if (type === 'replaceSettlementCheckpoint') {
  const checkpointIds = [...new Set(safeArray(payload?.checkpointIds).filter(Boolean))]
  const groups = Array.isArray(payload?.groups) ? payload.groups.filter(r => r?.groupId && r?.memberId) : []
  if (checkpointIds.length === 0 || groups.length === 0) throw new Error('...')
  await Promise.all(checkpointIds.map(id => dispatch({
    type: 'REJECT_SETTLEMENT_CHECKPOINT',
    checkpointId: id,
    treasurerMemberId: treasurerMemberIdForCheckpoint(state, id),
  })))
  // then same as requestSettlementCheckpoint for groups
}
```

Note: reject RPC requires treasurer member id — when member self-requests, verify existing reject path; if member cannot reject, use a SECURITY DEFINER path or only allow replace from treasurer UI. **Spec:** both member and treasurer — check `reject_settlement_checkpoint` authorization. If member cannot reject, add RPC `replace_settlement_checkpoint` owned by same member as pending `created_by` OR allow reject by checkpoint owner.

**Decision for implementer:** Read `reject_settlement_checkpoint` in migrations. If only treasurer: for member PaymentSheet blocked-by-pending, show “báo thủ quỹ hủy phiếu” OR add migration:

```sql
-- allow checkpoint creator OR treasurer to reject pending
```

Prefer small migration updating reject auth to: treasurer OR `created_by_member_id = caller` OR member_id = caller.

- [ ] **Step 2:** Migration if needed: `supabase/migrations/20260827_reject_checkpoint_by_owner.sql`

- [ ] **Step 3:** Tests + commit

```bash
git commit -m "feat: replace pending settlement checkpoint via reject+request"
```

---

### Task 4: UI — month toggles, replace dialog, time-stale

**Files:**
- Modify: `src/screens/Home.jsx` — `TreasurerConfirmPaymentSheet`, `TreasurerPaymentDashboard` stale block (~1300), member `PaymentSheet` if it creates/blocks on pending
- Test: `src/screens/HomePaymentSheet.test.mjs`

**UI rules:**
1. Group selectable rows by month with a month checkbox (toggles all items in month).
2. Default all months checked (from Task 2 defaults).
3. On `requestSettlementCheckpoint` failure “Already has a pending…” OR if `row.pendingCheckpoints?.length`: show modal — summary of old slip + **Giữ phiếu cũ** / **Thay phiếu** → `replaceSettlementCheckpoint`.
4. Extend stale:

```js
stale: itemStale || isCheckpointTimeStale(row, settlementAsOfDate()),
timeStale: isCheckpointTimeStale(row, settlementAsOfDate()),
```

Disable confirm when stale; copy for timeStale: `Phiếu chốt đến DD/MM đã qua ngày — hãy thay phiếu.`

5. Treasurer edit months before confirm = change checked month set then **Thay phiếu** with new coveredItems (guided replace — no new update RPC). Spec allows this path.

- [ ] **Step 1:** Source tests asserting `isCheckpointTimeStale`, `replaceSettlementCheckpoint`, month checkbox labels

- [ ] **Step 2:** Implement UI

- [ ] **Step 3:** `npm test -- src/screens/HomePaymentSheet.test.mjs` + relevant useScreenData tests

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: month-select settlement UI with replace and time-stale"
```

---

### Task 5: Regression + Quality Gate

- [ ] **Step 1:** `npm test -- src/hooks/useScreenData.test.js src/screens/HomePaymentSheet.test.mjs`
- [ ] **Step 2:** `npm run build`
- [ ] **Step 3:** Manual smoke (if browser available): create slip with July+Aug; deselect Aug; pending; next day time-stale; replace
- [ ] **Step 4:** Commit any fixes; run `node .gitnexus/run.cjs detect_changes -s staged -r Spliteasy-boss` before commits when hook requires it

---

## Spec coverage check

| Spec requirement | Task |
|---|---|
| Bucket by month / past full / current ≤ today | 1–2 |
| Default all months, deselect allowed | 2, 4 |
| Multiple slips in month via uncovered items | already coverage; 2 keeps asOf |
| Member propose + treasurer edit before confirm | 4 (replace with new months) |
| Replace pending Keep/Replace | 3–4 |
| Time-stale partial current month only | 1, 4 |
| No batch entity / carry-forward untouched | Global |
| period_end not primary | already true for covered_items; helpers don’t reintroduce |

## Self-review notes

- Treasurer month-edit uses **guided replace** (reject+request), not update RPC — matches spec open detail “smaller safe path”.
- Member replace needs reject-by-owner if RPC is treasurer-only — Task 3 migration.
