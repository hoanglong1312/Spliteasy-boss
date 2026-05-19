# Pickleball Tab Overhaul — Design Spec

**Ngày:** 2026-05-19
**Trạng thái:** Đã duyệt
**Phạm vi:** 2 spec liên kết — A (UI/Navigation) + B (Cost Tracking)

---

## Spec A: UI & Navigation Overhaul

### A1. Home Card — Simplified

Card Pickleball trên trang chủ đổi thành dạng gọn:
- Header: "🏓 Tên CLB" + tháng
- 3 số liệu nổi bật: số buổi đã đánh, số lần vắng (màu đỏ), tổng buổi tháng
- Progress bar mỏng (% hoàn thành tháng)
- Số tiền nợ to bên phải (đỏ nếu âm)
- Nút "Xem lịch & chi tiết →" → navigate sang tab Pickleball
- **Xóa** lưới ô vuông điểm danh khỏi home card

### A2. Tab Buổi đánh — Calendar Grid

Thay danh sách dọc bằng **full month calendar**:
- Header: "‹ Tháng 5 / 2026 ›" (có thể chuyển tháng)
- Row ngày trong tuần: CN T2 T3 T4 T5 T6 T7
- 7 cột × ~5 hàng, mỗi ô = 1 ngày
- Màu ô:
  - Ngày có buổi, bạn có mặt: nền xanh mint nhạt, viền mint
  - Ngày có buổi, bạn vắng: nền rose nhạt, viền rose
  - Hôm nay (có buổi): nền indigo, viền indigo đậm
  - Buổi sắp tới: nền tối, viền dashed
  - Ngày thường (không có buổi): nền tối mờ, chữ xám
- Tap vào ô có buổi → **expand detail panel bên dưới calendar** (không navigate đi đâu)
- Chỉ 1 ô được expand tại 1 thời điểm

### A3. Session Detail Panel

Hiện bên dưới calendar khi tap vào ngày có buổi:

**Header:** "Buổi #N · T[X], DD/MM" + badge trạng thái (Đủ mặt / Đã đánh / Hôm nay)

**Thành viên:**
- Nếu đủ mặt: "✓ Tất cả thành viên có mặt"
- Nếu có vắng: "✗ Vắng: Long, Minh" (tên đầy đủ, phân cách phẩy)
- Nếu có khách: "👤 Khách: Hoàng (+50.000 đ)"

**Chi phí:**
- Tiền sân: hiện số tiền (đã tính từ gói sân tháng ÷ số buổi)
- Tiền nước: hiện số tiền nếu đã nhập, hiện "Cuối tháng" nếu chưa
- Khoản phụ (bóng, phụ kiện...): hiện từng khoản nếu có
- Note nhỏ: "💡 Tiền nước chia đều người có mặt"

**Action buttons** (chỉ treasurer):
- "✓ Điểm danh" → mở attendance marking cho buổi đó
- "+ Thêm chi phí" → mở form thêm khoản phụ cho buổi đó

### A4. Settings CLB — Modal

Thêm icon ⚙️ góc phải trên hero header tab Pickleball (chỉ treasurer thấy).
Tap → mở bottom sheet "Cài đặt CLB":

**Lịch tháng tự động:**
- Ngày bắt đầu trong tháng (mặc định: ngày đầu tiên T2/T4/T6 ≥ ngày 1)
- Các thứ trong tuần: toggle T2 T3 T4 T5 T6 T7 CN
- Preview: "Tháng 6 sẽ có X buổi, từ DD/06"
- Lưu → tháng sau tự generate sessions theo config này (không cần tạo lại thủ công)

**Chi phí tháng:**
- Tiền sân tháng: nhập tổng → hiện "X đ / buổi = Y đ / người"
- Nút "📋 Nhập chi phí sân" → mở Batch Entry Form (xem Spec B)

### A5. Navigation Fix — "Điểm danh buổi này"

Card "Buổi hôm nay" trên Tab Tổng quan:
- Nút "✓ Điểm danh buổi này" → switch sang Tab Buổi đánh
- Auto scroll đến ngày hôm nay trong calendar, highlight + expand detail panel
- Nếu hôm nay không có buổi → scroll đến buổi sắp tới gần nhất

