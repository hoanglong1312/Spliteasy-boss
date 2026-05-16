# Bug Fixes Post-Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa tất cả lỗi phát sinh sau Sub-project 1: crash do `M = {}` rỗng, pickle null, "Đổi người dùng" crash, icon log-out thiếu, ScreenNotifications hardcode, không tạo được nhóm mới.

**Architecture:** React 18 + Babel CDN, global scope, không bundler. Fix theo nguyên tắc "shadow global M bằng local getMemberMap(state.members)" trong mỗi component cần dùng. Không refactor lớn — chỉ patch đúng chỗ cần thiết.

**Tech Stack:** React CDN, JSX, localStorage, global function components.

---

## File Structure

| File | Fixes |
|------|-------|
| `src/data.jsx` | Thêm `getMemberMap` helper |
| `src/store.jsx` | Fix pickle default state, thêm `ADD_MEMBER` action |
| `src/components.jsx` | Thêm icon `log-out` |
| `src/screen-home.jsx` | Fix `meMember` crash + `ActivityRow` dùng local M |
| `src/screen-profile.jsx` | Fix `me` crash + fix "Đổi người dùng" → LOGOUT |
| `src/screen-groups.jsx` | Fix M trong 4 sub-components + ScreenNotifications + group creation |
| `src/screen-pickleball.jsx` | Guard `state.pickle` null |

---

## Task 1: Thêm getMemberMap helper vào data.jsx

**Files:**
- Modify: `src/data.jsx`

Context: Hiện tại `const M = Object.fromEntries(MEMBERS.map(m => [m.id, m]))` → `M = {}` vì `MEMBERS = []`. Mọi `M[id]` đều undefined → crash. Fix: thêm helper `getMemberMap(members)` để các screen tự build local M từ `state.members`.

- [ ] **Step 1: Tìm dòng `const M = ...` trong data.jsx**

  Dòng 25:
  ```js
  const M = Object.fromEntries(MEMBERS.map(m => [m.id, m]));
  ```

- [ ] **Step 2: Thêm getMemberMap NGAY SAU dòng đó**

  Thêm function này sau dòng 25 (sau `const M = ...`):
  ```js
  // Build a member lookup map from a members array.
  // Call this at the top of any component that needs M:
  //   const M = getMemberMap(state.members);
  function getMemberMap(members) {
    return Object.fromEntries((members || []).map(m => [m.id, m]));
  }
  ```

  File sau khi sửa (dòng 23-28):
  ```js
  const MEMBERS = []; // Cleared — users are now dynamic via state.members
  const M = Object.fromEntries(MEMBERS.map(m => [m.id, m]));
  const ME = ''; // fallback — not used after login

  function getMemberMap(members) {
    return Object.fromEntries((members || []).map(m => [m.id, m]));
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/data.jsx
  git commit -m "fix: add getMemberMap helper for dynamic member lookup"
  ```

---

## Task 2: Fix store.jsx — Pickle default state + ADD_MEMBER action

**Files:**
- Modify: `src/store.jsx`

Context: `pickle: null` → crash khi mở tab Pickleball. Cần khởi tạo pickle với struct hợp lệ. Đồng thời thêm `ADD_MEMBER` action để ScreenNewGroup có thể thêm thành viên placeholder.

- [ ] **Step 1: Tìm `buildInitialState` trong store.jsx**

  Hiện tại (dòng 8-17):
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

- [ ] **Step 2: Thay `pickle: null` bằng default object**

  ```js
  function buildInitialState() {
    return {
      currentUserId: null,
      currentUserName: null,
      members: [],
      groups: [],
      pickle: {
        sessions: [],
        upcoming: [],
        fixedMembers: [],
        externalTickets: [],
        monthlyCourtFee: 0,
        guestFeePerSession: 0,
      },
      notifications: [],
    };
  }
  ```

- [ ] **Step 3: Thêm ADD_MEMBER action vào reducer**

  Tìm `case 'ADD_GROUP':` (khoảng dòng 51). Thêm TRƯỚC nó:
  ```js
  case 'ADD_MEMBER': {
    const { member } = action;
    const alreadyExists = state.members.some(m => m.id === member.id);
    return {
      ...state,
      members: alreadyExists ? state.members : [...state.members, member],
    };
  }
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/store.jsx
  git commit -m "fix: default pickle state, add ADD_MEMBER action"
  ```

