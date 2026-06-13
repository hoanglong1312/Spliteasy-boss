# Spec: Pickleball Cost Calculation Redesign

**Date:** 2026-06-12  
**Status:** draft

---

## Context

Logic tính chi phí pickleball hiện tại có 2 tầng riêng biệt:
- Tiền sân: tính theo tháng, tích lũy attendance
- Tiền nước: tính riêng qua `memberWaterShare`, dùng `fallback=true` cho tất cả

Bug xác nhận: Việt Hoàng (casual member) không đi buổi nào tháng 5, chỉ bấm "không đi" 1 lần (05-25) → bị tính tiền nước 12 buổi vì `fallback=true` coi mọi member không có record = có mặt.

**Root cause:** `fallback=true` đúng cho fixed member (vắng phải bấm), sai cho casual member (có mặt mới tính).

---

## Mục Tiêu

1. Fix bug nước cho casual member: chỉ charge khi có record `attended=true`.
2. Unify logic theo từng buổi: court + water tính cùng 1 pass per session.
3. Casual member dùng `ratePerSession` động (= court fee total / sessionsCount / fixedMemberCount), không cần config riêng.
4. Xé vé (external tickets) **không ảnh hưởng** `sessionsCount` — vẫn là p2p riêng.

---

## Thiết Kế — Approach B: Unified Per-Session Accumulator

### Khái Niệm Chính

```
ratePerSession = courtFeeTotal / sessionsCount / fixedMemberCount
```

Mỗi buổi tính độc lập:

```
buildSessionCostBreakdown(session, members, pickle):
  fixedPresent = effectiveSessionMemberIds(session, fixedMembers,  fallback=true)
  casualPresent = effectiveSessionMemberIds(session, casualMembers, fallback=false)  ← KEY FIX
  allPresent   = fixedPresent ∪ casualPresent

  courtShare:
    fixed member ∈ fixedPresent  → +ratePerSession (toward monthly total)
    casual member ∈ casualPresent → +ratePerSession

  waterShare:
    session.waterCost / allPresent.length  per present member
    (không phân biệt fixed/casual, chỉ phân biệt có mặt)
```

Accumulate toàn tháng → `memberMonthBalance`.

### Quy Tắc Loại Thành Viên

| Thành viên | Court fallback | Water fallback | Tính tiền sân tháng |
|---|---|---|---|
| Fixed (`isFixedForMonth=true`) | `true` (vắng = bấm) | `true` | Flat monthly (courtFeeTotal / fixedMemberCount) - rebate từ casual |
| Casual | `false` (có mặt = bấm) | `false` ← **FIX** | ratePerSession × số buổi có mặt |

### Xé Vé — Không Thay Đổi

`memberTeamFundTicketShare` và `memberTicketBalance` giữ nguyên. Xé vé là p2p transaction riêng, không phải session trong lịch định kỳ → `sessionsCount` không đổi.

### Ví Dụ Thực Tế — Tháng 5

```
Giả định: courtFeeTotal=3.000.000đ, 13 buổi, 10 fixed member
ratePerSession = 3.000.000 / 13 / 10 = 23.077đ/buổi

Việt Hoàng (casual):
  - 0 record "attended=true"
  - casualPresent → không có mặt buổi nào
  - Court charge: 0
  - Water charge: 0 ← FIX (trước: 12 buổi bị charge)

Thành viên cố định A:
  - 0 record (không bấm gì) → fallback=true → coi có mặt 13/13 buổi
  - Court charge: flat monthly (như cũ)
  - Water charge: mỗi buổi chia đều với người có mặt
```

---

## Files Cần Sửa

| File | Thay đổi |
|------|---------|
| `src/hooks/useScreenData.js` | Sửa `memberWaterShare` + `memberExtrasShare`: thêm type-aware fallback cho casual. Tách `buildSessionCostBreakdown()` helper (optional refactor). |

**Scope hẹp:** Chỉ sửa `memberWaterShare` trước (fix bug Việt Hoàng). `memberExtrasShare` là bug riêng, có thể fix cùng lúc.

### Hàm Cần Sửa

**`memberWaterShare` (line ~2753):**
```js
// TRƯỚC (bug):
const ids = effectiveSessionMemberIds(session, members, true)  // fallback=true cho tất cả

// SAU:
const fixedIds   = effectiveSessionMemberIds(session, fixedMembers, true)
const casualIds  = effectiveSessionMemberIds(session, casualMembers, false)
const presentIds = new Set([...fixedIds, ...casualIds])
// dùng presentIds.has(memberId) thay vì ids.has(memberId)
```

**`memberExtrasShare` (line ~2772):** Cùng pattern — sửa tương tự.

**Phụ thuộc cần đọc trước:**
- `effectiveSessionMemberIds(session, members, fallback)` — `src/hooks/useScreenData.js`
- `isFixedForMonth(member, date)` — để filter fixedMembers và casualMembers
- `buildMemberMonthBalance` caller chain — để hiểu context gọi

---

## Verification

1. `npm run build` pass
2. Supabase query: Việt Hoàng tháng 5 → water charge = 0
3. Thành viên cố định không bấm gì → water charge bình thường (fallback=true vẫn hoạt động)
4. Thành viên cố định bấm "có mặt" → charged, bấm "vắng" → không charged
5. `npx playwright test --reporter=line` pass

---

## Out of Scope

- Không thay đổi cách tính tiền sân fixed member (flat monthly - rebate)
- Không thay đổi xé vé logic
- Không redesign toàn bộ `buildMemberMonthBalance` (incremental fix)
- Không thêm UI mới