### A6. Access Control

- **Tất cả member**: thấy calendar + session detail (read-only)
- **Chỉ treasurer**: thấy icon ⚙️, thấy action buttons "Điểm danh" và "Thêm chi phí", có thể toggle attendance

---

## Spec B: Cost Tracking

### B1. DB Schema — Session Costs

```sql
-- Chi phí nước theo buổi
ALTER TABLE pickleball_sessions
  ADD COLUMN water_amount integer DEFAULT 0; -- đơn vị VND

-- Khoản phụ tự do (bóng, phụ kiện...)
CREATE TABLE pickleball_session_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES pickleball_sessions(id) ON DELETE CASCADE,
  name        text NOT NULL,           -- "Bóng BX", "Tất", v.v.
  amount      integer NOT NULL,        -- tổng tiền khoản này
  member_ids  uuid[] NOT NULL,         -- array member_id áp dụng
  created_by  uuid REFERENCES members(id),
  created_at  timestamptz DEFAULT now()
);
```

RLS:
- `pickleball_sessions.water_amount`: UPDATE chỉ treasurer
- `pickleball_session_items`: SELECT cho member trong group, INSERT/UPDATE/DELETE chỉ treasurer

### B2. Batch Entry Form

Truy cập: ⚙️ Settings CLB → "Nhập chi phí sân"

**Layout:** Danh sách tất cả buổi đã qua trong tháng (scroll), mỗi buổi là 1 card:
- Header: ngày + thứ + số người có mặt + tổng đã nhập (màu xanh) hoặc "Chưa nhập" (mờ)
- **Tiền nước**: input số tiền + hint "chia đều X người có mặt → Y đ/người"
- **Thêm khoản phụ**: bấm "+ Thêm bóng / phụ kiện" → expand inline:
  - Tên khoản (text input, placeholder "vd: Bóng BX")
  - Số tiền (number input)
  - Chips thành viên để chọn ai áp dụng (toggle, default tất cả)
  - Có thể thêm nhiều khoản phụ trên 1 buổi
- Buổi sắp tới: disabled, hiện "Chưa đến"

**Footer:** Summary tổng tháng (nước + khoản phụ đã nhập) + nút "💾 Lưu tất cả"

### B3. Logic Tính Tiền

**Tiền sân:**
- Nhập từ Settings: tổng tiền sân tháng ÷ số sessions = tiền sân / buổi
- Mỗi thành viên cố định trả đều, kể cả vắng

**Tiền nước (per session):**
- `water_amount` ÷ số người `present` trong session đó = phần mỗi người
- Chỉ người có mặt hôm đó trả

**Khoản phụ (per session):**
- `amount` ÷ `member_ids.length` = phần mỗi người trong danh sách chọn
- Chỉ người được chọn trả

**Tiền sân tháng (`court_fee_total`):**
- Lưu vào 1 field mới trong group config hoặc bảng riêng: `pickleball_monthly_config`

```sql
CREATE TABLE pickleball_monthly_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES groups(id),
  year_month  text NOT NULL,           -- "2026-05"
  court_fee   integer NOT NULL DEFAULT 0,  -- tổng tiền sân tháng
  schedule_start_day  integer,         -- ngày bắt đầu (1-31)
  schedule_weekdays   integer[],       -- [1,3,5] = T2,T4,T6
  UNIQUE(group_id, year_month)
);
```

---

## File Map

| File | Action |
|------|--------|
| `src/screen-home.jsx` | Modify: đơn giản hóa Pickleball card |
| `src/screen-pickleball.jsx` | Modify: calendar grid, session detail, settings modal, batch entry form |
| `src/store.jsx` | Modify: fetch session items, monthly config |
| `supabase/migrations/20260519000001_pickleball_costs.sql` | Create: water_amount, session_items, monthly_config tables |

---

## Không làm (YAGNI)

- Không breakdown loại nước (lọc/khoáng/revice) — chỉ tổng tiền nước per buổi
- Không auto-import từ Excel chủ sân
- Không notification nhắc nhập cuối tháng
- Không lịch sử chỉnh sửa chi phí
- Không phân quyền member được thêm khoản phụ (chỉ treasurer)