---

## Task 3: Thêm icon log-out vào components.jsx

**Files:**
- Modify: `src/components.jsx`

Context: Nút Đăng xuất trong screen-profile.jsx dùng `<Icon name="log-out" .../>` nhưng Icon component không có case này. Icon hiện ra null.

- [ ] **Step 1: Tìm `default: return null;` trong Icon switch**

  Cuối switch (dòng 52):
  ```js
    default: return null;
  }
  ```

- [ ] **Step 2: Thêm case `log-out` TRƯỚC default**

  ```js
    case 'log-out': return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
    default: return null;
  ```

  Kết quả (2 dòng cuối của switch):
  ```js
    case 'log-out': return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
    default: return null;
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/components.jsx
  git commit -m "fix: add log-out icon to Icon component"
  ```

---

## Task 4: Fix screen-home.jsx — meMember crash + ActivityRow local M

**Files:**
- Modify: `src/screen-home.jsx`

Có 2 điểm crash:

**4a.** `ScreenHome` dòng 8: `const meMember = members.find(m => m.id === meId) || M[ME];`
- `M[ME]` = `M['']` = `undefined` → crash khi gọi `meMember.name` ở dòng 34.

**4b.** `ActivityRow` dòng 437: `M[e.paidBy].short` — `ActivityRow` đã có `useApp()` nhưng chưa build local M.

- [ ] **Step 1: Fix meMember fallback (dòng 8)**

  Tìm:
  ```js
  const meMember = members.find(m => m.id === meId) || M[ME];
  ```
  Thay bằng:
  ```js
  const meMember = members.find(m => m.id === meId) || {
    name: state.currentUserName || 'Bạn',
    short: state.currentUserName || 'Bạn',
    initials: (state.currentUserName || 'B')[0].toUpperCase(),
    color: '#574EFA',
    isMe: true,
  };
  ```

  Lưu ý: `state` đã có sẵn từ `const { state } = useApp();` ở dòng 5.

- [ ] **Step 2: Thêm local M vào ActivityRow**

  Tìm `function ActivityRow({ e, divider, avatarStyle, showGroup })` (dòng 421). Bên trong function, sau dòng:
  ```js
  const { state: _s } = useApp();
  const me = _s.currentUserId || ME;
  ```
  Thêm:
  ```js
  const M = getMemberMap(_s.members);
  ```

- [ ] **Step 3: Fix safe access cho M[e.paidBy] trong ActivityRow (dòng 437)**

  Tìm:
  ```js
  {M[e.paidBy].short === 'Bạn' ? 'Bạn trả' : `${M[e.paidBy].short} trả`} {fmtVND(e.amount)} • {e.date}
  ```
  Thay bằng:
  ```js
  {(() => {
    const payer = M[e.paidBy] || { short: '?' };
    return payer.short === 'Bạn' || e.paidBy === me ? 'Bạn trả' : `${payer.short} trả`;
  })()} {fmtVND(e.amount)} • {e.date}
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/screen-home.jsx
  git commit -m "fix: safe meMember fallback and ActivityRow local M in screen-home"
  ```

---

## Task 5: Fix screen-profile.jsx — me crash + Đổi người dùng button

**Files:**
- Modify: `src/screen-profile.jsx`

Hai bugs:

**5a.** Dòng 9: `const me = state.members.find(m => m.id === meId) || M[ME];` → fallback undefined.

**5b.** Dòng 57: dispatch `SET_CURRENT_USER` với `userId: null` → `action.userName.trim()` crash vì `action.userName` là undefined.

- [ ] **Step 1: Fix `me` fallback (dòng 9)**

  Tìm:
  ```js
  const me = state.members.find(m => m.id === meId) || M[ME];
  ```
  Thay bằng:
  ```js
  const me = state.members.find(m => m.id === meId) || {
    name: state.currentUserName || 'Bạn',
    short: state.currentUserName || 'Bạn',
    initials: (state.currentUserName || 'B')[0].toUpperCase(),
    color: '#574EFA',
    isMe: true,
  };
  ```

