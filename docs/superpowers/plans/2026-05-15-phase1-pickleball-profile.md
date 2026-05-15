# Phase 1 — Pickleball + Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Prerequisite (điều kiện tiên quyết):** Plan A (Foundation + Groups + Home) phải hoàn thành trước — plan này dùng `useApp()`, `AppContext`, và `dispatch` từ `store.jsx`.

**Goal:** Hoàn thiện Screen Pickleball (xác nhận tham gia, thêm chi phí, vé lẻ) và Screen Cá nhân (chọn user, đổi user, stats thật).

**Architecture:** Tương tự Plan A — dùng `useApp()` hook để đọc `state.pickle` và dispatch Pickleball actions. Profile screen đọc `state.currentUserId` để hiển thị đúng thông tin người đang dùng app.

**Tech Stack:** React 18 (Babel CDN), store.jsx từ Plan A.

---

## File Map

| File | Hành động | Mục đích |
|------|-----------|----------|
| `src/store.jsx` | **Sửa** | Thêm Pickleball actions vào reducer |
| `src/screen-pickleball.jsx` | **Sửa lớn** | Tất cả interactions dùng dispatch; session detail clickable |
| `src/screen-profile.jsx` | **Sửa** | User selection, stats thật, đổi user button |

---

## Task 1: Thêm Pickleball actions vào store.jsx

**Files:**
- Sửa: `src/store.jsx`

- [ ] **Bước 1: Thêm 4 Pickleball action cases vào reducer**

Mở `src/store.jsx`, trong `appReducer`, thêm sau phần `SETTLE_DEBT`:

```jsx
// ── Pickleball ────────────────────────────────────────────────────────────────
case 'CONFIRM_ATTENDANCE': {
  // action.sessionId, action.memberId, action.attending (true/false)
  const sessions = (state.pickle.sessions || []).map(s =>
    s.id === action.sessionId
      ? {
          ...s,
          attendees: action.attending
            ? [...new Set([...(s.attendees || []), action.memberId])]
            : (s.attendees || []).filter(id => id !== action.memberId)
        }
      : s
  );
  return { ...state, pickle: { ...state.pickle, sessions } };
}

case 'ADD_PICKLE_EXPENSE': {
  // action.sessionId, action.expense = { id, title, category, amount, payerId }
  const sessions = (state.pickle.sessions || []).map(s =>
    s.id === action.sessionId
      ? { ...s, expenses: [...(s.expenses || []), action.expense] }
      : s
  );
  return { ...state, pickle: { ...state.pickle, sessions } };
}

case 'ADD_EXTERNAL_TICKET': {
  // action.ticket = { id, courtName, date, amount, payerId, participantIds }
  return {
    ...state,
    pickle: {
      ...state.pickle,
      externalTickets: [...(state.pickle.externalTickets || []), action.ticket]
    }
  };
}

case 'ADD_PICKLE_MEMBER': {
  // action.memberId — thêm thành viên cố định
  const fixedMembers = state.pickle.fixedMembers || [];
  if (fixedMembers.includes(action.memberId)) return state;
  return {
    ...state,
    pickle: { ...state.pickle, fixedMembers: [...fixedMembers, action.memberId] }
  };
}
```

- [ ] **Bước 2: Verify**

Reload browser. Mở console, kiểm tra không có lỗi syntax.

- [ ] **Bước 3: Commit**

```bash
git add src/store.jsx
git commit -m "feat: add Pickleball actions to store reducer"
```

---

## Task 2: Screen Pickleball — đọc data từ context

**Files:**
- Sửa: `src/screen-pickleball.jsx`

- [ ] **Bước 1: Thêm useApp() vào ScreenPickleball root component**

Tìm root component của Pickleball screen (có thể là `ScreenPickle` hoặc `PickleScreen`):

```jsx
function ScreenPickle({ nav }) {
  const { state, dispatch } = useApp();
  const pickle = state.pickle;
  const { sessions = [], fixedMembers = [], externalTickets = [] } = pickle;
  const members = state.members;

  // Tính summary từ data thật
  const fixedMemberObjects = fixedMembers
    .map(id => members.find(m => m.id === id))
    .filter(Boolean);

  // ... rest of component dùng pickle thay vì import PICKLE trực tiếp
}
```

- [ ] **Bước 2: Thay mọi tham chiếu đến PICKLE bằng state.pickle**

