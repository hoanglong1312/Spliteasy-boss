# Chốt Sổ Section — Redesign Plan

## Context
Feature "Gộp nợ tháng" cần redesign. Design cũ dùng `prevMonthUnpaidByMember` (outstanding từ tháng trước) hiển thị button trong từng confirmed card → sai use case. Design mới:
- **Trigger**: member đã trả tháng hiện tại (confirmed) nhưng trả chưa đủ (residual > 0 vì expense mới phát sinh sau khi trả)
- **Source data**: `profileBreakdown` (adjusted) trong `buildHomeData` — đã có `amount < 0` (vẫn nợ) + `paidAmount > 0` (đã trả gì đó) → residual = abs(amount)
- **UI**: Section riêng "Chốt sổ" bên dưới "Đã nhận", không lẫn vào card confirmed

## Files
- Modify: `src/hooks/useScreenData.js`
- Modify: `src/screens/Home.jsx`
- Tests: `src/hooks/useScreenData.test.js` (không đổi — `buildPrevMonthUnpaid` vẫn dùng cho personal notice)

---

## Task 1: `useScreenData.js` — Replace `prevMonthUnpaidByMember` with `currentMonthResidualByMember`

**Files:** Modify `src/hooks/useScreenData.js`

### Step 1: Đọc `buildHomeData` từ line ~246

Locate block:
```js
const prevYM = shiftMonthKey(selectedYearMonth, -1)
const prevDate = dateFromYearMonth(prevYM)
const prevExpenseGroups = ...
const prevSessions = ...
const prevSourceBalances = ...
const prevProfileBreakdown = ...
const prevMonthUnpaidByMember = {}
safeArray(prevProfileBreakdown).forEach(row => { ... })
```
→ Lines ~246-267. Remove TOÀN BỘ block này.

### Step 2: Ngay sau line `const profileBreakdown = adjustedProfileBreakdownForPayments(...)`, thêm:
```js
const currentMonthResidualByMember = {}
safeArray(profileBreakdown).forEach(row => {
  if (Number(row.amount) < 0 && Number(row.paidAmount) > 0) {
    safeArray(row.memberIds || memberIdsForProfile(row.profileId, members)).forEach(memberId => {
      currentMonthResidualByMember[String(memberId)] = Math.abs(Number(row.amount))
    })
  }
})
```

### Step 3: Trong return value của `buildHomeData`, replace:
```js
prevMonthUnpaidByMember,
```
với:
```js
currentMonthResidualByMember,
```

### Step 4: Verify build pass
```bash
npm run build 2>&1 | tail -20
```

### Step 5: Commit
```bash
git add src/hooks/useScreenData.js
git commit -m "refactor: replace prevMonthUnpaidByMember with currentMonthResidualByMember

Source: adjustedProfileBreakdown rows where amount<0 && paidAmount>0
(member paid something but still has residual in current month)"
```

---

## Task 2: `Home.jsx` — Redesign `TreasurerPaymentDashboard`

**Files:** Modify `src/screens/Home.jsx`

### Step 1: Update caller (search for `prevMonthUnpaidByMember={`)

Replace:
```jsx
prevMonthUnpaidByMember={data?.prevMonthUnpaidByMember || {}}
```
with:
```jsx
currentMonthResidualByMember={data?.currentMonthResidualByMember || {}}
```

Also check if `monthSettlements` is already passed — keep it.

### Step 2: Update `TreasurerPaymentDashboard` signature

From:
```js
function TreasurerPaymentDashboard({ ..., monthSettlements, prevMonthUnpaidByMember, onDeferMonthBalance, onUndoDeferMonthBalance })
```
To:
```js
function TreasurerPaymentDashboard({ ..., monthSettlements, currentMonthResidualByMember, onDeferMonthBalance, onUndoDeferMonthBalance })
```

### Step 3: Update internal variable

Replace:
```js
const safePrevUnpaid = prevMonthUnpaidByMember || {};
```
with:
```js
const safeCurrentResidual = currentMonthResidualByMember || {};
```

### Step 4: Remove Gộp button from confirmed cards

In `confirmedRecordsFiltered.map(record => { ... })`, locate and REMOVE:
- `const residual = memberIds.reduce(...)` line
- `const settlement = prevMonthStr ? ...` line
- `const isSettled = Boolean(settlement)` line
- Entire `{residual > 0 && !isSettled && ( <button>Gộp...</button> )}` block
- Entire `{isSettled && ( <> ... </> )}` block

