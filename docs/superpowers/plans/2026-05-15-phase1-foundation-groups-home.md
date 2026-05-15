# Phase 1 — Foundation + Groups + Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến skeleton app thành app thật — state management (quản lý trạng thái) với AppContext + useReducer + localStorage, Screen Home hiển thị số liệu thật, Screen Groups CRUD (Create, Read, Update, Delete) hoàn chỉnh.

**Architecture (kiến trúc):** Tạo `src/store.jsx` làm "kho trạng thái trung tâm" với AppContext + useReducer. Mọi screen đọc `state` và gọi `dispatch` thay vì dùng mock data (dữ liệu mẫu) trực tiếp. localStorage (bộ nhớ cục bộ trình duyệt) tự sync sau mỗi action (hành động).

**Tech Stack:** React 18 (Babel CDN), không có bundler — mọi file load tuần tự qua `<script>` trong index.html, biến global chia sẻ qua `window` hoặc scope toàn cục.

---

## File Map (Bản đồ file)

| File | Hành động | Mục đích |
|------|-----------|----------|
| `src/store.jsx` | **Tạo mới** | AppContext, reducer (bộ xử lý trạng thái), AppProvider, useApp hook |
| `src/data.jsx` | **Sửa nhỏ** | Tách initial data (dữ liệu khởi tạo) khỏi util functions; `totalBalances(groups)` nhận tham số thay vì đọc global |
| `index.html` | **Sửa nhỏ** | Thêm `<script src="src/store.jsx">` trước components |
| `src/app.jsx` | **Sửa** | Bọc root bằng `<AppProvider>` |
| `src/screen-home.jsx` | **Sửa** | Đọc data từ context thay vì import trực tiếp |
| `src/screen-groups.jsx` | **Sửa lớn** | Tất cả CRUD dùng dispatch; form thêm/sửa/xóa expense (chi tiêu) hoạt động |

---

## Task 1: Tạo store.jsx — AppContext + useReducer + localStorage

**Files:**
- Tạo: `src/store.jsx`

- [ ] **Bước 1: Tạo file store.jsx với đầy đủ reducer và AppProvider**

Tạo file `src/store.jsx` với nội dung sau:

```jsx
// store.jsx — "Kho trạng thái trung tâm" của toàn bộ app
const { createContext, useContext, useReducer, useEffect } = React;

const STORAGE_KEY = 'spliteasy_v2_state';

// ─── Initial State ────────────────────────────────────────────────────────────
// Dùng mock data từ data.jsx làm dữ liệu mẫu ban đầu
function buildInitialState() {
  return {
    currentUserId: null,   // null = chưa chọn "tôi là ai"
    members: MEMBERS,      // từ data.jsx
    groups: GROUPS,        // từ data.jsx
    pickle: PICKLE,        // từ data.jsx
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {

    // ── User ──────────────────────────────────────────────────────────────────
    case 'SET_CURRENT_USER':
      return { ...state, currentUserId: action.userId };

    // ── Groups ────────────────────────────────────────────────────────────────
    case 'ADD_GROUP':
      return { ...state, groups: [...state.groups, action.group] };

    case 'EDIT_GROUP':
      return {
        ...state,
        groups: state.groups.map(g => g.id === action.group.id ? { ...g, ...action.group } : g),
      };

    case 'DELETE_GROUP':
      return { ...state, groups: state.groups.filter(g => g.id !== action.groupId) };

    // ── Expenses ──────────────────────────────────────────────────────────────
    case 'ADD_EXPENSE':
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.groupId
            ? { ...g, expenses: [...g.expenses, action.expense] }
            : g
        ),
      };

    case 'EDIT_EXPENSE':
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.groupId
            ? { ...g, expenses: g.expenses.map(e => e.id === action.expense.id ? action.expense : e) }
            : g
        ),
      };

    case 'DELETE_EXPENSE':
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.groupId
            ? { ...g, expenses: g.expenses.filter(e => e.id !== action.expenseId) }
            : g
        ),
      };

    // ── Settle Debt ───────────────────────────────────────────────────────────
    case 'SETTLE_DEBT': {
      // action.settlement = { id, fromId, toId, amount, date }
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.groupId
            ? { ...g, settlements: [...(g.settlements || []), action.settlement] }
            : g
        ),
      };
    }

    default:
      return state;
  }
}

// ─── localStorage sync ────────────────────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // bỏ qua nếu localStorage đầy
  }
}

// ─── Context & Provider ───────────────────────────────────────────────────────
const AppContext = createContext(null);

function AppProvider({ children }) {
  const saved = loadState();
  const [state, dispatch] = useReducer(appReducer, saved || buildInitialState());

  // Sync xuống localStorage mỗi khi state thay đổi
  useEffect(() => {
    saveState(state);
  }, [state]);

  return React.createElement(AppContext.Provider, { value: { state, dispatch, genId } }, children);
}

// Hook tiện dụng dùng trong mọi component
function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
```

