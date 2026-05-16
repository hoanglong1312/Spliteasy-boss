# Sub-project 1 — App Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dọn sạch SpliteasyBoss — xóa mock data, thêm màn hình nhập tên (placeholder auth), fix bugs balance + isMe, thêm HScroll indicators, thêm nút Đăng xuất.

**Architecture:** React 18 + Babel CDN, không bundler, global scope. Mọi component là global function. `useApp()` trả về `{ state, dispatch, genId }`. Không có test runner — verify bằng visual check trên browser.

**Tech Stack:** React CDN, CSS variables (var(--brand-1) etc.), localStorage persistence.

---

## File Structure

| File | Thay đổi |
|------|----------|
| `src/data.jsx` | Xóa MEMBERS/GROUPS/PICKLE/NOTIFICATIONS. Fix groupBalance custom split. |
| `src/store.jsx` | Version bump v3, initialState trống, UPDATE SET_CURRENT_USER, thêm LOGOUT |
| `src/app.jsx` | Thay ScreenSelectUser → ScreenEnterName |
| `src/components.jsx` | Thêm HScroll component + export |
| `src/screen-home.jsx` | Áp dụng HScroll cho 2 khu vực, xóa chip "Thống kê" |
| `src/screen-groups.jsx` | Áp dụng HScroll cho phân loại chips |
| `src/screen-profile.jsx` | Thêm logout button, badge "Sắp ra mắt", fix tên user |

---

## Task 1: Xóa Mock Data khỏi data.jsx

**Files:**
- Modify: `src/data.jsx`

- [ ] **Step 1: Đọc file để xác định vị trí cần xóa**

  Mở `src/data.jsx`. Xác định:
  - `const MEMBERS = [...]` — khoảng dòng 24–35
  - `const GROUPS = [...]` — array lớn với expenses, settlements
  - `const PICKLE = {...}` — object pickleball data
  - `const NOTIFICATIONS = [...]` — nếu có
  - `const ME = 'u1'` — constant user mặc định

- [ ] **Step 2: Thay MEMBERS thành array rỗng**

  Tìm dòng:
  ```js
  const MEMBERS = [
    { id: 'u1', name: 'Bạn', ... },
    ...
  ];
  ```
  Thay bằng:
  ```js
  const MEMBERS = []; // Cleared — users are now dynamic via state.members
  ```

- [ ] **Step 3: Xóa GROUPS, PICKLE, NOTIFICATIONS**

  Tìm và xóa toàn bộ:
  ```js
  const GROUPS = [...]; // xóa toàn bộ array lớn này
  const PICKLE = {...};  // xóa toàn bộ object này
  const NOTIFICATIONS = [...]; // xóa nếu có
  ```

  **Giữ lại tất cả:** fmtVND, fmtVNDFull, fmtDate, genId, splitEqual, groupBalance, groupNet, ME, MEMBERS (empty), CategoryIcon nếu có.

- [ ] **Step 4: Thay ME thành empty string**

  Tìm:
  ```js
  const ME = 'u1';
  ```
  Thay bằng:
  ```js
  const ME = ''; // fallback — not used after login
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/data.jsx
  git commit -m "chore: clear mock data — MEMBERS/GROUPS/PICKLE removed"
  ```

---

## Task 2: Fix groupBalance — Custom Split Support

**Files:**
- Modify: `src/data.jsx` (hàm groupBalance khoảng dòng 102–129)

Context: Hàm `groupBalance(g, me)` hiện tại luôn dùng `splitEqual()` để tính phần của mỗi người. Nếu expense có `splits: [{memberId, amount}]` thì phải dùng splits đó thay vì chia đều.

- [ ] **Step 1: Đọc hàm groupBalance hiện tại**

  Tìm trong `src/data.jsx`:
  ```js
  function groupBalance(g, me = ME) {
    const bal = {};
    g.members.forEach(id => { if (id !== me) bal[id] = 0; });
    for (const e of g.expenses) {
      if (!e.participants || e.participants.length === 0) continue;
      const splits = splitEqual(e.amount, e.participants);
      const share = Object.fromEntries(splits.map(s => [s.memberId, s.amount]));
      // ...
    }
  }
  ```