- [ ] **Step 2: Fix "Đổi người dùng" button (dòng 57)**

  Tìm:
  ```js
  <button onClick={() => dispatch({ type: 'SET_CURRENT_USER', userId: null })} style={{
  ```
  Thay bằng:
  ```js
  <button onClick={() => { if (window.confirm('Đăng xuất để đổi tài khoản?')) dispatch({ type: 'LOGOUT' }); }} style={{
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/screen-profile.jsx
  git commit -m "fix: safe me fallback and fix Đổi người dùng button to use LOGOUT"
  ```

---

## Task 6: Fix screen-groups.jsx — Local M + ScreenNotifications + Group creation

**Files:**
- Modify: `src/screen-groups.jsx`

Đây là task lớn nhất. Chia thành 4 sub-steps.

### 6a — GroupBalance: thêm local M

- [ ] **Step 1: Tìm `function GroupBalance({ g, balance, avatarStyle, meId })`**

  Khoảng dòng 209. Hiện tại:
  ```js
  function GroupBalance({ g, balance, avatarStyle, meId }) {
    const { dispatch, genId } = useApp();
    const [confirmId, setConfirmId] = useState(null);
  ```

  Thêm `state` vào destructure + thêm local M:
  ```js
  function GroupBalance({ g, balance, avatarStyle, meId }) {
    const { state, dispatch, genId } = useApp();
    const M = getMemberMap(state.members);
    const [confirmId, setConfirmId] = useState(null);
  ```

### 6b — GroupMembers: thêm useApp + local M

- [ ] **Step 2: Tìm `function GroupMembers({ g, balance, avatarStyle })`**

  Khoảng dòng 297. Hiện tại:
  ```js
  function GroupMembers({ g, balance, avatarStyle }) {
    return (
  ```

  Thêm useApp + local M:
  ```js
  function GroupMembers({ g, balance, avatarStyle }) {
    const { state } = useApp();
    const M = getMemberMap(state.members);
    return (
  ```

### 6c — ScreenExpenseDetail + ScreenAddExpense: thêm local M

- [ ] **Step 3: Tìm `function ScreenExpenseDetail({ params, push, pop, tweaks })`**

  Khoảng dòng 317. Hiện tại:
  ```js
  function ScreenExpenseDetail({ params, push, pop, tweaks }) {
    const { state, dispatch } = useApp();
  ```

  Thêm local M ngay sau:
  ```js
  function ScreenExpenseDetail({ params, push, pop, tweaks }) {
    const { state, dispatch } = useApp();
    const M = getMemberMap(state.members);
  ```

- [ ] **Step 4: Tìm `function ScreenAddExpense({ params, push, pop, tweaks })`**

  Khoảng dòng 375. Hiện tại:
  ```js
  function ScreenAddExpense({ params, push, pop, tweaks }) {
    const { state, dispatch, genId } = useApp();
  ```

  Thêm local M ngay sau:
  ```js
  function ScreenAddExpense({ params, push, pop, tweaks }) {
    const { state, dispatch, genId } = useApp();
    const M = getMemberMap(state.members);
  ```

### 6d — ScreenNotifications: dùng state.notifications + empty state

- [ ] **Step 5: Tìm `function ScreenNotifications({ pop, tweaks })`**

  Khoảng dòng 868. Hiện tại toàn bộ function là hardcode với `u2/u3/u4/u9`.

  Thay TOÀN BỘ function bằng:
  ```jsx
  function ScreenNotifications({ pop, tweaks }) {
    const { state } = useApp();
    const M = getMemberMap(state.members);
    const items = state.notifications || [];
    return (
      <div style={{ paddingBottom: 32 }}>
        <NavHeader title="Thông báo" onBack={pop}/>
        <div style={{ padding: 16 }}>
          {items.length === 0 ? (
            <EmptyState
              icon="bell"
              title="Chưa có thông báo"
              subtitle="Hoạt động của nhóm sẽ xuất hiện ở đây"
            />
          ) : (
            <Card>
              {items.map((n, i) => {
                const member = M[n.who] || { name: n.who || 'Ai đó', initials: '?', color: '#999', short: '?' };
                return (
                  <ListRow key={n.id}
                    left={<Avatar member={member} size={40} style={tweaks.avatarStyle}/>}
                    title={<><b>{member.name}</b> {n.text}</>}
                    subtitle={`${n.group} • ${n.when}`}
                    divider={i < items.length - 1}
                  />
                );
              })}
            </Card>
          )}
        </div>
      </div>
    );
  }
  ```