- [ ] **Bước 2: Thêm script store.jsx vào index.html — TRƯỚC components và screens**

Mở `index.html`, tìm dòng `<script type="text/babel" src="src/data.jsx">`, thêm dòng mới **ngay sau** nó:

```html
<script type="text/babel" src="src/data.jsx"></script>
<script type="text/babel" src="src/store.jsx"></script>   <!-- THÊM DÒNG NÀY -->
<script type="text/babel" src="src/components.jsx"></script>
```

- [ ] **Bước 3: Verify (kiểm tra) store load được trong browser**

Mở browser console (F12), gõ:
```js
AppContext
```
Kết quả mong đợi: Object (React context) — không phải `undefined`.

- [ ] **Bước 4: Commit**

```bash
git add src/store.jsx index.html
git commit -m "feat: add AppContext + useReducer + localStorage store"
```

---

## Task 2: Bọc app bằng AppProvider

**Files:**
- Sửa: `src/app.jsx` (phần `ReactDOM.createRoot(...).render(...)` ở cuối file)

- [ ] **Bước 1: Tìm dòng render ở cuối app.jsx và bọc bằng AppProvider**

Tìm đoạn cuối file `src/app.jsx` có dạng:
```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(App)
);
```

Thay bằng:
```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(AppProvider, null,
    React.createElement(App)
  )
);
```

- [ ] **Bước 2: Verify trong browser**

Reload trang. Mở DevTools → Components tab (nếu có React DevTools) hoặc console:
```js
// App vẫn hiển thị bình thường, không có lỗi đỏ trong console
```
Kết quả mong đợi: App load bình thường, không có lỗi.

- [ ] **Bước 3: Commit**

```bash
git add src/app.jsx
git commit -m "feat: wrap app root with AppProvider"
```

---

## Task 3: Sửa data.jsx — tách util functions khỏi global state

**Files:**
- Sửa: `src/data.jsx`

Mục tiêu: `totalBalances()` hiện đọc global `GROUPS` → đổi thành nhận tham số để screens có thể truyền `state.groups` vào.

- [ ] **Bước 1: Tìm hàm totalBalances trong data.jsx và thêm tham số**

Tìm function `totalBalances` hiện tại (dạng `function totalBalances() { ... }` hoặc `const totalBalances = () => { ... }`).

Thêm tham số `groups` với default value là global `GROUPS`:

```jsx
// Trước:
function totalBalances() {
  // ... code dùng GROUPS
}

// Sau:
function totalBalances(groups = GROUPS) {
  // ... code dùng tham số groups thay vì GROUPS
  // Thay mọi chỗ tham chiếu đến GROUPS bên trong hàm này thành tham số groups
}
```

- [ ] **Bước 2: Tương tự với recentActivity nếu nó đọc GROUPS trực tiếp**

Nếu `recentActivity()` cũng đọc `GROUPS` trực tiếp, thêm tham số tương tự:
```jsx
function recentActivity(groups = GROUPS) {
  // ... dùng tham số groups
}
```