- [ ] **Step 2: Thêm helper getShareMap trước groupBalance**

  Thêm function này NGAY TRƯỚC `function groupBalance`:
  ```js
  // Trả về map { memberId: amount } cho một expense
  // Dùng expense.splits nếu có (custom split), không thì chia đều
  function getShareMap(e) {
    if (e.splits && e.splits.length > 0) {
      return Object.fromEntries(e.splits.map(s => [s.memberId, s.amount]));
    }
    const splits = splitEqual(e.amount, e.participants);
    return Object.fromEntries(splits.map(s => [s.memberId, s.amount]));
  }
  ```

- [ ] **Step 3: Cập nhật groupBalance dùng getShareMap**

  Trong vòng `for (const e of g.expenses)`, thay dòng:
  ```js
  const splits = splitEqual(e.amount, e.participants);
  const share = Object.fromEntries(splits.map(s => [s.memberId, s.amount]));
  ```
  Thành:
  ```js
  const share = getShareMap(e);
  ```

- [ ] **Step 4: Verify**

  Kiểm tra hàm sau khi sửa trông như sau:
  ```js
  function getShareMap(e) {
    if (e.splits && e.splits.length > 0) {
      return Object.fromEntries(e.splits.map(s => [s.memberId, s.amount]));
    }
    const splits = splitEqual(e.amount, e.participants);
    return Object.fromEntries(splits.map(s => [s.memberId, s.amount]));
  }

  function groupBalance(g, me = ME) {
    const bal = {};
    g.members.forEach(id => { if (id !== me) bal[id] = 0; });
    for (const e of g.expenses) {
      if (!e.participants || e.participants.length === 0) continue;
      const share = getShareMap(e); // <-- đã sửa
      if (e.paidBy === me) {
        for (const id of e.participants) {
          if (id !== me) bal[id] = (bal[id] || 0) + (share[id] || 0);
        }
      } else if (e.participants && e.participants.includes(me)) {
        if (g.members.includes(e.paidBy)) {
          bal[e.paidBy] = (bal[e.paidBy] || 0) - (share[me] || 0);
        }
      }
    }
    const settlements = g.settlements || [];
    for (const s of settlements) {
      if (s.fromId === me) {
        bal[s.toId] = (bal[s.toId] || 0) + s.amount;
      } else if (s.toId === me) {
        bal[s.fromId] = (bal[s.fromId] || 0) - s.amount;
      }
    }
    return bal;
  }
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/data.jsx
  git commit -m "fix: groupBalance uses custom splits when available"
  ```

---

## Task 3: Cập nhật store.jsx — Empty State + Actions Mới

**Files:**
- Modify: `src/store.jsx`

- [ ] **Step 1: Version bump STORAGE_KEY**

  Tìm dòng:
  ```js
  const STORAGE_KEY = 'spliteasy_v2_state';
  ```
  Thay bằng:
  ```js
  const STORAGE_KEY = 'spliteasy_v3_state';
  ```
  → localStorage cũ sẽ bị bỏ qua, app reset sạch.

- [ ] **Step 2: Thay buildInitialState() thành empty state**

  Tìm:
  ```js
  function buildInitialState() {
    return {
      currentUserId: null,
      members: MEMBERS,
      groups: GROUPS,
      pickle: PICKLE,
    };
  }
  ```
  Thay bằng:
  ```js
  function buildInitialState() {
    return {
      currentUserId: null,
      currentUserName: null,
      members: [],
      groups: [],
      pickle: null,
      notifications: [],
    };
  }
  ```

