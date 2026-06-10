# Spec: JoinGroup — Recent Sessions + Unified Inline PIN
**Date:** 2026-06-11  
**Status:** ready for writing-plans

---

## Mục tiêu

1. Thêm lại card list "Vào lại tài khoản gần đây" trên JoinGroup.
2. Thống nhất tất cả PIN flows thành **1 pattern duy nhất: inline expand**.
3. Ẩn chip mã nhóm khi session không có `inviteCode`.

---

## Files chịu ảnh hưởng

- `src/screens/JoinGroup.jsx` — toàn bộ thay đổi UI
- `src/lib/auth.js` — chỉ đọc (không sửa)
- `src/app-v2.jsx` — chỉ đọc, `resumeRecentSession` đã có sẵn

---

## 1. Recent Sessions Card List

### Khi nào hiện
- Hiện khi `hasGroupPreview === false` (chưa tìm thấy nhóm)
- Ẩn khi `hasGroupPreview === true` (đã tìm thấy nhóm → chuyển sang flow chọn member)

### Data source
```js
import { getRecentSessions, removeRecentSession } from '../lib/auth.js'
const sessions = getRecentSessions() // max 5, shape: { memberId, profileId, memberName, hasPin, authToken, inviteCode, ... }
```

Chỉ render khi `sessions.length > 0`.

### Card layout (1 card)
```
[Avatar 40px]  [memberName]     [icon]  [× delete]
```

- **Avatar**: chữ hoa đầu `memberName`, màu nền deterministic từ tên (dùng cùng hàm avatar color hiện tại trong app)
- **Icon**: `›` nếu `!hasPin`, `🔒` nếu `hasPin`
- **`×` delete**: gọi `removeRecentSession(session)` → re-render list. Touch target tối thiểu 28×28px.

### Tap card (không có PIN)
Gọi `onAction?.('resumeSession', session)` — handler đã có trong app-v2 (`resumeRecentSession`).

### Tap card (có PIN) → Inline PIN expand
Card mở rộng xuống dưới (flex-col), không tạo section mới:

```
[Avatar]  [memberName]                    [× delete]
┌─────────────────────────────────────────┐
│ 🔒 Nhập PIN để vào tài khoản này        │
│  ○ ○ ○ ○  (4 dots, filled as typed)    │
│  [Xác nhận]                             │
└─────────────────────────────────────────┘
```

- Border: `1px solid brand` (indigo)
- Nhập PIN: numeric, 4 ký tự, hiển thị dot (masked)
- Xác nhận: gọi `verifyProfilePin(session.profileId, pin)` từ `auth.js`, nếu đúng → `onAction?.('resumeSession', session)`
- Sai PIN: shake animation trên dots, clear input, không navigate
- State lỗi inline trong card (không toast)

---

## 2. Unified Inline PIN — "Bạn là ai?" member chip

### Hiện trạng (bỏ)
Khi chọn member chip có PIN → section riêng ở bottom (`pinRequired` section, lines ~510-600) hiện ra. → **XÓA** section này.

### Thay thế: selected chip transform

Khi user tap chip member trong "Bạn là ai?":
- Chip không có PIN → hành vi như cũ (highlight chip, enable Join button)
- Chip **có PIN** → chip đó transform thành inline card (giống recent session card):

```
[Avatar]  [memberName]           [×/collapse]
┌─────────────────────────────────────────┐
│ 🔒 Nhập PIN để xác nhận danh tính       │
│  ○ ○ ○ ○                                │
│  [Xác nhận]                             │
└─────────────────────────────────────────┘
```

- Các chip khác ở trạng thái mờ (opacity giảm) khi có 1 chip đang expand
- Tap `×` hoặc tap chip khác → collapse PIN, clear state
- Xác nhận đúng → set `selectedMember` → enable Join button như bình thường

> **Lưu ý:** Chip trong "Bạn là ai?" là chip text hiện tại. Khi expand, chip đó **không xóa** khỏi list — nó expand chiều dọc trong flow. Layout chip list vẫn là flex-wrap, chỉ chip đang active expand thành block.

---

## 3. Invite Link `pinRequired` Flow

### Không đổi về logic, chỉ đổi về trình bày

Khi backend trả về `requires_pin` (invite link flow):
- **Không dùng** big section ở bottom nữa
- Hiển thị inline card ngay dưới name input:

```
[name đã nhập]  ← read-only chip/badge

┌─────────────────────────────────────────┐
│ 🔒 [memberName] cần xác minh PIN        │
│  ○ ○ ○ ○                                │
│  [Xác nhận]                             │
└─────────────────────────────────────────┘
```

- `memberName` lấy từ `pinRequiredMemberName` (đã có từ RPC migration `20260611000001`)
- Xác nhận: gọi `getTokenAfterPinVerify(pinRequiredMemberId, pin)` như cũ
- Sai PIN: inline error, clear input

---

## 4. Chip mã nhóm — Ẩn khi không có `inviteCode`

Session joined qua invite link không có `inviteCode` → chip hiển thị sẽ không click được → misleading.

**Rule:** Chỉ render chip khi `session.inviteCode && session.inviteCode.trim()`.

Chip groupName fallback (hiện tại dùng để show nhóm khi không có code) → **xóa**. Không hiện chip nếu không có code.

---

## 5. Visual spec

### Colors (từ tokens.js)
```
brand: '#6366f1'          ← PIN expand border, active chip
brandSoftBg: rgba(99,102,241,0.12)  ← PIN expand background
textPrimary: '#f8fafc'
textSecondary: '#94a3b8'
borderSubtle: rgba(255,255,255,0.06)
```

### Card states
| State | Border | Background |
|---|---|---|
| Default | `borderSubtle` | `rgba(255,255,255,0.04)` |
| PIN expand | `brand` | `brandSoftBg` |
| Hover/focus | `borderNormal` | `rgba(255,255,255,0.06)` |

### Spacing
- Card padding: `12px 14px`
- Avatar size: 40×40px, border-radius 50%
- Gap giữa avatar và name: `12px`
- PIN dots: 12×12px, gap 8px, filled = brand color

---

## 6. Acceptance criteria

- [ ] Sessions list hiện khi `hasGroupPreview === false`, ẩn khi `true`
- [ ] Card hiển thị: avatar letter (colored), memberName, `›` hoặc `🔒`, `×`
- [ ] Tap `›` card → `resumeRecentSession` trong app-v2
- [ ] Tap `🔒` card → inline PIN expand, verify, navigate nếu đúng
- [ ] Sai PIN → shake, clear, không navigate
- [ ] Xóa card → session removed, list re-render
- [ ] Chip member có PIN trong "Bạn là ai?" → inline expand (không mở bottom section)
- [ ] Bottom `pinRequired` section đã xóa hoặc chỉ dùng cho invite link flow ở dạng inline card
- [ ] Chip không có `inviteCode` không render
- [ ] `npm run build` pass
- [ ] Không regression trên flow khác (admin shortcut, invite link, new member join)