- [ ] **Bước 3: Verify**

Reload browser → App load bình thường, các function vẫn chạy đúng vì default param = GROUPS.

- [ ] **Bước 4: Commit**

```bash
git add src/data.jsx
git commit -m "refactor: totalBalances/recentActivity accept groups param"
```

---

## Task 4: Screen Home — hiển thị data thật từ context

**Files:**
- Sửa: `src/screen-home.jsx`

- [ ] **Bước 1: Thêm useApp() vào ScreenHome component**

Tìm component `ScreenHome` (hoặc tên tương tự là root component của home screen). Thêm dòng đầu trong function body:

```jsx
function ScreenHome({ nav }) {
  const { state } = useApp();   // THÊM DÒNG NÀY
  const { groups, members, currentUserId } = state;
  // ... rest of component
}
```

- [ ] **Bước 2: Thay hardcoded balance bằng real calculation**

Tìm chỗ BalanceHero nhận props balance. Thay giá trị hardcode bằng:

```jsx
// Trước: balance={-794000} hoặc tương tự hardcode
// Sau:
const balances = totalBalances(groups);
const myBalance = currentUserId
  ? (balances.find(b => b.memberId === currentUserId)?.net ?? 0)
  : balances.reduce((sum, b) => sum + b.net, 0);
```

Truyền `myBalance` vào BalanceHero.

- [ ] **Bước 3: Thay danh sách "ai nợ ai" bằng real data**

Tìm chỗ WhoOwesView nhận dữ liệu. Thay bằng:

```jsx
const allBalances = totalBalances(groups);
// allBalances là array of { memberId, net, name, ... }
// Truyền allBalances vào WhoOwesView
```

- [ ] **Bước 4: Thay recent activity bằng real data**

```jsx
const activity = recentActivity(groups);
// Truyền activity vào ActivityRow list
```

- [ ] **Bước 5: Thay danh sách groups bằng state.groups**

Tìm chỗ render group cards. Thay:
```jsx
// Trước: GROUPS.map(...)
// Sau:
groups.map(g => /* GroupCard component */)
```

- [ ] **Bước 6: Verify trong browser**

Reload → Home screen hiển thị đúng data từ context. Thêm thử 1 group mới từ console để test:
```js
// Không cần test console — sẽ verify qua UI khi Groups CRUD xong
```
Kết quả mong đợi: Home screen load bình thường với data mock như cũ (vì store khởi tạo từ mock data).

- [ ] **Bước 7: Commit**

```bash
git add src/screen-home.jsx
git commit -m "feat: screen-home reads real data from AppContext"
```

---

## Task 5: Screen Groups list — filter hoạt động

**Files:**
- Sửa: `src/screen-groups.jsx` (component `ScreenGroups`)

- [ ] **Bước 1: Thêm useApp() vào ScreenGroups**

```jsx
function ScreenGroups({ nav }) {
  const { state } = useApp();
  const { groups } = state;
  // filter state đã có sẵn trong component (useState)
  // ...
}
```

- [ ] **Bước 2: Kết nối filter pills với real data**

```jsx
const [filter, setFilter] = React.useState('all'); // đã có hoặc thêm mới

const filtered = groups.filter(g => {
  if (filter === 'all') return true;
  const net = groupNet(g);
  if (filter === 'owed') return net > 0;      // người khác nợ mình
  if (filter === 'owing') return net < 0;     // mình nợ người khác
  if (filter === 'settled') return net === 0;
  return true;
});
```

Render `filtered` thay vì `groups` trực tiếp.

- [ ] **Bước 3: Nút "Tạo nhóm mới" navigate đến ScreenNewGroup**

Tìm nút tạo nhóm (có thể là FAB "+" hoặc button ở header). Thêm:
```jsx
onPress={() => nav.push('new-group')
```

- [ ] **Bước 4: Verify filter pills**

