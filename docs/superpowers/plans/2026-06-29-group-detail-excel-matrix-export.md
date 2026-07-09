# GroupDetail Excel Matrix Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Excel-style horizontal matrix `.xlsx` export option on GroupDetail while preserving the current CSV export.

**Architecture:** Keep export in `src/app-v2.jsx` beside existing CSV code. `GroupDetail` opens a small export option sheet, then calls either `exportGroupCsv` or `exportGroupMatrixXls` with the current GroupDetail data. `useScreenData` exposes `exportExpenses` so the XLS matrix can use raw expense splits rather than display-only activity rows.

**Tech Stack:** React, Vite, browser `Blob`, HTML table `.xlsx`, no new dependency.

## Global Constraints

- No new package.
- Keep current CSV export working.
- New Excel matrix file extension is `.xlsx`.
- Excel matrix uses HTML table MIME `application/vnd.ms-excel`.
- Scope is the opened group and selected month only.
- Missing data becomes empty cell, never crash.
- Member and expense sorting uses Vietnamese locale (`localeCompare(..., 'vi')`).
- Numbers use `toLocaleString('vi-VN')` thousands separators.

---

### Task 1: Expose raw monthly expenses for matrix export

**Files:**
- Modify: `src/hooks/useScreenData.js`
- Test: `src/app-v2.test.mjs`

**Interfaces:**
- Consumes: `monthlyExpenses` in `buildGroupDetailData`.
- Produces: `GroupDetailData.exportExpenses`, an array of current group/month expenses with raw `splits`/`participants`.

- [ ] **Step 1: Add failing static test**

Append near other GroupDetail tests in `src/app-v2.test.mjs`:

```js
test('GroupDetail data exposes raw monthly expenses for matrix export', () => {
  assert.match(dataSource, /exportExpenses: monthlyExpenses/)
})
```

- [ ] **Step 2: Run test to verify fail**

Run:

```bash
node --test --test-name-pattern "GroupDetail data exposes raw monthly expenses" src/app-v2.test.mjs
```

Expected: FAIL because `exportExpenses` is not present.

- [ ] **Step 3: Add data field**

In `src/hooks/useScreenData.js`, inside `buildGroupDetailData` return object near `activities` / `activitiesByWeek`, add:

```js
    exportExpenses: monthlyExpenses,
```

- [ ] **Step 4: Run focused test**

Run:

```bash
node --test --test-name-pattern "GroupDetail data exposes raw monthly expenses" src/app-v2.test.mjs
```

Expected: PASS.

---

### Task 2: Add GroupDetail export chooser UI

**Files:**
- Modify: `src/screens/GroupDetail.jsx`
- Test: `src/app-v2.test.mjs`

**Interfaces:**
- Consumes: existing `onAction` prop and `d` GroupDetail data.
- Produces: actions `onAction?.('exportGroupCsv', d)` and `onAction?.('exportGroupMatrixXls', d)`.

- [ ] **Step 1: Add failing static test**

Append near existing export action test in `src/app-v2.test.mjs`:

```js
test('GroupDetail offers CSV and Excel matrix export choices', () => {
  const groupDetailSource = readFileSync(new URL('./screens/GroupDetail.jsx', import.meta.url), 'utf8')

  assert.match(groupDetailSource, /const \[exportMenuOpen, setExportMenuOpen\] = useState\(false\)/)
  assert.match(groupDetailSource, /onClick=\{\(\) => setExportMenuOpen\(true\)\}>📤 Xuất Excel<\/Button>/)
  assert.match(groupDetailSource, /CSV danh sách/)
  assert.match(groupDetailSource, /onAction\?\.\('exportGroupCsv', d\)/)
  assert.match(groupDetailSource, /Excel bảng ngang/)
  assert.match(groupDetailSource, /onAction\?\.\('exportGroupMatrixXls', d\)/)
})
```

- [ ] **Step 2: Run test to verify fail**

Run:

```bash
node --test --test-name-pattern "GroupDetail offers CSV and Excel matrix export choices" src/app-v2.test.mjs
```

Expected: FAIL because chooser is missing.

- [ ] **Step 3: Add state**

In `src/screens/GroupDetail.jsx`, near other `useState` declarations, add:

```jsx
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
```

- [ ] **Step 4: Change hero export button**

Replace current export button:

```jsx
<Button variant="ghost" style={{ gridColumn: '1 / -1', padding: '7px 6px', fontSize: 11 }} onClick={() => onAction?.('exportGroupCsv', d)}>📤 Xuất Excel</Button>
```

with:

```jsx
<Button variant="ghost" style={{ gridColumn: '1 / -1', padding: '7px 6px', fontSize: 11 }} onClick={() => setExportMenuOpen(true)}>📤 Xuất Excel</Button>
```

