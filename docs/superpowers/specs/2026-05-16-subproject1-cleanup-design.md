# Sub-project 1 — App Cleanup Design Spec

**Ngày:** 2026-05-16  
**Scope:** Dọn sạch app để dùng thật — không cần backend  
**Stack:** React (JSX) + CDN, không có bundler, global scope  

---

## Goal

Đưa SpliteasyBoss từ trạng thái "prototype với mock data" sang "app thật với data trống" — người dùng mới mở ra không thấy data của người khác, mọi flow chính hoạt động đúng, không có nút giả.

---

## Architecture

Không thêm backend. Sửa trực tiếp trong 6 files:
- `src/data.jsx` — xóa mock data, giữ cấu trúc
- `src/store.jsx` — initialState trống + version bump + action SET_CURRENT_USER mới
- `src/app.jsx` — thay ScreenSelectUser bằng ScreenEnterName
- `src/screen-home.jsx` — scroll indicators, ẩn nút giả
- `src/screen-groups.jsx` — fix groupBalance custom split
- `src/screen-profile.jsx` — fix isMe label, thêm logout, ẩn nút giả

---

## Phần 1 — User Identity (Placeholder Auth)

**File:** `src/app.jsx`

Thay `ScreenSelectUser` bằng component `ScreenEnterName`:

```jsx
function ScreenEnterName() {
  const { dispatch } = useApp();
  const [name, setName] = React.useState('');

  function handleStart() {
    if (!name.trim()) return;
    const userId = 'u_' + Math.random().toString(36).slice(2, 10);
    dispatch({ type: 'SET_CURRENT_USER', userId, userName: name.trim() });
  }

  return (
    <div style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', background: 'var(--surface-2)',
    }}>
      {/* Logo / Icon */}
      <div style={{
        width: 72, height: 72, borderRadius: 24, marginBottom: 20,
        background: 'var(--brand-soft)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="split" size={36} color="var(--brand-1)"/>
      </div>

      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
        SpliteasyBoss
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 32, textAlign: 'center' }}>
        Chia tiền nhóm dễ dàng
      </div>

      <div style={{ width: '100%', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
          Tên của bạn
        </div>
        <input
          type="text"
          placeholder="VD: Nguyễn Văn A"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleStart()}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 14px', borderRadius: 12,
            border: '1.5px solid var(--border-1)',
            fontSize: 15, fontWeight: 500,
            background: 'var(--surface-1)', color: 'var(--text-1)',
            outline: 'none',
          }}
          autoFocus
        />
      </div>

      <button
        onClick={handleStart}
        disabled={!name.trim()}
        style={{
          width: '100%', height: 48, borderRadius: 14, border: 0,
          background: name.trim() ? 'var(--brand-1)' : 'var(--border-1)',
          color: name.trim() ? '#fff' : 'var(--text-3)',
          fontSize: 15, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'default',
          transition: 'background .2s',
        }}
      >
        Bắt đầu →
      </button>

      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 20, textAlign: 'center' }}>
        Tài khoản đầy đủ sẽ có ở phiên bản tiếp theo
      </div>
    </div>
  );
}
```

**Điều kiện hiển thị:** Trong `App()`, kiểm tra `state.currentUserId === null` → render `ScreenEnterName` thay vì `ScreenSelectUser`.

---

## Phần 2 — Data Cleanup

### 2a. `src/data.jsx`

**Xóa hoàn toàn:**
- `const MEMBERS = [...]` — toàn bộ array thành viên mock
- `const GROUPS = [...]` — toàn bộ nhóm mock với expenses, settlements
- `const PICKLE = {...}` — toàn bộ dữ liệu pickleball mock
- `const NOTIFICATIONS = [...]` — toàn bộ thông báo mock

**Giữ lại:**
- `const CATEGORIES` — danh sách loại chi tiêu
- `const EMOJI_MAP` — emoji cho từng loại
- Các helper functions như `fmtVND`, `genId`, v.v. nếu có trong file này

### 2b. `src/store.jsx`

**Version bump** để reset localStorage cũ:
```js
const STORAGE_KEY = 'spliteasy_v3_state'; // đổi từ v2 → v3
```

**initialState trống:**
```js
const initialState = {
  currentUserId: null,
  currentUserName: null,
  groups: [],
  pickle: null,
  notifications: [],
};
```

**Thêm action `SET_CURRENT_USER`:**
```js
case 'SET_CURRENT_USER':
  return {
    ...state,
    currentUserId: action.userId,
    currentUserName: action.userName,
  };

case 'LOGOUT':
  return { ...initialState };
```

**Xóa action `SET_CURRENT_USER` cũ** (cái chỉ nhận `userId` từ MEMBERS list) — thay bằng action mới nhận cả `userId` lẫn `userName`.

---

## Phần 3 — Bug Fixes