Tìm và thay trong toàn bộ `screen-pickleball.jsx`:
```jsx
// Trước: PICKLE.sessions, PICKLE.fixedMembers, ...
// Sau: state.pickle.sessions, state.pickle.fixedMembers, ...
// Hoặc dùng destructure từ bước 1
```

- [ ] **Bước 3: Verify**

Reload → tab Pickleball → data hiển thị như cũ (vì state khởi từ mock data).

- [ ] **Bước 4: Commit**

```bash
git add src/screen-pickleball.jsx
git commit -m "feat: pickleball screen reads from AppContext"
```

---

## Task 3: Session Detail — cả buổi sắp tới và đã diễn ra đều clickable

**Files:**
- Sửa: `src/screen-pickleball.jsx`

- [ ] **Bước 1: Tab "Buổi đánh" — thêm onClick cho mọi session card**

Tìm component render session list. Thêm onClick cho cả "Sắp diễn ra" và "Đã diễn ra":

```jsx
// Mỗi session card:
React.createElement('div', {
  key: s.id,
  onClick: () => nav.push('session-detail', { sessionId: s.id }),
  style: { cursor: 'pointer' }
  // ... existing style
},
  // ... existing content
)
```

- [ ] **Bước 2: ScreenSessionDetail — đọc data từ state**

```jsx
function ScreenSessionDetail({ nav, sessionId }) {
  const { state, dispatch } = useApp();
  const session = (state.pickle.sessions || []).find(s => s.id === sessionId);
  if (!session) return React.createElement('div', null, 'Không tìm thấy buổi đánh');

  const members = state.members;
  const attendees = session.attendees || [];
  const expenses = session.expenses || [];
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const perPerson = attendees.length > 0 ? totalExpense / attendees.length : 0;

  // ... render giống hiện tại nhưng dùng session thật
  return React.createElement('div', null,
    React.createElement(NavHeader, {
      title: `Buổi ${fmtDate(session.date)}`,
      subtitle: `${session.dayOfWeek} • ${session.time} • ${session.court}`,
      onBack: () => nav.pop()
    }),
    // Tổng chi
    React.createElement('div', { style: { padding: '0 16px' } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '12px 0' } },
        React.createElement('span', { style: { color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, letterSpacing: 1 } }, 'TỔNG CHI'),
        React.createElement(Money, { amount: totalExpense, style: { fontWeight: 700, fontSize: 18 } })
      ),
      expenses.map(e =>
        React.createElement(ListRow, {
          key: e.id,
          icon: React.createElement(CategoryIcon, { category: e.category }),
          title: e.title,
          subtitle: `${members.find(m => m.id === e.payerId)?.name || '?'} đã trả`,
          right: React.createElement(Money, { amount: e.amount })
        })
      )
    ),
    // Có mặt
    React.createElement(SectionHeader, { title: `CÓ MẶT — CHIA ${fmtVND(perPerson)}K MỖI NGƯỜI` }),
    attendees.map(id => {
      const m = members.find(m => m.id === id);
      return m ? React.createElement(ListRow, {
        key: id,
        icon: React.createElement(Avatar, { member: m }),
        title: m.name,
        right: React.createElement(Pill, { color: 'green', label: '✓ Có mặt' })
      }) : null;
    }),
    // Nút thêm chi phí (chỉ với buổi đã diễn ra)
    session.status === 'done' && React.createElement('button', {
      onClick: () => nav.push('add-session-expense', { sessionId }),
      style: { margin: '16px', display: 'block', width: 'calc(100% - 32px)', padding: '14px', borderRadius: 12, background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }
    }, '+ Thêm chi phí')
  );
}
```

- [ ] **Bước 3: Verify**

Reload → tab Buổi đánh → click bất kỳ session card nào (cả sắp tới lẫn đã diễn ra) → mở detail page.

- [ ] **Bước 4: Commit**

```bash
git add src/screen-pickleball.jsx
git commit -m "feat: all session cards navigate to detail — upcoming and past"
```

---

## Task 4: Nút "Tham gia" — toggle attendance

**Files:**
- Sửa: `src/screen-pickleball.jsx`

- [ ] **Bước 1: Nút Tham gia trong Tổng quan và Session Detail dispatch CONFIRM_ATTENDANCE**