- [ ] **Step 5: Add export BottomSheet**

Before existing `{selectedMember && (` block, add:

```jsx
      {exportMenuOpen && (
        <BottomSheet title="Xuất dữ liệu" onClose={() => setExportMenuOpen(false)}>
          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
            <ActionButton onClick={() => { setExportMenuOpen(false); onAction?.('exportGroupCsv', d); }}>CSV danh sách</ActionButton>
            <ActionButton onClick={() => { setExportMenuOpen(false); onAction?.('exportGroupMatrixXls', d); }}>Excel bảng ngang</ActionButton>
          </div>
        </BottomSheet>
      )}
```

- [ ] **Step 6: Run focused test**

Run:

```bash
node --test --test-name-pattern "GroupDetail offers CSV and Excel matrix export choices" src/app-v2.test.mjs
```

Expected: PASS.

---

### Task 3: Implement matrix XLS export

**Files:**
- Modify: `src/app-v2.jsx`
- Test: `src/app-v2.test.mjs`

**Interfaces:**
- Consumes: `data.members`, `data.exportExpenses`, `data.currentYearMonth`, `data.name`.
- Produces: action handler `exportGroupMatrixXls`, helper `exportGroupMatrixXls(data = {})`, and download `.xlsx` file.

- [ ] **Step 1: Add failing static test**

Append near current CSV export test in `src/app-v2.test.mjs`:

```js
test('AppV2 exports GroupDetail Excel matrix as HTML xls', () => {
  const matrixBlock = appSource.slice(
    appSource.indexOf('function exportGroupMatrixXls'),
    appSource.indexOf('function exportGroupCsv')
  )

  assert.match(appSource, /if \(type === 'exportGroupMatrixXls'\) \{[\s\S]*?exportGroupMatrixXls\(payload\)/)
  assert.match(matrixBlock, /const expenses = safeArray\(data\?\.exportExpenses \|\| data\?\.activities\)/)
  assert.match(matrixBlock, /\.sort\(\(a, b\) => csvMemberName\(members, a\?\.id, a\?\.name\)\.localeCompare\(csvMemberName\(members, b\?\.id, b\?\.name\), 'vi'\)\)/)
  assert.match(matrixBlock, /\.sort\(\(a, b\) => String\(a\?\.title \|\| a\?\.name \|\| ''\)\.localeCompare\(String\(b\?\.title \|\| b\?\.name \|\| ''\), 'vi'\)\)/)
  assert.match(matrixBlock, /expenseShareForMember\(expense, member\?\.id\)/)
  assert.match(matrixBlock, /formatCsvNumber\(share\)/)
  assert.match(matrixBlock, /application\/vnd\.ms-excel/)
  assert.match(matrixBlock, /download = `spliteasy-\$\{slugifyCsvFilePart\(data\?\.name \|\| 'nhom'\)\}-\$\{data\?\.currentYearMonth \|\| dateStamp\}-matrix\.xlsx`/)
  assert.match(appSource, /function expenseShareForMember\(expense, memberId\)/)
  assert.match(appSource, /function htmlCell\(value\)/)
})
```

- [ ] **Step 2: Run test to verify fail**

Run:

```bash
node --test --test-name-pattern "AppV2 exports GroupDetail Excel matrix" src/app-v2.test.mjs
```

Expected: FAIL because matrix export does not exist.

- [ ] **Step 3: Add action handler**

In `src/app-v2.jsx`, near current `exportGroupCsv` handler, add before it:

```js
    if (type === 'exportGroupMatrixXls') {
      exportGroupMatrixXls(payload)
      return
    }
```

- [ ] **Step 4: Add matrix export helpers**

In `src/app-v2.jsx`, above `function exportGroupCsv(data = {})`, add:

```js
function exportGroupMatrixXls(data = {}) {
  const dateStamp = new Date().toISOString().slice(0, 7)
  const members = safeArray(data?.members)
  const sortedMembers = safeArray(data?.members).slice().sort((a, b) => csvMemberName(members, a?.id, a?.name).localeCompare(csvMemberName(members, b?.id, b?.name), 'vi'))
  const expenses = safeArray(data?.exportExpenses || data?.activities)
    .slice()
    .sort((a, b) => String(a?.title || a?.name || '').localeCompare(String(b?.title || b?.name || ''), 'vi'))

  const memberTotals = new Map()
  const expenseTotals = new Map()
  sortedMembers.forEach(member => memberTotals.set(String(member?.id || ''), 0))

  const headerCells = [
    '<th class="index">STT</th>',
    '<th class="name">THÀNH VIÊN</th>',
    ...expenses.map(expense => `<th class="expense">${htmlCell(expense?.title || expense?.name || '')}</th>`),
    '<th class="total">TỔNG PHẢI CHỊU</th>',
    '<th class="balance">SỐ DƯ</th>',
  ].join('')

  const bodyRows = sortedMembers.map((member, index) => {
    let memberTotal = 0
    const expenseCells = expenses.map(expense => {
      const share = expenseShareForMember(expense, member?.id)
      if (share === '') return '<td></td>'
      const amount = Number(share) || 0
      memberTotal += amount
      expenseTotals.set(String(expense?.id || expense?.title || ''), (expenseTotals.get(String(expense?.id || expense?.title || '')) || 0) + amount)
      return `<td class="num">${formatCsvNumber(share)}</td>`
    }).join('')
    memberTotals.set(String(member?.id || ''), memberTotal)
    return `<tr><td class="index">${index + 1}</td><td class="name">${htmlCell(csvMemberName(members, member?.id, member?.name).toUpperCase())}</td>${expenseCells}<td class="total num">${formatCsvNumber(memberTotal)}</td><td class="balance num">${formatCsvNumber(member?.balance)}</td></tr>`
  }).join('')

  const totalCells = expenses.map(expense => `<td class="total num">${formatCsvNumber(expenseTotals.get(String(expense?.id || expense?.title || '')) || '')}</td>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th, td { border: 1px solid #333; padding: 4px 6px; min-width: 76px; }
    th.expense { background: #ef1717; color: #111; font-weight: 800; }
    th.index, td.index { min-width: 32px; text-align: right; font-weight: 700; }
    th.name, td.name { min-width: 150px; font-weight: 800; }
    .num { text-align: right; font-weight: 700; }
    .total, tr.footer td { background: #ffc000; color: #b91c1c; font-weight: 900; }
    .balance { color: #b91c1c; font-weight: 900; }
  </style></head><body><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}<tr class="footer"><td></td><td>TỔNG</td>${totalCells}<td class="total num">${formatCsvNumber(Array.from(memberTotals.values()).reduce((sum, value) => sum + value, 0))}</td><td></td></tr></tbody></table></body></html>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `spliteasy-${slugifyCsvFilePart(data?.name || 'nhom')}-${data?.currentYearMonth || dateStamp}-matrix.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

function expenseShareForMember(expense, memberId) {
  const splits = safeArray(expense?.splits)
  const split = splits.find(item => String(item?.memberId || item?.member_id || item?.id || '') === String(memberId || ''))
  if (split) return split.amount ?? split.shareAmount ?? split.share_amount ?? ''
  const participants = safeArray(expense?.participants).map(participant => participant?.memberId || participant?.member_id || participant?.id || participant)
  if (!participants.some(id => String(id || '') === String(memberId || ''))) return ''
  const count = participants.length
  return count > 0 ? (Number(expense?.amount) || 0) / count : ''
}

function htmlCell(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```

- [ ] **Step 5: Run focused test**

Run:

```bash
node --test --test-name-pattern "AppV2 exports GroupDetail Excel matrix" src/app-v2.test.mjs
```

Expected: PASS.

---

### Task 4: Full verification

**Files:**
- Modify: `src/hooks/useScreenData.js`
- Modify: `src/screens/GroupDetail.jsx`
- Modify: `src/app-v2.jsx`
- Modify: `src/app-v2.test.mjs`

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: verified implementation.

- [ ] **Step 1: Run app-level checks**

Run:

```bash
npm test
npm run build
```

Expected:
- `npm test`: all Vitest tests pass.
- `npm run build`: Vite build succeeds; existing chunk-size warning is acceptable.

- [ ] **Step 2: Browser verify**

With dev server running, use `cmux browser`:

```bash
cmux browser open http://localhost:5173
```

Navigate to a GroupDetail screen, click `📤 Xuất Excel`, click `Excel bảng ngang`, and verify the triggered download filename ends in `-matrix.xlsx`. If cmux cannot inspect downloads, temporarily hook `HTMLAnchorElement.prototype.click` in browser console and verify `download` and `href` values.

- [ ] **Step 3: Request code review**

Use `superpowers:requesting-code-review` before commit/push.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git add src/hooks/useScreenData.js src/screens/GroupDetail.jsx src/app-v2.jsx src/app-v2.test.mjs docs/superpowers/specs/2026-06-29-group-detail-excel-matrix-export-design.md docs/superpowers/plans/2026-06-29-group-detail-excel-matrix-export.md
git commit -m "feat: export group detail as Excel matrix"
```

---

## Self-Review

- Spec coverage: Excel matrix option, each expense as separate column, per-member share cells, `.xlsx`, no dependency, styling, sort, number format, and CSV preservation covered.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: action name `exportGroupMatrixXls`, helper `exportGroupMatrixXls(data = {})`, data field `exportExpenses`, and test regexes align.
