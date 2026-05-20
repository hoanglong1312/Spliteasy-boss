# P1 — Nhập chi phí Pickleball (nước + phụ phát sinh)

**Goal:** Đưa form nhập chi phí thực tế (nước + phụ phát sinh) vào đúng nơi — theo ngày nhập thẳng trong Calendar session detail, batch entry có nút riêng. Không tạo tab mới. Tiền sân vẫn lấy từ config, không nhập thủ công.

---

## Scope

- **KHÔNG tạo tab "Chi phí" mới**
- Mode 1 (theo ngày): thêm form nhập vào session detail panel của `PickleballCalendar.jsx`
- Mode 2 (batch): nút "📋 Nhập nhanh" trong `PickleballSettings.jsx` → mở `BatchEntry` screen
- Xoá nút "Nhập chi phí sân tháng này" cũ khỏi Settings (thay bằng nút mới gọn hơn)

---

## Mode 1 — Nhập theo ngày (Calendar session detail)

Khi tap vào 1 buổi trên Calendar → session detail panel hiện ra (đã có). Thêm section **"Chi phí buổi này"** vào panel đó:

```
─────────────────────────────────────
  Chi phí buổi này          [thủ quỹ]
─────────────────────────────────────
  💧 Tiền nước
  [________________________ đ]

  ⚡ Phụ phát sinh ▶  (collapsed)
    → tap mở:
    ┌──────────────────────────────┐
    │ Ghi chú: [________________] │
    │ Số tiền:         [_____ đ]  │
    │ Chia cho:                    │
    │  [An ✓] [Long ✓] [Hoa] ...  │
    │  [Tất cả]  = Xk/người        │
    └──────────────────────────────┘
    [+ Thêm phát sinh]

  [Lưu chi phí]
─────────────────────────────────────
```

**Rules:**
- Section chỉ hiển thị khi session đã diễn ra (date <= today) hoặc completed
- Thành viên thường: xem read-only (số nước, phát sinh đã nhập) — không edit
- Thủ quỹ: edit được
- Phụ phát sinh: ẩn mặc định, tap header để expand/collapse
- Mỗi item phụ phát sinh: ghi chú + số tiền + chip multi-select thành viên + auto-calc "= Xk/người"
- Nút "+ Thêm phát sinh" để add nhiều item
- "Tất cả" chip = select all members

---

## Mode 2 — Nhập nhanh (Batch)

Trong `PickleballSettings.jsx`, thay nút cũ "Nhập chi phí sân tháng này" bằng:

```
[📋 Nhập nhanh chi phí tháng này]
```

Tap → navigate sang `BatchEntry` screen (đã có). BatchEntry hiển thị bảng tất cả buổi tháng:

| Ngày | 💧 Nước (đ) | ⚡ Phát sinh |
|------|-------------|--------------|
| 05/05 ✓ | [40.000] | — |
| 07/05 ✓ | [30.000] | +50k |
| 10/05 | [_____] | + Thêm |

- Footer: tổng nước tháng
- Nút **[Lưu tất cả]** + **[Huỷ]**
- "Phát sinh" trong batch → bottom sheet nhỏ cho buổi đó (ghi chú + tiền + thành viên)

---

## Data Flow

### Đọc dữ liệu (Calendar session detail)
`buildPickleballCalendarData()` đã trả về `selectedSession`. Thêm vào:
```js
selectedSession: {
  ...existing fields...,
  costs: {
    waterAmount,           // số tiền nước đã nhập (0 nếu chưa)
    extras: [{ id, note, amount, memberIds }]
  }
}
```

### Ghi dữ liệu
- `onAction('saveSessionCost', { sessionId, waterAmount, extras: [{ note, amount, memberIds }] })`
- `onAction('saveBatchCosts', { sessions: [{ sessionId, waterAmount }] })`
- Handler trong `app-v2.jsx` → upsert `pickleball_session_items`

---

## DB

Dùng bảng `pickleball_session_items` đã có:
```sql
session_id UUID
name TEXT          -- "Nước" hoặc ghi chú phụ phát sinh
amount INTEGER
member_ids UUID[]  -- null = chia đều tất cả; có giá trị = chia cho list này
```

Upsert by `(session_id, name)` cho "Nước"; insert/delete cho phụ phát sinh.

---

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/screens/PickleballCalendar.jsx` | Thêm section "Chi phí buổi này" vào session detail panel |
| `src/screens/BatchEntry.jsx` | Review + wire đúng actions nếu chưa hoạt động |
| `src/hooks/useScreenData.js` | Thêm `costs` vào `selectedSession` trong `buildPickleballCalendarData()` |
| `src/app-v2.jsx` | Thêm handlers `saveSessionCost`, `saveBatchCosts` |
| `src/screens/PickleballSettings.jsx` | Đổi label nút batch entry |

---

## Out of scope

- Config tiền sân, lịch, thành viên → Settings (không đổi)
- Auto-generate sessions → P3
- Member edit / treasurer role → P2
