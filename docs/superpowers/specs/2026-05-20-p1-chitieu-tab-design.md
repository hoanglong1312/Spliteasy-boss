# P1 — Tab "Chi phí" Pickleball

**Goal:** Đưa form nhập chi phí thực tế (nước + phụ phát sinh) ra tab riêng trong Pickleball, thay vì nằm trong Settings modal. Tiền sân vẫn lấy từ config, không nhập thủ công.

---

## Scope

- Thêm tab **"Chi phí"** vào navigation bar Pickleball (sau tab "Lịch", trước tab "T.Viên")
- Xoá nút "Nhập chi phí sân tháng này" khỏi `PickleballSettings.jsx`
- Không thay đổi config tiền sân / thành viên / lịch trong Settings

---

## Tab "Chi phí" — Layout

### Header (dùng heroEmerald gradient như các tab Pickleball khác)
- Tiêu đề: "Chi phí tháng M/YYYY"
- Badge: "X/Y buổi đã nhập"

### Summary Strip (3 card ngang)
| Card | Nội dung |
|------|----------|
| 💧 Nước | Tổng tiền nước tháng này (đã nhập) |
| ⚡ Phát sinh | Tổng phụ phát sinh tháng này |
| ⚠ Chưa nhập | Số buổi còn thiếu data |

### Mode Toggle
Hai nút toggle: **"Theo ngày"** (default) | **"Nhập nhanh"**

---

## Mode 1 — Theo ngày (grid view)

Grid 4 cột, mỗi ô = 1 buổi đánh trong tháng:

| State | Style | Nội dung ô |
|-------|-------|------------|
| Đã nhập | emerald bg + border | ngày, số tiền nước |
| Chưa nhập (đã qua) | warning bg + border vàng | ngày, "Nhập" |
| Chưa tới | mờ opacity 0.4 | ngày, "—" |

**Tap ô "Chưa nhập" → form inline bên dưới grid:**

```
Buổi N — DD/MM THỨ
HH:mm–HH:mm · X người

[💧 Tiền nước]   [______ đ]

[⚡ Phụ phát sinh]  ▶ (collapsed)
  → tap mở:
  ┌─────────────────────────────┐
  │ Ghi chú: [_______________]  │
  │ Số tiền:          [___ đ]  │
  │ Chia cho:                   │
  │  [An ✓] [Long ✓] [Hoa] ... │
  │  [Tất cả]   = Xk/người      │
  └─────────────────────────────┘
  [+ Thêm phát sinh]

[Lưu buổi N]
```

**Chi tiết phụ phát sinh:**
- Ẩn mặc định, tap "⚡ Phụ phát sinh ▶" để mở/đóng
- Mỗi item: ghi chú (text) + số tiền + chip chọn nhiều thành viên
- Tap chip = toggle chọn/bỏ; có chip "Tất cả" để select all
- Hiển thị "= Xk/người" tự tính theo số người được chọn
- Nút "+ Thêm phát sinh" để add item thứ 2, 3...

---

## Mode 2 — Nhập nhanh (batch table)

Bảng tất cả buổi trong tháng (kể cả đã nhập):

| Ngày | 💧 Nước (đ) | ⚡ Phát sinh |
|------|-------------|--------------|
| 05/05 ✓ | [40.000] | — |
| 07/05 ✓ | [30.000] | +50k |
| 10/05 | [_____] | + Thêm |
| 12/05 | [_____] | + Thêm |

- Footer: "Tổng nước: Xđ"
- Nút "Phát sinh" trong batch chỉ là shortcut → mở form phát sinh cho buổi đó (overlay/bottom sheet nhỏ)
- Nút **[Lưu tất cả]** + **[Huỷ]**

---

## Data Flow

### Đọc dữ liệu
`buildPickleballCostTabData(state)` trong `useScreenData.js`:
```js
{
  monthLabel,          // "Tháng 5/2026"
  summary: {
    totalWater,        // tổng nước đã nhập
    totalExtra,        // tổng phụ phát sinh
    filledCount,       // số buổi đã nhập
    totalCount,        // tổng số buổi tháng này
  },
  sessions: [{
    id,
    date,              // "10/05"
    dayLabel,          // "T7"
    sessionNumber,
    timeRange,
    attendeeCount,
    state,             // 'filled' | 'missing' | 'future'
    waterAmount,       // 0 nếu chưa nhập
    extras: [{ note, amount, memberIds }]
  }]
}
```

### Ghi dữ liệu
- `onAction('saveSessionCost', { sessionId, waterAmount, extras: [{ note, amount, memberIds }] })`
- `onAction('saveBatchCosts', { sessions: [{ sessionId, waterAmount }] })`
- Handler trong `app-v2.jsx` → upsert vào `pickleball_session_items` (Supabase)

---

## DB

Dùng bảng `pickleball_session_items` đã có:
```sql
session_id UUID
name TEXT          -- "Nước" hoặc nội dung ghi chú phụ phát sinh
amount INTEGER
member_ids UUID[]  -- null = chia đều tất cả; có giá trị = chia cho list này
```

Upsert by `(session_id, name)` cho "Nước"; insert mới cho phụ phát sinh.

---

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/screens/PickleballCostTab.jsx` | Tạo mới — toàn bộ tab Chi phí |
| `src/hooks/useScreenData.js` | Thêm `buildPickleballCostTabData()` |
| `src/app-v2.jsx` | Thêm handler `saveSessionCost`, `saveBatchCosts`; thêm tab route |
| `src/screens/PickleballOverview.jsx` | Thêm tab "Chi phí" vào tab bar |
| `src/screens/PickleballSettings.jsx` | Xoá nút "Nhập chi phí sân tháng này" |

---

## Out of scope (P2, P3)

- Config tiền sân, lịch, thành viên → Settings (không đổi)
- Auto-generate sessions → P3
- Member edit / treasurer role → P2