Reload → click các tab "Nợ tôi", "Tôi nợ", "Đã xong" → danh sách nhóm lọc đúng.

- [ ] **Bước 5: Commit**

```bash
git add src/screen-groups.jsx
git commit -m "feat: groups list filter pills work with real data"
```

---

## Task 6: Screen Group Detail — hiển thị expenses thật

**Files:**
- Sửa: `src/screen-groups.jsx` (component `ScreenGroupDetail`)

- [ ] **Bước 1: Thêm useApp() và lấy group từ state**

```jsx
function ScreenGroupDetail({ nav, groupId }) {
  const { state, dispatch } = useApp();
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return null;
  // ...
}
```

- [ ] **Bước 2: Tab Activity — render expenses thật theo ngày**

```jsx
// Group expenses by date
const byDate = {};
(group.expenses || []).forEach(e => {
  const d = e.date || 'unknown';
  if (!byDate[d]) byDate[d] = [];
  byDate[d].push(e);
});
// Render byDate entries, mới nhất trên
Object.entries(byDate)
  .sort(([a], [b]) => b.localeCompare(a))
  .map(([date, exps]) => /* render group header + expense rows */)
```

- [ ] **Bước 3: Tab Balance — render balances thật**

```jsx
const balances = groupBalance(group);
// groupBalance đã có trong data.jsx, trả về array { from, to, amount }
// Render mỗi balance như 1 row với nút "Tất toán"
```

- [ ] **Bước 4: Click vào expense row → navigate đến ScreenExpenseDetail**

```jsx
// Trong mỗi expense row:
onClick={() => nav.push('expense-detail', { groupId: group.id, expenseId: e.id })
```

- [ ] **Bước 5: Verify**

Reload → vào 1 nhóm → tab Activity hiện expenses đúng → tab Balance hiện ai nợ ai đúng.

- [ ] **Bước 6: Commit**

```bash
git add src/screen-groups.jsx
git commit -m "feat: group detail shows real expenses and balances"
```

---

## Task 7: ⋯ menu trên Group — dropdown hoạt động

**Files:**
- Sửa: `src/screen-groups.jsx` (ScreenGroupDetail header)

- [ ] **Bước 1: Thêm state cho dropdown visibility vào ScreenGroupDetail**

```jsx
const [menuOpen, setMenuOpen] = React.useState(false);
```

- [ ] **Bước 2: Render dropdown menu khi menuOpen = true**

```jsx
// Trong JSX của ScreenGroupDetail, thêm:
React.createElement('div', { style: { position: 'relative' } },
  // Nút ⋯
  React.createElement('button', {
    onClick: () => setMenuOpen(v => !v),
    style: { background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }
  }, '⋯'),
  // Dropdown
  menuOpen && React.createElement('div', {
    style: {
      position: 'absolute', right: 0, top: '100%',
      background: 'var(--surface)', borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      minWidth: 180, zIndex: 100,
      overflow: 'hidden'
    }
  },
    [
      { label: '✏️  Sửa nhóm', action: () => { setMenuOpen(false); nav.push('edit-group', { groupId: group.id }); } },
      { label: '👥  Thêm thành viên', action: () => { setMenuOpen(false); nav.push('edit-group', { groupId: group.id, focusMembers: true }); } },
      { label: '🗑  Xóa nhóm', danger: true, action: () => { setMenuOpen(false); handleDeleteGroup(); } },
    ].map(item =>
      React.createElement('button', {
        key: item.label,
        onClick: item.action,
        style: {
          display: 'block', width: '100%', textAlign: 'left',
          padding: '14px 16px', background: 'none', border: 'none',
          color: item.danger ? 'var(--danger, #ff4444)' : 'var(--text)',
          cursor: 'pointer', fontSize: 15,
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))'
        }
      }, item.label)
    )
  )
)
```

- [ ] **Bước 3: Implement handleDeleteGroup**

