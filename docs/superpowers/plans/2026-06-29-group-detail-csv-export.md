# Group Detail CSV Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Xuất Excel` button on `GroupDetail` that downloads a group/month-scoped UTF-8 CSV with overview, members, and expenses.

**Architecture:** Reuse the existing client-side export pattern in `src/app-v2.jsx` (`Blob` + temporary anchor). Keep CSV builder in `app-v2.jsx` because existing `exportStateCsv` already lives there and this is one small export path. `GroupDetail` only emits `onAction('exportGroupCsv', data)`.

**Tech Stack:** React, Vite, browser `Blob`, CSV UTF-8 BOM, no new dependency.

## Global Constraints

- No new package.
- File extension is `.csv`, button copy is `Xuất Excel`.
- CSV must include BOM `﻿` for Excel Vietnamese text.
- Scope is the opened group and selected month only.
- Missing data becomes empty cell, never crash.

---

### Task 1: Wire GroupDetail export action

**Files:**
- Modify: `src/screens/GroupDetail.jsx`
- Test: `src/app-v2.test.mjs`

**Interfaces:**
- Consumes: `GroupDetail` prop `data` (`d`) and `onAction`.
- Produces: UI action `onAction?.('exportGroupCsv', d)`.

- [ ] **Step 1: Add static test for button/action wiring**

Append this test to `src/app-v2.test.mjs` near other `GroupDetail` tests:

```js
test('GroupDetail exposes an Excel export action', () => {
  const groupDetailSource = readFileSync(new URL('./screens/GroupDetail.jsx', import.meta.url), 'utf8')

  assert.match(groupDetailSource, />📤 Xuất Excel<\/Button>/)
  assert.match(groupDetailSource, /onAction\?\.\('exportGroupCsv', d\)/)
})
```

- [ ] **Step 2: Run node test to confirm it fails**

Run:

```bash
npm run test:node -- src/app-v2.test.mjs
```

Expected: FAIL because `Xuất Excel` action does not exist yet. Existing OCR test failures may appear; ignore only if failure output also includes this new export assertion.

- [ ] **Step 3: Add button in GroupDetail hero actions**

In `src/screens/GroupDetail.jsx`, replace the hero action block around `+ Thêm chi tiêu` / `💳 Thanh toán` with:

```jsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
  <Button variant="primary" style={{ padding: '7px 6px', fontSize: 11, color: '#7c2d12' }} onClick={() => onAction?.('addExpense', { groupId: d.id })}>+ Thêm chi tiêu</Button>
  <Button variant="ghost" style={{ padding: '7px 6px', fontSize: 11 }} onClick={() => onAction?.('settleAll')}>💳 Thanh toán</Button>
  <Button variant="ghost" style={{ gridColumn: '1 / -1', padding: '7px 6px', fontSize: 11 }} onClick={() => onAction?.('exportGroupCsv', d)}>📤 Xuất Excel</Button>
</div>
```

- [ ] **Step 4: Run focused static test**

Run:

```bash
npm run test:node -- src/app-v2.test.mjs
```

Expected: export wiring test passes. If unrelated OCR tests still fail, keep note and continue with `npm test`/build verification later.

---

### Task 2: Implement CSV builder and AppV2 action

**Files:**
- Modify: `src/app-v2.jsx`
- Test: `src/app-v2.test.mjs`

**Interfaces:**
- Consumes: `data` from GroupDetail with fields `name`, `monthLabel`, `currentYearMonth`, `memberCount`, `expenseCount`, `totalSpent`, `balance`, `members`, `activities`.
- Produces: `exportGroupCsv(data)` and action handler `if (type === 'exportGroupCsv') exportGroupCsv(payload)`.

- [ ] **Step 1: Add static tests for CSV action and helper**

Append this test near existing export/action tests in `src/app-v2.test.mjs`:

```js
test('AppV2 exports group detail CSV with Excel-safe BOM', () => {
  const exportBlock = appSource.slice(
    appSource.indexOf('function exportGroupCsv'),
    appSource.indexOf('function exportStateCsv')
  )

  assert.match(appSource, /if \(type === 'exportGroupCsv'\) \{[\s\S]*?exportGroupCsv\(payload\)/)
  assert.match(exportBlock, /const rows = \[\]/)
  assert.match(exportBlock, /rows\.push\(\['TỔNG QUAN'\]\)/)
  assert.match(exportBlock, /rows\.push\(\['THÀNH VIÊN'\]\)/)
  assert.match(exportBlock, /rows\.push\(\['CHI TIÊU'\]\)/)
  assert.match(exportBlock, /new Blob\(\['﻿' \+ csv\]/)
  assert.match(exportBlock, /download = `spliteasy-\$\{slugifyCsvFilePart\(data\?\.name \|\| 'nhom'\)\}-\$\{data\?\.currentYearMonth \|\| dateStamp\}\\.csv`/)
})
```

