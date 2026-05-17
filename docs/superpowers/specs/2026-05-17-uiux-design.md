# Thiết kế UI/UX — SpliteasyBoss Ver 2.0

**Ngày:** 2026-05-17
**Trạng thái:** Đã duyệt
**Phạm vi:** Kiến trúc thông tin + Luồng người dùng + Các màn hình mới

---

## 1. Kiến trúc thông tin (Information Architecture)

### 4 Tab chính

```
Tab 1: Tổng quát cá nhân   Tab 2: Nhóm chi tiêu
Tab 3: CLB Pickleball       Tab 4: Hồ sơ & Cài đặt
```

| Tab | Góc nhìn | Dữ liệu chính | Người dùng chính |
|-----|----------|---------------|-----------------|
| Tổng quát | Cá nhân | Tôi nợ bao nhiêu, cần trả ai | Tất cả |
| Nhóm | Theo nhóm | Chi tiêu sự kiện, ai nợ ai trong nhóm | Member + Treasurer |
| Pickleball | Cả đội | Lịch buổi, chi phí đội tháng này | Tất cả |
| Hồ sơ | Cá nhân | Cài đặt, thống kê cá nhân | Tất cả |

---

## 2. Luồng vào nhóm (Onboarding Flow)

### Lần đầu vào nhóm
```
Nhận link từ thủ quỹ
(spliteasy.app/join/PICKLE-X7K2)
        │
        ▼
Mở link → Trang join tự động điền mã
        │
        ▼
Hiển thị: Tên nhóm + Avatar stack thành viên
"Bạn là ai trong nhóm này?"
        │
        ▼
Chọn tên mình từ danh sách avatar
        │
        ▼
Lưu identity vào localStorage
(group_id + member_id)
        │
        ▼
Vào thẳng Tab Tổng quát cá nhân
```

### Lần sau mở lại
```
Mở link nhóm
        │
        ▼
Đọc localStorage → có identity rồi
        │
        ▼
Vào thẳng, không hỏi lại
```

### Fallback
- Nút "Nhập mã thủ công" ở trang chủ cho trường hợp đặc biệt

---

## 3. Tab 1 — Tổng quát cá nhân

### Layout
```
┌─────────────────────────────────┐
│  Xin chào, [Tên] 👋             │
│  Tháng 5/2026                   │
│                                 │
│  ┌─────────────┐ ┌───────────┐  │
│  │ 📦 Nhóm     │ │🏸Pickleball│ │
│  │ Nợ 120k     │ │ Nợ 200k   │ │
│  │ 2 nhóm      │ │ CLB Q7    │ │
│  └─────────────┘ └───────────┘  │
│                                 │
│  Tổng cần thanh toán: 320k      │
│  ┌─────────────────────────┐    │
│  │  → Thanh toán ngay      │    │
│  └─────────────────────────┘    │
│                                 │
│  [Nếu là Thủ quỹ]               │
│  ┌─────────────────────────┐    │
│  │  ⏳ 3 chi tiêu chờ duyệt│    │
│  │  ⚠️  1 sai sót cần xem  │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

### Hành động từ tab này
- Bấm card Nhóm → Tab Nhóm
- Bấm card Pickleball → Tab Pickleball
- Bấm "Thanh toán ngay" → Màn hình Thanh toán → QR → Xác nhận
- Bấm hàng đợi duyệt (chỉ thủ quỹ) → Màn hình duyệt chi tiêu

### Thông minh theo ngữ cảnh (Smart Context)
- Không có gì nợ → hiển thị "Tháng này bạn đang cân bằng 🎉"
- Có chi tiêu chờ duyệt → đẩy block thủ quỹ lên đầu trang
- Không có gì chờ duyệt → block thủ quỹ ẩn đi

---

## 4. Tab 2 — Nhóm chi tiêu

### Màn hình danh sách nhóm
```
┌─────────────────────────────────┐
│  Nhóm của bạn          [+ Tạo] │
│                                 │
│  [Tất cả] [Còn nợ] [Cân bằng]  │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🍜 Ăn trưa team         │    │
│  │ 3 thành viên • 2 khoản  │    │
│  │ Bạn nợ 80k              │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ ✈️  Du lịch Đà Lạt      │    │
│  │ 5 thành viên • 8 khoản  │    │
│  │ Bạn được nhận 150k      │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