```jsx
function handleDeleteGroup() {
  if (!window.confirm(`Xóa nhóm "${group.name}"? Không thể hoàn tác.`)) return;
  dispatch({ type: 'DELETE_GROUP', groupId: group.id });
  nav.pop();
}
```

- [ ] **Bước 4: Đóng menu khi click ra ngoài**

```jsx
// Thêm useEffect để đóng menu khi click ngoài
React.useEffect(() => {
  if (!menuOpen) return;
  const close = () => setMenuOpen(false);
  document.addEventListener('click', close);
  return () => document.removeEventListener('click', close);
}, [menuOpen]);
```

- [ ] **Bước 5: Verify**

Reload → vào nhóm → click ⋯ → dropdown xuất hiện → click "Xóa nhóm" → confirm → nhóm bị xóa, quay về danh sách.

- [ ] **Bước 6: Commit**

```bash
git add src/screen-groups.jsx
git commit -m "feat: group detail menu — edit/delete actions"
```

---

## Task 8: Form thêm expense (chi tiêu) — hoạt động thật

**Files:**
- Sửa: `src/screen-groups.jsx` (ScreenAddExpense)

- [ ] **Bước 1: Thêm useApp() và local form state vào ScreenAddExpense**

```jsx
function ScreenAddExpense({ nav, groupId }) {
  const { state, dispatch, genId } = useApp();
  const group = state.groups.find(g => g.id === groupId);

  const [title, setTitle] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [payerId, setPayerId] = React.useState(state.currentUserId || state.members[0]?.id || '');
  const [splitMode, setSplitMode] = React.useState('equal'); // 'equal' | 'parts' | 'percent'
  const [participants, setParticipants] = React.useState(
    (group?.members || state.members).map(m => ({
      id: typeof m === 'string' ? m : m.id,
      checked: true,
      parts: 1,
      percent: 0,
    }))
  );
  const [category, setCategory] = React.useState('food');
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = React.useState('');
  // ...
}
```

- [ ] **Bước 2: Implement handleSubmit — dispatch ADD_EXPENSE**

```jsx
function handleSubmit() {
  const amt = parseFloat(amount);
  if (!title.trim()) { setError('Cần nhập tên chi tiêu'); return; }
  if (!amt || amt <= 0) { setError('Số tiền phải lớn hơn 0'); return; }

  const checked = participants.filter(p => p.checked);
  if (checked.length === 0) { setError('Cần chọn ít nhất 1 người'); return; }

  // Tính split (chia tiền)
  let splits = [];
  if (splitMode === 'equal') {
    const share = amt / checked.length;
    splits = checked.map(p => ({ memberId: p.id, amount: share }));
  } else if (splitMode === 'parts') {
    const totalParts = checked.reduce((s, p) => s + (p.parts || 1), 0);
    splits = checked.map(p => ({ memberId: p.id, amount: amt * (p.parts || 1) / totalParts }));
  } else if (splitMode === 'percent') {
    const totalPct = checked.reduce((s, p) => s + (p.percent || 0), 0);
    if (Math.abs(totalPct - 100) > 0.01) { setError('Tổng % phải bằng 100'); return; }
    splits = checked.map(p => ({ memberId: p.id, amount: amt * (p.percent || 0) / 100 }));
  }

  const expense = {
    id: genId(),
    title: title.trim(),
    amount: amt,
    category,
    date,
    payerId,
    splitMode,
    splits,
    createdAt: new Date().toISOString(),
  };

  dispatch({ type: 'ADD_EXPENSE', groupId, expense });
  nav.pop();
}
```

- [ ] **Bước 3: Kết nối các input vào form state**

Đảm bảo các input field sau đã có `value` và `onChange`:
```jsx
// Title input
React.createElement('input', {
  value: title,
  onChange: e => setTitle(e.target.value),
  placeholder: 'Tên chi tiêu...',
  // ... style
})

// Amount input
React.createElement('input', {
  type: 'number',
  value: amount,
  onChange: e => setAmount(e.target.value),
  placeholder: '0',
  // ... style
})

// Nút Submit
React.createElement('button', { onClick: handleSubmit }, 'Thêm chi tiêu')
```

