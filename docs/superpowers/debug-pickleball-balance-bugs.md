# Debug: Pickleball Balance Bugs — 2026-06-04

## Bug 1: courtFee = 0 cho tất cả tháng

**Symptom:** Sau fix courtConfirmed, cả tháng 5 lẫn tháng 6 đều show 0đ cho tiền sân.

**Root cause:** `buildMemberMonthBalance` line 2673 check `key: 'court'` nhưng DB lưu item với `key: 'next_court'`. Key mismatch → `ownerPaymentCoversItem` never matches → `courtConfirmed = false` → `courtFee = 0`.

DB record xác nhận:
```
items: [{key: "next_court", yearMonth: "2026-06", amount: 4550000}]
```
Code check: `ownerPaymentCoversItem(ownerPayments, 'court', currentYearMonth)` → 'court' ≠ 'next_court' → false.

**Fix:** `src/hooks/useScreenData.js` line 2673:
```js
// Before:
const courtConfirmed = ownerPaymentCoversItem(ownerPayments, 'court', currentYearMonth)
// After:
const courtConfirmed = ownerPaymentCoversItem(ownerPayments, 'next_court', currentYearMonth)
```

Also line 1362 (costRows trong buildPickleballTeamFundData) cùng bug:
```js
// Before:
paidToOwner: isPaidToOwner(monthlyConfig) || ownerPaymentCoversItem(ownerPayments, 'court', currentYearMonth),
// After:
paidToOwner: isPaidToOwner(monthlyConfig) || ownerPaymentCoversItem(ownerPayments, 'next_court', currentYearMonth),
```

---

## Bug 2: TeamFund payment draft "Tiền sân tháng sau"

**Symptom:** TeamFund hiện item "Tiền sân tháng sau · 2026-06" khi đang xem tháng 5. User muốn "Tiền sân tháng này" cho tháng hiện tại.

**Root cause:** `buildPickleballTeamFundData` line 1319:
```js
{ key: 'next_court', label: 'Tiền sân tháng sau', yearMonth: nextYearMonth, amount: nextCourtFeeTotal },
```
Dùng `nextYearMonth` (tháng sau) làm yearMonth của item. User muốn thanh toán tiền sân tháng này (currentYearMonth).

**Fix:** `src/hooks/useScreenData.js` line 1319:
```js
// Before:
{ key: 'next_court', label: 'Tiền sân tháng sau', yearMonth: nextYearMonth, amount: nextCourtFeeTotal },
// After:
{ key: 'next_court', label: 'Tiền sân tháng này', yearMonth: currentYearMonth, amount: courtFeeTotal },
```

Note: Sau fix này, `ownerPaymentCoversItem` trong Bug 1 sẽ check `yearMonth: currentYearMonth` và DB record cũng có `yearMonth: '2026-06'` = currentYearMonth → match ✓.

---

## Bug 3: Vé lẻ không hiện trong balance khi xem tháng khác

**Symptom:** Thêm vé lẻ cho tháng 5, nhưng khi xem tháng 5 từ tháng 6, balance không phản ánh vé lẻ. "VÉ LẺ QUA QUỸ · 0đ".

**Root cause:** Tất cả ticket helper functions hardcode `currentMonthTicketsForState(state)` = `monthTicketsForState(state, new Date())` = June 2026. Khi xem May 2026, May tickets bị filter out do `yearMonth !== monthKey(new Date())`.

Các functions bị ảnh hưởng (đều gọi `currentMonthTicketsForState`):
- `memberTicketBalance` (line 4309) → dùng bởi `buildPickleballOverviewData` line 1237, `buildTicketFundSummary` line 2545, `buildMemberMonthBalance` line 2683
- `memberTeamFundTicketShare` (line 4328) → dùng bởi `buildPickleballOverviewData` line 1238, `buildTicketFundSummary` line 2545, `buildMemberMonthBalance` line 2682
- `buildTeamFundTicketRows` (line 1388) → dùng bởi `buildPickleballTeamFundData` line 1301
- `buildTeamFundTicketParticipantRows` (line 1442) → dùng bởi `buildPickleballTeamFundData` line 1302
- `buildTicketMonthStats` (line 4356) → dùng bởi `buildPickleballOverviewData` line 1240, `buildPickleballTeamFundData` line 1298
- `buildTicketFundSummary` (line 2541) → dùng bởi `buildPickleballOverviewData` line 1241, `buildPickleballTeamFundData` line 1299

