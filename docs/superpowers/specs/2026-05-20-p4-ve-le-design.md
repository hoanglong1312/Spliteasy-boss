# P4 — Vé lẻ (Individual Tickets)

**Goal:** Wire PickleballTickets screen với real data. Thêm form tạo vé lẻ, xử lý 2 TH: có người ứng (P2P) và quỹ team trả (gộp vào chi phí tháng).

---

## Khái niệm

**Vé lẻ** = vé mua riêng theo buổi, ngoài hoặc thêm vào lịch cố định.

| Trường hợp | Logic |
|-----------|-------|
| **Có người ứng** | Advancer trả trước → những người tham gia nợ advancer (P2P). Hiện trong personal balance của từng người. |
| **Quỹ team trả** | Không ai ứng → gộp vào chi phí tháng. Chia đều cho những người tham gia. Thanh toán cùng tiền nước cuối tháng. |

---

## Form thêm vé lẻ (thủ quỹ only)

Mở từ nút `+` trên PickleballTickets:

```
Ngày:   [DD/MM/YYYY]
Giờ:    [HH:mm]
Người tham gia:
  [An ✓] [Long ✓] [Hoa] [Tuấn] ...
Tổng tiền: [________ đ]
  = Xk/người

Thanh toán:
  ○ [Chọn người ứng...]   ← dropdown thành viên
  ● Quỹ team trả
```

**Lưu → insert DB + refresh state.**

---

## PickleballTickets screen — cập nhật

### Summary card (giữ nguyên layout hiện có)
- Tổng số buổi, tổng lượt, tổng tiền
- Đã trả / Chưa trả (chỉ relevant khi có advancer)

### Filter pills
- Tất cả / ⏳ Chưa trả / ✅ Đã trả / 🏦 Quỹ team

### Ticket card (mỗi vé)

**TH có người ứng:**
```
[Buổi N] T7 17/05 · 18:00          [⏳ Chưa trả]
Xk/người · Long ứng
[An] [Hoa] [Tuấn]
→ mọi người chuyển khoản Long
```

**TH quỹ team:**
```
[Buổi N] CN 18/05 · 19:00          [🏦 Quỹ team]
Xk/người · 3 người tham gia
[An] [Long] [Hoa]
→ cộng vào chi phí tháng
```

### Action (thủ quỹ only)
- Vé có advancer: nút **"✓ Đã trả"** → mark paid, hiện ai đã chuyển
- Vé quỹ team: không cần action (tự xử lý cuối tháng)
- Nút **"🗑 Xoá"** cho cả hai loại

---

## Balance integration

### Personal balance (Overview + MemberDetail)
Nếu vé có advancer:
- Người tham gia (không phải advancer): `-amount/participants`  trong balance
- Advancer: `+sum(nợ từ các người khác)` trong balance (họ cần được hoàn)

Nếu quỹ team:
- Người tham gia: `-amount/participants` gộp vào dòng "Vé lẻ" trong balance
- Thanh toán cùng tiền sân + nước cuối tháng

---

## DB Migration

```sql
CREATE TABLE pickleball_tickets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_time TIME,
  total_amount INTEGER NOT NULL,
  member_ids   UUID[] NOT NULL,        -- người tham gia
  advancer_id  UUID REFERENCES members(id),  -- NULL = quỹ team
  status       TEXT NOT NULL DEFAULT 'unpaid',  -- 'unpaid' | 'paid' | 'team_fund'
  year_month   TEXT NOT NULL,          -- '2026-05' để query nhanh
  created_by   UUID REFERENCES members(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON pickleball_tickets(group_id, year_month);
```

`status = 'team_fund'` khi `advancer_id IS NULL` — không cần track paid/unpaid riêng.

---

## Data Flow

### Đọc: `buildPickleballTicketsData(state)`
```js
{
  monthLabel,
  summary: { sessionCount, totalAttendances, totalAmount, paid, unpaid },
  filter: 'all' | 'unpaid' | 'paid' | 'team',
  tickets: [{
    id, dateLabel, timeLabel, sessionNumber,
    amountPerPerson, totalAmount,
    memberIds, memberLabels,
    advancerId, advancerName,   // null nếu quỹ team
    status,                     // 'unpaid' | 'paid' | 'team_fund'
  }]
}
```

### Ghi: handlers trong `app-v2.jsx`
| Action | Payload | Kết quả |
|--------|---------|---------|
| `addTicket` | `{ date, time, memberIds, totalAmount, advancerId }` | INSERT pickleball_tickets |
| `markTicketPaid` | `{ ticketId }` | UPDATE status = 'paid' |
| `deleteTicket` | `{ ticketId }` | DELETE |

---

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/screens/PickleballTickets.jsx` | Wire data thật, thêm form add, action markPaid/delete |
| `src/hooks/useScreenData.js` | Thêm `buildPickleballTicketsData()` |
| `src/app-v2.jsx` | Thêm handlers `addTicket`, `markTicketPaid`, `deleteTicket` |
| `src/hooks/useScreenData.js` | Update `buildPickleballOverviewData` + `buildMemberDetailData` — include ticket balance |
| `supabase/migrations/` | CREATE TABLE pickleball_tickets |

---

## Out of scope
- Reminder/notification nhắc chuyển khoản → P-later
- Export CSV danh sách nợ → đã bỏ
