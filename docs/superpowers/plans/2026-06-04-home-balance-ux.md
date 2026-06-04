# Home Balance UX — Court Confirmed + Prev Month Notice

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ẩn tiền sân khỏi balance member cho đến khi thủ quỹ xác nhận đã trả, và hiện dòng cảnh báo khi tháng trước chưa thanh toán.

**Architecture:** Task 1 sửa `buildMemberMonthBalance` trong `useScreenData.js` — thêm check `ownerPaymentCoversItem` trước khi tính `courtFee`. Task 2 sửa `buildHomeData` — thêm helper `buildPrevMonthUnpaid` + expose field mới. Task 3 sửa `Home.jsx` — render `PrevMonthNotice` component sau `SourceBreakdown`.

**Tech Stack:** React, `src/hooks/useScreenData.js`, `src/screens/Home.jsx`, `src/tokens.js` (colors.warning = `#fbbf24`)

---

## File Structure

| File | Thay đổi |
|------|----------|
| `src/hooks/useScreenData.js` | Task 1: fix `buildMemberMonthBalance` + Task 2: thêm `buildPrevMonthUnpaid`, expose `prevMonthUnpaid` từ `buildHomeData` |
| `src/screens/Home.jsx` | Task 3: thêm `PrevMonthNotice` component + render sau `<SourceBreakdown>` |

---

## Task 1: Fix courtFee = 0 Until Court Confirmed

**Files:**
- Modify: `src/hooks/useScreenData.js:2629-2672`

**Context:** `buildMemberMonthBalance` luôn tính `courtFee` dù thủ quỹ chưa record ownerPayment. `currentGroupOwnerPayments(state)` và `ownerPaymentCoversItem(payments, key, yearMonth)` đã có sẵn trong file — chỉ cần gọi thêm. `currentYearMonth` trong function = `monthKey(new Date())`.

- [ ] **Step 1: Sửa `buildMemberMonthBalance` trong `src/hooks/useScreenData.js`**

Tìm dòng (line ~2648-2652):
```js
  const member = members.find(row => String(row.id) === String(memberId))
  const courtFeeShare = courtFeeTotal / fixedMemberCount
  const fixedNetCost = Math.max(courtFeeShare - rebatePerFixed, 0)
  const casualCharge = casualCharges.find(row => String(row.memberId) === String(memberId))?.amount || 0
  const courtFee = memberType(member) === 'casual' ? casualCharge : Math.round(fixedNetCost)
```

Thay bằng:
```js
  const member = members.find(row => String(row.id) === String(memberId))
  const ownerPayments = currentGroupOwnerPayments(state)
  const courtConfirmed = ownerPaymentCoversItem(ownerPayments, 'court', currentYearMonth)
  const courtFeeShare = courtFeeTotal / fixedMemberCount
  const fixedNetCost = Math.max(courtFeeShare - rebatePerFixed, 0)
  const casualCharge = casualCharges.find(row => String(row.memberId) === String(memberId))?.amount || 0
  const courtFee = courtConfirmed
    ? (memberType(member) === 'casual' ? casualCharge : Math.round(fixedNetCost))
    : 0
```

- [ ] **Step 2: Build để confirm không lỗi**

```bash
npm run build
```