### 6e — ScreenNewGroup: cho phép tạo nhóm với 1 người + thêm thành viên bằng tên

- [ ] **Step 6: Tìm `function ScreenNewGroup({ params, pop, tweaks })`**

  Khoảng dòng 765. Thêm state cho inline member input:
  
  Tìm các `useState` hiện có trong function:
  ```js
  const [name, setName] = useState(existingGroup?.name || '');
  const [emoji, setEmoji] = useState(existingGroup?.emoji || '🎯');
  const [selected, setSelected] = useState(existingGroup?.members || [myId]);
  ```
  
  Thêm NGAY SAU 3 dòng đó:
  ```js
  const [newMemberName, setNewMemberName] = useState('');
  ```

- [ ] **Step 7: Thêm handler thêm thành viên mới trong ScreenNewGroup**

  Tìm `function handleCreate()` (khoảng dòng 785). Thêm function `handleAddMember` NGAY TRƯỚC `handleCreate`:
  ```js
  function handleAddMember() {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    const newId = 'u_' + Math.random().toString(36).slice(2, 10);
    const words = trimmed.split(' ');
    const newMem = {
      id: newId,
      name: trimmed,
      short: words[words.length - 1],
      initials: words.map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      color: ['#574EFA','#E040FB','#F4511E','#0B8043','#039BE5'][Math.floor(Math.random()*5)],
      isMe: false,
    };
    dispatch({ type: 'ADD_MEMBER', member: newMem });
    setSelected(s => [...s, newId]);
    setNewMemberName('');
  }
  ```

- [ ] **Step 8: Thay validation từ `selected.length < 2` sang `< 1`**

  Tìm (khoảng dòng 786):
  ```js
  if (!name.trim() || selected.length < 2) return;
  ```
  Thay bằng:
  ```js
  if (!name.trim() || selected.length < 1) return;
  ```

- [ ] **Step 9: Cập nhật nút Tạo để reflect điều kiện mới**

  Tìm (khoảng dòng 817):
  ```js
  background: name && selected.length > 1 ? 'var(--brand-1)' : 'var(--surface-2)',
  color: name && selected.length > 1 ? '#fff' : 'var(--text-3)',
  ```
  Thay bằng:
  ```js
  background: name && selected.length >= 1 ? 'var(--brand-1)' : 'var(--surface-2)',
  color: name && selected.length >= 1 ? '#fff' : 'var(--text-3)',
  ```

- [ ] **Step 10: Thêm UI "Thêm thành viên" vào FormRow Members**

  Tìm (khoảng dòng 843):
  ```jsx
  <FormRow label={`Thành viên (${selected.length})`} icon="users">
    <Card>
      {state.members.map((m, i) => {
  ```

  Thêm input row NGAY TRƯỚC closing `</Card>` của FormRow Members.
  Tìm đoạn sau khi map kết thúc — khoảng dòng 860:
  ```jsx
          </Card>
        </FormRow>
  ```
  Thay bằng:
  ```jsx
          {/* Thêm thành viên mới bằng tên */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px',
            borderTop: '1px solid var(--border-1)',
          }}>
            <input
              value={newMemberName}
              onChange={e => setNewMemberName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddMember()}
              placeholder="Thêm thành viên bằng tên..."
              style={{
                flex: 1, height: 34, padding: '0 10px',
                background: 'var(--surface-2)', border: '1px solid var(--border-1)',
                borderRadius: 8, fontFamily: 'var(--vb-font-body)', fontSize: 13,
                color: 'var(--text-1)', outline: 'none',
              }}
            />
            <button
              onClick={handleAddMember}
              disabled={!newMemberName.trim()}
              style={{
                appearance: 'none', height: 34, padding: '0 12px',
                background: newMemberName.trim() ? 'var(--brand-1)' : 'var(--surface-2)',
                color: newMemberName.trim() ? '#fff' : 'var(--text-3)',
                border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13,
                cursor: newMemberName.trim() ? 'pointer' : 'default',
              }}
            >+</button>
          </div>
        </Card>
      </FormRow>
  ```

