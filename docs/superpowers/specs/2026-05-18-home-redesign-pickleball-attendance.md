# Home Screen Redesign + Pickleball Attendance — Design Spec

**Ngày:** 2026-05-18  
**Trạng thái:** Đã duyệt  
**Phạm vi:** 2 tính năng liên kết — Home layout mới + Session attendance system

---

## Tổng quan

Trang chủ hiện tại gắn với từng nhóm (dùng group switcher) và hiện "Ai nợ ai" — quá chi tiết cho một trang overview. Redesign chuyển home thành **trang cá nhân theo tháng**: tổng net tháng + 2 card nhóm (Pickleball, Chi tiêu chung) → tap vào đi vào chi tiết.

Pickleball card cần dữ liệu điểm danh cá nhân — thêm `pickleball_sessions` + `pickleball_attendance` tables.

---

## 1. Home Screen Layout

### Thay đổi so với hiện tại

| Xóa | Thêm / Đổi |
|-----|-----------|
| Group switcher bar | Month navigation pill (‹ T5/2026 ›) |
| "Ai nợ ai" section | Pickleball card với attendance grid |
| Summary card "Được nhận / Phải trả" per-group | Summary card net tổng tháng (âm/dương) |
| — | Chi tiêu nhóm card với recent transactions |

### Month navigation

- State `selectedMonth` (format `YYYY-MM`) trong component, default = tháng hiện tại
- Mũi tên phải disabled khi đang ở tháng hiện tại
- Thay đổi tháng → re-compute tất cả dữ liệu trên home

### Summary card

```
TỔNG THÁNG 5
−343.000 đ
Bạn đang nợ tổng cộng tháng này
[+ Thêm chi tiêu]  [⚡ Thanh toán]
```

- Net = tổng tất cả expenses liên quan đến currentMember trong selectedMonth, across tất cả groups
- Dương → "Bạn được nhận X tháng này"  
- Âm → "Bạn đang nợ X tháng này"
- Zero → "Bạn đã cân bằng tháng này"

### Pickleball card

- Nền indigo tối (`#1e1b4b → #3730a3`)
- Header: icon 🏓, tên CLB, số tiền nợ tháng, nút "Xem CLB ›"
- Grid: xem mục 2 bên dưới
- Stats footer: Có mặt / Vắng / Tổng buổi / Bạn nợ
- **Tap vào card** → `navigate('pickleball')` (tab Pickleball hiện có)
- Nếu không có nhóm Pickleball → ẩn card này

### Chi tiêu nhóm card

- Nền navy (`#0c2340 → #154a7a`)
- Header: icon 📦, tổng nợ, số nhóm, nút "Chi tiết ›"
- Danh sách 3 giao dịch gần nhất trong selectedMonth (có emoji, tên, ngày, nhóm, số tiền màu đỏ/xanh)
- Stats footer: Số giao dịch / Tổng chi / Bạn nợ
- **Tap vào card** → `navigate('groups')` (tab Nhóm)
- Nếu không có expense nào → hiện "Chưa có chi tiêu tháng này"

---

## 2. Pickleball Session + Attendance

### DB schema

```sql
CREATE TABLE pickleball_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES groups(id),
  date        date NOT NULL,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(group_id, date)
);

CREATE TABLE pickleball_attendance (
  session_id  uuid NOT NULL REFERENCES pickleball_sessions(id),
  member_id   uuid NOT NULL REFERENCES members(id),
  status      text NOT NULL CHECK (status IN ('present', 'absent')),
  marked_by   uuid REFERENCES members(id), -- thủ quỹ
  marked_at   timestamptz DEFAULT now(),
  PRIMARY KEY (session_id, member_id)
);
```

RLS:
- `pickleball_sessions`: SELECT cho mọi member trong group, INSERT/UPDATE/DELETE chỉ treasurer
- `pickleball_attendance`: SELECT cho mọi member, INSERT/UPDATE chỉ treasurer

### Tạo lịch buổi (Bulk session generation)

Treasurer vào tab Quản lý CLB → "Tạo lịch tháng":
1. Chọn tháng
2. Nhập ngày bắt đầu (ví dụ 02/05)
3. Chọn các thứ trong tuần (T2 / T4 / T6 — checkbox, default T2+T4+T6)
4. Preview danh sách ngày được tạo
5. Xác nhận → bulk insert vào `pickleball_sessions`

Nếu tháng đó đã có session → hỏi "Đã có X buổi tháng này, thêm mới hay xóa và tạo lại?"

**Dời ngày:** Treasurer vào session cụ thể → sửa ngày → update record. Logic này chỉ ở tab CLB, **không hiện trên home card**.

### Điểm danh (Attendance marking)

Treasurer vào tab Quản lý CLB → chọn session → tick danh sách thành viên:
- Mặc định tất cả = `present` khi session được tạo (tự động insert attendance rows)
- Treasurer tick "Vắng" cho từng người → update status = `absent`

Hoặc ngược lại (mặc định vắng, tick có mặt) — **chọn mặc định = present** vì thực tế hay đủ người hơn.

### Session grid trên home

Query: `pickleball_sessions` của CLB group trong `selectedMonth`, LEFT JOIN `pickleball_attendance` WHERE `member_id = currentMemberId`

Màu ô:
| Trạng thái | Màu ô |
|-----------|-------|
| `present` | Mint bán trong suốt `rgba(110,231,183,.25)` + border `rgba(110,231,183,.5)`, text `#d1fae5` |
| `absent` | Rose bán trong suốt `rgba(251,113,133,.2)` + border `rgba(251,113,133,.45)`, text `#fecdd3` |
| Sắp tới (date > today) | Nền tối `rgba(255,255,255,.05)` nét đứt |

Grid: 6 cột, font 7px (thứ) + 11px (ngày), gap 5px. Số ô = số session của tháng.

---

## 3. File map

| File | Action | Mục đích |
|------|--------|---------|
| `supabase/migrations/20260518000005_pickleball_sessions.sql` | Create | Tạo bảng pickleball_sessions + pickleball_attendance + RLS |
| `src/screen-home.jsx` | Modify | Layout mới: month nav, summary net, 2 colored cards, remove "Ai nợ ai" |
| `src/store.jsx` | Modify | Action FETCH_HOME_MONTH(month): aggregate expenses + fetch sessions + attendance |
| `src/screen-pickleball.jsx` (hoặc file hiện có cho tab Pickleball) | Modify | Thêm UI tạo lịch tháng + điểm danh cho treasurer |

---

## 4. Không làm (YAGNI)

- Không push notification nhắc buổi tới
- Không cho member tự RSVP (chỉ thủ quỹ điểm danh)
- Không export lịch ra Google Calendar
- Không tính phí vắng khác với phí có mặt (giữ logic phí hiện tại)
- Không animation transition khi chuyển tháng
