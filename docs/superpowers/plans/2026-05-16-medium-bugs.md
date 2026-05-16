# Medium Bugs Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 medium issues còn lại — empty states, date động, badge giả, filter membership, confirm settle, redirect tab, split mode tự chọn.

**Architecture:** Sửa trực tiếp 5 file JSX hiện có, không tạo file mới. App là React + Babel CDN, không có bundler/npm. Tất cả components share global scope — không có import/export. Verify bằng cách mở `http://localhost:3000` trên trình duyệt.

**Tech Stack:** React 18 (CDN), Babel (CDN), plain JSX files, localStorage state persistence, `useApp()` hook để đọc/write state qua Context + Reducer.

---

## File Structure

```
src/
  screen-groups.jsx   — Task 1 (empty state groups), Task 3 (filter membership),
                        Task 4 (confirm settle), Task 6 (split mode)
  screen-pickleball.jsx — Task 1 (empty state vé lẻ)
  screen-home.jsx     — Task 2 (xóa badge)
  screen-profile.jsx  — Task 2 (date động)
  app.jsx             — Task 5 (redirect pickle tab)
```

---

## Task 1: Empty States

**Files:**
- Modify: `src/screen-groups.jsx:53-55`
- Modify: `src/screen-pickleball.jsx:306-328`

- [ ] **Step 1: Mở file screen-groups.jsx, tìm đoạn render groups**

Tìm đoạn này (khoảng dòng 53-55):
```jsx
<div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
  {filtered.map(g => <GroupCard key={g.id} g={g} avatarStyle={tweaks.avatarStyle} onClick={() => push('group-detail', { groupId: g.id })}/>)}
</div>
```

- [ ] **Step 2: Thay thế bằng empty state có điều kiện**

```jsx
{filtered.length === 0 ? (
  <div style={{
    textAlign: 'center', padding: '48px 24px',
    color: 'var(--text-3)', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 10,
  }}>
    <Icon name="users" size={36} color="var(--text-3)"/>
    <div style={{ fontSize: 15, fontWeight: 600 }}>Chưa có nhóm nào</div>
    <div style={{ fontSize: 13 }}>Bấm + để tạo nhóm mới</div>
  </div>
) : (
  <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
    {filtered.map(g => <GroupCard key={g.id} g={g} avatarStyle={tweaks.avatarStyle} onClick={() => push('group-detail', { groupId: g.id })}/>)}
  </div>
)}
```

- [ ] **Step 3: Mở file screen-pickleball.jsx, tìm hàm PickleExternal**

Tìm dòng (khoảng 305-307):
```jsx
function PickleExternal({ push, tweaks, accent, accentBg, style, pickle, meId }) {
  const tickets = [...(pickle.external || []), ...(pickle.externalTickets || [])];
  const total = tickets.reduce((a,e)=>a+e.amount, 0);
```

- [ ] **Step 4: Thêm early return empty state ngay sau dòng tính `total`**

```jsx
function PickleExternal({ push, tweaks, accent, accentBg, style, pickle, meId }) {
  const tickets = [...(pickle.external || []), ...(pickle.externalTickets || [])];
  const total = tickets.reduce((a,e)=>a+e.amount, 0);

  if (tickets.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Icon name="ticket" size={32} color="var(--text-3)"/>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Chưa có vé lẻ nào</div>
          <div style={{ fontSize: 12 }}>Bấm "Thêm buổi vé lẻ" để ghi lại</div>
        </div>
        <Button variant="primary" full size="lg" icon="plus" onClick={() => push('add-external-ticket')}>Thêm buổi vé lẻ</Button>
      </div>
    );
  }
  // ... phần còn lại của hàm giữ nguyên
```

- [ ] **Step 5: Verify trên browser**

Mở `http://localhost:3000`, vào tab Groups — bấm filter "Cân bằng" hoặc tạo tình huống không có nhóm nào → phải thấy icon + text "Chưa có nhóm nào".

Vào tab Pickleball → tab "Vé lẻ" → nếu chưa có vé lẻ → phải thấy empty state.

- [ ] **Step 6: Commit**

```bash
git add src/screen-groups.jsx src/screen-pickleball.jsx
git commit -m "feat: add empty states for groups list and external tickets"
```