```jsx
function AttendanceButton({ sessionId, memberId }) {
  const { state, dispatch } = useApp();
  const session = (state.pickle.sessions || []).find(s => s.id === sessionId);
  const isAttending = (session?.attendees || []).includes(memberId);

  return React.createElement('button', {
    onClick: () => dispatch({
      type: 'CONFIRM_ATTENDANCE',
      sessionId,
      memberId,
      attending: !isAttending
    }),
    style: {
      padding: '10px 20px',
      borderRadius: 20,
      border: 'none',
      cursor: 'pointer',
      fontWeight: 600,
      background: isAttending ? 'var(--surface)' : 'var(--primary)',
      color: isAttending ? 'var(--text-secondary)' : 'white',
    }
  }, isAttending ? 'Đã đăng ký' : 'Tham gia')
}
```

- [ ] **Bước 2: Dùng AttendanceButton trong card buổi sắp tới**

Tìm card buổi sắp tới trong `PickleOverview`. Thay nút "Tham gia" hardcode bằng:
```jsx
React.createElement(AttendanceButton, {
  sessionId: upcomingSession.id,
  memberId: state.currentUserId || state.pickle.fixedMembers[0]
})
```

- [ ] **Bước 3: Verify**

Reload → tab Tổng quan → nhấn "Tham gia" → nút đổi thành "Đã đăng ký" → nhấn lại → quay về "Tham gia".

- [ ] **Bước 4: Commit**

```bash
git add src/screen-pickleball.jsx
git commit -m "feat: Tham gia button toggles attendance via CONFIRM_ATTENDANCE"
```

---

## Task 5: Thêm chi phí buổi đánh (bóng/nước/đồ ăn)

**Files:**
- Sửa: `src/screen-pickleball.jsx` (ScreenAddSessionExpense)

- [ ] **Bước 1: Implement ScreenAddSessionExpense**

```jsx
function ScreenAddSessionExpense({ nav, sessionId }) {
  const { state, dispatch, genId } = useApp();
  const members = state.members;

  const [title, setTitle] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [payerId, setPayerId] = React.useState(state.currentUserId || members[0]?.id || '');
  const [category, setCategory] = React.useState('ball'); // ball | drink | food

  const CATEGORIES = [
    { id: 'ball', label: '🎾 Bóng' },
    { id: 'drink', label: '🥤 Nước' },
    { id: 'food', label: '🍜 Đồ ăn' },
  ];

  function handleSubmit() {
    const amt = parseFloat(amount);
    if (!title.trim()) { alert('Cần nhập tên chi phí'); return; }
    if (!amt || amt <= 0) { alert('Số tiền phải lớn hơn 0'); return; }

    dispatch({
      type: 'ADD_PICKLE_EXPENSE',
      sessionId,
      expense: {
        id: genId(),
        title: title.trim(),
        amount: amt,
        category,
        payerId,
        createdAt: new Date().toISOString(),
      }
    });
    nav.pop();
  }

  return React.createElement('div', null,
    React.createElement(NavHeader, { title: 'Thêm chi phí', onBack: () => nav.pop() }),
    React.createElement('div', { style: { padding: '0 16px' } },
      // Category selector
      React.createElement('div', { style: { display: 'flex', gap: 8, marginBottom: 16 } },
        CATEGORIES.map(c =>
          React.createElement('button', {
            key: c.id,
            onClick: () => setCategory(c.id),
            style: {
              flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: category === c.id ? 'var(--primary)' : 'var(--surface)',
              color: category === c.id ? 'white' : 'var(--text)', fontWeight: 600
            }
          }, c.label)
        )
      ),
      // Title input
      React.createElement('input', {
        value: title, onChange: e => setTitle(e.target.value),
        placeholder: 'Tên chi phí (ví dụ: Bóng Joola)...',
        style: { ...inputStyle(), marginBottom: 12 }
      }),
      // Amount input
      React.createElement('input', {
        type: 'number', value: amount, onChange: e => setAmount(e.target.value),
        placeholder: 'Số tiền (VND)',
        style: { ...inputStyle(), marginBottom: 12 }
      }),
      // Payer selector
      React.createElement('select', {
        value: payerId, onChange: e => setPayerId(e.target.value),
        style: { ...inputStyle(), marginBottom: 24 }
      },
        members.map(m => React.createElement('option', { key: m.id, value: m.id }, m.name))
      ),
      // Submit
      React.createElement('button', {
        onClick: handleSubmit,
        style: { width: '100%', padding: '16px', borderRadius: 12, background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16 }
      }, 'Thêm chi phí')
    )
  );
}
```

- [ ] **Bước 2: Register screen trong nav (navigation) — thêm case 'add-session-expense' vào app.jsx**

Trong `src/app.jsx`, tìm switch/if block render screens theo nav.current.name. Thêm:
```jsx
case 'add-session-expense':
  return React.createElement(ScreenAddSessionExpense, {
    nav,
    sessionId: nav.current.params?.sessionId
  });
```