### 3a. Fix nhãn "Bạn" (`src/screen-groups.jsx` + các screen khác)

**Xóa hoàn toàn** field `isMe` khỏi mọi chỗ dùng. Thay bằng so sánh dynamic — khai báo local ở đầu mỗi component cần dùng:

```js
const meId = state.currentUserId;
const isMe = (memberId) => memberId === meId;
// Dùng: isMe(m.id) thay vì m.isMe
```

Áp dụng trong các file:
- `src/screen-groups.jsx` — `GroupBalance`, `ActivityRow`, `ScreenAddExpense`
- `src/screen-home.jsx` — phần "Hay chia tiền cùng", balance summary
- `src/screen-profile.jsx` — hiển thị tên user hiện tại dùng `state.currentUserName`

### 3b. Fix `groupBalance` tính đúng Custom Split (`src/screen-groups.jsx`)

Tìm hàm `groupBalance` (hoặc `groupNet`). Hiện tại tính chia đều cho mọi expense. Sửa để đọc `splits[]` khi có:

```js
function getShareForMember(expense, memberId) {
  // Nếu có custom splits → dùng splits
  if (expense.splits && expense.splits.length > 0) {
    const split = expense.splits.find(s => s.memberId === memberId);
    return split ? split.amount : 0;
  }
  // Fallback: chia đều
  if (!expense.participants.includes(memberId)) return 0;
  return Math.round(expense.amount / expense.participants.length);
}
```

Dùng `getShareForMember(expense, memberId)` thay cho mọi chỗ tính `expense.amount / participants.length`.

### 3c. Ẩn / thay thế nút giả

| Nút | Vị trí | Xử lý |
|-----|--------|--------|
| "Nhắc" trong balance list | `GroupBalance` | Ẩn hoàn toàn (`display: none`) |
| "Nhắc qua Zalo" | `screen-profile.jsx` Settings | Thay bằng row disabled + badge "Sắp ra mắt" |
| "Tiền tệ" | `screen-profile.jsx` Settings | Thay bằng row disabled + badge "Sắp ra mắt" |
| "Thống kê" quick action | `screen-home.jsx` | Ẩn khỏi danh sách quick actions |

Badge "Sắp ra mắt":
```jsx
<span style={{
  fontSize: 10, fontWeight: 700, padding: '2px 7px',
  borderRadius: 20, background: 'var(--vb-warn-100)',
  color: '#B45309',
}}>Sắp ra mắt</span>
```

---

## Phần 4 — UI Polish

### 4a. Scroll Fade Indicator (4 chỗ)

Wrapper component `HScroll` thêm vào **`src/components.jsx`** (cuối file) — dùng CSS mask để tạo hiệu ứng mờ dần bên phải, không chặn scroll/touch:

```jsx
function HScroll({ children, style }) {
  return (
    <div style={{
      position: 'relative',
      ...style,
    }}>
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto',
        scrollbarWidth: 'none', // ẩn scrollbar Firefox
        WebkitOverflowScrolling: 'touch',
        paddingRight: 32, // space trước gradient
        WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
        maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
      }}>
        {children}
      </div>
    </div>
  );
}
```

Áp dụng cho 4 khu vực:
1. Quick actions row — `screen-home.jsx`
2. Phân loại chips — `screen-groups.jsx` (trong Add Expense)
3. "Hay chia tiền cùng" cards — `screen-home.jsx`
4. "AI nợ ai" balance cards — `screen-home.jsx`

### 4b. Nút Đăng xuất

Thêm vào cuối trang Settings trong `screen-profile.jsx`:

```jsx
{/* Logout */}
<div style={{ padding: '8px 16px 32px' }}>
  <button
    onClick={() => {
      if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
        dispatch({ type: 'LOGOUT' });
      }
    }}
    style={{
      width: '100%', height: 48, borderRadius: 14, border: 0,
      background: 'var(--vb-danger-50)', color: 'var(--vb-danger-700)',
      fontSize: 15, fontWeight: 700, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}
  >
    <Icon name="log-out" size={18} color="var(--vb-danger-700)"/>
    Đăng xuất
  </button>
</div>
```

Action `LOGOUT` reset về `initialState` → app render `ScreenEnterName`.

---

## Tóm tắt Files

| File | Thay đổi | Ước lượng |
|------|----------|-----------|
| `src/data.jsx` | Xóa tất cả mock data | Nhỏ |
| `src/store.jsx` | initialState trống, version bump, action mới | Nhỏ |
| `src/app.jsx` | ScreenEnterName thay ScreenSelectUser | Trung bình |
| `src/screen-home.jsx` | HScroll wrapper, ẩn Thống kê | Nhỏ |
| `src/screen-groups.jsx` | Fix groupBalance, HScroll cho phân loại | Trung bình |
| `src/screen-profile.jsx` | Fix isMe, logout button, ẩn nút giả | Trung bình |