- [ ] **Step 2: Run node test to confirm it fails**

Run:

```bash
npm run test:node -- src/app-v2.test.mjs
```

Expected: FAIL because `exportGroupCsv` does not exist yet.

- [ ] **Step 3: Add action handler**

In `src/app-v2.jsx`, near existing `exportCsv` handler, add:

```js
if (type === 'exportGroupCsv') {
  exportGroupCsv(payload)
  return
}
```

- [ ] **Step 4: Add CSV helpers before `exportStateCsv`**

In `src/app-v2.jsx`, above `function exportStateCsv(state)`, add:

```js
function exportGroupCsv(data = {}) {
  const dateStamp = new Date().toISOString().slice(0, 10)
  const members = safeArray(data?.members)
  const activities = safeArray(data?.activities)
  const rows = []

  rows.push(['TỔNG QUAN'])
  rows.push(['Nhóm', data?.name || ''])
  rows.push(['Tháng', data?.monthLabel || data?.currentYearMonth || ''])
  rows.push(['Số thành viên', data?.memberCount ?? members.length])
  rows.push(['Số khoản chi', data?.expenseCount ?? activities.length])
  rows.push(['Tổng chi', Number(data?.totalSpent) || 0])
  rows.push(['Số dư của bạn', Number(data?.balance) || 0])
  rows.push([])

  rows.push(['THÀNH VIÊN'])
  rows.push(['Tên', 'Vai trò', 'Số dư', 'Trạng thái', 'Ngân hàng', 'Số tài khoản'])
  members.forEach(member => {
    const balance = Number(member?.balance) || 0
    rows.push([
      member?.name || '',
      member?.role === 'treasurer' ? 'Thủ quỹ' : 'Thành viên',
      balance,
      balance > 0 ? 'Cần thu' : balance < 0 ? 'Cần nộp' : 'Cân bằng',
      member?.bankName || '',
      member?.bankAccount || '',
    ])
  })
  rows.push([])

  rows.push(['CHI TIÊU'])
  rows.push(['Ngày', 'Tên khoản', 'Số tiền', 'Người trả', 'Người tham gia', 'Trạng thái'])
  activities.forEach(item => {
    rows.push([
      item?.date || item?.rawDate || '',
      item?.title || item?.name || '',
      Number(item?.amount) || 0,
      item?.paidByName || item?.paidBy || '',
      safeArray(item?.participants || item?.participantNames).join(' + '),
      expenseStatusLabel(item?.status),
    ])
  })

  const csv = rows.map(row => row.map(csvCell).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `spliteasy-${slugifyCsvFilePart(data?.name || 'nhom')}-${data?.currentYearMonth || dateStamp}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function slugifyCsvFilePart(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'nhom'
}

function expenseStatusLabel(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'approved') return 'Đã duyệt'
  if (value === 'pending') return 'Chờ duyệt'
  if (value === 'rejected' || value === 'declined') return 'Từ chối'
  return status || ''
}
```

- [ ] **Step 5: Run focused static test**

Run:

```bash
npm run test:node -- src/app-v2.test.mjs
```

Expected: export CSV tests pass. Existing unrelated OCR failures may remain.

---

### Task 3: Runtime verification and commit

**Files:**
- Modify: `src/screens/GroupDetail.jsx`
- Modify: `src/app-v2.jsx`
- Modify: `src/app-v2.test.mjs`

**Interfaces:**
- Consumes: tasks 1-2.
- Produces: committed feature.

- [ ] **Step 1: Run app-level checks**

Run:

```bash
npm test
npm run build
```

Expected:
- `npm test`: all Vitest tests pass.
- `npm run build`: Vite build succeeds.

- [ ] **Step 2: Browser verify**

With dev server running, use `cmux browser`:

```bash
cmux browser open http://localhost:5173
```

Navigate to a group detail screen, click `📤 Xuất Excel`, and verify browser triggers a `.csv` download. If cmux cannot inspect downloads, use a temporary browser console hook around `HTMLAnchorElement.prototype.click` only for verification and confirm `download` ends in `.csv`.

- [ ] **Step 3: Commit implementation**

Run:

```bash
git add src/screens/GroupDetail.jsx src/app-v2.jsx src/app-v2.test.mjs
git commit -m "feat: export group detail as Excel CSV"
```

---

## Self-Review

- Spec coverage: button copy, CSV output, BOM, group/month scope, no dependency covered.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: `exportGroupCsv(data)` uses existing GroupDetail data fields and safe fallback values.
