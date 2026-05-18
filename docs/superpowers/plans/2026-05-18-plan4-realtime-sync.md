# Realtime Sync + Toast Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App tự cập nhật data khi có thay đổi trong nhóm + hiện toast cho các event quan trọng.

**Architecture:** Toast system (`src/lib/toast.jsx`) độc lập với store. `AppProvider` nhận `onToast` callback prop, setup Supabase Realtime channel sau khi login. Dùng `stateRef` để tránh stale closure trong subscription callbacks. Debounce 600ms gộp burst events.

**Tech Stack:** React hooks, Supabase Realtime (postgres_changes), CSS transitions.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/toast.jsx` | Create | ToastProvider + useToast hook + ToastContainer component |
| `src/store.jsx` | Modify | Add `onToast` prop, stateRef, channelRef, debounceRef, Realtime subscription useEffect |
| `src/app.jsx` | Modify | Wrap với ToastProvider, tạo AppWithToast wrapper truyền addToast xuống AppProvider |

---

## Task 1: Toast system

**Files:**
- Create: `src/lib/toast.jsx`

- [ ] **Step 1: Create `src/lib/toast.jsx`**

```jsx
import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
    setToasts(ts => [...ts, { id, message, type }])
    setTimeout(() => removeToast(id), 3000)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}