- [ ] **Step 3: Cập nhật action SET_CURRENT_USER**

  Tìm:
  ```js
  case 'SET_CURRENT_USER':
    return { ...state, currentUserId: action.userId };
  ```
  Thay bằng:
  ```js
  case 'SET_CURRENT_USER': {
    const shortName = action.userName.trim().split(' ').pop();
    const initials = action.userName.trim().split(' ')
      .map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const newMember = {
      id: action.userId,
      name: action.userName.trim(),
      short: shortName,
      initials,
      color: '#574EFA',
      isMe: true,
    };
    const alreadyExists = state.members.some(m => m.id === action.userId);
    return {
      ...state,
      currentUserId: action.userId,
      currentUserName: action.userName.trim(),
      members: alreadyExists ? state.members : [...state.members, newMember],
    };
  }
  ```

- [ ] **Step 4: Thêm action LOGOUT**

  Tìm phần `default:` trong switch của reducer. Thêm TRƯỚC nó:
  ```js
  case 'LOGOUT':
    return buildInitialState();
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/store.jsx
  git commit -m "feat: empty initialState, SET_CURRENT_USER with userName, add LOGOUT action"
  ```

---

## Task 4: Thêm ScreenEnterName vào app.jsx

**Files:**
- Modify: `src/app.jsx`

- [ ] **Step 1: Tìm ScreenSelectUser trong app.jsx**

  Tìm function bắt đầu bằng:
  ```js
  function ScreenSelectUser() {
  ```
  Nó kéo dài từ khoảng dòng 28 đến dòng 65.

