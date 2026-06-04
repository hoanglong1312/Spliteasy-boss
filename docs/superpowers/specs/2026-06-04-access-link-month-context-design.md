# Spec: Access Link Month Context + Notification

**Date:** 2026-06-04  
**Status:** approved  

## Problem

Khi thủ quỹ tạo link cá nhân (access link) cho member trong tháng 5, member mở link sẽ thấy tháng 6 (tháng hiện tại) thay vì tháng 5. Member phải tự navigate về đúng tháng.

## Goal

1. Link tạo ra "ghi nhớ" tháng đang xem lúc tạo
2. Khi member mở link → app tự navigate đến đúng tháng đó
3. Nếu tháng trong link khác tháng hiện tại → show toast để member biết context

## Approach: URL param `&month=YYYY-MM`

Không cần DB migration. Toàn bộ thay đổi ở frontend.

---

## Thay Đổi Chi Tiết

### 1. Link Creation — append `&month=`

**File:** `src/app-v2.jsx`, handler `createMemberBillShare`

Hiện tại:
```js
const url = `${window.location.origin}${window.location.pathname}?access=${encodeURIComponent(shareToken)}`
```

Sau khi sửa:
```js
const yearMonth = payload?.yearMonth || state.selectedYearMonth || monthKey(new Date())
const url = `${window.location.origin}${window.location.pathname}?access=${encodeURIComponent(shareToken)}&month=${encodeURIComponent(yearMonth)}`
```

**Files gọi `createMemberBillShare`** — phải pass thêm `yearMonth`:

| File | Location | Change |
|------|----------|--------|
| `src/screens/Home.jsx` | `onAction?.('createMemberBillShare', { groupId, memberId, copy: false })` | Thêm `yearMonth` từ prop `data.monthLabel` → cần `data.yearMonth` |
| `src/screens/SettlementPeriod.jsx` | `onAction?.('createMemberBillShare', { groupId, memberId })` | Thêm `yearMonth` từ screen params/state |
| `src/screens/GroupDetail.jsx` | `onAction?.('createMemberBillShare', { groupId, memberId })` | Thêm `yearMonth` từ screen params/state |

`yearMonth` lấy từ `data.yearMonth` (cần expose trong screen data) hoặc `state.selectedYearMonth` trực tiếp trong handler (đơn giản hơn — handler đã có `state`).

→ **Chọn: handler tự lấy `state.selectedYearMonth`**, không cần screens truyền thêm. Screens không thay đổi.

### 2. Read `?month=` on App Load

**File:** `src/app-v2.jsx`

Cạnh `accessTokenFromLocation()` thêm:
```js
function monthFromLocation() {
  const params = new URLSearchParams(window.location.search)
  const m = params.get('month') || ''
  return /^\d{4}-\d{2}$/.test(m) ? m : ''
}
```

Khởi tạo state:
```js
const [linkedMonth] = useState(() => monthFromLocation())
```

### 3. Set Month Sau Khi Login via Access Link

**File:** `src/app-v2.jsx`, `consumeAccessLink()` (line ~218) và `openPersonalLinkHome()` (line ~287)

Sau khi `dispatch({ type: 'LOGIN', ... })` thành công, nếu `linkedMonth` có giá trị:
```js
if (linkedMonth) {
  await dispatch({ type: 'SET_SELECTED_MONTH', selectedYearMonth: linkedMonth })
}
```

`window.history.replaceState` đã có sẵn → URL bị clear (bao gồm `?month=`), state đã set → OK.

### 4. Toast Notification

Sau khi set month, nếu `linkedMonth` khác `monthKey(new Date())`:
```js
if (linkedMonth && linkedMonth !== monthKey(new Date())) {
  const [year, month] = linkedMonth.split('-')
  dispatch({ type: 'SHOW_TOAST', message: `Link dẫn đến tháng ${Number(month)}/${year} · Xem số tiền cần thanh toán` })
}
```

Toast dùng `SHOW_TOAST` có sẵn — không cần state mới.

---

## Files Thay Đổi

| File | Loại thay đổi |
|------|---------------|
| `src/app-v2.jsx` | Đọc `?month=` param, set month sau login, toast notification, append month vào URL |

Screens (`Home.jsx`, `SettlementPeriod.jsx`, `GroupDetail.jsx`) **không cần thay đổi** — handler tự lấy `state.selectedYearMonth`.

---

## Edge Cases

| Case | Xử lý |
|------|-------|
| `?month=` invalid / không có | `monthFromLocation()` trả `''` → không set, không toast |
| Link tạo lúc tháng hiện tại | `linkedMonth === monthKey(new Date())` → không toast (không cần thông báo) |
| Người dùng đã login (không qua access link) | `linkedMonth` rỗng → không ảnh hưởng |
| Link hết hạn (consume thất bại) | Không đến bước set month → không thay đổi |

---

## Bell Notification — Fix Scope Leak

**Bug:** Mọi member active đều thấy TẤT CẢ `payment_submitted` notifications (của người khác).

**Root cause** — `list_visible_notifications` + RLS policy, condition 3:
```sql
OR (notification.type = 'payment_submitted' AND public.is_active_member_session())
```
`is_active_member_session()` = true với mọi member đang login → leak.

**Fix:** Đổi thành `actor_member_id = get_current_member_id()`

```sql
-- list_visible_notifications
WHERE public.is_same_profile_member(notification.member_id)
    OR public.is_payment_notification_reviewer(notification.type)
    OR (notification.type = 'payment_submitted' AND notification.actor_member_id = public.get_current_member_id())

-- RLS policy notifications_select
USING (
    public.is_same_profile_member(member_id)
    OR public.is_payment_notification_reviewer(type)
    OR (type = 'payment_submitted' AND actor_member_id = public.get_current_member_id())
)
```

**Kết quả sau fix:**

| Ai | Thấy gì |
|---|---|
| Thủ quỹ | Tất cả payment_submitted (via `is_payment_notification_reviewer`) + notifications targeted at them |
| Member | Chỉ notifications targeted at them + payment_submitted mà **họ** gửi |

**File:** Tạo migration mới `supabase/migrations/20260604000008_fix_notification_scope.sql`  
**Apply:** Claude dùng `mcp__supabase__apply_migration` sau khi Codex viết file.

---

## Acceptance Criteria

- [ ] Thủ quỹ xem tháng 5 → tạo link → URL chứa `&month=2026-05`
- [ ] Member mở link → sau login → `selectedYearMonth` = `2026-05`
- [ ] Tháng 5 khác tháng hiện tại → toast hiện: "Link dẫn đến tháng 5/2026 · Xem số tiền cần thanh toán"
- [ ] Tháng trong link = tháng hiện tại → không toast
- [ ] `?month=` bị xóa khỏi URL sau login (replaceState đã có)
- [ ] Người vào app không qua link → không bị ảnh hưởng

### Bell Notification Fix
- [ ] Member thường KHÔNG thấy payment_submitted của người khác trong bell
- [ ] Member thấy payment_submitted của chính họ (status pending/confirmed/rejected)
- [ ] Thủ quỹ vẫn thấy tất cả payment_submitted
- [ ] Migration apply thành công, không regression các notification type khác