### Màn hình chi tiết nhóm
```
┌─────────────────────────────────┐
│  ← 🍜 Ăn trưa team       [⋯]  │
│                                 │
│  Bạn nợ 80k tháng này          │
│  [+ Thêm chi tiêu]  [Tất toán] │
│                                 │
│  [Hoạt động] [Số dư] [Thành viên]│
│                                 │
│  Hoạt động gần đây:             │
│  ┌─────────────────────────┐    │
│  │ ⏳ Bún chả • 240k       │    │  ← Pending: vàng
│  │ An đề xuất • 16/05      │    │
│  │              [Báo sai]  │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ ✅ Cà phê • 120k        │    │  ← Approved: xanh
│  │ Bình trả • 15/05        │    │
│  │              [Báo sai]  │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

### Badge trạng thái chi tiêu
| Trạng thái | Màu | Icon | Ý nghĩa |
|-----------|-----|------|---------|
| pending | Vàng #F59E0B | ⏳ | Đang chờ thủ quỹ duyệt |
| approved | Xanh #10B981 | ✅ | Đã duyệt, tính vào số dư |
| declined | Đỏ #EF4444 | ❌ | Bị từ chối, không tính |

### Màn hình duyệt chi tiêu (Thủ quỹ — Tinder style)
```
┌─────────────────────────────────┐
│  3 chi tiêu chờ duyệt           │
│                                 │
│         ┌───────────────┐       │
│  ✕      │ 🍜 Bún chả   │    ✓  │
│ Từ chối │               │ Duyệt │
│  ←      │ 240,000 ₫     │    →  │
│         │ An đề xuất    │       │
│         │ 16/05/2026    │       │
│         │               │       │
│         │ An + 3 người  │       │  ← Chia đều: gọn
│         │ mỗi người 60k │       │
│         └───────────────┘       │
│                                 │
│         ● ○ ○  (còn 2 cái)     │
└─────────────────────────────────┘
```
- Chia tùy chỉnh → hiện chi tiết từng người thay vì gọn
- Vuốt phải = Duyệt, vuốt trái = Từ chối
- Từ chối → popup nhỏ nhập lý do → gửi

### Màn hình thêm/đề xuất chi tiêu
- Thủ quỹ thêm → `status = approved` ngay
- Thành viên thêm → `status = pending`, hiện badge "Đang chờ duyệt"

### Luồng Báo sai sót
```
Bấm [Báo sai] trên chi tiêu
        │
        ▼
Popup nhỏ: "Sai sót ở đâu?"
[___________________________]
        │
        ▼
Gửi → thủ quỹ thấy trong hàng đợi
```

---

## 5. Tab 3 — CLB Pickleball

### Màn hình tổng quát đội
```
┌─────────────────────────────────┐
│  🏸 CLB Pickleball Q7           │
│  Tháng 5/2026                   │
│                                 │
│  Buổi tháng này                 │
│  ████████░░  8/10 buổi          │
│  Còn 2 buổi:                    │
│  • T7 24/05 • 19:00 • Sân A    │
│  • T3 28/05 • 19:00 • Sân B    │
│                                 │
│  Chi phí cả đội                 │
│  ┌──────────────────────────┐   │
│  │ 💧 Nước        600k      │   │  ← Cố định
│  │ 🏸 Chi tiêu khác  300k   │   │  ← Phát sinh (đặt tên tự do)
│  │ Tổng           900k      │   │
│  └──────────────────────────┘   │
│                                 │
│  Thành viên (8)                 │
│  [Avatar stack]                 │
└─────────────────────────────────┘
```

### Chi phí phát sinh — đặt tên tự do
- Thủ quỹ có thể thêm khoản phát sinh với tên tùy ý: "Tiền tất", "Tiền bóng", "Nước thêm"...
- Tất cả gộp hiển thị là "Chi tiêu khác" trên tổng quát
- Bấm vào "Chi tiêu khác" → xổ ra danh sách chi tiết

### Tabs trong Pickleball
- **Tổng quan** — màn hình trên
- **Buổi đánh** — lịch sử + sắp tới, RSVP
- **Thành viên** — số buổi đi, % tham gia, số dư tháng
- **Vé lẻ** — buổi tự phát ngoài lịch

---

## 6. Màn hình Thanh toán (Payment Flow)

```
Bấm "Thanh toán ngay"
        │
        ▼
┌─────────────────────────────────┐
│  Thanh toán tháng 5             │
│                                 │
│  Bạn cần trả:                   │
│  • An (nhóm Ăn trưa) — 80k     │
│  • An (Pickleball) — 200k       │
│  ─────────────────────          │
│  Tổng: 280k → An               │
│                                 │
│  ┌─────────────────────────┐    │
│  │    [QR chuyển khoản]    │    │
│  │    MBBank • 0901xxx     │    │
│  │    Nội dung: SP-BinhAn  │    │
│  └─────────────────────────┘    │
│                                 │
│  [✓ Đã chuyển tiền rồi]        │
└─────────────────────────────────┘
        │
        ▼
