# Ticket Water + Home Banner + BatchEntry OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add water expenses to ticket sessions, show pending-ticket banner on Home for treasurers, and upgrade BatchEntry OCR to handle ticket amounts alongside water data.

**Architecture:** Three independent layers — DB migration first, then data layer (`useScreenData.js`), then UI (`PickleballCalendar`, `Home`, `BatchEntry`), then handler (`app-v2.jsx`). Tasks 1–2 have no UI dependencies; Tasks 3–7 can proceed after Task 1 lands.

**Tech Stack:** React, Supabase PostgreSQL, `src/lib/waterOcrImport.js` (pure JS parser)

---

## Files changed

| File | Change |
|---|---|
| `supabase/migrations/20260607000001_ticket_water_amount.sql` | CREATE — add `water_amount` column |
| `src/lib/waterOcrImport.js` | MODIFY — expose `ticketAmount` in block return |
| `src/hooks/useScreenData.js` | MODIFY — `ticketAmountPerPerson` includes water, `toTicketRow` exposes `waterAmount`, `buildHomeData` adds `pendingTickets` |
| `src/screens/PickleballCalendar.jsx` | MODIFY — `AddTicketSheet` water input, `TicketDayPanel` water display + inline edit |
| `src/app-v2.jsx` | MODIFY — pass `isPickleballTreasurer` to Home, update `addTicket`/`updateTicket`/`saveBatchCosts` |
| `src/screens/Home.jsx` | MODIFY — accept `isPickleballTreasurer` prop, add `PendingTicketsBanner` |
| `src/screens/BatchEntry.jsx` | MODIFY — ticket status chip, updateTicketAmount toggle, updated payload |

---

### Task 1: DB Migration — `water_amount` column

**Files:**
- Create: `supabase/migrations/20260607000001_ticket_water_amount.sql`

- [ ] **Step 1: Write migration file**

```sql
-- Add water_amount to pickleball_tickets
-- Stores water cost separately from ticket fee (total_amount)
ALTER TABLE pickleball_tickets
  ADD COLUMN IF NOT EXISTS water_amount integer NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Apply migration via MCP**

```
mcp__supabase__apply_migration with name "ticket_water_amount" and the SQL above
```

Expected: migration applied without error.

- [ ] **Step 3: Verify column exists**

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'pickleball_tickets' AND column_name = 'water_amount';
```

Expected: 1 row, `data_type = integer`, `column_default = 0`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260607000001_ticket_water_amount.sql
git commit -m "feat(db): add water_amount column to pickleball_tickets"
```

---

### Task 2: Parser — Expose `ticketAmount` in OCR output

**Files:**
- Modify: `src/lib/waterOcrImport.js`

- [ ] **Step 1: Read current `parseBlock` return** (lines 91–132)

Current return does NOT include `ticketAmount`. It's computed at line 94 but only used for `pickWaterTotal` and `extraNotes`.

- [ ] **Step 2: Add `ticketAmount` to return object**

In `parseBlock`, change the return in the `status: 'skip'` branch (line ~107) and the main branch (line ~122) to include `ticketAmount`:

```js
// skip branch (~line 106):
return {
  date: toIsoDate(displayDate),
  displayDate,
  quantities,
  detectedWaterTotal,
  calculatedWaterTotal,
  ticketAmount,
  extraNotes,
  status: 'skip',
  warnings: ['Không tìm thấy dữ liệu tiền nước'],
}

