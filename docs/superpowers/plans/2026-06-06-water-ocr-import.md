# Water OCR Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a paste-import workflow inside the existing quick water-entry screen so raw OCR/Excel text fills dated water rows after user preview.

**Architecture:** Add a focused parser module for OCR/Excel text and wire it into the existing `BatchEntry` quick-entry screen. Parser returns UI-ready rows with status, warnings, xé vé notes, and water quantities; UI previews rows, then applies parsed quantities to current quick-entry state without saving.

**Tech Stack:** React + Vite, existing `src/app-v2.jsx` screen flow, existing tests in `src/app-v2.test.mjs`, `npm run build` verification, Playwright final verification by Claude main if UI changed.

---

## File Structure

- Create: `src/lib/waterOcrImport.js`
  - Owns pure parsing logic.
  - Exports `parseWaterOcrText(text)`.
  - No React, Supabase, or browser dependencies.

- Modify: `src/app-v2.jsx`
  - Import parser.
  - Add paste/import UI inside existing `BatchEntry` screen.
  - Add local import state and preview action.
  - Fill existing quick-entry water rows by date only; do not save.

- Modify: `src/app-v2.test.mjs`
  - Add parser tests near existing parser tests.
  - Add behavior tests if existing screen test helpers support quick-entry state. If not, keep parser tests and build verification.

---

### Task 1: Add Pure OCR Parser

**Files:**
- Create: `src/lib/waterOcrImport.js`
- Modify: `src/app-v2.test.mjs`

- [ ] **Step 1: Add failing parser tests**

Add tests to `src/app-v2.test.mjs` near existing parser assertions. Use this sample text inline so tests lock real OCR shape:

```js
import { parseWaterOcrText } from './lib/waterOcrImport.js'

const MAY_WATER_OCR_SAMPLE = `
NGÀY
19h30-22h
T2-4-6
GIÁ TIỀN
10k/chai
10k/ chai 12,5k/chai 14k/chai 30k/chai
50k/quả 30k/quả
GHI CHÚ
Tất
THÀNH TIỀN
161
01/05/2026
2
2
4
96.000 đ
96.000 đ
162
04/05/2026
2
4
76.000 đ
76.000 đ
165
09/05/2026
Xé vé
200.000 đ
1
10.000 đ
210.000 đ
173
27/05/2026
2
2
4
88.000 đ
15.000 đ
103.000 đ
175
TỔNG CỘNG
1.445-000đ
`

describe('parseWaterOcrText', () => {
  it('parses dated OCR rows into water quantities and skips totals', () => {
    const result = parseWaterOcrText(MAY_WATER_OCR_SAMPLE)

    expect(result.rows.some(row => row.displayDate === 'TỔNG CỘNG')).toBe(false)
    expect(result.rows.map(row => row.displayDate)).toEqual([
      '01/05/2026',
      '04/05/2026',
      '09/05/2026',
      '27/05/2026'
    ])

    expect(result.rows[0]).toMatchObject({
      date: '2026-05-01',
      displayDate: '01/05/2026',
      quantities: {
        10000: 2,
        12500: 2,
        14000: 0,
        30000: 4
      },
      detectedWaterTotal: 96000,
      calculatedWaterTotal: 96000,
      status: 'ok'
    })

    expect(result.rows[1]).toMatchObject({
      date: '2026-05-04',
      quantities: {
        10000: 2,
        12500: 0,
        14000: 0,
        30000: 4
      },
      detectedWaterTotal: 76000,
      calculatedWaterTotal: 76000,
      status: 'ok'
    })
  })

  it('detects xé vé but excludes it from water totals', () => {
    const result = parseWaterOcrText(MAY_WATER_OCR_SAMPLE)
    const row = result.rows.find(item => item.displayDate === '09/05/2026')

    expect(row).toMatchObject({
      date: '2026-05-09',
      quantities: {
        10000: 1,
        12500: 0,
        14000: 0,
        30000: 0
      },
      detectedWaterTotal: 10000,
      calculatedWaterTotal: 10000,
      status: 'ok'
    })
    expect(row.extraNotes).toContain('Có xé vé 200.000 đ — không nhập vào nước')
  })

  it('marks mismatched rows as needs_review', () => {
    const result = parseWaterOcrText(`01/05/2026\n2\n2\n4\n95.000 đ`)

    expect(result.rows[0]).toMatchObject({
      status: 'needs_review',
      calculatedWaterTotal: 96000,
      detectedWaterTotal: 95000
    })
    expect(result.rows[0].warnings).toContain('Tổng tiền nước không khớp')
  })

  it('returns a top-level error for empty or dateless text', () => {
    expect(parseWaterOcrText('')).toMatchObject({
      rows: [],
      error: 'Chưa có dữ liệu để phân tích'
    })
    expect(parseWaterOcrText('TỔNG CỘNG 1.445.000 đ')).toMatchObject({
      rows: [],
      error: 'Không tìm thấy ngày dạng dd/mm/yyyy'
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/app-v2.test.mjs
```

