# Pickleball Attendance Redesign — Design Spec

**Ngày:** 2026-05-19
**Trạng thái:** Đã duyệt
**Phạm vi:** Sửa tab Pickleball — fix data source, thêm card "Buổi hôm nay", đổi attendance UI thành inline

---

## Tổng quan

Tab Pickleball hiện đang đọc sessions từ schema cũ (`pickle_sessions`/`pickle_attendees`) nên hiện "0/0 buổi". Cần chuyển sang schema mới (`pickleball_sessions`/`pickleball_attendance`) và redesign UI điểm danh để thủ quỹ dễ sử dụng hơn.

---

## 1. Fix Data Source

Toàn bộ logic đọc sessions trong `screen-pickleball.jsx` phải dùng:
- `pickleball_sessions` (thay cho `pickle_sessions`)
- `pickleball_attendance` (thay cho `pickle_attendees`)

Schema mới:
```
pickleball_sessions: id, group_id, date, notes, created_at
pickleball_attendance: session_id, member_id, status ('present'|'absent'), marked_by, marked_at
```

---

## 2. Tab Tổng quan — Card "Buổi hôm nay"

Thêm card ở **đầu trang** Tab Tổng quan, chỉ hiện khi:
- Hôm nay có session (date = today) trong `pickleball_sessions` của group
- User là thủ quỹ (`isTreasurer = true`)

**UI card:**
- Nền indigo gradient (`#3730a3 → #4f46e5`)
- Badge: "📅 Hôm nay · T[X], DD/MM"
- Title: "Buổi #N"
- Sub: "X có mặt · Y vắng" (từ attendance đã load)
- Nút "✓ Điểm danh buổi này" → set active tab sang "sessions" và set `expandedSession = todaySession.id`

---

## 3. Tab Buổi đánh — Attendance Inline

### Sessions list
- Load từ `pickleball_sessions` của group trong tháng hiện tại
- Sort ascending theo date
- Mỗi session: hiện ngày + thứ + tên buổi + tóm tắt "X có mặt · Y vắng"
- Session hôm nay: highlight indigo + badge "Hôm nay"
- Session sắp tới (date > today): opacity thấp, không cho expand điểm danh

### Expand inline attendance (chỉ thủ quỹ, session đã qua hoặc hôm nay)
Tap session → expand danh sách thành viên:
- Mỗi member: avatar (initials) + tên + trạng thái
- Default = `present` (xanh mint, `rgba(52,211,153,0.12)`, border mint)
- Absent = đỏ rose (`rgba(251,113,133,0.12)`, border rose)
- **Tap row** → toggle giữa present ↔ absent (upsert vào `pickleball_attendance`)
- Hint text: "Tap vào tên để đánh dấu vắng"
- Load attendance lazy khi expand lần đầu

### Bỏ section riêng "Điểm danh tháng"
Gộp vào sessions list ở trên. Section "Điểm danh tháng" hiện tại xóa đi.

### Giữ nguyên "Quản lý CLB"
Chỉ giữ phần tạo lịch tháng. Không có gì khác.

---

## 4. Fix isTreasurer

Logic hiện tại có thể sai khi `currentGroupId` không trỏ đúng pickleball group.

Fix: tìm group pickleball từ `state.groups` (name chứa "pickleball", case-insensitive), sau đó tìm member trong group đó có token khớp, kiểm tra `role === 'treasurer'`.

---

## 5. Không làm (YAGNI)

- Không thêm filter tháng trong tab Buổi đánh (dùng tháng hiện tại)
- Không cho member thường xem attendance của người khác
- Không thêm animation expand/collapse
- Không notify khi điểm danh xong
