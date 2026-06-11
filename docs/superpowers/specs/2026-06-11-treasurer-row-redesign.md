# Treasurer Payment Dashboard — Row Redesign

## Goal
Redesign nút hành động trong `TreasurerPaymentDashboard` từ full-width "Đã TT" sang layout inline compact, thêm multi-select mode và share link dùng profile_id.

## Design Decisions (đã confirm)

### Row Layout: Option B inline
Mỗi unpaid member row:
```
[Tên member]           [🔗] [QR] [✓TT]
N nguồn · X.XXX.XXX đ
```
- Amount + nguồn gom vào dòng subtitle
- Button cluster bên phải: 3 nút nhỏ inline
- 🔗 → copy profile share link to clipboard ngay (no sheet)
- QR → mở QR sheet cho member đó (single-member, flow hiện tại)
- ✓TT → markMemberPaid (flow hiện tại)

### Select Mode: B1 (header toggle)
- Header section "CÒN CHƯA THANH TOÁN" bỏ nút QR riêng
- Thêm nút "☑ Chọn" ở header
- Tap → `selectMode = true`: rows chuyển sang checkbox, per-row buttons ẩn
- Floating action bar xuất hiện khi `selectMode && selected.size > 0`:
  - `[N member đã chọn] [QR] [✓ ĐÃ TT] [✕]`
  - QR → `MultiMemberQRSheet` với danh sách selected (giữ flow hiện tại)
  - ĐÃ TT → bulk `markMemberPaid` cho tất cả selected (loop)
  - ✕ → thoát select mode, clear selection
- Khi `selectMode = false`: trở lại inline buttons

### Share Link: Profile-level
- URL dùng `profile_id` thay vì `member_id + group_id`
- Format: `?access=<profile_token>` (cùng param name `access`)
- Khi land: app detect token là profile-level → show Home với TẤT CẢ groups của profile đó
- Sau khi land: `window.history.replaceState(null, '', window.location.pathname)` ngay
- New Supabase RPC `create_profile_access_link(p_profile_id uuid)` (SECURITY DEFINER):
  - Validate caller là treasurer của ít nhất 1 group có profile này làm member
  - Tạo token trong bảng `member_access_links` với `is_profile_level = true` (hoặc bảng riêng)
  - Return `{ urlToken: string }`
- Landing handler trong app-v2.jsx: detect token type → nếu profile-level → resolve về member.id của profile trong group hiện tại (hoặc group đầu tiên) để set `currentUserId`

## Files Liên Quan
- `src/screens/Home.jsx` — TreasurerPaymentDashboard (line ~970–1300)
- `src/app-v2.jsx` — action handlers
- `supabase/migrations/` — new RPC migration

## Out of Scope
- Không sửa `MemberShareLinkSheet` component (giữ nguyên, chỉ không dùng trong flow mới)
- Không đổi layout các section khác (Chờ duyệt, Đã nhận, Cần hoàn tiền)