Expected: FAIL because `src/lib/waterOcrImport.js` or `parseWaterOcrText` does not exist.

- [ ] **Step 3: Implement parser module**

Create `src/lib/waterOcrImport.js`:

```js
const WATER_PRICES = [10000, 12500, 14000, 30000]

const emptyQuantities = () => ({
  10000: 0,
  12500: 0,
  14000: 0,
  30000: 0
})

const normalizeNumberText = value => String(value || '').replace(/[,]/g, '.').replace(/[đ\s]/gi, '')

const parseMoney = value => {
  const normalized = normalizeNumberText(value)
    .replace(/(\d)[.-](\d{3})(?!\d)/g, '$1$2')
    .replace(/[^0-9]/g, '')
  return normalized ? Number(normalized) : 0
}

const formatMoney = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`

const toIsoDate = displayDate => {
  const [day, month, year] = displayDate.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

const numbersBeforeFirstMoney = block => {
  const lines = block
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)

  const values = []
  for (const line of lines) {
    if (/\d+[.,-]\d{3}\s*đ?/i.test(line)) break
    if (/^\d+$/.test(line)) values.push(Number(line))
  }
  return values
}

const moneyValues = block => {
  const matches = block.match(/\d+[.,-]\d{3}\s*đ?/gi) || []
  return matches.map(parseMoney).filter(value => value > 0)
}

const pickWaterTotal = (amounts, ticketAmount) => {
  const filtered = amounts.filter(amount => amount !== ticketAmount)
  if (!filtered.length) return 0
  if (ticketAmount) {
    const exactWater = filtered.find(amount => filtered.includes(amount + ticketAmount))
    if (exactWater) return exactWater
  }
  return filtered[0]
}

const assignQuantities = values => {
  const quantities = emptyQuantities()
  WATER_PRICES.forEach((price, index) => {
    quantities[price] = Number(values[index] || 0)
  })
  return quantities
}

const calculatedTotal = quantities => WATER_PRICES.reduce((sum, price) => {
  return sum + Number(quantities[price] || 0) * price
}, 0)

const parseBlock = (displayDate, block) => {
  const hasTicket = /x[eé]\s*vé/i.test(block)
  const amounts = moneyValues(block)
  const ticketAmount = hasTicket ? amounts[0] || 0 : 0
  const detectedWaterTotal = pickWaterTotal(amounts, ticketAmount)
  const quantities = assignQuantities(numbersBeforeFirstMoney(block))
  const calculatedWaterTotal = calculatedTotal(quantities)
  const warnings = []
  const extraNotes = []

  if (ticketAmount) {
    extraNotes.push(`Có xé vé ${formatMoney(ticketAmount)} — không nhập vào nước`)
  }

  if (!calculatedWaterTotal && !detectedWaterTotal) {
    return {
      date: toIsoDate(displayDate),
      displayDate,
      quantities,
      detectedWaterTotal,
      calculatedWaterTotal,
      extraNotes,
      status: 'skip',
      warnings: ['Không tìm thấy dữ liệu tiền nước']
    }
  }

  if (detectedWaterTotal && calculatedWaterTotal !== detectedWaterTotal) {
    warnings.push('Tổng tiền nước không khớp')
  }

  return {
    date: toIsoDate(displayDate),
    displayDate,
    quantities,
    detectedWaterTotal,
    calculatedWaterTotal,
    extraNotes,
    status: warnings.length ? 'needs_review' : 'ok',
    warnings
  }
}

