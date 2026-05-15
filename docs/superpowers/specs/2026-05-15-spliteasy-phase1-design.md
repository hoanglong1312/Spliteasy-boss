# SpliteasyBoss Ver2.0 — Design Spec (Tài liệu thiết kế)

**Ngày:** 2026-05-15  
**Phạm vi:** Phase 1 — Fully functional demo + lộ trình Phase 2

---

## 1. Mục tiêu (Goals)

### Phase 1 — Demo đầy đủ chức năng
- Toàn bộ CRUD (Create, Read, Update, Delete — tạo, đọc, sửa, xóa) hoạt động thật
- Cả nhóm pickleball dùng chung app trên nhiều thiết bị
- Mỗi người chọn "tôi là ai" khi mở app (profile selection — chọn hồ sơ)
- Data (dữ liệu) lưu vào localStorage (bộ nhớ cục bộ trình duyệt) — không mất khi đóng/mở app
- Không cần backend (máy chủ), không cần đăng nhập

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

## 7. Lộ trình Phase 2 — Backend (Máy chủ)

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

## 8. Quyết định kỹ thuật đã thống nhất

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
