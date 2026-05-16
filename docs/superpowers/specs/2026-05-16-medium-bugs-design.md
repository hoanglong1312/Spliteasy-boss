# Medium Bugs Fix — Design Spec

**Ngày:** 2026-05-16  
**Scope:** 8 Medium issues còn lại sau khi fix 7 Critical bugs  
**Stack:** React (JSX) + CDN, không có bundler, global scope  

---

## Goal

Hoàn thiện app SpliteasyBoss để không còn lỗi nhìn thấy được khi dùng bình thường: empty states đầy đủ, ngày tháng động, không có badge giả, nút Trả có confirm, split tự chọn hoạt động thật, groups lọc đúng theo thành viên.

---

## Architecture

Không thêm file mới. Sửa trực tiếp trong 4 file:
- `src/screen-groups.jsx` — 4 fixes
- `src/screen-home.jsx` — 2 fixes
- `src/screen-pickleball.jsx` — 1 fix
- `src/app.jsx` — 1 fix
- `src/screen-profile.jsx` — 1 fix (date động)

---

## Issue 1 — Empty State: Groups list rỗng

**File:** `src/screen-groups.jsx` dòng 53-55

**Hiện tại:**
```jsx
{filtered.map(g => <GroupCard .../>)}
```

**Sửa thành:** Nếu `filtered.length === 0`, hiển thị empty state thay vì list trống im lặng.

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

---

## Issue 2 — Empty State: External tickets rỗng (Pickleball)

**File:** `src/screen-pickleball.jsx` dòng 306-328, trong `PickleExternal`

**Sửa:** Sau khi tính `tickets`, nếu `tickets.length === 0`:

```jsx
if (tickets.length === 0) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)' }}>
      <Icon name="ticket" size={32} color="var(--text-3)"/>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>Chưa có vé lẻ nào</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>Bấm "Thêm buổi vé lẻ" để ghi lại</div>
    </div>
  );
}
```

---

## Issue 3 — Xóa Notification Badge hardcode

**File:** `src/screen-home.jsx` dòng 61-62

**Hiện tại:** Có `<span>` chấm đỏ hardcode bên trong nút bell.

**Sửa:** Xóa hoàn toàn `<span>` chấm đỏ đó. Giữ nguyên nút bell icon.

```jsx
// Xóa dòng này:
<span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: 'var(--vb-danger-600)', boxShadow: '0 0 0 2px var(--surface-1)' }}></span>
```

---

## Issue 4 — Ngày tháng động thay vì hardcode

**File:** `src/screen-profile.jsx` dòng 83

**Hiện tại:**
```jsx
<SectionHeader title="Chi tiêu theo loại" action="Tháng 5" onAction={() => {}}/>
```

**Sửa:** Thêm helper lấy tháng hiện tại ở đầu component `ScreenProfile`:
```jsx
const now = new Date();
const currentMonthLabel = `Tháng ${now.getMonth() + 1}`;
```

Rồi dùng:
```jsx
<SectionHeader title="Chi tiêu theo loại" action={currentMonthLabel} onAction={() => {}}/>
```

**Lưu ý:** Kiểm tra xem screen-home.jsx và screen-groups.jsx có hardcode "Tháng 5" không — nếu có thì áp dụng tương tự.

---

## Issue 5 — Filter Groups theo Membership

**File:** `src/screen-groups.jsx` — phần tính `filtered` (trước dòng 53)

**Hiện tại:** Hiển thị tất cả groups trong `state.groups`, kể cả groups user không phải thành viên.

**Sửa:** Thêm filter membership trước filter tab:
```jsx
const meId = state.currentUserId || ME;
const myGroups = state.groups.filter(g => g.members && g.members.includes(meId));

// Sau đó dùng myGroups thay vì state.groups trong filter tab:
const filtered = filter === 'all'    ? myGroups
               : filter === 'owe'    ? myGroups.filter(g => groupNet(g, meId) < 0)
               : filter === 'owed'   ? myGroups.filter(g => groupNet(g, meId) > 0)
               : filter === 'settled'? myGroups.filter(g => groupNet(g, meId) === 0)
               : myGroups;
```

---

## Issue 6 — Nút "Trả" cần Confirm trước khi Settle

**File:** `src/screen-groups.jsx` dòng 202-255, trong `GroupBalance`

**Hiện tại:** Bấm "Trả" → dispatch `SETTLE_DEBT` ngay lập tức. Không có confirm, không chống double-click.

**Sửa:**

Thêm state `confirmId` vào component `GroupBalance`:
```jsx
const [confirmId, setConfirmId] = useState(null);
```

Logic nút "Trả" (dành cho `positive === false`, tức là bạn nợ họ):
```jsx
// Lần bấm 1: hiện confirm
onClick={() => setConfirmId(id)}

// Nếu confirmId === id → hiện 2 nút thay thế:
confirmId === id ? (
  <div style={{ display: 'flex', gap: 6 }}>
    <button onClick={() => setConfirmId(null)} style={/* style hủy */}>Hủy</button>
    <button onClick={() => {
      dispatch({ type: 'SETTLE_DEBT', groupId: g.id, settlement: {
        id: genId(), fromId: meId, toId: id,
        amount: Math.abs(v), date: new Date().toLocaleDateString('vi-VN')
      }});
      setConfirmId(null);
    }} style={/* style xác nhận */}>Xác nhận trả {fmtVND(Math.abs(v))}</button>
  </div>
) : (
  <button onClick={() => setConfirmId(id)}>Trả</button>
)
```