export const parseWaterOcrText = text => {
  const raw = String(text || '').trim()
  if (!raw) return { rows: [], error: 'Chưa có dữ liệu để phân tích' }

  const dateMatches = [...raw.matchAll(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g)]
  if (!dateMatches.length) return { rows: [], error: 'Không tìm thấy ngày dạng dd/mm/yyyy' }

  const rows = dateMatches.map((match, index) => {
    const displayDate = match[0]
    const start = match.index + displayDate.length
    const end = dateMatches[index + 1]?.index ?? raw.length
    return parseBlock(displayDate, raw.slice(start, end))
  }).filter(row => row.displayDate !== 'TỔNG CỘNG')

  return { rows, error: '' }
}
```

- [ ] **Step 4: Run parser tests**

Run:

```bash
npm test -- src/app-v2.test.mjs
```

Expected: parser tests PASS. If unrelated existing tests fail, record exact `QA-FAIL:` output and stop for Claude review.

- [ ] **Step 5: Build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/waterOcrImport.js src/app-v2.test.mjs
git commit -m "feat: parse water OCR import text"
```

---

### Task 2: Add Import UI to Quick Water Entry

**Files:**
- Modify: `src/app-v2.jsx`
- Modify: `src/app-v2.test.mjs` if existing UI helper allows quick-entry behavior coverage

- [ ] **Step 1: Inspect existing `BatchEntry` state and water save path**

Read these areas before editing:

- `src/app-v2.jsx` import section.
- `src/app-v2.jsx` `BatchEntry` component.
- `src/app-v2.jsx` water quick action functions around `saveWater`, `saveSessionCost`, `parseMoneyAmount`, `savePickleSessionWaterExpense`.
- `src/hooks/useScreenData.js` `getBatchEntryData`.

Expected: identify existing state setter or input model used by quick water-entry rows.

- [ ] **Step 2: Add import state and parser import**

In `src/app-v2.jsx`, import:

```js
import { parseWaterOcrText } from './lib/waterOcrImport.js'
```

Inside `BatchEntry`, add local state matching existing style:

```js
const [waterImportOpen, setWaterImportOpen] = useState(false)
const [waterImportText, setWaterImportText] = useState('')
const [waterImportResult, setWaterImportResult] = useState({ rows: [], error: '' })
const [waterImportMessage, setWaterImportMessage] = useState('')
```

Add analyze handler:

```js
const analyzeWaterImport = () => {
  const result = parseWaterOcrText(waterImportText)
  setWaterImportResult(result)
  setWaterImportMessage(result.error || '')
}
```

- [ ] **Step 3: Add preview UI**

Add a section in the existing water quick-entry area, near existing water controls:

```jsx
<button type="button" onClick={() => setWaterImportOpen(open => !open)}>
  Dán dữ liệu Excel/OCR
</button>

{waterImportOpen ? (
  <div>
    <textarea
      value={waterImportText}
      onChange={event => setWaterImportText(event.target.value)}
      placeholder="Dán dữ liệu Excel/OCR ở đây"
      rows={8}
    />
    <button type="button" onClick={analyzeWaterImport}>Phân tích</button>
    {waterImportMessage ? <p>{waterImportMessage}</p> : null}
    {waterImportResult.rows.length ? (
      <div>
        <table>
          <thead>
            <tr>
              <th>Ngày</th>
              <th>10k</th>
              <th>12.5k</th>
              <th>14k</th>
              <th>30k</th>
              <th>Tổng detect</th>
              <th>Tổng tính</th>
              <th>Ghi chú</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {waterImportResult.rows.map(row => (
              <tr key={row.date}>
                <td>{row.displayDate}</td>
                <td>{row.quantities[10000]}</td>
                <td>{row.quantities[12500]}</td>
                <td>{row.quantities[14000]}</td>
                <td>{row.quantities[30000]}</td>
                <td>{row.detectedWaterTotal.toLocaleString('vi-VN')} đ</td>
                <td>{row.calculatedWaterTotal.toLocaleString('vi-VN')} đ</td>
                <td>{[...row.extraNotes, ...row.warnings].join(' · ')}</td>
                <td>{row.status === 'ok' ? 'OK' : row.status === 'skip' ? 'Bỏ qua' : 'Cần kiểm tra'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={applyWaterImportRows}>Điền vào bảng nhập nhanh</button>
      </div>
    ) : null}
  </div>
) : null}
```