- [ ] **Bước 3: Verify**

Reload → session detail của buổi đã diễn ra → nhấn "Thêm chi phí" → form mở → nhập data → submit → quay về detail → chi phí mới xuất hiện.

- [ ] **Bước 4: Commit**

```bash
git add src/screen-pickleball.jsx src/app.jsx
git commit -m "feat: add session expense form — ADD_PICKLE_EXPENSE action"
```

---

## Task 6: Form thêm vé lẻ (external ticket)

**Files:**
- Sửa: `src/screen-pickleball.jsx` (tab Vé lẻ)

- [ ] **Bước 1: Implement ScreenAddExternalTicket**

```jsx
function ScreenAddExternalTicket({ nav }) {
  const { state, dispatch, genId } = useApp();
  const members = state.members;

  const [courtName, setCourtName] = React.useState('');
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = React.useState('');
  const [payerId, setPayerId] = React.useState(state.currentUserId || members[0]?.id || '');
  const [participantIds, setParticipantIds] = React.useState([]);

  function toggleParticipant(id) {
    setParticipantIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function handleSubmit() {
    const amt = parseFloat(amount);
    if (!courtName.trim()) { alert('Cần nhập tên sân'); return; }
    if (!amt || amt <= 0) { alert('Số tiền phải lớn hơn 0'); return; }
    if (participantIds.length === 0) { alert('Cần chọn ít nhất 1 người tham gia'); return; }

    dispatch({
      type: 'ADD_EXTERNAL_TICKET',
      ticket: {
        id: genId(),
        courtName: courtName.trim(),
        date,
        amount: amt,
        payerId,
        participantIds,
        createdAt: new Date().toISOString(),
      }
    });
    nav.pop();
  }

  return React.createElement('div', null,
    React.createElement(NavHeader, { title: 'Thêm vé lẻ', onBack: () => nav.pop() }),
    React.createElement('div', { style: { padding: '0 16px' } },
      React.createElement('input', {
        value: courtName, onChange: e => setCourtName(e.target.value),
        placeholder: 'Tên sân (ví dụ: Sân Nguyễn Khoái)...',
        style: { ...inputStyle(), marginBottom: 12 }
      }),
      React.createElement('input', {
        type: 'date', value: date, onChange: e => setDate(e.target.value),
        style: { ...inputStyle(), marginBottom: 12 }
      }),
      React.createElement('input', {
        type: 'number', value: amount, onChange: e => setAmount(e.target.value),
        placeholder: 'Tiền sân (VND)',
        style: { ...inputStyle(), marginBottom: 12 }
      }),
      React.createElement('select', {
        value: payerId, onChange: e => setPayerId(e.target.value),
        style: { ...inputStyle(), marginBottom: 16 }
      },
        members.map(m => React.createElement('option', { key: m.id, value: m.id }, m.name))
      ),
      React.createElement('p', { style: { color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 } }, 'Người tham gia:'),
      members.map(m =>
        React.createElement('div', {
          key: m.id,
          onClick: () => toggleParticipant(m.id),
          style: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', cursor: 'pointer' }
        },
          React.createElement(Avatar, { member: m, size: 36 }),
          React.createElement('span', null, m.name),
          participantIds.includes(m.id)
            ? React.createElement('span', { style: { marginLeft: 'auto', color: 'var(--primary)', fontWeight: 700 } }, '✓')
            : null
        )
      ),
      React.createElement('button', {
        onClick: handleSubmit,
        style: { width: '100%', padding: '16px', marginTop: 16, borderRadius: 12, background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16 }
      }, 'Thêm vé lẻ')
    )
  );
}
```

- [ ] **Bước 2: Nút "Thêm buổi vé lẻ" trong tab Vé lẻ navigate đến form**

Tìm nút "Thêm buổi vé lẻ" trong `PickleExternal` component. Thêm:
```jsx
onClick: () => nav.push('add-external-ticket')
```

- [ ] **Bước 3: Register 'add-external-ticket' screen trong app.jsx**

```jsx
case 'add-external-ticket':
  return React.createElement(ScreenAddExternalTicket, { nav });
```

- [ ] **Bước 4: Tab Vé lẻ render từ state.pickle.externalTickets**

```jsx
// Trong PickleExternal:
const { state } = useApp();
const tickets = state.pickle.externalTickets || [];
// Render tickets thay vì mock data
```

- [ ] **Bước 5: Verify**

