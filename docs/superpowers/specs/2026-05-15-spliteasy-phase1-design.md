# SpliteasyBoss Ver2.0 — Design Spec (Tài liệu thiết kế)

**Ngày:** 2026-05-15  
**Phạm vi:** Phase 1 — Fully functional demo + lộ trình Phase 2

---

## 1. Mục tiêu (Goals)

### Phase 1 — Demo đầy đủ chức năng (1 người quản lý)
- Toàn bộ CRUD (Create, Read, Update, Delete — tạo, đọc, sửa, xóa) hoạt động thật
- **1 người duy nhất** (bạn) nhập và quản lý toàn bộ data trên thiết bị của mình
- Các thành viên xem kết quả qua thiết bị của bạn hoặc được bạn chia sẻ màn hình
- Data (dữ liệu) lưu vào localStorage (bộ nhớ cục bộ trình duyệt) — không mất khi đóng/mở app
- Không cần backend (máy chủ), không cần đăng nhập
- **Giới hạn rõ:** Không sync (đồng bộ) giữa các thiết bị — mục tiêu hoàn thiện nhanh để tiến sang Phase 2

### Phase 2 — App thật có backend (máy chủ)
- Supabase: authentication (xác thực), database (cơ sở dữ liệu) PostgreSQL, realtime sync (đồng bộ thời gian thực)
- Hệ thống permission (phân quyền) 3 tầng
- Nhiều thiết bị sync dữ liệu với nhau

---

## 2. Kiến trúc State (Trạng thái) — Phase 1

### Lựa chọn: React Context + useReducer

App có một `AppContext` (ngữ cảnh ứng dụng) duy nhất là "kho dữ liệu trung tâm". Mọi screen (màn hình) đọc và ghi vào cùng một chỗ.

### Cấu trúc data (dữ liệu)

```js
AppContext {
  currentUserId: string,       // "tôi là ai" — chọn khi mở app
  members: Member[],           // danh sách thành viên
  groups: Group[],             // nhóm + expenses (chi tiêu) bên trong
  pickle: PickleballData,      // dữ liệu pickleball
}
```

### Luồng hoạt động

1. **Mở app** → kiểm tra localStorage → có data thì load, không có thì dùng mock data (dữ liệu mẫu)
2. **Chọn profile** → lưu `currentUserId` vào localStorage
3. **Mọi action (hành động)** → dispatch (gửi lệnh) vào reducer (bộ xử lý trạng thái) → state cập nhật → tự động sync xuống localStorage
4. **Mọi screen** tự cập nhật ngay khi state thay đổi

### Danh sách actions (mệnh lệnh) chính

| Action | Mô tả |
|--------|-------|
| `ADD_EXPENSE` | Thêm chi tiêu mới vào nhóm |
| `EDIT_EXPENSE` | Sửa chi tiêu, tự tính lại số dư |
| `DELETE_EXPENSE` | Xóa chi tiêu, cập nhật số dư |
| `SETTLE_DEBT` | Ghi lịch sử tất toán giữa 2 người |
| `ADD_GROUP` | Tạo nhóm mới |
| `DELETE_GROUP` | Xóa nhóm |
| `ADD_PICKLE_SESSION` | Thêm buổi đánh pickleball |
| `CONFIRM_ATTENDANCE` | Xác nhận tham gia buổi đánh |
| `ADD_EXTERNAL_TICKET` | Thêm vé lẻ ngoài CLB (câu lạc bộ) |
| `SET_CURRENT_USER` | Chọn "tôi là ai" |

---

## 3. Logic tất toán và chỉnh lý (Adjustment)

### Nguyên tắc cốt lõi
- Chi tiêu **luôn sửa được** bất cứ lúc nào, kể cả sau khi đã tất toán
- Số dư (balance) luôn được tính real-time (thời gian thực) từ **toàn bộ chi tiêu + lịch sử tất toán**
- Nếu sửa chi tiêu sau tất toán → hệ thống tính ra khoản **chênh lệch cần bổ sung hoặc được hoàn**

