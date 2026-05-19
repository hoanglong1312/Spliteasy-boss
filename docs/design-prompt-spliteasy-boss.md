# Design Prompt — Spliteasy Boss (Full App Redesign)

> **Dành cho:** Claude Designer  
> **Mục tiêu:** Thiết kế lại toàn bộ UI app theo Style B "Sport Finance". Trả về HTML mockup cho từng màn hình + JSX component.

---

## 1. Bối cảnh dự án

**Spliteasy Boss** là web app mobile-first quản lý tài chính nhóm cho CLB pickleball Việt Nam.

**Người dùng:** Nhóm 6–15 người Việt Nam chơi pickleball định kỳ. Dùng để chia tiền sân, tiền nước, theo dõi nợ — thay Excel/Zalo.

**Vai trò:**
- **Thủ quỹ (Treasurer):** Toàn quyền thêm/sửa/xóa/duyệt
- **Thành viên (Member):** Xem + đề xuất chi tiêu + điểm danh

**Stack kỹ thuật:**
- React + Vite, inline styles (không dùng CSS class)
- Mobile phone frame (width ~375px), không phải desktop
- Tất cả màu sắc dùng **hex hoặc rgba hardcoded**, không dùng CSS variables

---

## 2. Style Direction — "Sport Finance" (Style B)

### Palette

```
Nền trang (page bg):     #07080f
Nền shell (app bg):      #0c0e18
Card surface:            rgba(255,255,255,0.04) + border rgba(255,255,255,0.07)
Card elevated:           rgba(255,255,255,0.06) + border rgba(255,255,255,0.10)
Input bg:                rgba(255,255,255,0.05)

Text primary:            #f8fafc
Text secondary:          #94a3b8
Text muted:              #475569
Text hint:               #334155

Brand (indigo):          #6366f1
Brand light:             #818cf8
Brand soft bg:           rgba(99,102,241,0.12)
Brand glow:              rgba(99,102,241,0.4)

Accent Pickleball:       #34d399  (emerald)
Accent Groups:           #f59e0b  (amber)
Accent Profile:          #a78bfa  (violet)

Success:                 #34d399
Success soft:            rgba(52,211,153,0.12)
Danger:                  #f87171
Danger soft:             rgba(248,113,113,0.12)
Warning:                 #fbbf24
Warning soft:            rgba(251,191,36,0.12)

Border subtle:           rgba(255,255,255,0.06)
Border normal:           rgba(255,255,255,0.10)
Border strong:           rgba(255,255,255,0.18)
```

### Hero Card (số dư, tổng quan tháng)
```
Background: linear-gradient(145deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)
Border: 1px solid rgba(99,102,241,0.3)
Border-radius: 20px
Có radial glow nhỏ ở góc phải trên: rgba(99,102,241,0.25)
```

### Typography
```
Font: Inter (đã có)
Số tiền lớn:   font-size 28-36px, font-weight 900, letter-spacing -1px
Heading card:  font-size 13px, font-weight 700
Body:          font-size 12px, font-weight 500, color #94a3b8
Label nhỏ:     font-size 9-10px, text-transform uppercase, letter-spacing 1px, color #475569
```

### Spacing & Radius
```
Page padding:    16px
Card radius:     14-16px
Inner radius:    8-10px
Pill radius:     100px
Gap giữa cards: 8-10px
```

### Accent line trên card (theo loại)
```
Pickleball card: border-top: 2px solid #34d399 (hoặc gradient xanh lá)
Group card:      border-top: 2px solid #f59e0b (hoặc gradient amber)
Finance card:    border-top: 2px solid #6366f1 (hoặc gradient indigo)
```

### Tab bar
```
Background: rgba(7,8,15,0.9) + backdrop-filter: blur(20px)
Border-top: 1px solid rgba(255,255,255,0.06)
Active tab: icon glow + label màu #818cf8
FAB (nút +): gradient #6366f1→#8b5cf6, border-radius 50%, glow shadow
```

---

## 3. Danh sách màn hình cần thiết kế

### 3A. TAB TRANG CHỦ

**Home Dashboard**
- Header: "Xin chào, [Tên] 👋" + icon thông báo
- Month nav: `‹ Tháng 5 · 2026 ›`
- **Hero card** (gradient indigo/navy): Tổng số dư tháng, trạng thái "Còn nợ / Cân bằng / Được nhận", 2 nút "+ Thêm chi tiêu" và "⚡ Thanh toán"
- **Mini cards 2 cột**: Card Pickleball (accent xanh lá, số buổi + nợ tiền sân) + Card Nhóm (accent amber, tổng nợ)
- **Danh sách giao dịch gần đây**: 3-4 row, icon danh mục + tên + ngày + số tiền

---

### 3B. TAB NHÓM