Xác nhận → Ghi settlement → Cập nhật số dư
```

**Gộp khoản nợ cùng người**: Nếu nợ An cả nhóm lẫn pickleball → gộp 1 QR duy nhất, 1 lần chuyển.

---

## 7. Dashboard cá nhân (Personal Link)

Truy cập qua link riêng: `spliteasy.app/me/[personal_token]`

```
┌─────────────────────────────────┐
│  Tháng 5 của Bình               │
│                                 │
│  ┌──────────────────────────┐   │
│  │ 📦 Chi tiêu nhóm    ▶   │   │  ← Card gọn
│  │ Nợ 80k • 2 nhóm         │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │  ← Highlight vì có action
│  │ 🏸 Pickleball      ⚡ ▶  │   │
│  │ Nợ 200k • Cần thanh toán │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │ ✅ Đã thanh toán    ▶   │   │  ← Card gọn
│  │ Tháng này: 150k          │   │
│  └──────────────────────────┘   │
│                                 │
│  [→ Thanh toán 280k]            │
└─────────────────────────────────┘
```

- Card có `⚡` = cần action ngay
- Bấm card → xem chi tiết hạng mục đó
- Không có nút dư thừa — chỉ có 1 CTA (call-to-action) duy nhất là Thanh toán

---

## 8. Phân biệt UI theo vai trò (Role-based UI)

| Element | Treasurer | Member | Viewer |
|---------|-----------|--------|--------|
| Block "Chờ duyệt" | ✅ Hiển thị | ❌ Ẩn | ❌ Ẩn |
| Nút "+ Thêm chi tiêu" | ✅ Auto-approved | ✅ Pending | ❌ Ẩn |
| Nút "Báo sai" | ✅ | ✅ | ❌ |
| Nút "Tất toán" | ✅ | ❌ | ❌ |
| Nút "Thêm thành viên" | ✅ | ❌ | ❌ |
| Swipe duyệt | ✅ | ❌ | ❌ |
| Xem chi tiết số dư | ✅ | Của mình | Của mình |

---

## 9. Components mới cần xây dựng

| Component | Mô tả | Dùng ở đâu |
|-----------|-------|-----------|
| `SwipeCard` | Card vuốt Tinder-style | Màn hình duyệt chi tiêu |
| `StatusBadge` | Badge ⏳✅❌ màu theo status | Mọi expense item |
| `SummaryCard` | Card thu gọn có drill-down | Personal dashboard, Tab tổng quát |
| `PaymentFlow` | QR + xác nhận đã trả | Màn hình thanh toán |
| `DisputePopup` | Popup nhỏ báo sai sót | Inline trên expense |
| `SessionCalendar` | Lịch buổi + progress bar | Tab Pickleball |
| `SmartHome` | Trang chủ thông minh theo role | Tab Tổng quát |
| `JoinGroup` | Onboarding nhập mã / chọn identity | Màn hình join |
| `ApprovalQueue` | Badge + counter chờ duyệt | Tab Tổng quát (treasurer) |

---

## 10. Prompt cho Claude Design (Vẽ Mockup)

Dùng prompt sau để nhờ một AI design tool (Claude, Midjourney, v.v.) vẽ mockup:

```
Design a mobile-first web app UI called "SpliteasyBoss" — a group expense 
splitting app for Vietnamese pickleball clubs.

Design these 4 screens in Vietnamese language:

SCREEN 1 — Personal Overview Tab (for a member named "Bình"):
- Greeting: "Xin chào, Bình 👋 Tháng 5/2026"
- Two summary cards side by side: "📦 Nhóm - Nợ 120k" and "🏸 Pickleball - Nợ 200k"
- One prominent CTA button: "→ Thanh toán ngay 320k"
- Below (treasurer only): amber warning card "⏳ 3 chi tiêu chờ duyệt"

SCREEN 2 — Group Detail (expense list):
- Header: "🍜 Ăn trưa team" with back arrow and "..." menu
- Summary: "Bạn nợ 80k" with "+ Thêm" and "Tất toán" buttons
- Expense list with status badges:
  • Pending (amber ⏳): "Bún chả • 240k • An đề xuất" with small "Báo sai" button
  • Approved (green ✅): "Cà phê • 120k • Bình trả"
  • Declined (red ❌): "Bia • 180k • Bị từ chối: sai số tiền"

SCREEN 3 — Approval Swipe Card (treasurer view):
- Large card in center showing: expense name, amount, who submitted, date
- Smart split display: "An + 3 người khác, mỗi người 60k"
- Left side: red ✕ "Từ chối" | Right side: green ✓ "Duyệt"
- Swipe hint arrows on both sides
- Progress: "● ○ ○ — còn 2 chi tiêu"

SCREEN 4 — Pickleball Team Overview:
- Header: "🏸 CLB Pickleball Q7 — Tháng 5/2026"
- Session progress bar: "████████░░ 8/10 buổi"
- Upcoming sessions list: date, time, court
- Team costs card: 💧 Nước 600k | 🏸 Chi tiêu khác 300k | Tổng 900k
- Member avatar stack

Style requirements:
- Mobile-first, 390px width
- Dark mode with purple accent (#574EFA)
- Rounded cards with subtle shadows
- Vietnamese text throughout
- Clean, modern fintech aesthetic (similar to Revolut or Momo)
- Bottom tab bar with 4 tabs: Tổng quát / Nhóm / Pickleball / Hồ sơ
```