### Ví dụ
> Mạnh trả 500k, chia đều 5 người → mỗi người nợ 100k  
> Trang tất toán → trả Mạnh 100k ✅  
> Trang sửa: "Tôi không đi hôm đó" → bỏ Trang khỏi split → chia 4 người → mỗi người nợ 125k  
> **Kết quả:** Trang thực ra nợ 0đ, đã trả 100k → **Mạnh nợ lại Trang 100k**  
> App hiển thị: *"Sau chỉnh lý: Mạnh cần hoàn Trang 100k"*

---

## 4. User Selection (Chọn người dùng) — Phase 1

- Lần đầu mở app: Hiện màn hình chọn "Tôi là ai?" với danh sách các thành viên
- Lưu lựa chọn vào localStorage
- Có thể đổi lại bất cứ lúc nào qua Screen Profile (màn hình cá nhân)
- Phase 1: Không có PIN, không có xác thực — tin tưởng người dùng tự chọn đúng

---

## 5. Permission (Phân quyền) — Để Phase 2

Phase 1 không có hệ thống phân quyền. Tất cả người dùng đều có full quyền (toàn quyền).

### Phase 2 — 3 tầng phân quyền

| Vai trò | Quyền hạn |
|---------|-----------|
| **Super Admin (Admin tổng)** | Toàn quyền mọi thứ trong app, thêm/bớt admin khác |
| **Group Leader (Nhóm trưởng)** | Toàn quyền trong nhóm mình tạo, cấp/thu hồi quyền cho thành viên |
| **Member (Thành viên)** | Xem + thêm chi tiêu, xin quyền sửa/xóa từ nhóm trưởng |

**Xác nhận quyền Admin tổng Phase 2:** Login (đăng nhập) thật qua Supabase Auth (xác thực)

**Luồng xin quyền:**  
Thành viên bấm "Sửa" → xin quyền → nhóm trưởng nhận notification (thông báo) → chấp thuận/từ chối → thành viên được cấp quyền

---

## 6. Danh sách tính năng Phase 1 cần implement (triển khai)

### Screen Home (Trang chủ)
- [ ] Số dư tổng tính từ data thật (không phải hardcode — giá trị cố định)
- [ ] "Ai nợ ai" cập nhật real-time
- [ ] Search (tìm kiếm) hoạt động

### Screen Groups (Nhóm)
- [ ] Tạo nhóm mới → lưu thật
- [ ] Thêm chi tiêu → số dư cập nhật ngay
- [ ] Sửa chi tiêu bất cứ lúc nào → tính lại tự động
- [ ] Xóa chi tiêu → cập nhật số dư
- [ ] Tất toán → ghi lịch sử, hiển thị chênh lệch nếu sửa sau
- [ ] Split mode (chia tiền): equal (đều) / parts (phần) / percent (phần trăm) — UI nhập đủ cả 3

### Screen Pickleball
- [ ] Thêm buổi đánh → lưu thật
- [ ] Xác nhận tham gia / vắng mặt
- [ ] Tính tiền sân chia đều tự động theo số người tham gia
- [ ] Thêm vé lẻ ngoài CLB

### Screen Profile (Cá nhân)
- [ ] Màn hình chọn "tôi là ai" (hiện khi lần đầu dùng app)
- [ ] Thông tin cá nhân hiển thị đúng theo người đang chọn
- [ ] Nút đổi người dùng

### Hệ thống chung
- [ ] AppContext + useReducer setup (thiết lập)
- [ ] localStorage sync tự động mỗi khi state thay đổi
- [ ] Load data từ localStorage khi mở app

---

## 7. Kết quả Screen Tour (Đánh giá giao diện thực tế)

*Ngày test: 2026-05-15 — Đánh giá toàn bộ 4 screen bằng cách điều khiển trực tiếp trên trình duyệt*

### Những điểm hoạt động tốt ✅