// main branch (~line 122):
return {
  date: toIsoDate(displayDate),
  displayDate,
  quantities,
  detectedWaterTotal,
  calculatedWaterTotal,
  ticketAmount,
  extraNotes,
  status: warnings.length ? 'needs_review' : 'ok',
  warnings,
}
```

- [ ] **Step 3: Verify with manual test**

In browser console or node, run:
```js
import { parseWaterOcrText } from './src/lib/waterOcrImport.js'
const result = parseWaterOcrText('165 09/05/2026 Xé vé 200.000 đ 1 10.000 đ 210.000 đ')
console.log(result.rows[0])
// Expected: { ticketAmount: 200000, detectedWaterTotal: 10000, ... }
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/waterOcrImport.js
git commit -m "feat(parser): expose ticketAmount in parseBlock return"
```

---

### Task 3: Data layer — `useScreenData.js`

**Files:**
- Modify: `src/hooks/useScreenData.js`

Three changes in this file: (a) `ticketAmountPerPerson` includes water, (b) `toTicketRow` exposes `waterAmount`, (c) `buildHomeData` adds `pendingTickets`.

- [ ] **Step 1: Update `ticketAmountPerPerson` (line ~3321)**

Replace the existing function:

```js
function ticketAmountPerPerson(ticket) {
  const memberIds = ticketMemberIds(ticket)
  const waterAmount = Number(ticket?.waterAmount ?? ticket?.water_amount ?? 0) || 0
  const total = ticketTotalAmount(ticket) + waterAmount
  return memberIds.length > 0 ? Math.round(total / memberIds.length) : 0
}
```

- [ ] **Step 2: Add `waterAmount` to `toTicketRow` (line ~3244)**

Inside `toTicketRow`, after `const amountPerPerson = ticketAmountPerPerson(ticket)`, add:

```js
const waterAmount = Number(ticket?.waterAmount ?? ticket?.water_amount ?? 0) || 0
```

And add `waterAmount` to the return object:

```js
return {
  id: ticket?.id || `ticket-${index}`,
  date,
  number: ticket?.number || ticket?.sessionNumber || ticket?.session_number || index + 1,
  sessionNumber: ticket?.sessionNumber || ticket?.session_number || ticket?.number || index + 1,
  dateLabel: formatSessionDetailDate(date),
  timeLabel: ticket?.timeLabel || ticket?.time || sessionTime(ticket),
  status,
  amount: totalAmount,
  totalAmount,
  waterAmount,           // ← NEW
  amountPerPerson,
  memberIds,
  memberLabels: attendees.map(row => row.name),
  memberChips: attendees,
  advancerId,
  advancerName,
  advancer: advancerName,
  expanded: index < 2,
  expiringSoon: Boolean(ticket?.expiringSoon || ticket?.expiring_soon),
  attendees,
}
```

- [ ] **Step 3: Add `pendingTickets` to `buildHomeData` return (line ~219)**

Inside `buildHomeData`, before the `return {` statement, add:

```js
const allTickets = safeArray(pickleballState?.pickleballTickets)
const pendingTickets = {
  count: allTickets.filter(t => String(t?.status || '').toLowerCase() === 'pending_review').length,
  totalAmount: allTickets
    .filter(t => String(t?.status || '').toLowerCase() === 'pending_review')
    .reduce((sum, t) => sum + (Number(t?.total_amount ?? t?.totalAmount) || 0), 0),
}
```

And add to the return object (after `prevMonthUnpaid`):

```js
pendingTickets,
```

- [ ] **Step 4: Run build to verify no type errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useScreenData.js
git commit -m "feat(data): waterAmount in ticket rows, pendingTickets in homeData"
```

---

### Task 4: PickleballCalendar — Water input in form + TicketDayPanel

**Files:**
- Modify: `src/screens/PickleballCalendar.jsx`

Two sub-changes: (a) `AddTicketSheet` water input, (b) `TicketDayPanel` water display + inline edit.

- [ ] **Step 1: Add `waterInput` state to `AddTicketSheet` (~line 340)**

After existing `useState` declarations in `AddTicketSheet`:

```js
const [waterInput, setWaterInput] = useState(
  editingTicket?.waterAmount > 0 ? formatAmountInput(editingTicket.waterAmount) : ''
);
```

- [ ] **Step 2: Add water field to `AddTicketSheet` submit payload (~line 147)**

In the `submit` function inside `AddTicketSheet`, the payload passed to `onSave` currently has `{ time, memberIds, paymentMode, advancerId }`. Add `waterAmount`:

```js
onSave({
  time,
  memberIds,
  paymentMode,
  advancerId,
  waterAmount: parseAmount(waterInput) || 0,
})
```

- [ ] **Step 3: Render water input in `AddTicketSheet` form**

After the total amount preview box (the `rgba(251,191,36,0.09)` div, ~line 438), add:

```jsx
<div style={{ marginTop: 12 }}>
  <div style={{ fontSize: 10, fontWeight: 800, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
    Tiền nước (tuỳ chọn)
  </div>
  <input
    type="text"
    inputMode="numeric"
    value={waterInput}
    onChange={e => setWaterInput(e.target.value)}
    placeholder="0"
    style={{
      width: '100%',
      padding: '8px 10px',
      background: colors.inputBg,
      border: `1px solid ${colors.borderSubtle}`,
      borderRadius: 10,
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: 900,
      fontFamily: 'inherit',
      outline: 'none',
      boxSizing: 'border-box',
    }}
  />
</div>
```

- [ ] **Step 4: Add water state to `TicketDayPanel` + display**

At the top of `TicketDayPanel` function body (~line 234), after existing state, add:

```js
const [ticketWaterEdits, setTicketWaterEdits] = useState({})
const [waterEditOpen, setWaterEditOpen] = useState({})

async function saveTicketWater(ticketId) {
  const raw = ticketWaterEdits[ticketId]
  if (raw === undefined) return
  if (savingAction) return
  setSavingAction('saveWater')
  try {
    await onAction?.('updateTicket', { ticketId, waterAmount: parseAmount(raw) || 0 })
    setWaterEditOpen(prev => ({ ...prev, [ticketId]: false }))
  } finally {
    setSavingAction('')
  }
}
```

- [ ] **Step 5: Render water row inside each ticket card in `TicketDayPanel`**

Inside the `tickets.map(ticket => ...)` block, after the status/action row, before the closing `</div>` of the ticket card:

```jsx
{(ticket.waterAmount > 0 || waterEditOpen[ticket.id]) && (
  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${colors.borderSubtle}` }}>
    {!waterEditOpen[ticket.id] ? (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#6ee7b7', fontWeight: 800 }}>
          💧 Nước: {formatVNDShort(ticket.waterAmount)} (+{formatVNDShort(Math.round(ticket.waterAmount / Math.max(ticket.memberIds.length, 1)))}/người)
        </span>
        {isTreasurer && (
          <button
            type="button"
            onClick={() => {
              setTicketWaterEdits(prev => ({ ...prev, [ticket.id]: formatAmountInput(ticket.waterAmount) }))
              setWaterEditOpen(prev => ({ ...prev, [ticket.id]: true }))
            }}
            style={{ fontSize: 10, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: '2px 4px' }}
          >Sửa</button>
        )}
      </div>
    ) : (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="text"
          inputMode="numeric"
          value={ticketWaterEdits[ticket.id] ?? ''}
          onChange={e => setTicketWaterEdits(prev => ({ ...prev, [ticket.id]: e.target.value }))}
          placeholder="0"
          style={{
            flex: 1,
            padding: '5px 8px',
            background: colors.inputBg,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: 8,
            color: colors.textPrimary,
            fontSize: 12,
            fontWeight: 900,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button type="button" onClick={() => saveTicketWater(ticket.id)} disabled={savingAction === 'saveWater'}
          style={{ fontSize: 11, fontWeight: 900, padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.1)', color: '#6ee7b7', cursor: 'pointer' }}>
          {savingAction === 'saveWater' ? '…' : 'Lưu'}
        </button>
        <button type="button" onClick={() => setWaterEditOpen(prev => ({ ...prev, [ticket.id]: false }))}
          style={{ fontSize: 11, padding: '5px 8px', borderRadius: 8, border: `1px solid ${colors.borderSubtle}`, background: 'transparent', color: colors.textSecondary, cursor: 'pointer' }}>
          Hủy
        </button>
      </div>
    )}
  </div>
)}
{isTreasurer && ticket.waterAmount === 0 && !waterEditOpen[ticket.id] && (
  <button
    type="button"
    onClick={() => {
      setTicketWaterEdits(prev => ({ ...prev, [ticket.id]: '' }))
      setWaterEditOpen(prev => ({ ...prev, [ticket.id]: true }))
    }}
    style={{ marginTop: 6, fontSize: 10, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 0, display: 'block' }}
  >+ Thêm nước</button>
)}
```

Note: `parseAmount` and `formatAmountInput` and `formatVNDShort` are already defined in this file.

- [ ] **Step 6: Run build**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/screens/PickleballCalendar.jsx
git commit -m "feat(calendar): water input in ticket form + inline water edit in TicketDayPanel"
```

---

### Task 5: app-v2.jsx — Handlers update

**Files:**
- Modify: `src/app-v2.jsx`

Three sub-changes: (a) pass `isPickleballTreasurer` to Home, (b) `addTicket`/`updateTicket` include `water_amount`, (c) `saveBatchCosts` ticket handling rewritten.

- [ ] **Step 1: Pass `isPickleballTreasurer` to Home (~line 2230)**

Change:
```jsx
return <Home data={homeData} isTreasurer={isTreasurer} paymentOpen={homePaymentOpen} onPaymentClose={() => handle('closeHomePayment')} onAction={handle} />
```
To:
```jsx
return <Home data={homeData} isTreasurer={isTreasurer} isPickleballTreasurer={isPickleballTreasurer} paymentOpen={homePaymentOpen} onPaymentClose={() => handle('closeHomePayment')} onAction={handle} />
```

- [ ] **Step 2: Update `addTicket` handler to include `water_amount`**

Find the `addTicket` handler (~line 1153). The INSERT into `pickleball_tickets` — add `water_amount` field:

```js
const { error } = await sb.from('pickleball_tickets').insert({
  group_id: groupId,
  session_date: sessionDate,
  total_amount: totalAmount,
  water_amount: Number(payload?.waterAmount) || 0,   // ← NEW
  member_ids: memberIds,
  advancer_id: advancerId || null,
  status: ticketStatus,
  year_month: monthKey(sessionDate),
  created_by: actorMemberId,
})
```

- [ ] **Step 3: Update `updateTicket` handler to include `water_amount`**

Find the `updateTicket` handler (~line 1192). In the UPDATE call, add `water_amount` conditionally:

```js
const updates = {
  session_date: sessionDate,
  total_amount: totalAmount,
  member_ids: memberIds,
  advancer_id: advancerId || null,
  status: ticketStatus,
}
if (payload?.waterAmount !== undefined) {
  updates.water_amount = Number(payload.waterAmount) || 0
}
const { error } = await sb.from('pickleball_tickets').update(updates).eq('id', ticketId)
```

- [ ] **Step 4: Rewrite `saveBatchCosts` ticket handling (~line 1660)**

Replace the existing `ticketRows` block:

```js
// OLD: filter(r => r?.sessionDate && r?.waterAmount > 0)
// NEW: only update existing tickets; no create; handle newTotal separately
const ticketRows = safeArray(payload?.ticketRows).filter(r =>
  r?.existingTicketId && (r?.waterAmount > 0 || r?.newTotal != null)
)
if (ticketRows.length > 0) {
  for (const ticketRow of ticketRows) {
    const updates = {}
    if (ticketRow.waterAmount > 0) updates.water_amount = ticketRow.waterAmount
    if (ticketRow.newTotal != null) updates.total_amount = ticketRow.newTotal
    const { error } = await sb.from('pickleball_tickets')
      .update(updates)
      .eq('id', ticketRow.existingTicketId)
    if (error) throw error
  }
}
```

Remove the `else` branch that creates new tickets from ticketRows (that path is no longer used).

- [ ] **Step 5: Run build**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app-v2.jsx
git commit -m "feat(handlers): water_amount in addTicket/updateTicket, rewrite saveBatchCosts ticket path"
```

---

### Task 6: Home — `PendingTicketsBanner`

**Files:**
- Modify: `src/screens/Home.jsx`

- [ ] **Step 1: Add `isPickleballTreasurer` to Home props signature (~line 38)**

Change:
```js
export default function Home({ data, isTreasurer, paymentOpen = false, onPayment...
```
To:
```js
export default function Home({ data, isTreasurer, isPickleballTreasurer = false, paymentOpen = false, onPayment...
```

- [ ] **Step 2: Add `PendingTicketsBanner` component**

Add this component near the bottom of `Home.jsx`, before the last export or helper functions:

```jsx
function PendingTicketsBanner({ count, totalAmount, onNavigate }) {
  if (!count) return null
  return (
    <div
      onClick={onNavigate}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        background: 'rgba(251,191,36,0.08)',
        border: '1px solid rgba(251,191,36,0.38)',
        borderRadius: 12,
        cursor: 'pointer',
        marginBottom: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Vé lẻ chờ duyệt
        </div>
        <div style={{ fontSize: 12, fontWeight: 900, marginTop: 2 }}>
          {count} lượt · {totalAmount > 0 ? totalAmount.toLocaleString('vi-VN') + 'đ' : ''}
        </div>
      </div>
      <span style={{ fontSize: 18, color: '#fbbf24' }}>›</span>
    </div>
  )
}
```

- [ ] **Step 3: Render banner in Home body**

In the main `Home` component JSX, find where the month navigation / balance card ends and the expenses section begins (around `<SectionHeader action="Xem tất cả →"...`, ~line 95). Insert before that section:

```jsx
{isPickleballTreasurer && (
  <PendingTicketsBanner
    count={d.pendingTickets?.count || 0}
    totalAmount={d.pendingTickets?.totalAmount || 0}
    onNavigate={() => onAction?.('push', 'pickleball-calendar')}
  />
)}
```

- [ ] **Step 4: Run build**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Home.jsx
git commit -m "feat(home): PendingTicketsBanner for pickleball treasurer"
```

---

### Task 7: BatchEntry — Ticket status + amount toggles

**Files:**
- Modify: `src/screens/BatchEntry.jsx`

- [ ] **Step 1: Add `updateTicketAmount` state (~line 16)**

After `const [addToTicket, setAddToTicket] = useState({})`, add:

```js
const [updateTicketAmount, setUpdateTicketAmount] = useState({})
```

- [ ] **Step 2: Reset `updateTicketAmount` in `useEffect` and `analyzeWaterImport`**

In the `useEffect` block (~line 18) add:
```js
setUpdateTicketAmount({})
```

In `analyzeWaterImport` function (~line 80) add:
```js
setUpdateTicketAmount({})
```

- [ ] **Step 3: Update `saveAll` — include `newTotal` and filter correctly**

Replace the `ticketRows` construction in `saveAll`:

```js
const ticketRows = waterImportRows
  .map((row, index) => {
    if (!addToTicket[index]) return null
    const water = Number(editedAmounts[index] !== undefined
      ? editedAmounts[index].replace(/\D/g, '')
      : row.detectedWaterTotal || row.calculatedWaterTotal) || 0
    if (!water && !updateTicketAmount[index]) return null
    const existingTicket = (d.tickets || []).find(t => t.date === row.date)
    if (!existingTicket) return null  // never create from BatchEntry
    return {
      sessionDate: row.date,
      waterAmount: water,
      newTotal: updateTicketAmount[index] ? row.ticketAmount : null,
      existingTicketId: existingTicket.id,
      existingTotal: existingTicket.totalAmount || 0,
    }
  })
  .filter(Boolean)
```

- [ ] **Step 4: Render ticket status chip in OCR result rows**

Inside the `waterImportRows.map((row, index) => ...)` block, after the existing notes/toggles section (after the `addToTicket` toggle button), add this ticket status section when `row.ticketAmount > 0`:

```jsx
{row.ticketAmount > 0 && (() => {
  const existingTicket = (d.tickets || []).find(t => t.date === row.date)
  if (!existingTicket) {
    return (
      <div style={{ marginTop: 6, fontSize: 10, color: '#fca5a5', fontWeight: 800 }}>
        ⚠ Chưa có vé ngày {row.displayDate} — tạo trước trong Calendar
      </div>
    )
  }
  const amountMatches = existingTicket.totalAmount === row.ticketAmount
  if (amountMatches) {
    return (
      <div style={{ marginTop: 6, fontSize: 10, color: '#6ee7b7', fontWeight: 800 }}>
        ✓ Vé {(row.ticketAmount / 1000).toFixed(0)}k — khớp
      </div>
    )
  }
  // amounts differ — show toggle
  const active = updateTicketAmount[index]
  return (
    <button
      type="button"
      onClick={() => setUpdateTicketAmount(prev => ({ ...prev, [index]: !prev[index] }))}
      style={{
        marginTop: 6,
        padding: '4px 8px',
        borderRadius: 8,
        fontSize: 10,
        fontWeight: 900,
        border: active ? '1px solid rgba(251,191,36,0.5)' : `1px solid ${colors.borderSubtle}`,
        background: active ? 'rgba(251,191,36,0.12)' : 'transparent',
        color: active ? '#fde68a' : colors.textMuted,
        cursor: 'pointer',
        fontFamily: type.family,
        display: 'block',
      }}
    >
      {active ? '✓ ' : ''}⚠ App {((existingTicket.totalAmount || 0) / 1000).toFixed(0)}k · OCR {(row.ticketAmount / 1000).toFixed(0)}k — cập nhật?
    </button>
  )
})()}
```

Note: `d.tickets` comes from `data.tickets`. Confirm `d` is `data || DEMO` (line 9).

- [ ] **Step 5: Run build**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/screens/BatchEntry.jsx
git commit -m "feat(batch): ticket amount status chip + updateTicketAmount toggle in OCR import"
```

---

## Self-Review

- **Spec coverage:**
  - F1 Home banner ✅ Task 3 (data) + Task 5 (prop) + Task 6 (UI)
  - F2 Ticket water form ✅ Task 4 (UI) + Task 5 (handlers) + Task 1 (DB)
  - F2 TicketDayPanel display+edit ✅ Task 4
  - F2 `amountPerPerson` includes water ✅ Task 3
  - F3 Parser exposes ticketAmount ✅ Task 2
  - F3 BatchEntry ticket status chips ✅ Task 7
  - F3 updateTicketAmount toggle ✅ Task 7
  - F3 saveBatchCosts rewrite ✅ Task 5

- **No placeholders**: All steps have explicit code.

- **Type consistency:**
  - `waterAmount` (camelCase) used throughout JS; `water_amount` (snake_case) only in DB column names and Supabase calls. Consistent.
  - `pendingTickets.count` / `pendingTickets.totalAmount` — used identically in Task 3 (builder) and Task 6 (consumer).
  - `existingTicketId` / `waterAmount` / `newTotal` — same keys in BatchEntry `saveAll` (Task 7) and `saveBatchCosts` handler (Task 5). ✅
