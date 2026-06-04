# Spec: Home Balance UX — Court Confirmed + Prev Month Notice

**Date:** 2026-06-04
**Status:** approved

## Problem

1. Member balance luôn show 568k ngay cả tháng chưa có gì xảy ra (July, August) vì `courtFee` luôn được tính dù thủ quỹ chưa xác nhận đã trả tiền sân — trông không chuyên nghiệp.
2. Khi tháng trước chưa thanh toán, home không có gì nhắc nhở — member dễ bỏ qua.

## Goals

1. **courtFee = 0** cho đến khi thủ quỹ record payment trong PickleballTeamFund (`ownerPaymentCoversItem(ownerPayments, 'court', yearMonth) === true`)
2. **Prev month notice** — dòng nhỏ dưới SourceBreakdown khi đang xem tháng hiện tại mà tháng trước còn âm, có nút [Xem →] navigate về tháng đó

---

## Feature 1: Court Fee Only When Confirmed

### Thay đổi

**File:** `src/hooks/useScreenData.js`, function `buildMemberMonthBalance` (line ~2629)

Hiện tại:
```js
const courtFeeShare = courtFeeTotal / fixedMemberCount
const fixedNetCost = Math.max(courtFeeShare - rebatePerFixed, 0)
const casualCharge = casualCharges.find(...)?.amount || 0
const courtFee = memberType(member) === 'casual' ? casualCharge : Math.round(fixedNetCost)
```

Sau fix:
```js
const ownerPayments = currentGroupOwnerPayments(state)
const courtConfirmed = ownerPaymentCoversItem(ownerPayments, 'court', currentYearMonth)
const courtFeeShare = courtFeeTotal / fixedMemberCount
const fixedNetCost = Math.max(courtFeeShare - rebatePerFixed, 0)
const casualCharge = casualCharges.find(...)?.amount || 0
const courtFee = courtConfirmed
  ? (memberType(member) === 'casual' ? casualCharge : Math.round(fixedNetCost))
  : 0
```

**Kết quả:**
- Tháng chưa confirm court: member balance = chỉ nước + phát sinh + vé lẻ
- Tháng đã confirm court: balance như cũ, bao gồm đủ tiền sân

**Edge case:**
- `state` đã có trong signature của `buildMemberMonthBalance` → `currentGroupOwnerPayments(state)` gọi trực tiếp được
- Tháng hiện tại chưa record ownerPayment → `courtFee = 0` ✅

---

## Feature 2: Previous Month Unpaid Notice

### Data — `buildHomeData`

**File:** `src/hooks/useScreenData.js`, function `buildHomeData` (line ~197)

Thêm sau khi tính `paymentSummary`:
```js
// Prev month unpaid notice — chỉ hiện khi đang xem tháng hiện tại
const prevMonthUnpaid = buildPrevMonthUnpaid(
  state, currentUserId, members, safeGroups, pickle, pickleballState, pickleballMemberId, selectedYearMonth
)
```

Return object thêm:
```js
prevMonthUnpaid,   // null | { yearMonth: '2026-05', label: 'Tháng 5/2026', balance: -150000 }
```

**Helper `buildPrevMonthUnpaid`:**
```js
function buildPrevMonthUnpaid(state, currentUserId, members, safeGroups, pickle, pickleballState, pickleballMemberId, selectedYearMonth) {
  // Chỉ compute khi đang xem tháng hiện tại
  if (selectedYearMonth !== monthKey(new Date())) return null

  const prevYearMonth = shiftMonthKey(selectedYearMonth, -1)
  const prevDate = dateFromYearMonth(prevYearMonth)

  // Expense balance prev month
  const prevExpenseGroups = safeGroups
    .filter(group => groupKind(group) !== 'pickleball')
    .map(group => groupWithMonthExpenses(group, prevDate))
  const prevExpenseBalance = prevExpenseGroups.reduce((sum, group) => (
    sum + groupNetForMember(group, currentUserId, members, state?.currentUserName)
  ), 0)

  // Pickleball balance prev month
  const prevSessions = getStateMonthSessions(pickleballState, prevDate)
  const prevPickleBalance = buildMemberMonthBalance(pickleballState, pickle, prevSessions, pickleballMemberId).netBalance || 0

  const prevTotal = prevExpenseBalance + prevPickleBalance
  if (prevTotal >= 0) return null

  return {
    yearMonth: prevYearMonth,
    label: formatMonthLabel(prevDate),
    balance: prevTotal,
  }
}
```

### UI — `Home.jsx`

Thêm component `PrevMonthNotice` render sau `<SourceBreakdown>`:
```jsx
{d.prevMonthUnpaid && (
  <PrevMonthNotice
    label={d.prevMonthUnpaid.label}
    balance={d.prevMonthUnpaid.balance}
    onView={() => onAction?.('monthPrev')}
  />
)}
```

UI của `PrevMonthNotice`:
```
↳ Tháng 5/2026 chưa trả · -150,000đ    [Xem →]
```

Style: compact row, border-left màu warning (#f59e0b), font nhỏ (11-12px), nằm ngay dưới SourceBreakdown card.

`onView` gọi `monthPrev` — navigate về tháng trước. Vì `prevMonthUnpaid` chỉ tồn tại khi `selectedYearMonth === currentMonth`, bấm `monthPrev` luôn đúng tháng.

---

## Files Thay Đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useScreenData.js` | Feature 1: fix `buildMemberMonthBalance` + Feature 2: thêm `buildPrevMonthUnpaid`, expose `prevMonthUnpaid` từ `buildHomeData` |
| `src/screens/Home.jsx` | Feature 2: thêm `PrevMonthNotice` component + render sau SourceBreakdown |

---

## Acceptance Criteria

### Feature 1
- [ ] Tháng chưa có `ownerPayment` với key `court` → `courtFee = 0` trong balance của mọi member
- [ ] Tháng đã confirm court → balance bao gồm tiền sân như cũ
- [ ] Water, extras, ticket vẫn tính bình thường bất kể court confirmed hay không

### Feature 2
- [ ] Đang xem tháng hiện tại, tháng trước balance < 0 → hiện notice row
- [ ] Bấm [Xem →] → navigate về tháng trước
- [ ] Đang xem tháng hiện tại, tháng trước balance >= 0 → không hiện
- [ ] Đang xem tháng khác (không phải current) → không hiện
