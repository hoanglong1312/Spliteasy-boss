# B1 — Realtime Sync + Toast Design

## Goal

Khi thành viên khác thêm/sửa/xóa chi tiêu, các client đang mở app tự động cập nhật dữ liệu và hiển thị toast thông báo — không cần F5.

## Architecture

Supabase Realtime channel subscribe bảng `expenses`. Khi nhận event từ người khác → refetch expenses + hiển thị toast. Toast state nằm trong store để mọi screen đều có thể trigger nếu cần sau này.

## Components

### 1. Realtime Channel (`src/store.jsx`)

Khởi tạo channel sau khi user login thành công (có `currentUserId`). Unmount khi logout.

```
channel = supabase
  .channel('expenses-realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, handler)
  .subscribe()
```

**Handler logic:**
```
if (payload.new?.created_by !== currentUserId && payload.old?.created_by !== currentUserId):
  → fetchExpenses()  // refetch toàn bộ
  → dispatch SHOW_TOAST với message phù hợp
```

Message theo event type:
- INSERT: `"[Tên thành viên] vừa thêm chi tiêu mới"`
- UPDATE: `"Chi tiêu vừa được cập nhật"`
- DELETE: `"Một chi tiêu đã bị xóa"`

Resolve tên: lookup `state.members` bằng `payload.new.created_by`.

### 2. Toast State (`src/store.jsx`)

Thêm vào store state:
```js
toast: { visible: false, message: '' }
```

Actions:
- `SHOW_TOAST`: set `visible: true`, `message`, tự dispatch `HIDE_TOAST` sau 3000ms
- `HIDE_TOAST`: set `visible: false`

### 3. Toast Component (`src/app-v2.jsx`)

Render overlay fixed bottom, z-index cao, xuất hiện khi `state.toast.visible`.

```
position: fixed, bottom: 80px, left: 50%, transform: translateX(-50%)
background: #1e293b, text: #f8fafc, padding: 12px 20px, border-radius: 8px
fade-in/fade-out via CSS transition opacity
```

Không cần lib animation — CSS transition đủ.

## Constraints

- **Không toast cho action của chính mình**: check `created_by !== currentUserId`
- **Channel lifecycle**: subscribe sau login, unsubscribe khi logout (`sessionStorage` PIN cleared)
- **Reconnect**: Supabase client tự handle — không cần logic thủ công
- **Chỉ expenses**: members và sessions ít thay đổi, không subscribe để tránh noise

## Out of Scope

- Push notifications (B2 — chưa làm)
- Realtime cho members hoặc sessions
- Toast queue (nếu nhiều event liên tiếp, chỉ show cái mới nhất)