- [ ] **Bước 4: Verify**

Reload → vào nhóm → mở form thêm chi tiêu → nhập title + amount → chọn người trả → submit → chi tiêu xuất hiện trong danh sách → số dư cập nhật.

- [ ] **Bước 5: Commit**

```bash
git add src/screen-groups.jsx
git commit -m "feat: add expense form dispatches ADD_EXPENSE to store"
```

---

## Task 9: Edit Expense (sửa chi tiêu) — hoạt động thật

**Files:**
- Sửa: `src/screen-groups.jsx` (ScreenExpenseDetail + ScreenAddExpense)

- [ ] **Bước 1: ScreenExpenseDetail — nút ✏️ navigate đến edit form**

Trong `ScreenExpenseDetail`, thêm nút edit:
```jsx
// Nút edit ở header hoặc cuối trang
React.createElement('button', {
  onClick: () => nav.push('add-expense', { groupId, expenseId: expense.id })
}, '✏️ Sửa')
```

- [ ] **Bước 2: ScreenAddExpense — load existing expense nếu có expenseId**

Thêm logic load vào ScreenAddExpense:
```jsx
function ScreenAddExpense({ nav, groupId, expenseId }) {
  const { state, dispatch, genId } = useApp();
  const group = state.groups.find(g => g.id === groupId);
  const existing = expenseId
    ? (group?.expenses || []).find(e => e.id === expenseId)
    : null;

  // Initialize state từ existing expense nếu có
  const [title, setTitle] = React.useState(existing?.title || '');
  const [amount, setAmount] = React.useState(existing?.amount?.toString() || '');
  const [payerId, setPayerId] = React.useState(existing?.payerId || state.currentUserId || '');
  const [splitMode, setSplitMode] = React.useState(existing?.splitMode || 'equal');
  const [date, setDate] = React.useState(existing?.date || new Date().toISOString().slice(0, 10));
  const [category, setCategory] = React.useState(existing?.category || 'food');
  // participants: rebuild từ existing.splits nếu có
  const [participants, setParticipants] = React.useState(() => {
    const mems = (group?.members || state.members).map(m => typeof m === 'string' ? m : m.id);
    return mems.map(id => {
      const split = existing?.splits?.find(s => s.memberId === id);
      return {
        id,
        checked: existing ? !!split : true,
        parts: split ? Math.round(split.amount / (existing.amount / existing.splits.length)) : 1,
        percent: split ? Math.round(split.amount / existing.amount * 100) : 0,
      };
    });
  });
  // ...
}
```

- [ ] **Bước 3: handleSubmit — dispatch EDIT_EXPENSE nếu đang edit**

```jsx
function handleSubmit() {
  // ... validation giống Task 8 ...

  const expense = {
    id: existing?.id || genId(),  // giữ id cũ nếu edit
    title: title.trim(),
    amount: amt,
    category,
    date,
    payerId,
    splitMode,
    splits,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    dispatch({ type: 'EDIT_EXPENSE', groupId, expense });
  } else {
    dispatch({ type: 'ADD_EXPENSE', groupId, expense });
  }
  nav.pop();
}
```

- [ ] **Bước 4: Đổi title header theo mode**

```jsx
// Header title: "Sửa chi tiêu" nếu edit, "Thêm chi tiêu" nếu thêm mới
const headerTitle = existing ? 'Sửa chi tiêu' : 'Thêm chi tiêu';
```

- [ ] **Bước 5: Verify**

Reload → vào expense detail → nhấn ✏️ → form load đúng data → sửa amount → submit → expense cập nhật, số dư tính lại.

- [ ] **Bước 6: Commit**

```bash
git add src/screen-groups.jsx
git commit -m "feat: edit expense — EDIT_EXPENSE action, form preloads existing data"
```

---

## Task 10: Delete Expense — hoạt động thật