| Screen | Chức năng | Ghi chú |
|--------|-----------|---------|
| Trang chủ | Hiển thị số dư, tab "Ai nợ ai" / "Số dư" | UI (giao diện người dùng) đẹp |
| Nhóm | Danh sách nhóm, xem expense (chi tiêu) | Cơ bản xong |
| Pickleball | Tab navigation (4 tab) chuyển mượt | Không lag |
| Pickleball | Card "Đã diễn ra" → mở detail page (trang chi tiết) | **Đẹp nhất app** — đủ: tổng chi, ai trả, có mặt/vắng lai, tiền chia |
| Pickleball | Nút `<` back từ detail page | Hoạt động đúng |
| Cá nhân | ⚙️ Settings mở trang Cài đặt | Điều hướng OK |
| Cá nhân | 4 ô stats + bar chart (biểu đồ cột) chi tiêu theo loại | Thiết kế rất xịn |

### Các nút no-op cần implement (triển khai) Phase 1 ❌

**Screen Nhóm:**
- ⋯ menu → cần dropdown: Sửa nhóm · Thêm thành viên · Xóa nhóm
- ✏️ edit trong expense → cần mở form sửa chi tiêu

**Screen Pickleball:**
- Nút "Tham gia" buổi sắp tới
- "Xem lịch →"
- Click card "Sắp diễn ra" → cần mở detail (nhất quán với card "Đã diễn ra")
- Badge "Có mặt" → cần toggle được
- "Thêm buổi vé lẻ" → cần mở form
- Click card vé lẻ → cần mở detail
- "Thêm" thành viên → cần mở form
- Click card thành viên → cần mở detail

**Screen Cá nhân:**
- Filter "Tháng 5" trong Chi tiêu theo loại
- Card bạn bè "Hay chia tiền cùng"

### Quyết định thiết kế từ screen tour ⚠️

**1. Thiếu nút "Đổi người dùng"** — Phase 1 cần nút này, hiện không có trên bất kỳ screen nào. Cần thêm vào Screen Cá nhân.

**2. Profile screen có nhiều mục Phase 2** — Phương thức thanh toán, Nhắc qua Zalo, Lời mời là Phase 2 features. Phase 1: hiển thị với label "Sắp ra mắt" (coming soon), không implement.

**3. UX (trải nghiệm người dùng) không nhất quán** — Card "Đã diễn ra" click được mở detail nhưng card "Sắp diễn ra" thì không. Phase 1 cần làm nhất quán: card sắp tới cũng mở detail (chỉ xem, không edit).

---

## 8. Lộ trình Phase 2 — Backend (Máy chủ)

**Stack:** Supabase

**Migrate (chuyển đổi) từ Phase 1:**
- AppContext dispatches → thay bằng Supabase API calls (lời gọi API)
- localStorage → thay bằng Supabase PostgreSQL database
- Profile selection → thay bằng Supabase Auth (email / Google login)
- Logic tính toán số dư: giữ nguyên 100% — chỉ thay nguồn data

**Tính năng mới Phase 2:**
- Nhiều thiết bị sync dữ liệu thời gian thực
- Hệ thống phân quyền 3 tầng (như mô tả ở phần 5)
- Notification (thông báo) khi có chi tiêu mới hoặc bị nhắc nợ
- Zalo reminder (nhắc nhở) tích hợp (integration)

---

## 9. Quyết định kỹ thuật đã thống nhất

| Hạng mục | Quyết định |
|----------|-----------|
| State management | React Context + useReducer |
| Persistence Phase 1 | localStorage |
| Persistence Phase 2 | Supabase PostgreSQL |
| Auth Phase 1 | Không có (profile selection) |
| Auth Phase 2 | Supabase Auth |
| Permission Phase 1 | Full quyền cho tất cả |
| Permission Phase 2 | 3 tầng: Super Admin / Group Leader / Member |
| Post-settlement edit | Luôn cho phép, tính lại chênh lệch tự động |
| Stack frontend | React 18 + Babel CDN (giữ nguyên, không thay đổi) |