**Danh sách nhóm**
- Header: "Nhóm · X đang hoạt động", nút "+ Nhóm mới" + "Tham gia"
- Filter pills: Tất cả / Còn nợ / Cân bằng
- Mỗi nhóm: icon emoji + tên nhóm + avatar stack + số dư (xanh/đỏ)

**Chi tiết nhóm** (push screen)
- Header: tên nhóm + back + menu (...)
- Card tổng số dư với nhóm này
- 3 nút action: Thêm chi tiêu / Tất toán / Chốt sổ (thủ quỹ)
- Tabs: Hoạt động · Số dư · Thành viên
- Tab Hoạt động: danh sách chi tiêu chronological, badge trạng thái
- Tab Số dư: ai nợ ai
- Tab Thành viên: list + join requests (thủ quỹ)

**Thêm chi tiêu** (bottom sheet hoặc push)
- Tiêu đề, số tiền, người chi, danh mục, ngày
- Chọn thành viên tham gia (chips toggle)
- Phương thức chia: Đều nhau / Tuỳ chỉnh

**Form Tham gia nhóm** (modal)
- Input mã nhóm
- Chọn tên / nhập tên mới

---

### 3C. TAB PICKLEBALL

**Tổng quan (sub-tab)**
- Hero: tên CLB + tháng + icon settings ⚙️ (chỉ thủ quỹ)
- Card "Buổi hôm nay" nếu có: ngày + số người có mặt + nút "✓ Điểm danh Buổi #N · [ngày]" (tìm buổi gần nhất chưa điểm danh theo thứ tự)
- Donut chart tiến độ: 8/13 buổi
- Card số dư: tiền sân + tiền nước + tổng nợ

**Buổi đánh (Calendar sub-tab)**
- Grid calendar tháng, 7 cột Mon-first
- Màu ô:
  - **Hôm nay có buổi**: nền indigo đậm, viền indigo sáng
  - **Có buổi, đã tham dự**: nền emerald mờ, viền emerald
  - **Có buổi, vắng mặt**: nền đỏ mờ, viền đỏ
  - **Buổi sắp tới**: nền tối hơn, viền dashed
  - **Đã dời sang ngày khác**: gạch ngang, xám, click thấy "Dời → 21/05"
  - **Ngày bình thường**: nền rất tối, chữ xám
- Tap ô có buổi → **Detail panel** mở bên dưới calendar (accordion):
  - Header: "Buổi #N · T[X] DD/MM" + badge (Hôm nay / Đã đánh / Sắp tới / Đã dời)
  - **Attendance chips**: chip xanh (có mặt) + chip đỏ (vắng) + chip vàng (khách vãng lai)
    - Thủ quỹ tap để toggle mặt/vắng
    - Nút "+ Thêm khách" → nhập tên → chip riêng (màu vàng/cam)
  - **Chi phí buổi**:
    - 🏸 Tiền sân/người: X đ (tổng sân tháng ÷ số buổi ÷ số thành viên cố định, khách được chia lại)
    - 💧 Tiền nước/người: X đ (chỉ người có mặt, bao gồm khách)
    - 📦 Khoản phụ (nếu có): item name + X đ/người
  - Action (thủ quỹ): nút "Dời buổi" (chọn ngày mới + lý do)

**Thành viên (sub-tab)**
- Danh sách thành viên cố định: tên + buổi tham gia/tổng + avatar
- Thủ quỹ: nút Thêm mới + Sửa từng người
- Danh sách khách vãng lai đã lưu: tên + số buổi + nút "Chuyển thành cố định"

**Vé lẻ (sub-tab)**
- Danh sách buổi extra (ngoài lịch cố định): ngày + người tham gia + tổng tiền
- Mỗi vé lẻ có badge trạng thái:
  - ✅ **Đã trả chủ sân** (xanh): ai trả ai nợ ai (P2P)
  - ⏳ **Chưa trả chủ sân** (vàng): cộng vào quỹ nợ cuối tháng
- Thêm vé lẻ: ngày, chọn thành viên tham gia, 50k/người, chọn trạng thái (đã/chưa trả chủ sân), nếu đã trả → chọn ai trả

**Cài đặt CLB ⚙️ (bottom sheet, chỉ thủ quỹ)**
- Tiền sân tháng: input số tiền → hiện "X đ / buổi = Y đ / người"
- Lịch tự động: chọn thứ trong tuần (T2 T3 T4 T5 T6 T7 CN), ngày bắt đầu tháng
- Preview: "Tháng 6 sẽ có X buổi, từ DD/06"
- Nút "📋 Nhập chi phí sân" → mở Batch Entry

**Batch Entry Form (full-screen)**
- Danh sách buổi đã qua trong tháng
- Mỗi buổi: ngày + số người có mặt + input tiền nước + nút "+ Thêm phụ kiện"
- Phụ kiện: tên item + số tiền + chip chọn thành viên áp dụng
- Footer: summary tổng + nút "💾 Lưu tất cả"