---

## Task 2: Xóa Badge Giả + Date Động

**Files:**
- Modify: `src/screen-home.jsx:61-62`
- Modify: `src/screen-profile.jsx:83`

- [ ] **Step 1: Xóa badge đỏ trong screen-home.jsx**

Tìm đoạn này (dòng ~60-63):
```jsx
<button style={iconBtnStyle()} onClick={() => push('notifications')}>
  <Icon name="bell" size={20} color="var(--text-1)"/>
  <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: 'var(--vb-danger-600)', boxShadow: '0 0 0 2px var(--surface-1)' }}></span>
</button>
```

Xóa chỉ dòng `<span ...></span>`, giữ nguyên button và Icon:
```jsx
<button style={iconBtnStyle()} onClick={() => push('notifications')}>
  <Icon name="bell" size={20} color="var(--text-1)"/>
</button>
```

- [ ] **Step 2: Thêm date động trong screen-profile.jsx**

Tìm component `ScreenProfile` (dòng đầu của function). Thêm ngay sau dòng khai báo `const { state } = useApp();`:
```jsx
const now = new Date();
const currentMonthLabel = `Tháng ${now.getMonth() + 1}`;
```

- [ ] **Step 3: Thay hardcode "Tháng 5" bằng biến**

Tìm dòng 83:
```jsx
<SectionHeader title="Chi tiêu theo loại" action="Tháng 5" onAction={() => {}}/>
```

Sửa thành:
```jsx
<SectionHeader title="Chi tiêu theo loại" action={currentMonthLabel} onAction={() => {}}/>
```

- [ ] **Step 4: Verify trên browser**

Mở Home → nút chuông không còn chấm đỏ nữa.
Vào tab Cá nhân → section "Chi tiêu theo loại" hiện đúng tháng hiện tại (không phải "Tháng 5" cứng).

- [ ] **Step 5: Commit**

```bash
git add src/screen-home.jsx src/screen-profile.jsx
git commit -m "fix: remove hardcoded notification badge + dynamic month label in profile"
```

---

## Task 3: Filter Groups theo Membership

**Files:**
- Modify: `src/screen-groups.jsx` — phần tính `filtered` (khoảng dòng 40-55)

- [ ] **Step 1: Tìm phần tính `filtered` trong ScreenGroups**

Tìm đoạn có `filter === 'all'` hay `filter === 'owe'` v.v. — thường ở gần đầu component `ScreenGroups`.

- [ ] **Step 2: Thêm filter membership trước filter tab**

Thêm dòng lọc `myGroups` từ `state.groups`, rồi thay `state.groups` bằng `myGroups` trong tất cả filter:

```jsx
const meId = state.currentUserId || ME;
const myGroups = state.groups.filter(g => Array.isArray(g.members) && g.members.includes(meId));

const filtered =
  filter === 'all'     ? myGroups :
  filter === 'owe'     ? myGroups.filter(g => groupNet(g, meId) < 0) :
  filter === 'owed'    ? myGroups.filter(g => groupNet(g, meId) > 0) :
  filter === 'settled' ? myGroups.filter(g => groupNet(g, meId) === 0) :
  myGroups;
```

**Lưu ý:** Nếu `meId` và `filtered` đã được khai báo trước đó trong component, chỉ sửa phần tính `myGroups` và cập nhật lại chỗ `filtered` dùng `state.groups` thành `myGroups`. Không khai báo trùng `const meId`.

- [ ] **Step 3: Verify trên browser**

Chọn user "Phương Vy" (u5) — tab Groups chỉ hiển thị nhóm có u5 là thành viên (Du lịch Đà Lạt, Sinh nhật sếp, Team building).
Chọn lại "Bạn" (u1) — hiển thị đủ 4 nhóm.

- [ ] **Step 4: Commit**

```bash
git add src/screen-groups.jsx
git commit -m "fix: filter groups list to only show groups where current user is a member"
```

---

## Task 4: Confirm trước khi Settle Debt

**Files:**
- Modify: `src/screen-groups.jsx:202-255` — component `GroupBalance`

- [ ] **Step 1: Tìm component GroupBalance**

