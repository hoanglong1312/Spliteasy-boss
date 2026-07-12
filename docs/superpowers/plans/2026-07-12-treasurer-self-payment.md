# Treasurer Self Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hiện khoản phải nộp của thủ quỹ trong sheet Thanh toán và cho xác nhận trực tiếp bằng coverage per-item hiện có.

**Architecture:** Tái sử dụng nguyên payment card và selector của member trong `PaymentSheet`. `Home` chọn action theo vai trò: member gửi `confirmPaymentSent`, thủ quỹ gửi `markMemberPaid`, action này đã ghi payment confirmed qua `TREASURER_CONFIRM_PAYMENT`.

**Tech Stack:** React, inline styles, Node test runner, Vite.

---

### Task 1: Khóa hành vi bằng regression test

**Files:**
- Modify: `src/screens/HomePaymentSheet.test.mjs`

- [ ] **Step 1: Viết test failing cho card và action thủ quỹ**

Thêm test:

```js
test('treasurer can confirm own selected payable items directly', () => {
  const homeTopLevel = sliceBetween('export default function Home(', 'function PaymentManagementZone');
  const paymentSheetSource = sliceBetween('function PaymentSheet(', 'function treasurerProfileStatKey');

  assert.match(homeTopLevel, /onConfirmPayment=\{\(payload\) => onAction\?\.\(isTreasurer \? 'markMemberPaid' : 'confirmPaymentSent', payload\)\}/);
  assert.match(paymentSheetSource, /\{netBalance < 0 && \(/);
  assert.match(paymentSheetSource, /caption=\{isTreasurer \? 'Khoản của thủ quỹ' : undefined\}/);
  assert.match(paymentSheetSource, /isTreasurer \? 'Xác nhận đã nộp' : 'Báo đã chuyển'/);
  assert.match(paymentSheetSource, /memberId: data\?\.memberId \|\| data\?\.currentMemberId/);
  assert.match(paymentSheetSource, /groupId: data\?\.currentGroupId/);
  assert.match(paymentSheetSource, /\{canShowQr && !isTreasurer && payForRows\.length > 0 && \(/);
});
```

- [ ] **Step 2: Chạy test và xác nhận RED**

Run:

```bash
node --test src/screens/HomePaymentSheet.test.mjs
```

Expected: FAIL vì payment card còn bị guard bởi `!isTreasurer`, action vẫn luôn là `confirmPaymentSent`, chưa có label/nút riêng cho thủ quỹ.

### Task 2: Mở self-payment cho thủ quỹ

**Files:**
- Modify: `src/screens/Home.jsx`
- Test: `src/screens/HomePaymentSheet.test.mjs`

- [ ] **Step 1: Chọn action xác nhận theo vai trò**

Đổi prop:

```jsx
onConfirmPayment={(payload) => onAction?.(isTreasurer ? 'markMemberPaid' : 'confirmPaymentSent', payload)}
```

- [ ] **Step 2: Bổ sung identity vào payload**

Trong `confirmPayment()` thêm:

```js
memberId: data?.memberId || data?.currentMemberId || '',
profileId: data?.profileId || data?.currentProfileId || '',
groupId: data?.currentGroupId || '',
```

Giữ nguyên `coveredSources` và `coveredItems`.

- [ ] **Step 3: Hiện card own-payment cho cả thủ quỹ**

Đổi guard:

```jsx
{netBalance < 0 && (
```

Truyền caption:

```jsx
caption={isTreasurer ? 'Khoản của thủ quỹ' : undefined}
```

Đổi nút:

```jsx
{savingAction === 'confirmPayment'
  ? 'Đang xử lý…'
  : !isTreasurer && data?.pendingSettlementCheckpoint
    ? 'Chờ duyệt'
    : paymentConfirmed
      ? 'Đã thanh toán'
      : isTreasurer
        ? 'Xác nhận đã nộp'
        : 'Báo đã chuyển'}
```

Chỉ khóa theo checkpoint cho member:

```js
const paymentConfirmationDisabled = savingAction === 'confirmPayment'
  || paymentConfirmed
  || amountToPay <= 0
  || (!isTreasurer && Boolean(data?.pendingSettlementCheckpoint));
```

- [ ] **Step 4: Không hiện thanh toán hộ trong card cá nhân thủ quỹ**

Đổi guard:

```jsx
{canShowQr && !isTreasurer && payForRows.length > 0 && (
```

- [ ] **Step 5: Chạy test và xác nhận GREEN**

Run:

```bash
node --test src/screens/HomePaymentSheet.test.mjs
```

Expected: toàn bộ test pass.

### Task 3: Regression và UI verification

**Files:**
- Verify only

- [ ] **Step 1: Chạy node test suite**

```bash
npm run test:node
```

Expected: toàn bộ test pass, member pending flow không đổi.

- [ ] **Step 2: Chạy build**

```bash
npm run build
```

Expected: Vite build thành công.

- [ ] **Step 3: Browser verify**

Mở `http://localhost:5173/` bằng tài khoản thủ quỹ:

1. Mở sheet `Thanh toán`.
2. Card `Khoản của thủ quỹ` nằm trên dashboard nếu thủ quỹ còn payable item âm.
3. Bỏ/chọn item làm tổng tiền đổi đúng.
4. Bấm `Xác nhận đã nộp`.
5. Sau refresh, item đã cover không còn outstanding.
6. Không xuất hiện notification chờ tự duyệt.
7. Danh sách cần thu bên dưới không có row thủ quỹ.

- [ ] **Step 4: Kiểm tra blast radius**

```bash
npx gitnexus detect-changes -r Spliteasy-boss
```

Expected: chỉ `Home`, `PaymentSheet` và test liên quan; không đổi store, RPC hoặc schema.

- [ ] **Step 5: Commit file cụ thể**

```bash
git add src/screens/Home.jsx src/screens/HomePaymentSheet.test.mjs docs/superpowers/plans/2026-07-12-treasurer-self-payment.md
git commit -m "feat: let treasurer confirm own payment"
```