const TYPE_COLOR = {
  info:    'var(--brand-1)',
  success: '#10B981',
  warning: '#F59E0B',
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null
  return (
    <div style={{
      position: 'fixed', top: 16, right: 16,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 9999, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onRemove(t.id)}
          style={{
            pointerEvents: 'auto',
            background: 'var(--surface-1, #fff)',
            borderLeft: `4px solid ${TYPE_COLOR[t.type] || TYPE_COLOR.info}`,
            borderRadius: 10,
            padding: '10px 14px',
            maxWidth: 280,
            fontSize: 13,
            color: 'var(--text-1, #111)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            animation: 'toast-in 0.2s ease',
          }}
        >
          {t.message}
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```
Expected: passes, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/toast.jsx
git commit -m "feat: add Toast system — ToastProvider + useToast + ToastContainer"
```

---

## Task 2: Wire ToastProvider + AppWithToast in app.jsx

**Files:**
- Modify: `src/app.jsx`

**Context:** Read `src/app.jsx` để tìm:
1. Chỗ import `AppProvider` từ `./store.jsx`
2. Nơi `<AppProvider>` được render (thường wrap toàn bộ app)
3. Cấu trúc root component (tên có thể là `App`, `Root`, hoặc component exported từ file)

- [ ] **Step 1: Read `src/app.jsx`** — xác định nơi `AppProvider` được render và root component structure.

- [ ] **Step 2: Add ToastProvider + AppWithToast wrapper**

Thêm import:
```js
import { ToastProvider, useToast } from './lib/toast.jsx'
```

Tìm chỗ `<AppProvider ...>` được render. Wrap nó như sau:

```jsx
// Thay thế chỗ render AppProvider bằng:
function AppWithToast() {
  const { addToast } = useToast()
  return <AppProvider onToast={addToast}>{/* existing children */}</AppProvider>
}

// Và ở root render:
<ToastProvider>
  <AppWithToast />
</ToastProvider>
```

Điều chỉnh theo cấu trúc thực tế của file — giữ nguyên mọi thứ khác, chỉ wrap thêm hai lớp này.

- [ ] **Step 3: Build check**

```bash
npm run build
```
Expected: passes. (AppProvider chưa có prop `onToast` nhưng React ignore unknown props — sẽ implement ở Task 3.)

- [ ] **Step 4: Commit**

```bash
git add src/app.jsx
git commit -m "feat: wrap app with ToastProvider + AppWithToast bridge"
```

---

## Task 3: Realtime subscription in store.jsx

**Files:**
- Modify: `src/store.jsx`

**Context:** Read `src/store.jsx` để xác định:
- Signature hiện tại của `AppProvider` (có thể là `export function AppProvider({ children })`)
- Danh sách imports từ React (cần thêm nếu thiếu: `useRef`)
- Nơi `tokenRef` được khai báo (để biết pattern ref đang dùng)
- Nơi `useEffect` login/refresh được gọi (để biết lifecycle)

- [ ] **Step 1: Read `src/store.jsx`**

- [ ] **Step 2: Thêm `onToast` prop và refs vào AppProvider**

Đổi signature:
```js
export function AppProvider({ children, onToast }) {
```

Thêm refs sau `tokenRef`:
```js
const channelRef  = useRef(null)
const debounceRef = useRef(null)
const stateRef    = useRef(state)
```

Thêm useEffect giữ `stateRef` luôn sync với state mới nhất (đặt ngay sau khai báo refs):
```js
useEffect(() => { stateRef.current = state })
```

- [ ] **Step 3: Thêm `scheduleRefresh` helper** (đặt trong AppProvider, sau phần khai báo refs)

```js
const scheduleRefresh = useCallback(() => {
  if (debounceRef.current) clearTimeout(debounceRef.current)
  debounceRef.current = setTimeout(() => refresh(), 600)
}, [refresh])
```

- [ ] **Step 4: Thêm Realtime subscription useEffect** (đặt sau useEffect refresh ban đầu)

```js
useEffect(() => {
  const groupId = stateRef.current.currentGroupId
  const token   = tokenRef.current
  if (!groupId || !token) return

  const sb      = createSupabase(token)
  const channel = sb.channel(`group-${groupId}`)

  // Helper lấy member name từ state (dùng ref để tránh stale closure)
  const getMemberName = (id) =>
    stateRef.current.members.find(m => m.id === id)?.name || 'Ai đó'
  const getMyRole = () =>
    stateRef.current.members.find(m => m.isMe)?.role

  channel
    // expenses INSERT
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'expenses',
      filter: `group_id=eq.${groupId}`,
    }, (payload) => {
      scheduleRefresh()
      const row = payload.new
      if (row.submitted_by_member_id === stateRef.current.currentUserId) return
      if (!onToast) return
      if (getMyRole() === 'treasurer') {
        onToast('Có khoản mới chờ duyệt ⏳', 'warning')
      } else {
        onToast(`${getMemberName(row.submitted_by_member_id)} vừa thêm chi tiêu ${row.title}`, 'info')
      }
    })
    // expenses UPDATE (duyệt / từ chối)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'expenses',
      filter: `group_id=eq.${groupId}`,
    }, (payload) => {
      scheduleRefresh()
      const row = payload.new
      if (row.submitted_by_member_id !== stateRef.current.currentUserId) return
      if (!onToast) return
      if (row.status === 'approved') {
        onToast(`Chi tiêu "${row.title}" đã được duyệt ✅`, 'success')
      } else if (row.status === 'declined') {
        onToast(`Chi tiêu "${row.title}" bị từ chối ❌`, 'warning')
      }
    })
    // settlements INSERT
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'settlements',
      filter: `group_id=eq.${groupId}`,
    }, (payload) => {
      scheduleRefresh()
      const row = payload.new
      if (row.to_member_id !== stateRef.current.currentUserId) return
      if (onToast) onToast(`${getMemberName(row.from_member_id)} đã thanh toán cho bạn 💸`, 'success')
    })
    // pickle_sessions
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'pickle_sessions',
      filter: `group_id=eq.${groupId}`,
    }, () => scheduleRefresh())
    // pickle_attendees (không có group_id filter — RLS tự scope)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'pickle_attendees',
    }, () => scheduleRefresh())
    // expense_disputes
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'expense_disputes',
    }, () => {
      scheduleRefresh()
      if (getMyRole() === 'treasurer' && onToast) {
        onToast('Có sai sót cần xem ⚠️', 'warning')
      }
    })
    .subscribe()

  channelRef.current = channel

  return () => {
    channel.unsubscribe()
    channelRef.current = null
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }
}, [state.currentGroupId, scheduleRefresh])
```

- [ ] **Step 5: Build check**

```bash
npm run build
```
Expected: passes, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/store.jsx
git commit -m "feat: add Supabase Realtime subscription + debounce refresh + toast events"
```

---

## Task 4: Enable Realtime on Supabase tables

**Files:** Supabase dashboard (manual step)

- [ ] **Step 1: Enable Realtime**

Vào Supabase dashboard → **Database** → **Replication** (hoặc **Table Editor** → chọn từng bảng → toggle Realtime):

Enable Realtime cho các bảng:
- `expenses`
- `settlements`
- `pickle_sessions`
- `pickle_attendees`
- `expense_disputes`

- [ ] **Step 2: Verify**

Mở app, mở thêm một tab trình duyệt khác cùng group. Trong tab 2, thêm một chi tiêu. Tab 1 phải tự cập nhật trong vòng ~1 giây và hiện toast (nếu role phù hợp).

- [ ] **Step 3: Commit note**

```bash
git commit --allow-empty -m "chore: note — Supabase Realtime enabled on expenses, settlements, pickle_sessions, pickle_attendees, expense_disputes"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|-----------------|------|
| Silent reload khi có thay đổi | Task 3 (scheduleRefresh + debounce) |
| Toast cho event ảnh hưởng đến mình | Task 3 (subscription callbacks) |
| Toast cho event cần action | Task 3 (treasurer conditions) |
| Subscribe all tables + debounce | Task 3 |
| Toast system (ToastProvider, useToast, ToastContainer) | Task 1 |
| Mount ToastContainer ở root | Task 2 |
| Cleanup khi logout/unmount | Task 3 (useEffect cleanup return) |
| Enable Realtime trên dashboard | Task 4 |

**Type consistency:**
- `addToast(message: string, type: 'info' \| 'success' \| 'warning')` — dùng nhất quán ở Task 1 và Task 3 ✅
- `onToast` prop truyền từ Task 2 → Task 3 ✅
- `stateRef.current.currentUserId` / `.members` / `.currentGroupId` — match với shape của `state` trong store.jsx ✅