Tìm `function GroupBalance({ g, balance, avatarStyle, meId })` (khoảng dòng 202).

- [ ] **Step 2: Thêm state confirmId vào đầu component**

Ngay sau dòng `const { state, dispatch, genId } = useApp();` (hoặc thêm `useApp()` nếu chưa có), thêm:
```jsx
const { state, dispatch, genId } = useApp();
const [confirmId, setConfirmId] = useState(null);
```

Kiểm tra: nếu `GroupBalance` chưa gọi `useApp()`, thêm dòng đó. Nếu đã có `dispatch` từ props thì giữ nguyên — chỉ cần thêm `useState(null)`.

- [ ] **Step 3: Tìm nút "Trả" trong GroupBalance**

Tìm đoạn render nút "Trả" (khoảng dòng 238-255):
```jsx
<button onClick={positive ? undefined : () => dispatch({
  type: 'SETTLE_DEBT',
  groupId: g.id,
  ...
})}>
  {positive ? 'Nhắc' : 'Trả'}
</button>
```

- [ ] **Step 4: Thay nút "Trả" bằng confirm flow**

```jsx
{positive ? (
  <button style={{
    appearance: 'none', cursor: 'pointer', height: 28, padding: '0 10px',
    background: 'var(--brand-soft)', color: 'var(--brand-1)',
    border: 0, borderRadius: 8, fontWeight: 700, fontSize: 12,
  }}>Nhắc</button>
) : confirmId === id ? (
  <div style={{ display: 'flex', gap: 6 }}>
    <button
      onClick={() => setConfirmId(null)}
      style={{
        appearance: 'none', cursor: 'pointer', height: 28, padding: '0 8px',
        background: 'var(--surface-2)', color: 'var(--text-2)',
        border: 0, borderRadius: 8, fontWeight: 700, fontSize: 11,
      }}>Hủy</button>
    <button
      onClick={() => {
        dispatch({
          type: 'SETTLE_DEBT',
          groupId: g.id,
          settlement: {
            id: genId(),
            fromId: meId,
            toId: id,
            amount: Math.abs(v),
            date: new Date().toLocaleDateString('vi-VN'),
          },
        });
        setConfirmId(null);
      }}
      style={{
        appearance: 'none', cursor: 'pointer', height: 28, padding: '0 8px',
        background: 'var(--brand-1)', color: '#fff',
        border: 0, borderRadius: 8, fontWeight: 700, fontSize: 11,
      }}>✓ {fmtVND(Math.abs(v))}</button>
  </div>
) : (
  <button
    onClick={() => setConfirmId(id)}
    style={{
      appearance: 'none', cursor: 'pointer', height: 28, padding: '0 10px',
      background: 'var(--brand-1)', color: '#fff',
      border: 0, borderRadius: 8, fontWeight: 700, fontSize: 12,
    }}>Trả</button>
)}
```

**Context:** `id` là memberId từ vòng lặp `Object.entries(balance)`, `v` là giá trị balance (âm = bạn nợ họ, dương = họ nợ bạn), `positive = v > 0`.

- [ ] **Step 5: Verify trên browser**

Vào Groups → chọn nhóm → tab Số dư → bấm "Trả" → phải thấy 2 nút "Hủy" và "✓ XXXk" xuất hiện.
Bấm "Hủy" → về nút "Trả" ban đầu.
Bấm "✓ XXXk" → balance được cập nhật, nút biến mất.

- [ ] **Step 6: Commit**

```bash
git add src/screen-groups.jsx
git commit -m "fix: add confirm step before settling debt in GroupBalance"
```

---

## Task 5: Redirect Tab khi Tắt Pickleball

**Files:**
- Modify: `src/app.jsx:288` — `TweakToggle` cho `showPickleball`

- [ ] **Step 1: Tìm TweakToggle showPickleball trong app.jsx**

Tìm dòng (khoảng 288):
```jsx
<TweakToggle label="Bật tab Pickleball" value={t.showPickleball} onChange={(v) => setTweak('showPickleball', v)}/>
```

- [ ] **Step 2: Thêm redirect logic vào onChange**

