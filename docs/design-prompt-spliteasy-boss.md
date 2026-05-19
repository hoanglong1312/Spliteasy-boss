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

**Đã có (batch 1):**
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

**Cần thiết kế thêm (batch 2):**
- `join-group.html` — Tham gia nhóm
- `expense-detail.html` — Chi tiết khoản chi
- `session-detail.html` — Chi tiết buổi đánh (full screen)
- `new-group.html` — Tạo nhóm mới
- `settle-all.html` — Tất toán / chốt nợ
- `notifications.html` — Thông báo
- `approval-queue.html` — Duyệt yêu cầu tham gia
- `settings.html` — Cài đặt tài khoản
- `settlement-period.html` — Chốt sổ tháng

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

---

## 3F. BATCH 2 — CÁC MÀN HÌNH CÒN THIẾU

> Giữ nguyên Style B "Sport Finance", palette + typography + spacing đã định nghĩa ở Mục 2.

---

### 3F-1. THAM GIA NHÓM (`join-group.html`)

Luồng 2 bước. Màn hình full-screen (không có TabBar).

**Bước 1 — Nhập mã:**
- Header: mũi tên back ‹ + tiêu đề "Tham gia nhóm"
- Hero nhỏ: icon 🔗 + text "Nhập mã mời từ thủ quỹ"
- Input lớn: placeholder `VD: CLB-2026`, font monospace, border brand khi focus
- Nút "Xem trước nhóm →" (brand gradient, disabled khi input rỗng)

**Bước 2 — Xác nhận danh tính** (sau khi preview load):
- Card nhóm: emoji nhóm + tên + số thành viên + badge "X đang hoạt động"
- Avatar stack thành viên (6 avatar + "+N")
- Section "Bạn là ai?":
  - Nếu tên đã tồn tại trong nhóm → row chip chọn tên (màu brand khi selected)
  - Input thêm tên mới nếu chưa có
- Nút "Tham gia" (xanh) + trạng thái "Chờ duyệt" (vàng, sau khi gửi)
- Error state: card đỏ "Mã không đúng hoặc đã hết hạn"

---

### 3F-2. CHI TIẾT KHOẢN CHI (`expense-detail.html`)

Push screen từ Group Detail. Có back button.

- Header: ‹ back + tiêu đề khoản chi + menu (…) cho thủ quỹ
- Hero card (gradient indigo): icon danh mục lớn + tên khoản chi + số tiền lớn + ngày + badge trạng thái (Đang chờ / Đã duyệt / Đã thanh toán)
- Section "Người trả trước": avatar + tên + số tiền đã trả
- Section "Chia cho":
  - List các thành viên tham gia: avatar + tên + số tiền mỗi người + badge "Đã trả" (xanh) / "Còn nợ" (đỏ)
  - Tổng cộng ở dưới
- Section "Ghi chú" (nếu có): text nhỏ màu secondary
- Action buttons (thủ quỹ): "✏️ Sửa" (ghost) + "🗑 Xóa" (danger ghost)
- Nút "⚡ Thanh toán ngay" nếu user đang nợ khoản này

---

### 3F-3. CHI TIẾT BUỔI ĐÁNH — FULL SCREEN (`session-detail.html`)

Push screen từ Calendar (khi tap "Xem chi tiết" hoặc từ Home card điểm danh).

- Header: ‹ back + "Buổi #N · T[X] DD/MM/YYYY" + badge trạng thái (Hôm nay / Đã đánh / Sắp tới / Đã dời)
- Hero emerald (nếu hôm nay) hoặc card thường (nếu đã qua):
  - Sân + thời gian + tổng số người có mặt / tổng
- Section "Điểm danh":
  - Grid chip 2 hàng: thành viên cố định (chip xanh = có mặt, chip đỏ = vắng)
  - Thủ quỹ: tap chip để toggle
  - Chip khách vãng lai: màu vàng/cam, có "×" để xóa
  - Nút "+ Thêm khách" → inline input nhập tên → thêm chip vàng
- Section "Chi phí buổi":
  - Row 🏸 Tiền sân/người: X đ — "(tổng sân ÷ buổi ÷ N thành viên)"
  - Row 💧 Tiền nước/người: X đ — input nhập tổng tiền nước → tự tính /người
  - Nếu có khoản phụ: row 📦 Tên item: X đ/người (chips thành viên áp dụng nhỏ bên dưới)
  - Nút "+ Thêm khoản phụ" (thủ quỹ): mở inline form tên + số tiền + chip chọn thành viên
- Action (thủ quỹ): nút "📅 Dời buổi" → bottom picker chọn ngày mới + input lý do (optional)

---

### 3F-4. TẠO NHÓM MỚI (`new-group.html`)

Push screen. Back button + "Tạo" button ở header phải.

- Input tên nhóm (required, maxlength 40)
- Chọn emoji đại diện: grid 4×3 emoji phổ biến (🏓 ⚽ 🏀 🎾 🍜 ☕ 🎮 🏖 🌿 🎵 💼 🏠), tap để chọn
- Input mô tả ngắn (optional, placeholder "VD: Nhóm pickleball thứ 2-4-6")
- Toggle "Yêu cầu duyệt khi tham gia" (default: bật)
- Preview card: hiển thị trước nhóm trông như thế nào (emoji + tên + mô tả)
- Nút "Tạo nhóm" (brand gradient, full width)

---

### 3F-5. TẤT TOÁN / CHỐT NỢ (`settle-all.html`)