Reload → tab Vé lẻ → nhấn "Thêm buổi vé lẻ" → form mở → điền data → submit → vé lẻ mới xuất hiện trong danh sách.

- [ ] **Bước 6: Commit**

```bash
git add src/screen-pickleball.jsx src/app.jsx
git commit -m "feat: add external ticket form — ADD_EXTERNAL_TICKET action"
```

---

## Task 7: Screen Profile — chọn "Tôi là ai?" khi lần đầu mở app

**Files:**
- Sửa: `src/app.jsx`, `src/screen-profile.jsx`

- [ ] **Bước 1: Tạo ScreenSelectUser component trong screen-profile.jsx**

```jsx
function ScreenSelectUser({ onSelect }) {
  const { state, dispatch } = useApp();
  const members = state.members;

  function handleSelect(memberId) {
    dispatch({ type: 'SET_CURRENT_USER', userId: memberId });
    onSelect(memberId);
  }

  return React.createElement('div', {
    style: { padding: '24px 16px', textAlign: 'center' }
  },
    React.createElement('div', { style: { fontSize: 48, marginBottom: 8 } }, '👋'),
    React.createElement('h2', { style: { margin: '0 0 8px' } }, 'Xin chào!'),
    React.createElement('p', { style: { color: 'var(--text-secondary)', marginBottom: 32 } }, 'Bạn là ai trong nhóm?'),
    members.map(m =>
      React.createElement('div', {
        key: m.id,
        onClick: () => handleSelect(m.id),
        style: {
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '14px 16px', marginBottom: 8,
          background: 'var(--surface)', borderRadius: 14,
          cursor: 'pointer',
        }
      },
        React.createElement(Avatar, { member: m, size: 48 }),
        React.createElement('div', { style: { textAlign: 'left' } },
          React.createElement('div', { style: { fontWeight: 600, fontSize: 16 } }, m.name),
          React.createElement('div', { style: { color: 'var(--text-secondary)', fontSize: 13 } }, m.email || '')
        )
      )
    )
  );
}
```

- [ ] **Bước 2: Trong app.jsx — hiện ScreenSelectUser khi currentUserId là null**

Tìm chỗ render màn hình chính trong `App` component. Bọc bằng:

```jsx
function App() {
  const { state } = useApp();

  // Lần đầu mở app: currentUserId chưa được chọn
  if (state.currentUserId === null) {
    return React.createElement(ScreenSelectUser, {
      onSelect: () => {} // dispatch đã xử lý trong ScreenSelectUser
    });
  }

  // ... render bình thường
}
```

- [ ] **Bước 3: Verify**

Xóa localStorage (`localStorage.removeItem('spliteasy_v2_state')` trong console) → reload → màn hình chọn "Tôi là ai?" xuất hiện → chọn một người → app vào màn hình chính.

- [ ] **Bước 4: Commit**

```bash
git add src/app.jsx src/screen-profile.jsx
git commit -m "feat: user selection screen on first open — SET_CURRENT_USER"
```

---

## Task 8: Screen Profile — nút "Đổi người dùng" + stats thật

**Files:**
- Sửa: `src/screen-profile.jsx`

- [ ] **Bước 1: Thêm useApp() vào ScreenProfile và tính stats thật**

```jsx
function ScreenProfile({ nav }) {
  const { state, dispatch } = useApp();
  const { currentUserId, members, groups } = state;
  const me = members.find(m => m.id === currentUserId);
  if (!me) return null;

  // Tính stats từ data thật
  const allBalances = totalBalances(groups);
  const myBalance = allBalances.find(b => b.memberId === currentUserId) || { net: 0, owed: 0, owing: 0 };

  // Tổng đã chi (là payer)
  let totalPaid = 0;
  let paidOnBehalf = 0;
  groups.forEach(g => {
    (g.expenses || []).forEach(e => {
      if (e.payerId === currentUserId) {
        totalPaid += e.amount;
        // Phần mình nợ mình = split của mình
        const myShare = (e.splits || []).find(s => s.memberId === currentUserId)?.amount || 0;
        paidOnBehalf += e.amount - myShare;
      }
    });
  });
```

- [ ] **Bước 2: Truyền stats thật vào các StatCard**