Expected: build pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useScreenData.js
git commit -m "fix: courtFee = 0 until treasurer confirms court payment"
```

---

## Task 2: Expose prevMonthUnpaid từ buildHomeData

**Files:**
- Modify: `src/hooks/useScreenData.js`

**Context:** `buildHomeData` (line ~197) nhận `selectedYearMonth`. Cần tính balance tháng trước bằng cách tái dùng `groupWithMonthExpenses`, `groupNetForMember`, `getStateMonthSessions`, `buildMemberMonthBalance` — tất cả đã có trong file. `shiftMonthKey` ở line ~1445, `dateFromYearMonth` đã dùng ở line ~198, `formatMonthLabel` ở line ~226. Chỉ compute khi `selectedYearMonth === monthKey(new Date())`.

- [ ] **Step 1: Thêm helper `buildPrevMonthUnpaid` vào `src/hooks/useScreenData.js`**

Thêm function mới ngay trước `function buildHomeData` (line ~197):

```js
function buildPrevMonthUnpaid(state, currentUserId, members, safeGroups, pickle, pickleballState, pickleballMemberId, selectedYearMonth) {
  if (selectedYearMonth !== monthKey(new Date())) return null
  const prevYearMonth = shiftMonthKey(selectedYearMonth, -1)
  const prevDate = dateFromYearMonth(prevYearMonth)
  const prevExpenseGroups = safeGroups
    .filter(group => groupKind(group) !== 'pickleball')
    .map(group => groupWithMonthExpenses(group, prevDate))
  const prevExpenseBalance = prevExpenseGroups.reduce((sum, group) => (
    sum + groupNetForMember(group, currentUserId, members, state?.currentUserName)
  ), 0)
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

- [ ] **Step 2: Gọi helper trong `buildHomeData` và expose field mới**

Tìm đoạn cuối `buildHomeData` (line ~215-251):
```js
  const paymentSummary = buildHomePaymentSummary(state, rawSourceBreakdown, profileBreakdown, members, me, today)
  const sourceBreakdown = paymentSummary.sourceBreakdown
  const totalBalance = paymentSummary.netBalance

  return {
    user: {
```

Thay bằng:
```js
  const paymentSummary = buildHomePaymentSummary(state, rawSourceBreakdown, profileBreakdown, members, me, today)
  const sourceBreakdown = paymentSummary.sourceBreakdown
  const totalBalance = paymentSummary.netBalance
  const prevMonthUnpaid = buildPrevMonthUnpaid(state, currentUserId, members, safeGroups, pickle, pickleballState, pickleballMemberId, selectedYearMonth)

  return {
    user: {
```

Thêm `prevMonthUnpaid,` vào return object — tìm `paymentSummary,` ở cuối return và thêm ngay sau:
```js
    paymentSummary,
    prevMonthUnpaid,
  }
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build pass.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useScreenData.js
git commit -m "feat: expose prevMonthUnpaid in buildHomeData"
```

---

## Task 3: Render PrevMonthNotice trong Home.jsx

**Files:**
- Modify: `src/screens/Home.jsx`

**Context:** `Home.jsx` line 1 có comment `// Props: data { user, monthLabel, totalBalance, ... }`. Sau Task 2, `d.prevMonthUnpaid` là `null | { yearMonth, label, balance }`. Render ngay sau `<SourceBreakdown>` (line ~75). Colors từ `src/tokens.js`: `colors.warning = '#fbbf24'`, `colors.textSecondary` đã dùng khắp file. `formatVND` đã import ở line 6.

- [ ] **Step 1: Thêm `PrevMonthNotice` component vào cuối `src/screens/Home.jsx`** (trước dòng cuối file hoặc sau các component helper khác)

```jsx
function PrevMonthNotice({ label, balance, onView }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '9px 12px',
      marginTop: 6,
      borderRadius: 10,
      borderLeft: `3px solid ${colors.warning}`,
      background: 'rgba(251,191,36,0.07)',
      border: `1px solid rgba(251,191,36,0.22)`,
      borderLeftWidth: 3,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.warning }}>
          {label} chưa trả ·
        </span>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#fca5a5', marginLeft: 4, ...type.mono }}>
          {formatVND(Math.abs(balance))}
        </span>
      </div>
      <button
        type="button"
        onClick={onView}
        style={{
          flexShrink: 0,
          padding: '5px 10px',
          borderRadius: 8,
          background: 'rgba(251,191,36,0.14)',
          border: '1px solid rgba(251,191,36,0.32)',
          color: colors.warning,
          fontSize: 11,
          fontWeight: 800,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        Xem →
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Render `PrevMonthNotice` sau `<SourceBreakdown>` trong Home component**

Tìm (line ~75-77):
```jsx
        />

        <PendingApprovalZone
```

Thay bằng:
```jsx
        />

        {d.prevMonthUnpaid && (
          <PrevMonthNotice
            label={d.prevMonthUnpaid.label}
            balance={d.prevMonthUnpaid.balance}
            onView={() => onAction?.('monthPrev')}
          />
        )}

        <PendingApprovalZone
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build pass.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Home.jsx
git commit -m "feat: hiện notice tháng trước chưa trả dưới SourceBreakdown"
```

---

## Acceptance Criteria

**Feature 1 — Court Confirmed:**
- [ ] Tháng chưa có ownerPayment với key `court` → `courtFee = 0`, balance member chỉ gồm nước + phát sinh + vé lẻ
- [ ] Tháng đã confirm court → balance bao gồm tiền sân như cũ
- [ ] Water, extras, ticketShare không bị ảnh hưởng

**Feature 2 — Prev Month Notice:**
- [ ] Đang xem tháng hiện tại, tháng trước balance < 0 → notice hiện dưới SourceBreakdown
- [ ] Bấm "Xem →" → navigate về tháng trước
- [ ] Đang xem tháng hiện tại, tháng trước balance >= 0 → không hiện notice
- [ ] Đang xem tháng không phải current → không hiện notice