**Lưu ý:** `genId` cần được lấy từ `useApp()` — kiểm tra xem `GroupBalance` có gọi `useApp()` không, nếu chưa thì thêm vào.

---

## Issue 7 — Tab Pickleball Redirect khi Tắt

**File:** `src/app.jsx` dòng 288 — `TweakToggle` cho `showPickleball`

**Hiện tại:**
```jsx
<TweakToggle label="Bật tab Pickleball" value={t.showPickleball} onChange={(v) => setTweak('showPickleball', v)}/>
```

**Sửa:** Khi tắt (`v === false`) và đang ở tab pickle → switch về home:
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

---

## Issue 8 — Split Mode "Tự chọn" (Custom Amount)

**File:** `src/screen-groups.jsx` dòng 505-518 (tabs) và 365-375 (handleSave)

### 8a. Thay tab "Phần" và "%" bằng "Tự chọn"

**Sửa tabs** (dòng 506-510):
```jsx
{ id: 'equal',  label: 'Chia đều', icon: 'split' },
{ id: 'custom', label: 'Tự chọn',  icon: 'edit'  },
```
Xóa `parts` và `percent` khỏi danh sách tabs.

### 8b. Thêm state `customAmounts`

Trong `ScreenAddExpense`, thêm:
```jsx
const [customAmounts, setCustomAmounts] = useState({});
```

Khi đổi sang tab `custom` hoặc khi participants thay đổi — khởi tạo `customAmounts` bằng split đều:
```jsx
useEffect(() => {
  if (splitMode === 'custom') {
    const per = Math.round(num / participants.length);
    const init = {};
    participants.forEach((id, i) => {
      init[id] = customAmounts[id] ?? (i === participants.length - 1
        ? num - per * (participants.length - 1)
        : per);
    });
    setCustomAmounts(init);
  }
}, [splitMode, participants, num]);
```

### 8c. UI Tab "Tự chọn"

Khi `splitMode === 'custom'`, hiển thị list input cho từng participant:
```jsx
{splitMode === 'custom' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {participants.map(id => (
      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar member={M[id]} size={32} style={tweaks.avatarStyle}/>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{M[id].short}</div>
        <input
          type="text" inputMode="numeric"
          value={customAmounts[id] ?? ''}
          onChange={(e) => setCustomAmounts(prev => ({
            ...prev,
            [id]: Number(e.target.value.replace(/[^0-9]/g, '')) || 0
          }))}
          style={{ width: 100, textAlign: 'right', ...inputStyle() }}
        />
      </div>
    ))}
    {/* Realtime total */}
    {(() => {
      const total = participants.reduce((s, id) => s + (customAmounts[id] || 0), 0);
      const diff = num - total;
      return (
        <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'right',
          color: diff === 0 ? 'var(--vb-success-700)' : 'var(--vb-danger-700)' }}>
          {diff === 0 ? `✓ Đủ ${fmtVND(num)}` : `Còn thiếu ${fmtVND(Math.abs(diff))}`}
        </div>
      );
    })()}
  </div>
)}
```

### 8d. Validate và Save

Trong `handleSave` (dòng 365-375):

```jsx
function handleSave() {
  if (!title.trim() || num <= 0) return;
  if (participants.length === 0) return;

  // Validate custom mode
  if (splitMode === 'custom') {
    const total = participants.reduce((s, id) => s + (customAmounts[id] || 0), 0);
    if (total !== num) return; // disable nút Lưu nếu tổng sai
  }

  let splits;
  if (splitMode === 'custom') {
    splits = participants.map(id => ({ memberId: id, amount: customAmounts[id] || 0 }));
  } else {
    // equal split (giữ nguyên logic cũ)
    const per = Math.round(num / participants.length);
    splits = participants.map((id, i) => ({
      memberId: id,
      amount: i === participants.length - 1 ? num - per * (participants.length - 1) : per,
    }));
  }
  // ... phần còn lại của handleSave giữ nguyên
}
```

**Disable nút Lưu** khi custom mode mà tổng sai:
Trong `<Header>` component (nút Lưu), thêm điều kiện:
```jsx
const customValid = splitMode !== 'custom' || 
  participants.reduce((s, id) => s + (customAmounts[id] || 0), 0) === num;
const canSave = num > 0 && title && customValid;
// Dùng canSave thay vì (num > 0 && title) để style và disable nút Lưu
```

---

## Tóm tắt Files cần sửa

| File | Issues | Ước lượng |
|------|--------|-----------|
| `src/screen-groups.jsx` | #1 empty state, #5 filter membership, #6 confirm settle, #8 split mode | Lớn nhất |
| `src/screen-home.jsx` | #3 xóa badge | Nhỏ |
| `src/screen-pickleball.jsx` | #2 empty state vé lẻ | Nhỏ |
| `src/app.jsx` | #7 redirect khi tắt pickle tab | Nhỏ |
| `src/screen-profile.jsx` | #4 date động | Nhỏ |
