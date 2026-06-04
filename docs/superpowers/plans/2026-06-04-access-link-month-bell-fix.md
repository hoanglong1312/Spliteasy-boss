# Access Link Month Context + Bell Notification Scope Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khi thủ quỹ tạo link cá nhân, link ghi nhớ tháng đang xem; member mở link sẽ vào đúng tháng đó và thấy toast thông báo. Đồng thời fix bell chỉ hiện notifications của chính member, không leak sang người khác.

**Architecture:** Task 1 là SQL migration fix RLS + function — Codex viết file, Claude apply qua MCP. Task 2 là frontend-only thay đổi duy nhất `src/app-v2.jsx` — thêm URL param `&month=YYYY-MM` khi tạo link, đọc param khi load app, set month sau login.

**Tech Stack:** React, Supabase (PostgreSQL, RLS), `SHOW_TOAST` / `SET_SELECTED_MONTH` dispatch actions đã có sẵn.

---

## File Structure

| File | Thay đổi |
|------|----------|
| `supabase/migrations/20260604000008_fix_notification_scope.sql` | **Tạo mới** — fix `list_visible_notifications` + RLS policy `notifications_select` |
| `src/app-v2.jsx` | **Sửa** — thêm `monthFromLocation()`, `linkedMonth` state, set month sau login, toast, append `&month=` vào URL |

---

## Task 1: Fix Bell Notification Scope Leak

**Files:**
- Create: `supabase/migrations/20260604000008_fix_notification_scope.sql`
- ⚠️ Apply migration: **Claude làm** bằng `mcp__supabase__apply_migration` sau khi file được tạo

**Bug:** Condition `(type = 'payment_submitted' AND is_active_member_session())` cho mọi member active thấy tất cả payment notifications của người khác.

**Fix:** Đổi thành `actor_member_id = get_current_member_id()` — chỉ thấy payment mà chính mình gửi.

- [ ] **Step 1: Tạo migration file**

Tạo `supabase/migrations/20260604000008_fix_notification_scope.sql`:

```sql
-- Fix: notifications scope leak — regular members saw all payment_submitted notifications
-- Change: condition 3 from is_active_member_session() to actor_member_id = get_current_member_id()
-- Result: members only see their own submitted payments; treasurers see all (via is_payment_notification_reviewer)

CREATE OR REPLACE FUNCTION public.list_visible_notifications()
RETURNS SETOF public.notifications
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT notification.*
  FROM public.notifications notification
  WHERE public.is_same_profile_member(notification.member_id)
    OR public.is_payment_notification_reviewer(notification.type)
    OR (notification.type = 'payment_submitted' AND notification.actor_member_id = public.get_current_member_id())
  ORDER BY notification.created_at DESC;
$$;

DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select
  ON public.notifications FOR SELECT
  USING (
    public.is_same_profile_member(member_id)
    OR public.is_payment_notification_reviewer(type)
    OR (type = 'payment_submitted' AND actor_member_id = public.get_current_member_id())
  );
```

- [ ] **Step 2: Commit file**

```bash
git add supabase/migrations/20260604000008_fix_notification_scope.sql
git commit -m "fix: bell notification scope — member chỉ thấy payment của chính họ"
```

- [ ] **Step 3: Báo Claude apply migration**

Codex không apply được migration (no MCP). Báo Claude: "Apply migration `20260604000008_fix_notification_scope.sql`".

---

## Task 2: Access Link Month Context (Frontend)

**Files:**
- Modify: `src/app-v2.jsx`

Toàn bộ thay đổi trong 1 file. Không sửa screens — handler đọc `state.selectedYearMonth` trực tiếp.

### Bước 2a — Thêm `monthFromLocation()` helper + `linkedMonth` state

- [ ] **Step 1: Thêm helper function sau `joinCodeFromLocation()` (line ~120)**

Tìm đoạn:
```js
function joinCodeFromLocation() {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search || '')
  return (params.get('join') || '').trim().toUpperCase()
}
```

Thêm ngay SAU đoạn đó:
```js
function monthFromLocation() {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search || '')
  const m = params.get('month') || ''
  return /^\d{4}-\d{2}$/.test(m) ? m : ''
}
```

- [ ] **Step 2: Thêm `linkedMonth` state trong AppV2 sau `groupJoinCode` (line ~127)**

Tìm đoạn:
```js
const [groupJoinCode] = useState(() => joinCodeFromLocation())
```

Thêm ngay SAU dòng đó:
```js
const [linkedMonth] = useState(() => monthFromLocation())
```

### Bước 2b — Set month + toast sau login trong `consumeAccessLink`

- [ ] **Step 3: Sửa `consumeAccessLink` trong `useEffect` (line ~229-240)**