```jsx
// Thay hardcode bằng:
React.createElement(StatCard, { icon: '⬆️', label: 'ĐƯỢC NHẬN', value: fmtVNDFull(Math.max(0, myBalance.net)) }),
React.createElement(StatCard, { icon: '⬇️', label: 'CÒN NỢ', value: fmtVNDFull(Math.abs(Math.min(0, myBalance.net))) }),
React.createElement(StatCard, { icon: '💳', label: 'ĐÃ CHI', value: fmtVNDFull(totalPaid) }),
React.createElement(StatCard, { icon: '🤝', label: 'ĐÃ TRẢ THAY', value: fmtVNDFull(paidOnBehalf) }),
```

- [ ] **Bước 3: Thêm nút "Đổi người dùng" trong profile header**

```jsx
// Thêm nút bên cạnh ⚙️ settings icon
React.createElement('button', {
  onClick: () => dispatch({ type: 'SET_CURRENT_USER', userId: null }),
  style: {
    background: 'none', border: '1px solid var(--border, rgba(255,255,255,0.2))',
    borderRadius: 20, padding: '6px 14px', color: 'var(--text-secondary)',
    cursor: 'pointer', fontSize: 13
  }
}, '↩ Đổi người')
```

Khi dispatch `SET_CURRENT_USER` với `userId: null` → App component sẽ hiện lại ScreenSelectUser (Task 7, bước 2 đã xử lý).

- [ ] **Bước 4: Verify**

Reload → Profile screen hiện đúng tên người đang chọn → stats tính từ data thật → nhấn "Đổi người" → màn hình chọn user xuất hiện lại.

- [ ] **Bước 5: Commit**

```bash
git add src/screen-profile.jsx
git commit -m "feat: profile shows real stats, switch user button"
```

---

## Task 9: Settings — Phase 2 placeholders

**Files:**
- Sửa: `src/screen-profile.jsx` (ScreenSettings và section Tài khoản)

- [ ] **Bước 1: Các mục Phase 2 trong section Tài khoản — thêm badge "Sắp ra mắt"**

Tìm các ListRow cho "Phương thức thanh toán", "Thông báo", "Lời mời" trong ScreenProfile. Thêm badge:

```jsx
// Với mỗi mục Phase 2:
React.createElement(ListRow, {
  icon: React.createElement(MenuIcon, { icon: '💳', color: '#4CAF50' }),
  title: 'Phương thức thanh toán',
  subtitle: 'Momo, ZaloPay, ngân hàng',
  right: React.createElement(Pill, { label: 'Sắp ra mắt', color: 'gray' }),
  // Không có onClick — hoặc onClick hiện alert
  onClick: () => alert('Tính năng này sẽ có trong phiên bản tiếp theo 🚀')
})
```

Áp dụng tương tự cho: Thông báo (nhắc nợ qua Zalo), Lời mời.

- [ ] **Bước 2: ScreenSettings — các mục Phase 2 cũng thêm badge tương tự**

```jsx
// Nhắc qua Zalo trong ScreenSettings:
React.createElement(ListRow, {
  // ...
  right: React.createElement(Pill, { label: 'Phase 2', color: 'gray' }),
  onClick: () => alert('Tính năng nhắc qua Zalo sẽ có trong phiên bản tiếp theo 🚀')
})
```

- [ ] **Bước 3: Verify**

Reload → Profile → cuộn xuống → các mục Phase 2 hiện badge "Sắp ra mắt" → click → alert hiện ra.

- [ ] **Bước 4: Commit**

```bash
git add src/screen-profile.jsx
git commit -m "feat: Phase 2 features show coming-soon badge in settings"
```

---

## Checklist tự review

### Spec coverage

- [x] ADD_PICKLE_SESSION (CONFIRM_ATTENDANCE) → Task 1 + 4
- [x] Thêm buổi đánh → Task 5 (add session expense)
- [x] Xác nhận tham gia / vắng mặt → Task 4
- [x] Tính tiền sân chia đều theo số người → Task 3 (perPerson calculation)
- [x] Thêm vé lẻ → Task 6
- [x] Màn hình chọn "tôi là ai" → Task 7
- [x] Thông tin cá nhân đúng theo người đang chọn → Task 8
- [x] Nút đổi người dùng → Task 8
- [x] Phase 2 placeholders → Task 9
- [x] Session cards đều clickable (consistent UX) → Task 3

### Gaps

- `PickleMembers` tab — nút "Thêm" thành viên: dispatch ADD_PICKLE_MEMBER. Implement tương tự Task 12 của Plan A nhưng đơn giản hơn (chỉ chọn từ danh sách members không có trong fixedMembers).
- Tab Tổng quan → "Xem lịch →" navigate đến tab Buổi đánh: thêm `onClick: () => setActiveTab('sessions')` nếu tab state accessible.