Push screen từ Group Detail. Tổng kết ai nợ ai trong nhóm.

- Header: ‹ back + "Tất toán · [Tên nhóm]"
- Hero card: tổng nợ của user với nhóm này (số lớn, đỏ/xanh)
- Section "Bạn nợ" (nếu có): list người + số tiền + nút "⚡ Thanh toán" mỗi row
- Section "Người nợ bạn" (nếu có): list người + số tiền + nút "✓ Xác nhận đã nhận"
- Section "Tất toán toàn nhóm" (thủ quỹ): bảng nợ tối giản — cột Từ / Đến / Số tiền
- Nút "📋 Chốt sổ tháng này" (thủ quỹ, outline amber) → dẫn tới settlement-period

---

### 3F-6. THÔNG BÁO (`notifications.html`)

Push screen từ icon 🔔 trên Home.

- Header: ‹ back + "Thông báo" + nút "Đánh dấu đã đọc tất cả"
- Filter pills: Tất cả / Chưa đọc / Chi tiêu / Thanh toán
- List thông báo, mỗi item:
  - Dot xanh (chưa đọc) hoặc không có dot (đã đọc)
  - Icon emoji theo loại + tên sự kiện + mô tả ngắn + thời gian relative
  - Nền item chưa đọc: `rgba(99,102,241,0.06)`, border-left 3px brand
- Các loại thông báo cần hiển thị (dữ liệu mẫu):
  - 💸 "Minh thêm khoản chi 150.000 đ" · Nhóm CLB · 10 phút trước *(chưa đọc)*
  - ✅ "Hoa xác nhận đã thanh toán 240.000 đ" · 1 giờ trước *(chưa đọc)*
  - 👤 "Tuấn yêu cầu tham gia Nhóm CLB" · 2 giờ trước *(chưa đọc)* → có 2 nút "Duyệt" / "Từ chối" inline
  - 🏓 "Buổi #9 hôm nay lúc 19:00" · 5 giờ trước *(đã đọc)*
  - 💰 "Nam còn nợ bạn 93.333 đ" · Hôm qua *(đã đọc)*

---

### 3F-7. DUYỆT YÊU CẦU THAM GIA (`approval-queue.html`)

Push screen — chỉ thủ quỹ thấy. Từ notification hoặc Group Detail tab Thành viên.

- Header: ‹ back + "Yêu cầu tham gia" + badge số lượng pending
- Nếu không có yêu cầu: empty state — icon 🎉 + "Không có yêu cầu nào"
- Mỗi request:
  - Avatar chữ cái + tên người xin vào + thời gian gửi
  - Tên nhóm (nếu hiển thị từ nhiều nhóm)
  - 2 nút: "✓ Duyệt" (emerald, rounded) + "✕ Từ chối" (danger ghost, rounded)
  - Sau khi duyệt: row collapse với animation, badge giảm 1
- Nút "Duyệt tất cả" ở bottom nếu có ≥ 2 request

---

### 3F-8. CÀI ĐẶT TÀI KHOẢN (`settings.html`)

Push screen từ Profile tab. Không có TabBar.

- Header: ‹ back + "Cài đặt"
- Section "Thông tin ngân hàng":
  - Card: logo ngân hàng (text) + tên NH + số TK (masked: **** 4321) + chủ TK
  - Nút "✏️ Sửa" → inline edit form: chọn ngân hàng (dropdown) + input STK + input tên chủ TK
- Section "Bảo mật":
  - Row "PIN ứng dụng": toggle on/off + nút "Đổi PIN" (nếu đang bật)
  - PIN flow: 6 ô tròn nhập số, màu brand khi điền
- Section "Ứng dụng":
  - Row "Ngôn ngữ": Tiếng Việt (hiện tại, không cần thay đổi — show only)
  - Row "Phiên bản": v1.0.0
- Section danger:
  - Nút "🚪 Đăng xuất" (danger outline, full width)
  - Nút "🗑 Xóa tài khoản" (danger ghost, smaller, text muted)

---

### 3F-9. CHỐT SỔ THÁNG (`settlement-period.html`)

Push screen — chỉ thủ quỹ. Từ Settle All hoặc Group Detail "Chốt sổ".

- Header: ‹ back + "Chốt sổ · Tháng 5/2026" + badge "Chưa chốt" (amber)
- Hero amber: tổng thu/chi tháng — 2 cột: Tổng chi (đỏ) / Tổng đã thanh toán (xanh)
- Section "Số dư từng người":
  - List thành viên: avatar + tên + số tiền còn nợ (đỏ) hoặc được nhận (xanh) + badge "Đã trả" / "Chưa trả"
- Section "Khoản chi tháng": tổng hợp theo danh mục (tiền sân, tiền nước, vé lẻ, chi tiêu nhóm)
- Nút "📊 Xuất CSV" (ghost, icon download)
- Nút "✅ Xác nhận chốt sổ" (brand gradient, full width) → confirm dialog "Sau khi chốt không sửa được. Tiếp tục?"

---

## 7. Ghi chú kỹ thuật

- App render trong phone frame ~375px wide
- Tất cả màu phải hardcoded hex/rgba (không `var(--...)`)
- Emoji dùng thoải mái cho icon (🏓 🏠 👥 👤 📦 💧 ⚙️ ✅ ⏳)
- Số tiền format: `X.XXX đ` hoặc `Xk` (ngắn) hoặc `X.XXX.XXX đ` (đầy đủ)
- Ngôn ngữ UI: **Tiếng Việt** hoàn toàn