Tìm đoạn:
```js
      await dispatch({
        type: 'LOGIN',
        token: data.authToken,
        memberId: data.memberId,
        groupId: data.groupId,
        memberName: data.memberName,
        purpose: data.purpose,
      })
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname)
      }
      setAccessLinkLoading(false)
```

Thay bằng:
```js
      await dispatch({
        type: 'LOGIN',
        token: data.authToken,
        memberId: data.memberId,
        groupId: data.groupId,
        memberName: data.memberName,
        purpose: data.purpose,
      })
      if (linkedMonth) {
        await dispatch({ type: 'SET_SELECTED_MONTH', selectedYearMonth: linkedMonth })
        if (linkedMonth !== monthKey(new Date())) {
          const [lYear, lMonth] = linkedMonth.split('-')
          dispatch({ type: 'SHOW_TOAST', message: `Link dẫn đến tháng ${Number(lMonth)}/${lYear} · Xem số tiền cần thanh toán` })
        }
      }
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname)
      }
      setAccessLinkLoading(false)
```

### Bước 2c — Set month + toast trong `openPersonalLinkHome`

- [ ] **Step 4: Sửa `openPersonalLinkHome` (line ~294-310)**

Tìm đoạn:
```js
    await dispatch({
      type: 'LOGIN',
      token: data.authToken,
      memberId: data.memberId,
      groupId: data.groupId,
      memberName: data.memberName,
      purpose: data.purpose,
    })
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname)
    }
    setPublicBillToken('')
```

Thay bằng:
```js
    await dispatch({
      type: 'LOGIN',
      token: data.authToken,
      memberId: data.memberId,
      groupId: data.groupId,
      memberName: data.memberName,
      purpose: data.purpose,
    })
    if (linkedMonth) {
      await dispatch({ type: 'SET_SELECTED_MONTH', selectedYearMonth: linkedMonth })
      if (linkedMonth !== monthKey(new Date())) {
        const [lYear, lMonth] = linkedMonth.split('-')
        dispatch({ type: 'SHOW_TOAST', message: `Link dẫn đến tháng ${Number(lMonth)}/${lYear} · Xem số tiền cần thanh toán` })
      }
    }
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname)
    }
    setPublicBillToken('')
```

### Bước 2d — Append `&month=` vào URL khi tạo link

- [ ] **Step 5: Sửa `createMemberBillShare` handler (line ~1342)**

Tìm đoạn:
```js
      const shareToken = data?.urlToken || data?.token || data
      const url = `${window.location.origin}${window.location.pathname}?access=${encodeURIComponent(shareToken)}`
```

Thay bằng:
```js
      const shareToken = data?.urlToken || data?.token || data
      const linkMonth = payload?.yearMonth || state.selectedYearMonth || monthKey(new Date())
      const url = `${window.location.origin}${window.location.pathname}?access=${encodeURIComponent(shareToken)}&month=${encodeURIComponent(linkMonth)}`
```

- [ ] **Step 6: Build để kiểm tra không có lỗi compile**

```bash
npm run build
```

Expected: build thành công, không có lỗi TypeScript/ESLint.

- [ ] **Step 7: Commit**

```bash
git add src/app-v2.jsx
git commit -m "feat: access link ghi nhớ tháng — navigate đúng tháng + toast khi mở link"
```

---

## Task 3: Claude Apply Migration (không phải Codex)

*Task này Claude main thực hiện, không giao Codex.*

- [ ] Claude dùng `mcp__supabase__apply_migration` với nội dung file `20260604000008_fix_notification_scope.sql`
- [ ] Verify bằng `mcp__supabase__execute_sql`:
  ```sql
  SELECT routine_name, routine_definition
  FROM information_schema.routines
  WHERE routine_name = 'list_visible_notifications';
  ```
  Expected: definition chứa `actor_member_id = public.get_current_member_id()`, không còn `is_active_member_session()`.

---

## Acceptance Criteria Checklist

**Access Link:**
- [ ] Thủ quỹ xem tháng 5 → tạo link → URL chứa `&month=2026-05`
- [ ] Member mở link → sau login → home hiển thị tháng 5
- [ ] Tháng trong link khác tháng hiện tại → toast "Link dẫn đến tháng 5/2026 · Xem số tiền cần thanh toán"
- [ ] Tháng trong link = tháng hiện tại → không toast
- [ ] `?month=` bị xóa khỏi URL sau login (replaceState đã xử lý)
- [ ] Người vào app không qua link → không bị ảnh hưởng (linkedMonth = '')

**Bell Notification:**
- [ ] Member thường KHÔNG thấy payment_submitted của người khác trong bell
- [ ] Member thấy payment_submitted của chính họ (status pending/confirmed/rejected)
- [ ] Thủ quỹ vẫn thấy tất cả payment_submitted
- [ ] Migration apply thành công, build pass