```jsx
<TweakToggle
  label="Bật tab Pickleball"
  value={t.showPickleball}
  onChange={(v) => {
    setTweak('showPickleball', v);
    if (!v && activeTab === 'pickle') switchTab('home');
  }}
/>
```

**Giải thích:** `activeTab` và `switchTab` đã có sẵn trong scope của component `App` — không cần import thêm gì.

- [ ] **Step 3: Verify trên browser**

Vào tab Pickleball → mở Tweaks panel (góc phải) → tắt "Bật tab Pickleball" → app phải tự chuyển về tab Trang chủ ngay lập tức.

- [ ] **Step 4: Commit**

```bash
git add src/app.jsx
git commit -m "fix: redirect to home tab when Pickleball tab is disabled while active"
```

---

## Task 6: Split Mode "Tự chọn"

**Files:**
- Modify: `src/screen-groups.jsx:365-375` (handleSave)
- Modify: `src/screen-groups.jsx:505-518` (tabs UI)
- Modify: `src/screen-groups.jsx` — state và UI tab Tự chọn

Đây là task lớn nhất — chia thành các bước nhỏ.

- [ ] **Step 1: Tìm state declarations trong ScreenAddExpense**

Tìm `function ScreenAddExpense` và các `useState` ở đầu. Thêm state mới:
```jsx
const [customAmounts, setCustomAmounts] = useState({});
```
Đặt ngay sau các useState khác (paidBy, participants, splitMode, v.v.).

- [ ] **Step 2: Thêm useEffect để init customAmounts khi switch sang tab Tự chọn**

Thêm sau các useState:
```jsx
const { useEffect } = React;

useEffect(() => {
  if (splitMode !== 'custom' || participants.length === 0 || num <= 0) return;
  setCustomAmounts(prev => {
    const per = Math.round(num / participants.length);
    const result = {};
    participants.forEach((id, i) => {
      result[id] = prev[id] !== undefined ? prev[id]
        : (i === participants.length - 1 ? num - per * (participants.length - 1) : per);
    });
    return result;
  });
}, [splitMode, participants.join(','), num]);
```

**Lưu ý:** `useEffect` đã được destructure từ React ở đầu file (`const { useState, useEffect, ... } = React;`). Nếu chưa có `useEffect` trong destructure, thêm vào.

- [ ] **Step 3: Tính canSave để dùng cho nút Lưu**

Tìm phần tính điều kiện enable nút Lưu (thường là `num > 0 && title`). Thêm validation custom:
```jsx
const customTotal = splitMode === 'custom'
  ? participants.reduce((s, id) => s + (customAmounts[id] || 0), 0)
  : num;
const canSave = num > 0 && title.trim() && (splitMode !== 'custom' || customTotal === num);
```

- [ ] **Step 4: Sửa tabs UI — thay "Phần" và "%" bằng "Tự chọn"**

Tìm đoạn (dòng ~506-510):
```jsx
{ id: 'equal',   label: 'Chia đều',   icon: 'split'   },
{ id: 'parts',   label: 'Theo phần',  icon: 'fraction' },
{ id: 'percent', label: '%',          icon: 'percent'  },
```

Sửa thành:
```jsx
{ id: 'equal',  label: 'Chia đều', icon: 'split' },
{ id: 'custom', label: 'Tự chọn',  icon: 'edit'  },
```

- [ ] **Step 5: Thêm UI cho tab Tự chọn**

Tìm phần render nội dung split mode (phần render khi `splitMode === 'parts'` hoặc `splitMode === 'percent'`). Thay toàn bộ phần đó bằng:

```jsx
{splitMode === 'custom' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
    {participants.map(id => (
      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar member={M[id]} size={32} style={tweaks.avatarStyle}/>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
          {M[id].short}
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={customAmounts[id] !== undefined ? customAmounts[id] : ''}
          onChange={(e) => {
            const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
            setCustomAmounts(prev => ({ ...prev, [id]: val }));
          }}
          style={{
            width: 100, textAlign: 'right', padding: '6px 10px',
            border: '1.5px solid var(--border-1)', borderRadius: 8,
            fontFamily: 'var(--vb-font-body)', fontSize: 14, fontWeight: 600,
            color: 'var(--text-1)', background: 'var(--surface-1)',
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-2)', minWidth: 12 }}>₫</span>
      </div>
    ))}
    <div style={{
      fontSize: 12, fontWeight: 700, textAlign: 'right', marginTop: 4,
      color: customTotal === num ? 'var(--vb-success-700)' : 'var(--vb-danger-700)',
    }}>
      {customTotal === num
        ? `✓ Đủ ${fmtVND(num)}`
        : customTotal < num
          ? `Còn thiếu ${fmtVND(num - customTotal)}`
          : `Vượt ${fmtVND(customTotal - num)}`}
    </div>
  </div>
)}
```