**Files:**
- Sửa: `src/screen-groups.jsx` (ScreenExpenseDetail)

- [ ] **Bước 1: Thêm nút xóa vào ScreenExpenseDetail**

```jsx
function ScreenExpenseDetail({ nav, groupId, expenseId }) {
  const { state, dispatch } = useApp();
  const group = state.groups.find(g => g.id === groupId);
  const expense = (group?.expenses || []).find(e => e.id === expenseId);
  if (!expense) return null;

  function handleDelete() {
    if (!window.confirm(`Xóa "${expense.title}"? Không thể hoàn tác.`)) return;
    dispatch({ type: 'DELETE_EXPENSE', groupId, expenseId });
    nav.pop();
  }

  // ... render expense detail ...
  // Thêm nút Delete ở cuối:
  return React.createElement('div', null,
    // ... existing content ...
    React.createElement('button', {
      onClick: handleDelete,
      style: { color: 'var(--danger, #ff4444)', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 16px' }
    }, '🗑  Xóa chi tiêu')
  );
}
```

- [ ] **Bước 2: Verify**

Reload → vào expense detail → nhấn Xóa → confirm → quay về group detail → expense biến mất → số dư cập nhật.

- [ ] **Bước 3: Commit**

```bash
git add src/screen-groups.jsx
git commit -m "feat: delete expense — DELETE_EXPENSE action with confirm dialog"
```

---

## Task 11: Tất toán (Settle Debt) — hoạt động thật

**Files:**
- Sửa: `src/screen-groups.jsx` (ScreenGroupDetail tab Balance)

- [ ] **Bước 1: Nút "Tất toán" trong tab Balance dispatch SETTLE_DEBT**

```jsx
function handleSettle(fromId, toId, amount) {
  dispatch({
    type: 'SETTLE_DEBT',
    groupId: group.id,
    settlement: {
      id: genId(),
      fromId,
      toId,
      amount,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    }
  });
}
```

- [ ] **Bước 2: Cập nhật groupBalance để trừ settlements**

Trong `data.jsx`, cập nhật `groupBalance(group)` để tính settlements:

```jsx
function groupBalance(g) {
  // ... existing logic tính net từ expenses ...
  // Sau đó trừ đi settlements
  const settlements = g.settlements || [];
  settlements.forEach(s => {
    // s.fromId trả cho s.toId s.amount → giảm khoản nợ
    // Adjust the balance entries accordingly
    // (chi tiết tuỳ vào implementation hiện tại của groupBalance)
  });
  return balances;
}
```

**Lưu ý:** Xem implementation hiện tại của `groupBalance` trong `data.jsx` trước khi sửa — chỉ thêm phần xử lý settlements, không thay đổi logic tính expense splits.

- [ ] **Bước 3: Verify**

Reload → vào nhóm có nợ → tab Balance → nhấn "Tất toán" → số dư về 0 → các số liệu cập nhật ngay.

- [ ] **Bước 4: Commit**

```bash
git add src/screen-groups.jsx src/data.jsx
git commit -m "feat: settle debt — SETTLE_DEBT action, balance accounts for settlements"
```

---

## Task 12: Tạo nhóm mới — hoạt động thật

**Files:**
- Sửa: `src/screen-groups.jsx` (ScreenNewGroup)

- [ ] **Bước 1: Thêm form state vào ScreenNewGroup**

```jsx
function ScreenNewGroup({ nav }) {
  const { state, dispatch, genId } = useApp();

  const [name, setName] = React.useState('');
  const [emoji, setEmoji] = React.useState('👥');
  const [selectedMembers, setSelectedMembers] = React.useState([]);
  const [error, setError] = React.useState('');

  const EMOJI_OPTIONS = ['👥', '🍜', '🏖', '🎉', '🏢', '⚽', '🎮', '🎂', '✈️', '🎵'];
  // ...
}
```

- [ ] **Bước 2: Implement handleCreate**