Keep only `<button>Xem</button>` và `<button>Hủy</button>` trong mỗi confirmed card.

### Step 5: Add "Chốt sổ" section sau closing tag của "Đã nhận" section

Sau `{confirmedRecords.length > 0 && ( <DashboardSection ...> ... </DashboardSection> )}`, thêm:

```jsx
{(() => {
  const chossoRows = confirmedRecords.filter(record => {
    const memberIds = safeArray(record.memberIds || [record.memberId]).map(String);
    const residual = memberIds.reduce((max, mId) => Math.max(max, Number(safeCurrentResidual[mId]) || 0), 0);
    return residual > 0;
  });
  if (chossoRows.length === 0) return null;
  return (
    <DashboardSection
      title={`Chốt sổ · ${chossoRows.length} thành viên`}
      subtitle={`Đã nhận nhưng còn dư · chuyển sang ${nextMonthLabel}`}
      amount={chossoRows.reduce((sum, record) => {
        const memberIds = safeArray(record.memberIds || [record.memberId]).map(String);
        return sum + memberIds.reduce((max, mId) => Math.max(max, Number(safeCurrentResidual[mId]) || 0), 0);
      }, 0)}
      icon="⟳"
      color="#f59e0b"
      expanded
      onToggle={() => {}}
    >
      {chossoRows.map(record => {
        const memberIds = safeArray(record.memberIds || [record.memberId]).map(String);
        const residual = memberIds.reduce((max, mId) => Math.max(max, Number(safeCurrentResidual[mId]) || 0), 0);
        const settlement = currentYM ? safeSettlements.find(s =>
          memberIds.includes(String(s.member_id)) && String(s.month) === currentYM
        ) : null;
        const isSettled = Boolean(settlement);
        return (
          <PaymentDashboardRow key={`chosso-${record.notificationId || record.id}`} row={{ ...record, amount: residual }} tone="confirmed">
            {!isSettled && (
              <button
                type="button"
                onClick={() => withLoading(() => onDeferMonthBalance?.({
                  memberId: memberIds[0] || record.memberId,
                  profileId: record.profileId,
                  month: currentYM,
                  amount: residual,
                  nextMonthDate: nextMonthFirstDay,
                  memberName: record.name || record.memberName || '',
                  groupId: data?.currentGroupId || '',
                }))}
                style={miniDashButton('#f59e0b', '#1c1917')}
              >
                Gộp → {nextMonthLabel}
              </button>
            )}
            {isSettled && (
              <>
                <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.18)', color: '#4ade80', borderRadius: 6, padding: '3px 8px', fontWeight: 700 }}>✓ Gộp {nextMonthLabel}</span>
                <button
                  type="button"
                  onClick={() => withLoading(() => onUndoDeferMonthBalance?.({ settlementId: settlement.id }))}
                  style={miniDashButton(colors.danger, '#fff')}
                >
                  Hủy gộp
                </button>
              </>
            )}
          </PaymentDashboardRow>
        );
      })}
    </DashboardSection>
  );
})()}
```

### Step 6: Verify build pass
```bash
npm run build 2>&1 | tail -20
```

### Step 7: Run unit tests (không liên quan test này nhưng verify không regression)
```bash
npm test 2>&1 | tail -10
```

### Step 8: Commit
```bash
git add src/screens/Home.jsx
git commit -m "feat: replace per-card Gộp button with Chốt sổ section in payment dashboard

- Remove Gộp button from each confirmed payment card
- Add new Chốt sổ section below Đã nhận section
- Section only visible when confirmed members have current-month residual
- Settlement check uses currentYM (not prevMonth) for member_month_settlements"
```

---

## Acceptance Criteria
- `npm run build` passes
- `npm test` passes (unit tests unchanged)
- "Chốt sổ" section hiện ra khi member trong "Đã nhận" còn dư tháng hiện tại
- "Chốt sổ" section ẩn khi không có ai còn dư
- Bấm "Gộp → T6" tạo carry-forward expense + settlement record
- Sau khi gộp: hiện "✓ Gộp T6" + nút "Hủy gộp"
- "Đã nhận" cards không còn button Gộp