**Fix approach:** Thêm optional `date` param vào 6 functions trên, default = `new Date()`. Update callers trong `buildPickleballOverviewData` và `buildPickleballTeamFundData` để pass `today`.

### Thay đổi functions:

```js
// memberTicketBalance: thêm date param
function memberTicketBalance(state, memberId, date) {
  return monthTicketsForState(state, date || new Date()).reduce(...)
}

// memberTeamFundTicketShare: thêm date param
function memberTeamFundTicketShare(state, memberId, date) {
  return monthTicketsForState(state, date || new Date()).reduce(...)
}

// buildTeamFundTicketRows: thêm date param
function buildTeamFundTicketRows(state, date) {
  return monthTicketsForState(state, date || new Date())
    .filter(ticket => ticketStatus(ticket) !== 'pending_review')
    ...
}

// buildTeamFundTicketParticipantRows: thêm date param
function buildTeamFundTicketParticipantRows(state, date) {
  const memberMap = new Map()
  monthTicketsForState(state, date || new Date())
    .filter(...)
    ...
}

// buildTicketMonthStats: thêm date param
function buildTicketMonthStats(state, date) {
  const rows = monthTicketsForState(state, date || new Date()).map(...)
  ...
  const tickets = monthTicketsForState(state, date || new Date())
  ...
}

// buildTicketFundSummary: thêm date param, pass date to inner calls
function buildTicketFundSummary(state, date) {
  const rows = currentGroupMembers(state)
    .filter(isActiveMember)
    .map(member => {
      const ticketNet = memberTicketBalance(state, member.id, date) - memberTeamFundTicketShare(state, member.id, date)
      ...
    })
  ...
  const tickets = monthTicketsForState(state, date || new Date())
  ...
}
```

### Thay đổi callers:

**`buildMemberMonthBalance`**: thêm `date` param thứ 5 (optional):
```js
function buildMemberMonthBalance(state, pickle, sessions, memberId, date) {
  ...
  const ticketShare = memberTeamFundTicketShare(state, memberId, date)
  const p2pBalance = memberTicketBalance(state, memberId, date)
  ...
}
```

**`buildPickleballOverviewData` (line 1237-1243)**: pass `today`:
```js
const p2pTicketBalance = memberTicketBalance(state, currentPickleballMemberId, today)
const teamFundTicketShare = memberTeamFundTicketShare(state, currentPickleballMemberId, today)
const ticketStats = buildTicketMonthStats(state, today)
const ticketFund = buildTicketFundSummary(state, today)
const teamFundOverview = buildPickleballTeamFundData(state, currentYearMonth)  // already has month
const memberBalance = buildMemberMonthBalance(state, pickle, monthSessions, currentPickleballMemberId, today)
```

**`buildPickleballTeamFundData` (lines 1298-1302)**: pass `today`:
```js
const ticketStats = buildTicketMonthStats(state, today)
const ticketFund = buildTicketFundSummary(state, today)
const teamFundDirectTotal = ticketFund.teamFundTotal || 0
const ticketRows = buildTeamFundTicketRows(state, today)
const ticketParticipantRows = buildTeamFundTicketParticipantRows(state, today)
```

**`buildPrevMonthUnpaid` (buildHomeData area, ~line 193-212)**: pass `prevDate`:
```js
const prevPickleBalance = buildMemberMonthBalance(pickleballState, pickle, prevSessions, pickleballMemberId, prevDate).netBalance || 0
```

**`buildHomeData` (~line 231)**: pass the appropriate date:
```js
const pickleballBalance = buildMemberMonthBalance(pickleballState, pickle, monthSessions, pickleballMemberId, today)
```
Note: Need to check line 231 context to find what `today` is in that scope.

