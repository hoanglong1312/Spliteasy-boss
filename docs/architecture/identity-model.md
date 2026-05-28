# Identity Model — Source Of Truth

File này là nguồn sự thật (source of truth) cho cách phân biệt danh tính người dùng trong SpliteasyBoss. Khi code đụng tới thành viên, quyền, PIN, avatar, ngân hàng, giao dịch, điểm danh hoặc chia tiền, đọc file này trước.

## Khái Niệm Chính

### `profiles.id` — Người thật trong toàn app

`profiles.id` đại diện cho một người thật xuyên suốt nhiều nhóm. Một người như Long, Cường hoặc Hoàng Em có thể tham gia nhiều nhóm, nhưng vẫn nên có một profile chung.

Dùng `profile_id` cho dữ liệu thuộc về con người, không phụ thuộc nhóm:

- Tên hiển thị chung.
- Avatar / ảnh cá nhân.
- Màu avatar fallback nếu lưu ở danh bạ.
- Thông tin ngân hàng.
- PIN bảo mật ứng dụng.
- Danh bạ / hồ sơ gần đây.
- Tổng hợp số dư theo người trên nhiều nguồn tiền.

Không dùng `member.id` cho các setting cá nhân dài hạn, vì cùng một người có thể có nhiều `member.id` ở nhiều nhóm.

### `members.id` — Membership trong một nhóm cụ thể

`members.id` đại diện cho việc một profile tham gia một group cụ thể. Đây là danh tính theo ngữ cảnh nhóm.

Dùng `member.id` cho dữ liệu thuộc về nhóm hoặc giao dịch trong nhóm:

- Vai trò trong nhóm (`role`: treasurer/member/viewer).
- Trạng thái trong nhóm (`is_active`, `expense_active`, `member_type`).
- Người trả tiền trong chi tiêu (`paid_by_member_id`).
- Người tham gia chia tiền (`participants`, `splits.member_id`).
- Người gửi chi tiêu chờ duyệt (`submitted_by_member_id`).
- Người duyệt chi tiêu (`reviewed_by_member_id`).
- Điểm danh pickleball và vé lẻ theo buổi.
- Token session hiện tại, vì app đang đăng nhập bằng một membership cụ thể.

### `members.profile_id` — Cầu nối

`members.profile_id` nối membership trong nhóm về người thật. Khi cần gom dữ liệu của cùng một người qua nhiều nhóm, luôn đi qua `profile_id`.

Ví dụ:

- Long trong nhóm chi tiêu A và Long trong nhóm pickleball B có thể là hai `members.id` khác nhau.
- Nếu hai row cùng `profile_id`, app phải coi đó là cùng một người khi xử lý avatar, bank, PIN và tổng hợp cá nhân.

## Quy Ước Runtime

### `state.currentUserId`

`state.currentUserId` hiện là `member.id` của membership đang active, không phải `profile.id`.

Khi cần profile hiện tại, lấy từ member hiện tại:

```js
const me = members.find(member => String(member.id) === String(state.currentUserId))
const currentProfileId = me?.profileId || me?.profile_id
```

### Auth Và Recent Session

Auth token vẫn gắn với một `member.id` để Supabase RLS biết user đang vào từ nhóm nào. Recent session nên lưu cả `memberId`, `groupId`, `profileId`, `memberName`, `groupName`, `hasPin`.

Không được tin tuyệt đối `hasPin` trong localStorage. Trước khi chặn bằng PIN, hỏi Supabase bằng RPC hiện hành như `member_pin_required(memberId)` vì PIN là state server-side theo profile.

## Ma Trận Chọn ID

| Use case | ID chuẩn | Lý do |
|---|---:|---|
| Avatar cá nhân | `profile_id` | Một ảnh dùng ở mọi nhóm. |
| Bank info | `profile_id` | Một người có một tài khoản nhận tiền mặc định. |
| PIN bảo mật | `profile_id` | Một người dùng một PIN dù vào nhiều nhóm. |
| Role thủ quỹ trong nhóm | `member.id` + `group_id` | Quyền khác nhau theo nhóm. |
| Active/inactive trong nhóm | `member.id` + `group_id` | Có thể rời nhóm này nhưng vẫn ở nhóm khác. |
| Chi tiêu: người trả | `member.id` | Giao dịch thuộc một nhóm cụ thể. |
| Chi tiêu: người tham gia | `member.id` | Split theo membership trong nhóm. |
| Điểm danh pickleball | `member.id` | Điểm danh theo nhóm/buổi. |
| Tổng hợp trang chủ theo người | `profile_id` | Gom nhiều nguồn tiền của cùng một người. |
| Share bill nhóm hiện tại | `member.id` + `group_id`, có thể kèm `profile_id` | Bill scoped theo nhóm, nhưng phải biết người thật. |
| Share/link vào app | Token membership, metadata profile | Login cần membership, hiển thị cần profile. |

## Rules Bắt Buộc Khi Code

1. Nếu dữ liệu là thuộc tính cá nhân lâu dài, dùng `profile_id` và bảng `profiles`.
2. Nếu dữ liệu là quan hệ với một nhóm, dùng `member.id` và `group_id`.
3. Không thêm field cá nhân mới vào `members` nếu field đó cần đồng bộ qua nhiều nhóm.
4. Khi query hoặc normalize member, luôn giữ cả hai alias `profileId/profile_id` và `groupId/group_id` nếu codebase đang dùng cả camelCase và snake_case.
5. Khi viết RPC có input `p_member_id` nhưng logic là cá nhân, RPC phải map sang `profile_id` bên trong.
6. Khi hiển thị hoặc lọc “cùng một người”, so sánh `profile_id` trước, chỉ fallback name/member id khi dữ liệu legacy thiếu profile.
7. Khi sửa auth/session/PIN/avatar/bank, thêm test để chứng minh không dùng nhầm `member.id` làm danh tính thật.

## Anti-Patterns

Không làm các pattern này:

```js
// Sai: PIN theo membership nên Long ở nhóm khác verify không được.
hash(pin + ':' + memberId)

// Sai: avatar update một row member, tab khác không đổi.
update members set avatar_url = ... where id = currentUserId

// Sai: gộp số dư theo tên, dễ dính trùng tên hoặc sai dấu tiếng Việt.
groupBy(member.name)
```

Pattern đúng:

```js
// Đúng: setting cá nhân theo profile.
hash(pin + ':' + profileId)

// Đúng: role theo membership trong group.
update members set role = 'treasurer' where id = memberId and group_id = groupId

// Đúng: tổng hợp cùng người qua nhiều nhóm.
groupBy(member.profileId || member.profile_id)
```

## Check Trước Khi Commit

- Có field nào mới thuộc về người thật nhưng lại lưu vào `members` không?
- Có logic nào dùng `state.currentUserId` như `profile_id` không?
- Có compare theo tên trong khi đã có `profile_id` không?
- Có test/source test khóa đúng boundary `profile_id` vs `member.id` chưa?
- Migration/RPC có tương thích dữ liệu legacy thiếu `profile_id` hoặc còn `members.pin_hash` không?