Adapt markup to existing project primitives/styles if `BatchEntry` uses `Card`, `Button`, `TextArea`, or inline style constants. Do not introduce a new design system.

- [ ] **Step 4: Implement fill action without saving**

Add `applyWaterImportRows` inside `BatchEntry`. It must:

1. Use only rows with `status === 'ok'`.
2. Match existing quick-entry rows by ISO date or equivalent date field.
3. Fill current water quantity fields for prices `10000`, `12500`, `14000`, `30000`.
4. Skip rows whose date is not present in current quick-entry period.
5. Set a message summarizing applied/skipped counts.
6. Not call Supabase or existing save function.

Implementation shape:

```js
const applyWaterImportRows = () => {
  const importRowsByDate = new Map(
    waterImportResult.rows
      .filter(row => row.status === 'ok')
      .map(row => [row.date, row])
  )

  let applied = 0
  let skipped = 0

  setWaterRows(currentRows => currentRows.map(row => {
    const rowDate = row.date || row.sessionDate || row.day
    const importRow = importRowsByDate.get(rowDate)
    if (!importRow) return row

    applied += 1
    return {
      ...row,
      water10000: importRow.quantities[10000],
      water12500: importRow.quantities[12500],
      water14000: importRow.quantities[14000],
      water30000: importRow.quantities[30000]
    }
  }))

  skipped = importRowsByDate.size - applied
  setWaterImportMessage(`Đã điền ${applied} ngày${skipped > 0 ? `, bỏ qua ${skipped} ngày không có trong bảng hiện tại` : ''}`)
}
```

Important: replace `setWaterRows`, `waterRows`, `water10000`, `water12500`, `water14000`, `water30000`, and date field names with the actual names from `BatchEntry`. Preserve current save format.

- [ ] **Step 5: Verify UI compiles**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Add focused UI behavior test if existing tests support it**

If `src/app-v2.test.mjs` already has helpers to render `BatchEntry` or exercise quick actions, add a test that:

- Opens import section.
- Pastes one dated row.
- Clicks `Phân tích`.
- Expects preview row with `01/05/2026` and `OK`.
- Clicks `Điền vào bảng nhập nhanh`.
- Expects matching water inputs to contain parsed quantities.

If no existing helper can render `BatchEntry` without heavy app bootstrapping, do not create a brittle new harness. Keep parser tests + build, and leave Playwright for Claude main.

- [ ] **Step 7: Commit**

```bash
git add src/app-v2.jsx src/app-v2.test.mjs
git commit -m "feat: import water OCR into quick entry"
```

---

### Task 3: Final Verification and Review

**Files:**
- No planned source changes unless verification finds a bug.

- [ ] **Step 1: Run targeted tests**

```bash
npm test -- src/app-v2.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Report for Claude main Playwright verification**

Because this is UI behavior, Claude main must run:

```bash
npx playwright test --reporter=line
```

Expected: PASS, or Claude records exact failing test output and loops fix.

- [ ] **Step 4: Commit any verification-only fixes**

If verification required fixes:

```bash
git add src/lib/waterOcrImport.js src/app-v2.jsx src/app-v2.test.mjs
git commit -m "fix: polish water OCR import verification"
```

If no fixes were needed, no commit.

---

## Self-Review

Spec coverage:

- Paste import inside existing quick water-entry screen: Task 2.
- Parser for copied OCR/Excel text: Task 1.
- Preview before fill: Task 2.
- Fill current quick-entry state only, no DB save: Task 2.
- Detect xé vé and exclude from water: Task 1 + Task 2 preview.
- Skip totals/noise: Task 1.
- Tests/build/Playwright verification: Task 1 + Task 3.

Placeholder scan: no TBD/TODO/fill-later placeholders remain.

Type consistency: parser exports `parseWaterOcrText(text)` and UI imports same function. Row statuses are `ok`, `needs_review`, `skip` throughout.
