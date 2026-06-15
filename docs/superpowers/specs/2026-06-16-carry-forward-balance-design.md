# Spec: Carry Forward Balance (Gộp Nợ Sang Tháng Sau)

**Date:** 2026-06-16  
**Status:** approved

## Bài Toán

Member đã thanh toán phần lớn tháng cũ. Sau đó phát sinh thêm giao dịch nhỏ → tháng cũ hiển thị "chưa trả" cho member đó. Thủ quỹ muốn defer khoản nhỏ này sang tháng sau thay vì đòi riêng, nhưng chỉ cho member đó (không phải tất cả).

## Data Model

### Bảng mới: `member_month_settlements`

```sql
id                   uuid PK DEFAULT gen_random_uuid()
member_id            uuid FK → members.id ON DELETE CASCADE
group_id             uuid FK → groups.id ON DELETE CASCADE
month                text NOT NULL   -- "2026-05" (YYYY-MM)
expense_id           uuid FK → expenses.id ON DELETE SET NULL  -- carry-forward expense được tạo
settled_by_member_id uuid FK → members.id
created_at           timestamptz DEFAULT now()

UNIQUE(member_id, month, group_id)   -- 1 member chỉ chốt 1 lần/tháng/nhóm
```

**RLS:**
- SELECT: mọi member trong group (`group_id` match group của member hiện tại)
- INSERT/DELETE: chỉ treasurer của group đó

## Flow Khi Thủ Quỹ Bấm "Gộp → T[next]"

1. Frontend gọi action `deferMonthBalance` với `{ memberId, profileId, month, amount, nextMonth, memberName, groupId }`
2. Store gọi RPC `defer_member_month_balance(p_member_id, p_group_id, p_month, p_amount, p_next_month_date, p_member_name, p_treasurer_member_id)`
3. RPC (SECURITY DEFINER, kiểm tra treasurer role):
   - INSERT `expenses`: `expense_date = p_next_month_date (first day)`, `paid_by_member_id = p_treasurer_member_id`, `title = 'Nợ chuyển từ tháng [X] · [member_name]'`, `split_method = 'custom'`, `status = 'approved'`, `group_id`
   - INSERT `expense_participants`: `(expense_id, p_member_id, p_amount)`
   - INSERT `member_month_settlements`: `(p_member_id, p_group_id, p_month, expense_id, p_treasurer_member_id)`
4. State reload expenses + settlements
5. `buildPrevMonthUnpaid` → kiểm tra settlements → nếu settled, return null

## Flow Undo

Thủ quỹ bấm "Hủy gộp" (chip "✓ Gộp T6" trên row):
1. Gọi action `undoDeferMonthBalance` với settlement record
2. RPC `undo_defer_member_month_balance(p_settlement_id)`:
   - DELETE expense (via `expense_id` trong settlement)
   - DELETE settlement
3. State reload → prev month notice xuất hiện lại

## UI

### TreasurerPaymentDashboard → Section "Đã nhận"

Mỗi `PaymentDashboardRow` trong `confirmedRecords`:
- Nếu `row.prevMonthResidual > 0` (member có prev month balance chưa settle):
  - Hiện button **"Gộp → T[next_month_label]"** (ví dụ "Gộp → T6")
  - Click → dispatch `deferMonthBalance` action
- Nếu đã settle (`row.prevMonthSettled === true`):
  - Hiện chip **"✓ Gộp T6"** (xanh, disabled) + button nhỏ "Hủy" để undo

### Member View (Home screen)

Không thay đổi. Prev month notice biến mất khi đã settle. Tháng sau member thấy expense "Nợ chuyển từ tháng 5 · [Tên]" trong danh sách chi tiêu bình thường.

## Changes Cần Thiết

### DB
- Migration: tạo `member_month_settlements` + RLS
- RPC: `defer_member_month_balance` + `undo_defer_member_month_balance`

### State (`store.jsx`)
- Load `month_settlements` khi fetch group data
- Actions: `deferMonthBalance`, `undoDeferMonthBalance`

### `useScreenData.js`
- `buildPaymentProgressRows`: thêm `prevMonthResidual` và `prevMonthSettled` per member row
  - `prevMonthResidual`: tính bằng cách chạy `buildPrevMonthUnpaid` logic cho từng profile
  - `prevMonthSettled`: check `state.monthSettlements` có entry cho member+prevMonth

### `buildPrevMonthUnpaid`
- Thêm check: nếu có settlement record cho (currentUserId, prevMonth) → return null

### `Home.jsx` — `TreasurerPaymentDashboard`
- Props mới: `monthSettlements`, `onDeferMonthBalance`, `onUndoDeferMonthBalance`
- "Đã nhận" rows: hiện button/chip dựa trên `prevMonthResidual` + `prevMonthSettled`

## Acceptance Criteria

- [ ] Thủ quỹ thấy button "Gộp → T6" trên member đã confirmed nhưng còn nợ tháng trước
- [ ] Sau khi bấm: prev month notice của member đó biến mất
- [ ] Tháng sau: expense "Nợ chuyển từ T5 · [Tên]" xuất hiện trong danh sách (chỉ charge member đó)
- [ ] Thủ quỹ có thể undo: bấm "Hủy" → notice xuất hiện lại, expense bị xóa
- [ ] Member khác không bị ảnh hưởng
- [ ] `npm test` pass, `npm run build` pass
