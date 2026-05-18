# Realtime Sync + Toast Notifications — Design Spec

**Ngày:** 2026-05-18
**Trạng thái:** Đã duyệt
**Phạm vi:** Supabase Realtime subscription + Toast notification system

---

## 1. Mục tiêu

Khi thành viên khác trong nhóm thêm chi tiêu, thủ quỹ duyệt/từ chối, hoặc ai đó thanh toán — app tự động cập nhật data trong nền và hiện toast cho các event quan trọng. Không cần refresh tay.

---

## 2. Architecture

3 thành phần mới:

| Thành phần | File | Việc làm |
|-----------|------|---------|
| Realtime subscription | `src/store.jsx` | Setup channel khi login, teardown khi logout/unmount |
| Toast system | `src/lib/toast.jsx` | Context + Provider + `useToast()` hook + `ToastContainer` component |
| Toast render | `src/app.jsx` | Mount `<ToastContainer>` một lần ở root |

Ngoài ra: enable Realtime trên 5 bảng trong Supabase dashboard.

---

## 3. Realtime Subscription

### Setup
Khi `currentGroupId` có giá trị (sau LOGIN hoặc refresh thành công), `AppProvider` tạo một Supabase channel:

```
channel name: group-${groupId}
subscribe:
  - table: expenses          filter: group_id=eq.${groupId}  events: INSERT, UPDATE
  - table: settlements       filter: group_id=eq.${groupId}  events: INSERT
  - table: pickle_sessions   filter: group_id=eq.${groupId}  events: INSERT, UPDATE
  - table: pickle_attendees  (no filter — session_id scoped)  events: INSERT, DELETE
  - table: expense_disputes  (no filter — expense scoped)     events: INSERT
```

### Debounce refresh
Mỗi event → `scheduleRefresh()`:
```js
const debounceRef = useRef(null)
function scheduleRefresh() {
  if (debounceRef.current) clearTimeout(debounceRef.current)
  debounceRef.current = setTimeout(() => refresh(), 600)
}
```
600ms window gộp burst events (thủ quỹ duyệt nhiều khoản liên tiếp) thành 1 lần `refresh()`.

### Toast logic
Event payload chứa `table`, `eventType`, `new` (row mới). Quyết định toast dựa trên:

| Table | EventType | Điều kiện | Toast |
|-------|-----------|-----------|-------|
| `expenses` | INSERT | `new.submitted_by_member_id !== currentUserId` && `currentUserRole !== 'treasurer'` | "**[tên]** vừa thêm chi tiêu **[title]**" — `info` |
| `expenses` | INSERT | `new.submitted_by_member_id !== currentUserId` && `currentUserRole === 'treasurer'` | "Có khoản mới chờ duyệt ⏳" — `warning` (ưu tiên hơn info khi là thủ quỹ) |
| `expenses` | UPDATE | `new.status === 'approved'` && `new.submitted_by_member_id === currentUserId` | "Chi tiêu **[title]** đã được duyệt ✅" — `success` |
| `expenses` | UPDATE | `new.status === 'declined'` && `new.submitted_by_member_id === currentUserId` | "Chi tiêu **[title]** bị từ chối ❌" — `warning` |
| `expense_disputes` | INSERT | `currentUserRole === 'treasurer'` | "Có sai sót cần xem ⚠️" — `warning` |
| `settlements` | INSERT | `new.to_member_id === currentUserId` | "**[tên]** đã thanh toán cho bạn 💸" — `success` |

Tên thành viên: lookup từ `state.members` bằng `member_id` từ payload.

**Quan trọng:** Toast chỉ hiện cho event từ người **khác** (không tự toast khi mình là người thực hiện action).

### Cleanup
```js
useEffect(() => {
  if (!currentGroupId || !tokenRef.current) return
  const channel = setupChannel(...)
  return () => { channel.unsubscribe() }
}, [currentGroupId])
```

### Supabase Realtime — bật trên dashboard
Vào Supabase dashboard → Database → Replication → enable Realtime cho:
- `expenses`
- `settlements`
- `pickle_sessions`
- `pickle_attendees`
- `expense_disputes`

---

## 4. Toast System

### `src/lib/toast.jsx`

```
ToastProvider (wrap toàn app)
  ├── state: toasts = [{ id, message, type, createdAt }]
  ├── addToast(message, type) — thêm toast, auto-remove sau 3000ms
  └── removeToast(id) — remove thủ công (bấm vào toast)

useToast() → { addToast }

ToastContainer
  ├── position: fixed, top: 16px, right: 16px, z-index: 9999
  ├── display: flex column, gap: 8px
  └── mỗi toast: slide-in từ phải, fade-out khi dismiss
```

### Toast types
| Type | Màu border-left | Dùng khi |
|------|----------------|---------|
| `info` | `var(--brand-1)` tím | Thông tin trung tính (ai thêm chi tiêu) |
| `success` | `#10B981` xanh | Tốt (duyệt, thanh toán) |
| `warning` | `#F59E0B` vàng | Cần chú ý (từ chối, sai sót, chờ duyệt) |

### Auto-dismiss
`setTimeout(removeToast, 3000)` set ngay khi `addToast()` được gọi. Bấm vào toast → dismiss ngay lập tức.

---

## 5. Tích hợp vào store.jsx

`AppProvider` nhận `addToast` từ `useToast()` — nhưng `store.jsx` là Context, không thể `useToast()` bên trong chính nó. Giải pháp: truyền `addToast` callback vào `AppProvider` như một prop, hoặc dùng pattern "callback ref".

**Cách sạch nhất:** `AppProvider` accept prop `onToast`:
```jsx
<ToastProvider>
  <AppProviderInner onToast={addToast}>
    {children}
  </AppProviderInner>
</ToastProvider>
```
Trong `app.jsx`:
```jsx
function AppWithToast() {
  const { addToast } = useToast()
  return <AppProvider onToast={addToast}>{...}</AppProvider>
}
```

---

## 6. Không làm (YAGNI)

- Không persist toasts vào localStorage
- Không có "notification center" / history
- Không retry subscription khi mất kết nối (Supabase tự handle reconnect)
- Không filter toast theo tab đang xem

---

## 7. Supabase Realtime setup note

Một số bảng (pickle_attendees, expense_disputes) không có `group_id` nên không filter được. Subscription vẫn hoạt động — Supabase trả toàn bộ event của bảng, nhưng vì RLS chặn row của group khác, chỉ nhận được event thuộc group mình.