```jsx
function handleCreate() {
  if (!name.trim()) { setError('Cần nhập tên nhóm'); return; }
  if (selectedMembers.length < 2) { setError('Cần chọn ít nhất 2 người'); return; }

  const group = {
    id: genId(),
    name: name.trim(),
    emoji,
    members: selectedMembers,
    expenses: [],
    settlements: [],
    createdAt: new Date().toISOString(),
  };

  dispatch({ type: 'ADD_GROUP', group });
  nav.pop(); // Quay về danh sách groups
}
```

- [ ] **Bước 3: Render member selector**

```jsx
// Danh sách checkbox chọn thành viên
state.members.map(m =>
  React.createElement('div', {
    key: m.id,
    onClick: () => setSelectedMembers(prev =>
      prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
    ),
    style: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }
  },
    React.createElement(Avatar, { member: m, size: 40 }),
    React.createElement('span', null, m.name),
    selectedMembers.includes(m.id)
      ? React.createElement('span', { style: { marginLeft: 'auto', color: 'var(--primary)' } }, '✓')
      : null
  )
)
```

- [ ] **Bước 4: Verify**

Reload → Groups → nút tạo nhóm → đặt tên + emoji + chọn 2 thành viên → Tạo → nhóm mới xuất hiện trong danh sách.

- [ ] **Bước 5: Commit**

```bash
git add src/screen-groups.jsx
git commit -m "feat: create new group — ADD_GROUP action with member selection"
```

---

## Task 13: Search (tìm kiếm) trên Home Screen

**Files:**
- Sửa: `src/screen-home.jsx`

- [ ] **Bước 1: Thêm search state và filter logic**

```jsx
function ScreenHome({ nav }) {
  const { state } = useApp();
  const { groups } = state;
  const [searchQuery, setSearchQuery] = React.useState('');

  // Filter groups và activity theo searchQuery
  const filteredGroups = searchQuery.trim()
    ? groups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.expenses || []).some(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : groups;
  // ...
}
```

- [ ] **Bước 2: Kết nối search input với searchQuery state**

```jsx
// Tìm search input trong ScreenHome, thêm:
React.createElement('input', {
  value: searchQuery,
  onChange: e => setSearchQuery(e.target.value),
  placeholder: 'Tìm nhóm, chi tiêu...',
  // ... existing style
})
```

- [ ] **Bước 3: Render filteredGroups thay vì groups**

```jsx
// Thay groups.map(...) bằng:
filteredGroups.map(g => /* GroupCard */)
```

- [ ] **Bước 4: Verify**

Reload → gõ vào search box → danh sách nhóm lọc theo tên → xóa text → hiện lại tất cả.

- [ ] **Bước 5: Commit**

```bash
git add src/screen-home.jsx
git commit -m "feat: home screen search filters groups and expenses"
```

---

## Checklist tự review

### Spec coverage

- [x] AppContext + useReducer setup → Task 1
- [x] localStorage sync → Task 1
- [x] Load data từ localStorage khi mở app → Task 1 (loadState())
- [x] ADD_EXPENSE → Task 8
- [x] EDIT_EXPENSE → Task 9
- [x] DELETE_EXPENSE → Task 10
- [x] SETTLE_DEBT → Task 11
- [x] ADD_GROUP → Task 12
- [x] DELETE_GROUP → Task 7
- [x] Split mode equal/parts/percent → Task 8
- [x] Screen Home real data → Task 4
- [x] "Ai nợ ai" real-time → Task 4
- [x] Search → Task 13
- [x] ⋯ menu → Task 7
- [x] ✏️ edit → Task 9

### Gaps

- Sửa nhóm (EDIT_GROUP) — được trigger từ menu Task 7, form giống ScreenNewGroup. Reuse ScreenNewGroup với prop `editGroupId`.
- Tab Members trong Group Detail — hiện thành viên với số dư. Thêm vào Task 6 nếu chưa có.

---

*Tiếp theo: [Plan B — Pickleball + Profile](./2026-05-15-phase1-pickleball-profile.md)*
