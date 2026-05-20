# P2 — Member Management Redesign

**Goal:** Redesign tab T.Viên trong Pickleball: compact list với rank, member detail screen, edit info (tên/STK), grant treasurer, fixed↔vãng lai switch. Xoá phần member management khỏi PickleballSettings.

---

## Scope

- Redesign `PickleballMembers.jsx` toàn bộ
- Thêm màn hình `MemberDetail.jsx` (mới)
- Thêm field `bank_account` vào DB (migration)
- Xoá phần member list + add/delete member khỏi `PickleballSettings.jsx`
- Logic vãng lai tính tiền (trong `useScreenData.js`)

---

## Tab T.Viên — Layout

### Header (heroEmerald gradient, giống các tab Pickleball khác)
- Title: "Thành viên"
- Nút **"+ Thêm"** (chỉ thủ quỹ thấy)

### Stats Strip (3 card)
| Cố định | Vãng lai | Tổng |

### Search bar
- Lọc theo tên, real-time

### Section "Cố định · N người"
List compact, mỗi row:
```
[Avatar 34px] [Tên] [rank icon]   [⋯]
              [progress bar──────] XX% · rank label
```

Row tap → MemberDetail screen.
Nút `⋯` → quick actions (thủ quỹ) hoặc ẩn (member thường).

Khi list > 5 người → hiện 5 đầu + "▼ Xem thêm N thành viên" (expand in-place).

### Section "Vãng lai · N người"
Same layout, progress bar đo số buổi tháng này thay vì %.

---

## Rank Tiers (dựa trên % buổi tháng hiện tại)

| Icon | Label | Ngưỡng |
|------|-------|--------|
| 🔥 | Siêu chăm | ≥ 85% |
| ⚡ | Chăm chỉ | 65–84% |
| 😐 | Bình thường | 45–64% |
| 🥶 | Hay vắng | < 45% |

Progress bar màu: xanh emerald ≥65%, amber 45–64%, red <45%.

---

## MemberDetail Screen

Route: `memberDetail` (push từ T.Viên tab, back về T.Viên).

### Header
Avatar 56px + tên + rank icon + badges (THỦ QUỸ / Cố định / Vãng lai).

### Card: Điểm danh tháng này
- Progress bar lớn + %
- Grid: Có mặt / Vắng / Tổng buổi

### Card: Số dư tháng này
- Dòng: Tiền sân / Tiền nước / Phụ phát sinh
- Tổng còn nợ (hoặc thặng dư nếu > 0)
- **Tất cả thành viên đều xem được — không phân biệt role**

### Card: Thông tin
- Ngày tham gia
- STK ngân hàng (hiển thị, nút copy)
- Nút **"✏️ Sửa"** (chỉ thủ quỹ thấy) → bottom sheet: sửa tên + STK

### Card: Quản lý (chỉ thủ quỹ thấy)
- `↔️ Chuyển sang Vãng lai` / `Chuyển thành Cố định`
- `👑 Cấp quyền Thủ quỹ` / `Thu quyền Thủ quỹ` (toggle theo role hiện tại)
- `🗑 Xoá khỏi nhóm` (confirm dialog trước khi xoá)

---

## Logic Vãng lai

**Công thức:**
```
ratePerSession = courtFeeTotal / sessionsCount / fixedMemberCount
vanglaiCharge  = ratePerSession × sessionsAttended   // mỗi vãng lai tự trả
rebatePerFixed = sum(vanglaiCharge cho tất cả vãng lai) / fixedMemberCount
fixedNetCost   = courtFeeShare - rebatePerFixed
```

Áp dụng trong `buildPickleballOverviewData` và `buildMemberDetailData` (tính `yourBalance`).

---

## DB Migration

```sql
ALTER TABLE members ADD COLUMN bank_account TEXT;
```

Không có constraint — tuỳ chọn, thủ quỹ nhập thay cho thành viên.

---

## Actions & Handlers (app-v2.jsx)

| Action | Payload | Kết quả |
|--------|---------|---------|
| `editMember` | `{ memberId, name, bankAccount }` | UPDATE members |
| `setMemberRole` | `{ memberId, role }` | UPDATE members SET role |
| `setMemberType` | `{ memberId, type }` | UPDATE members SET member_type (`fixed`/`casual`) |
| `deleteMember` | `{ memberId }` | UPDATE members SET is_active=false |

`member_type` field: thêm vào DB migration nếu chưa có (check schema trước).

---

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/screens/PickleballMembers.jsx` | Viết lại toàn bộ |
| `src/screens/MemberDetail.jsx` | Tạo mới |
| `src/hooks/useScreenData.js` | Thêm `buildMemberDetailData()`, update vãng lai logic |
| `src/app-v2.jsx` | Thêm route `memberDetail`, handlers editMember/setMemberRole/setMemberType/deleteMember |
| `src/screens/PickleballSettings.jsx` | Xoá section member list + add/delete member |
| `supabase/migrations/` | `ALTER TABLE members ADD COLUMN bank_account TEXT` + `member_type` nếu thiếu |

---

## Out of scope

- Monthly participation toggle (ai đánh tháng này) → vẫn trong Settings
- Push notification khi thêm thành viên → P-later
- Avatar upload → không làm