- [ ] **Step 2: Thay toàn bộ ScreenSelectUser bằng ScreenEnterName**

  Xóa toàn bộ `function ScreenSelectUser() { ... }` và thay bằng:
  ```jsx
  function ScreenEnterName() {
    const { dispatch } = useApp();
    const [name, setName] = React.useState('');

    function handleStart() {
      const trimmed = name.trim();
      if (!trimmed) return;
      const userId = 'u_' + Math.random().toString(36).slice(2, 10);
      dispatch({ type: 'SET_CURRENT_USER', userId, userName: trimmed });
    }

    return (
      <div style={{
        minHeight: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', background: 'var(--surface-2)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 24, marginBottom: 20,
          background: 'var(--brand-soft)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="split" size={36} color="var(--brand-1)"/>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>
          SpliteasyBoss
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 36, textAlign: 'center' }}>
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
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 14px', borderRadius: 12,
              border: '1.5px solid var(--border-1)',
              fontSize: 15, fontWeight: 500,
              background: 'var(--surface-1)', color: 'var(--text-1)',
              outline: 'none', fontFamily: 'var(--vb-font-body)',
            }}
          />
        </div>
        <button
          onClick={handleStart}
          disabled={!name.trim()}
          style={{
            width: '100%', height: 48, borderRadius: 14, border: 0,
            background: name.trim() ? 'var(--brand-1)' : 'var(--border-1)',
            color: name.trim() ? '#fff' : 'var(--text-3)',
            fontSize: 15, fontWeight: 700,
            cursor: name.trim() ? 'pointer' : 'default',
            fontFamily: 'var(--vb-font-body)',
            transition: 'background .15s',
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

- [ ] **Step 3: Cập nhật điều kiện render**

  Tìm:
  ```jsx
  if (state.currentUserId === null) {
    return (
      <div style={{ ...themeVars, fontFamily: 'var(--vb-font-body)', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-2)', overflowY: 'auto' }}>
        <ScreenSelectUser/>
      </div>
    );
  }
  ```
  Thay `<ScreenSelectUser/>` thành `<ScreenEnterName/>`.

- [ ] **Step 4: Visual verify**

  Mở browser (trình duyệt) tại `http://localhost:5173`. Nếu localStorage cũ còn, clear nó bằng DevTools (F12 → Application → localStorage → Clear). Reload. Phải thấy màn hình "SpliteasyBoss — Tên của bạn". Nhập tên → bấm Bắt đầu → vào Home screen trống.

- [ ] **Step 5: Commit**

  ```bash
  git add src/app.jsx
  git commit -m "feat: replace ScreenSelectUser with ScreenEnterName (placeholder auth)"
  ```

---

## Task 5: Thêm HScroll Component vào components.jsx

**Files:**
- Modify: `src/components.jsx`

- [ ] **Step 1: Tìm cuối file components.jsx**

  Cuối file có:
  ```js
  Object.assign(window, {
    Icon, Avatar, AvatarStack, Money, Button, Card, Pill, SectionHeader,
    CategoryIcon, ScreenTransition, NavHeader, ListRow, EmptyState,
  });
  ```

- [ ] **Step 2: Thêm HScroll TRƯỚC Object.assign**

  Thêm function này ngay trước `Object.assign(window, {...})`:
  ```jsx
  // HScroll — horizontal scroll container với fade gradient ở cạnh phải
  // Không chặn scroll/touch — chỉ là visual indicator
  function HScroll({ children, style, gap = 8, pb = 4 }) {
    return (
      <div style={{
        overflowX: 'auto',
        display: 'flex',
        gap,
        paddingBottom: pb,
        scrollbarWidth: 'none',         // ẩn scrollbar Firefox
        msOverflowStyle: 'none',        // ẩn scrollbar IE
        WebkitOverflowScrolling: 'touch',
        WebkitMaskImage: 'linear-gradient(to right, black 88%, transparent 100%)',
        maskImage: 'linear-gradient(to right, black 88%, transparent 100%)',
        ...style,
      }}>
        {children}
      </div>
    );
  }
  ```

- [ ] **Step 3: Thêm HScroll vào Object.assign**

  Thay:
  ```js
  Object.assign(window, {
    Icon, Avatar, AvatarStack, Money, Button, Card, Pill, SectionHeader,
    CategoryIcon, ScreenTransition, NavHeader, ListRow, EmptyState,
  });
  ```
  Thành:
  ```js
  Object.assign(window, {
    Icon, Avatar, AvatarStack, Money, Button, Card, Pill, SectionHeader,
    CategoryIcon, ScreenTransition, NavHeader, ListRow, EmptyState, HScroll,
  });
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/components.jsx
  git commit -m "feat: add HScroll component with fade gradient indicator"
  ```

---

## Task 6: Áp dụng HScroll trong screen-home.jsx

**Files:**
- Modify: `src/screen-home.jsx`

- [ ] **Step 1: Tìm quick actions row**

  Tìm đoạn (khoảng dòng 168):
  ```jsx
  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 4px', marginLeft: -4, marginRight: -4 }}>
    {[
      { label: 'Chia đều', icon: 'split' },
      { label: 'Thanh toán', icon: 'card' },
      { label: 'Nhắc nợ', icon: 'send' },
      { label: 'Pickleball', icon: 'pickle', onClick: () => switchTab('pickle') },
      { label: 'Thống kê', icon: 'sparkle', onClick: () => switchTab('me') },
    ].map((q, i) => (
  ```

- [ ] **Step 2: Thay bằng HScroll + bỏ chip Thống kê**

  Thay toàn bộ div đó (từ `<div style={{ display: 'flex', gap: 8, overflowX: 'auto'...` đến closing `</div>`) bằng:
  ```jsx
  <HScroll style={{ padding: '0 4px', marginLeft: -4, marginRight: -4 }}>
    {[
      { label: 'Chia đều',  icon: 'split',  onClick: () => push('add-expense') },
      { label: 'Thanh toán', icon: 'card',  onClick: null },
      { label: 'Nhắc nợ',   icon: 'send',  onClick: null },
      { label: 'Pickleball', icon: 'pickle', onClick: () => switchTab('pickle') },
    ].map((q, i) => (
      <button key={i} onClick={q.onClick || undefined} style={{
        appearance: 'none', flexShrink: 0,
        padding: '10px 14px', height: 40,
        background: 'var(--surface-1)', border: '1px solid var(--border-1)',
        borderRadius: 'var(--vb-radius-pill)',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--vb-font-body)', fontWeight: 600, fontSize: 13,
        color: 'var(--text-1)', cursor: q.onClick ? 'pointer' : 'default',
        opacity: q.onClick ? 1 : 0.5,
      }}>
        <Icon name={q.icon} size={16} color="var(--brand-1)"/>{q.label}
      </button>
    ))}
  </HScroll>
  ```

- [ ] **Step 3: Tìm "Ai nợ ai" cards và wrap với HScroll**

  Tìm trong `WhoOwesView` function (khoảng dòng 362):
  ```jsx
  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, marginLeft: -16, marginRight: -16, padding: '4px 16px 8px' }}>
      {ranked.map(([id, v]) => {
  ```
  Thay `<div style={{ display: 'flex', gap: 10, overflowX: 'auto', ...` thành:
  ```jsx
  return (
    <HScroll gap={10} pb={8} style={{ marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16, paddingTop: 4 }}>
      {ranked.map(([id, v]) => {
  ```
  Và đổi closing `</div>` thành `</HScroll>`.

- [ ] **Step 4: Tìm "Hay chia tiền cùng" nếu có và wrap tương tự**

  Tìm section `hay chia tiền cùng` hoặc `frequent`. Nếu có div với `overflowX: 'auto'`, wrap tương tự bằng `<HScroll>`.

- [ ] **Step 5: Commit**

  ```bash
  git add src/screen-home.jsx
  git commit -m "feat: apply HScroll to quick actions and balance cards; remove Thống kê chip"
  ```

---

## Task 7: Áp dụng HScroll cho Phân loại trong screen-groups.jsx

**Files:**
- Modify: `src/screen-groups.jsx`

- [ ] **Step 1: Tìm phân loại chips trong ScreenAddExpense**

  Tìm (khoảng dòng 531):
  ```jsx
  <FormRow label="Phân loại" icon="filter">
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
      {[
        { id: 'food', label: 'Ăn uống' },
        ...
      ].map(c => (
  ```

- [ ] **Step 2: Thay div bằng HScroll**

  Thay `<div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>` thành `<HScroll>` và closing `</div>` thành `</HScroll>`.

  Kết quả:
  ```jsx
  <FormRow label="Phân loại" icon="filter">
    <HScroll>
      {[
        { id: 'food', label: 'Ăn uống' },
        { id: 'drink', label: 'Đồ uống' },
        { id: 'travel', label: 'Đi lại' },
        { id: 'gift', label: 'Quà tặng' },
      ].map(c => (
        <button key={c.id} onClick={() => setCat(c.id)} style={{
          appearance: 'none', cursor: 'pointer', flexShrink: 0,
          height: 36, padding: '0 12px',
          background: cat === c.id ? 'var(--brand-soft)' : 'var(--surface-1)',
          border: '1px solid ' + (cat === c.id ? 'var(--brand-1)' : 'var(--border-1)'),
          borderRadius: 'var(--vb-radius-pill)', fontWeight: 600, fontSize: 13,
          color: cat === c.id ? 'var(--brand-1)' : 'var(--text-1)',
          display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
        }}><CategoryIcon cat={c.id} size={20}/>{c.label}</button>
      ))}
    </HScroll>
  </FormRow>
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/screen-groups.jsx
  git commit -m "feat: wrap phân loại chips with HScroll in ScreenAddExpense"
  ```

---

## Task 8: Fix screen-profile.jsx — Logout + Badge + Tên user

**Files:**
- Modify: `src/screen-profile.jsx`

- [ ] **Step 1: Tìm header profile để hiển thị tên đúng**

  Tìm chỗ hiển thị tên người dùng trong profile header. Hiện tại có thể đang dùng `MEMBERS[0].name` hoặc hardcode. Tìm và thay bằng:
  ```jsx
  const { state, dispatch } = useApp();
  const userName = state.currentUserName || 'Bạn';
  const userId = state.currentUserId;
  ```
  Dùng `userName` để hiển thị tên.

- [ ] **Step 2: Tìm ScreenSettings và thay nút giả bằng badge**

  Tìm (khoảng dòng 178–180):
  ```jsx
  <ListRow left={<MenuIcon name="card" bg="var(--vb-success-100)" c="var(--vb-success-700)"/>} title="Tiền tệ" subtitle="VND" right={<Icon name="chevron-right" size={18} color="var(--text-3)"/>}/>
  <ListRow left={<MenuIcon name="bell" bg="#FFF7E0" c="#A05C0C"/>} title="Nhắc qua Zalo" subtitle="Đang bật" right={<Icon name="chevron-right" size={18} color="var(--text-3)"/>} divider={false}/>
  ```
  Thay bằng:
  ```jsx
  <ListRow
    left={<MenuIcon name="card" bg="var(--vb-success-100)" c="var(--vb-success-700)"/>}
    title="Tiền tệ"
    subtitle="VND"
    right={<span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--vb-warn-100)', color: '#B45309' }}>Sắp ra mắt</span>}
  />
  <ListRow
    left={<MenuIcon name="bell" bg="#FFF7E0" c="#A05C0C"/>}
    title="Nhắc qua Zalo"
    right={<span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--vb-warn-100)', color: '#B45309' }}>Sắp ra mắt</span>}
    divider={false}
  />
  ```

- [ ] **Step 3: Thêm nút Đăng xuất vào cuối ScreenSettings**

  Tìm closing `</div>` cuối cùng của ScreenSettings (sau `<Card>` chứa "Phiên bản"). Thêm TRƯỚC closing `</div>` của div wrapper chính:
  ```jsx
  {/* Logout */}
  <button
    onClick={() => {
      if (window.confirm('Đăng xuất khỏi SpliteasyBoss?')) {
        dispatch({ type: 'LOGOUT' });
      }
    }}
    style={{
      appearance: 'none', width: '100%', height: 48,
      borderRadius: 14, border: 0, cursor: 'pointer',
      background: 'var(--vb-danger-50)', color: 'var(--vb-danger-700)',
      fontSize: 15, fontWeight: 700, fontFamily: 'var(--vb-font-body)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}
  >
    <Icon name="log-out" size={18} color="var(--vb-danger-700)"/>
    Đăng xuất
  </button>
  ```

  **Lưu ý:** `ScreenSettings` nhận `pop` prop, không có `useApp` trực tiếp. Cần thêm `const { dispatch } = useApp();` vào đầu function `ScreenSettings`.

- [ ] **Step 4: Visual verify**

  Mở app → vào tab Cá nhân → Cài đặt. Phải thấy:
  - "Tiền tệ" và "Nhắc qua Zalo" có badge cam "Sắp ra mắt"
  - Cuối trang có nút đỏ "Đăng xuất"
  - Bấm Đăng xuất → confirm dialog → về màn hình nhập tên

- [ ] **Step 5: Commit**

  ```bash
  git add src/screen-profile.jsx
  git commit -m "feat: add logout button, Sắp ra mắt badges, fix user name display"
  ```

---

## Self-Review Checklist

- [x] Spec Phần 1 (ScreenEnterName) → Task 4
- [x] Spec Phần 2 (Data Cleanup) → Task 1 + Task 3
- [x] Spec Phần 3a (Fix isMe) → Task 8 Step 1 (currentUserName)
- [x] Spec Phần 3b (Fix groupBalance) → Task 2
- [x] Spec Phần 3c (Ẩn nút giả) → Task 6 Step 2, Task 8 Step 2
- [x] Spec Phần 4a (HScroll 4 chỗ) → Task 5 + 6 + 7 (home x2 + groups x1 + còn 1 ở home "hay chia")
- [x] Spec Phần 4b (Logout button) → Task 8 Step 3
- [x] Version bump localStorage → Task 3 Step 1