---

---

## Bug 4: "Vé lẻ trong tháng" BUỔI THÊM = 0 khi xem tháng cũ

**Symptom:** Lê Minh xem Pickleball screen → phần "Vé lẻ trong tháng" BUỔI THÊM = 0, dù có vé lẻ tháng đang xem.

**Root cause:** `buildPersonalTicketOverview` (line 2483) không nhận `date` param:
```js
function buildPersonalTicketOverview(state, memberId) {
  const rows = currentMonthTicketsForState(state)  // hardcode new Date() → tháng hiện tại
```

Caller tại line 1278 không truyền `today`:
```js
yourTickets: buildPersonalTicketOverview(state, currentPickleballMemberId),
```

Khi `selectedYearMonth = "2026-05"` (xem tháng 5) nhưng `new Date() = "2026-06"`, tất cả ticket "2026-05" bị filter out.

**Fix:**
1. `buildPersonalTicketOverview` line 2483: thêm `date` param, đổi sang `monthTicketsForState`:
```js
function buildPersonalTicketOverview(state, memberId, date) {
  const rows = monthTicketsForState(state, date || new Date())
    .filter(ticket => ticketStatus(ticket) !== 'pending_review')
    ...
```
2. Line 1278: truyền `today`:
```js
yourTickets: buildPersonalTicketOverview(state, currentPickleballMemberId, today),
```

---

## Bug 5: Trang chủ Lê Minh không cập nhật sau khi thủ quỹ CK cho chủ sân

**Symptom:** Thủ quỹ confirm thanh toán 4,550,000 cho chủ sân (tháng 5) → `pickleball_owner_payments` có row mới → trang chủ Lê Minh vẫn balance = 0, không có banner "tháng trước còn nợ".

**Root cause:** `src/store.jsx` Supabase realtime chỉ subscribe `expenses`:
```js
.channel('expenses-realtime')
.on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, ...)
```

`pickleball_owner_payments` **không có subscription**. Khi thủ quỹ insert → `refresh()` chỉ chạy session của thủ quỹ. Lê Minh không nhận event → state cũ → `courtConfirmed = false` → `prevMonthUnpaid = null`.

**Expected flow sau khi fix:**
- `courtConfirmed(May) = true` → `courtFee ≈ 758,333`
- May `netBalance ≈ 50,000 - 758,333 = -708,333` (Lê Minh nợ)
- `prevMonthUnpaid` returns `{yearMonth: "2026-05", balance: -708k}`
- `Home.jsx:78`: `<PrevMonthNotice>` hiện banner

**Fix:** `src/store.jsx` — thêm subscription cho `pickleball_owner_payments` vào cùng channel hoặc channel riêng (sau line 2804, trước `.subscribe()`):
```js
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'pickleball_owner_payments',
}, () => {
  scheduleRefresh()
})
```

---

## Verification

After fix:
1. Xem tháng 5: courtFee show bình thường (vì `courtConfirmed` true khi `next_court` cho tháng 6 = currentYearMonth = 2026-06 confirmed)
2. Xem tháng 7/8 tương lai: courtFee = 0 (chưa có `next_court` item cho 2026-06 hay 2026-07)

Wait — issue: khi là tháng 7, `currentYearMonth` trong `buildMemberMonthBalance` = `monthKey(new Date())` = `'2026-07'`. Sẽ check `ownerPaymentCoversItem(payments, 'next_court', '2026-07')`. Không có item → `courtFee = 0`. ✓

Khi là tháng 6, `currentYearMonth = '2026-06'`. DB có item `{key: 'next_court', yearMonth: '2026-06'}` → confirmed → `courtFee` show. ✓

3. TeamFund: hiện "Tiền sân tháng này · 2026-06 · [status]" ✓
4. Vé lẻ tháng 5: khi xem tháng 5 từ tháng 6 (viewing past month), ticket balance được tính đúng. ✓

## npm run build

Chạy sau fix để verify không lỗi.