- [ ] **Step 11: Commit**

  ```bash
  git add src/screen-groups.jsx
  git commit -m "fix: local M in GroupBalance/GroupMembers/ExpenseDetail/AddExpense, fix ScreenNotifications, allow group creation with member input"
  ```

---

## Task 7: Fix screen-pickleball.jsx — Guard pickle null

**Files:**
- Modify: `src/screen-pickleball.jsx`

Context: Dù đã fix pickle default ở Task 2, vẫn cần guard cho trường hợp user có localStorage cũ với `pickle: null` (dù đã bump version v3 — an toàn hơn vẫn nên guard).

- [ ] **Step 1: Tìm `ScreenPickleball` function và thêm pickle guard**

  Hiện tại dòng 7:
  ```js
  const summary = useMemo(() => pickleSummary(state.pickle), [state.pickle]);
  ```

  Tìm dòng sử dụng state.pickle.sessions đầu tiên (dòng 58):
  ```js
  {state.pickle.sessions.length} buổi cố định • {state.pickle.fixedMembers.length} thành viên
  ```

  Thêm constant `pickle` ở đầu `ScreenPickleball`, ngay sau dòng `const meId = ...`:
  ```js
  const pickle = state.pickle || {
    sessions: [], upcoming: [], fixedMembers: [],
    externalTickets: [], monthlyCourtFee: 0, guestFeePerSession: 0,
  };
  ```
  
  Sau đó thay `state.pickle.sessions.length` → `pickle.sessions.length`, `state.pickle.fixedMembers.length` → `pickle.fixedMembers.length` ở dòng 58.
  
  Và thay mọi `state.pickle` trong component body bằng `pickle` (trừ dòng useMemo vì nó dùng state.pickle để trigger re-compute khi state đổi — đó là đúng).

  **Verify:** Tìm tất cả `state.pickle.` trong ScreenPickleball (không phải trong useMemo deps) và thay bằng `pickle.`:
  ```
  state.pickle.sessions → pickle.sessions
  state.pickle.fixedMembers → pickle.fixedMembers
  state.pickle.externalTickets → pickle.externalTickets
  state.pickle.monthlyCourtFee → pickle.monthlyCourtFee
  state.pickle.guestFeePerSession → pickle.guestFeePerSession
  state.pickle.upcoming → pickle.upcoming
  ```

- [ ] **Step 2: Fix useMemo summary**

  Tìm:
  ```js
  const summary = useMemo(() => pickleSummary(state.pickle), [state.pickle]);
  ```
  Thay bằng:
  ```js
  const summary = useMemo(() => pickleSummary(state.pickle || {}), [state.pickle]);
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/screen-pickleball.jsx
  git commit -m "fix: guard state.pickle null in screen-pickleball"
  ```

---

## Self-Review Checklist

- [x] CRITICAL #1 (M = {}) → Task 1 (getMemberMap) + Task 4, 5, 6 (local M in each component)
- [x] CRITICAL #2 (pickle null crash) → Task 2 (default state) + Task 7 (null guard)
- [x] CRITICAL #3 (Đổi người dùng crash) → Task 5 Step 2
- [x] CRITICAL #4 (meMember undefined) → Task 4 Step 1
- [x] IMPORTANT #5 (không tạo được nhóm) → Task 6 Steps 6-10
- [x] IMPORTANT #6 (ScreenNotifications crash) → Task 6 Step 5
- [x] IMPORTANT #7 (ScreenAddExpense crash) → Task 6 Step 4
- [x] IMPORTANT #8 (Pickle actions null) → Task 2 + Task 7
- [x] MINOR #9 (log-out icon thiếu) → Task 3
- [x] MINOR #10 (empty states) → Task 6 Step 5 (notifications), others already handled

**Placeholder scan:** Không có TBD, TODO, hoặc vague instructions. Mọi step đều có code cụ thể.

**Type consistency:** `getMemberMap` được define ở Task 1, dùng ở Task 4/5/6 — consistent. `ADD_MEMBER` action defined ở Task 2, dispatched ở Task 6 — consistent.