- [ ] **Step 6: Sửa nút Lưu dùng canSave**

Tìm nút Lưu trong `<Header>` (có style background phụ thuộc vào điều kiện). Sửa từ:
```jsx
background: num > 0 && title ? 'var(--brand-1)' : 'var(--surface-2)',
color: num > 0 && title ? '#fff' : 'var(--text-3)',
```
thành:
```jsx
background: canSave ? 'var(--brand-1)' : 'var(--surface-2)',
color: canSave ? '#fff' : 'var(--text-3)',
```

- [ ] **Step 7: Sửa handleSave để lưu custom splits**

Tìm hàm `handleSave` (dòng ~365). Thay phần tính `splits`:

```jsx
function handleSave() {
  if (!title.trim() || num <= 0) return;
  if (participants.length === 0) return;
  if (splitMode === 'custom') {
    const total = participants.reduce((s, id) => s + (customAmounts[id] || 0), 0);
    if (total !== num) return;
  }

  let splits;
  if (splitMode === 'custom') {
    splits = participants.map(id => ({
      memberId: id,
      amount: customAmounts[id] || 0,
    }));
  } else {
    // equal split
    const per = Math.round(num / participants.length);
    splits = participants.map((id, i) => ({
      memberId: id,
      amount: i === participants.length - 1
        ? num - per * (participants.length - 1)
        : per,
    }));
  }

  const expense = {
    id: existing?.id || genId(),
    title: title.trim(),
    amount: num,
    paidBy,
    splitMode,
    participants,
    splits,
    date: existing?.date || date,
    cat,
    createdAt: existing?.createdAt || new Date().toISOString(),
    ...(existing ? { updatedAt: new Date().toISOString() } : {}),
  };

  if (existing) {
    dispatch({ type: 'EDIT_EXPENSE', groupId: g.id, expense });
  } else {
    dispatch({ type: 'ADD_EXPENSE', groupId: g.id, expense });
  }
  pop();
}
```

- [ ] **Step 8: Verify trên browser**

Vào Groups → nhóm bất kỳ → bấm "+" thêm chi tiêu → chọn tab "Tự chọn":
- Phải thấy list input cho từng thành viên với giá trị khởi tạo chia đều
- Thay đổi 1 input → realtime total cập nhật
- Nếu tổng ≠ amount → dòng đỏ "Còn thiếu..." + nút Lưu mờ
- Khi tổng = amount → dòng xanh "✓ Đủ..." + nút Lưu sáng
- Bấm Lưu → expense được thêm với splits chính xác

- [ ] **Step 9: Commit**

```bash
git add src/screen-groups.jsx
git commit -m "feat: implement custom split mode with per-member amount inputs and realtime validation"
```

---

## Self-Review Checklist

**Spec coverage:**
- Issue 1 (empty states groups) → Task 1 Step 1-2 ✓
- Issue 2 (empty states vé lẻ) → Task 1 Step 3-4 ✓
- Issue 3 (xóa badge) → Task 2 Step 1 ✓
- Issue 4 (date động) → Task 2 Step 2-3 ✓
- Issue 5 (filter membership) → Task 3 ✓
- Issue 6 (confirm settle) → Task 4 ✓
- Issue 7 (redirect pickle tab) → Task 5 ✓
- Issue 8 (split mode) → Task 6 ✓

**Không có placeholder, TBD, hay "similar to Task N"** ✓

**Type consistency:** `customAmounts` dùng nhất quán từ Task 6 Step 1 đến Step 7. `canSave` định nghĩa Step 3, dùng Step 6. `meId` dùng trong Task 3 và Task 4 đều là `state.currentUserId || ME` ✓