---

### 3D. TAB CÁ NHÂN

**Profile**
- Avatar lớn + tên + email
- 6 ô màu chọn màu profile
- Thống kê tháng: buổi đánh X/Y + số dư
- Thông tin ngân hàng: tên NH + STK + chủ TK + nút Sửa
- PIN bảo mật: Đặt / Đổi / Xóa PIN
- Nút xuất CSV (thủ quỹ)
- Nút Đăng xuất (danger)

---

### 3E. LUỒNG THANH TOÁN

**Payment Flow (push screen)**
- Summary: tổng nợ + breakdown từng người
- Chọn người nhận
- Tạo VietQR: chọn ngân hàng + số TK tự động điền từ profile người nhận
- Copy thông tin chuyển khoản
- Nút "✓ Đã thanh toán" → xác nhận

---

## 4. Luồng hoạt động quan trọng

| Luồng | Từ | Đến |
|---|---|---|
| Điểm danh buổi gần nhất | Home card "Điểm danh Buổi #N" | Tab Buổi đánh → scroll + expand đúng buổi |
| Dời buổi | Calendar detail panel → "Dời buổi" | Ngày cũ: gạch ngang xám. Ngày mới: hiện buổi + badge "Đã dời" |
| Khách vãng lai | Session detail → "+ Thêm khách" → nhập tên | Lưu vào buổi + lưu tên để sau chuyển cố định |
| Vé lẻ TH1 (đã trả) | Thêm vé lẻ → chọn người trả → lưu | P2P debt: người trả ↔ người tham gia |
| Vé lẻ TH2 (chưa trả) | Thêm vé lẻ → trạng thái chưa trả | Cộng vào quỹ nợ cuối tháng của từng người tham gia |
| Batch entry chi phí | ⚙️ → "Nhập chi phí sân" | Form nhập nước + phụ kiện từng buổi |

---

## 5. Logic tài chính (để hiểu khi design data display)

**Tiền sân:**
- `court_fee_total ÷ số_buổi_tháng = tiền_sân_per_buổi`
- Mỗi thành viên cố định trả đều, kể cả vắng
- Nếu có khách vãng lai buổi đó: `khách_fee = tiền_sân_per_buổi`, chia đều trả lại cho thành viên cố định

**Tiền nước (per session):**
- `water_amount ÷ số_người_có_mặt = X đ/người`
- Cả khách cũng chia đều

**Vé lẻ:**
- `50.000 × số_người_tham_gia = tổng_buổi_vé_lẻ`
- TH1 đã trả: người A trả → các người khác nợ A = 50k/người
- TH2 chưa trả: quỹ nợ tăng, cuối tháng mọi người trả vào quỹ

---

## 6. Yêu cầu output từ designer

### Deliverable 1: HTML Mockups
Tạo file HTML riêng cho từng màn hình (self-contained, mở được trên browser):
- `home.html` — Trang chủ
- `groups-list.html` — Danh sách nhóm
- `group-detail.html` — Chi tiết nhóm (tab Hoạt động)
- `add-expense.html` — Form thêm chi tiêu
- `pickleball-overview.html` — Pickleball tổng quan
- `pickleball-calendar.html` — Calendar + session detail panel mở sẵn
- `pickleball-members.html` — Tab thành viên + khách vãng lai
- `pickleball-tickets.html` — Tab vé lẻ (hiện cả 2 trạng thái)
- `pickleball-settings.html` — Modal cài đặt CLB
- `batch-entry.html` — Form nhập chi phí sân
- `profile.html` — Trang cá nhân
- `payment-flow.html` — Luồng thanh toán + QR

**Yêu cầu HTML mockup:**
- Width cố định 375px, nền tối `#07080f`
- Dùng dữ liệu thật, tên tiếng Việt (Long, Minh, Hoa, Tuấn, Nam, Linh)
- Số tiền: định dạng VND (333.333 đ, 1.200.000 đ)
- Không dùng CSS class framework — style inline hoặc `<style>` tag

### Deliverable 2: JSX Components
Sau khi HTML được duyệt, convert sang React JSX:
- Inline styles (không dùng CSS modules hay Tailwind)
- Props: `{ data, isTreasurer, onAction }` pattern
- Không gọi API — component nhận data qua props
- File tổ chức theo screen (không split quá nhỏ)

---

## 7. Ghi chú kỹ thuật

- App render trong phone frame ~375px wide
- Tất cả màu phải hardcoded hex/rgba (không `var(--...)`)
- Emoji dùng thoải mái cho icon (🏓 🏠 👥 👤 📦 💧 ⚙️ ✅ ⏳)
- Số tiền format: `X.XXX đ` hoặc `Xk` (ngắn) hoặc `X.XXX.XXX đ` (đầy đủ)
- Ngôn ngữ UI: **Tiếng Việt** hoàn toàn
