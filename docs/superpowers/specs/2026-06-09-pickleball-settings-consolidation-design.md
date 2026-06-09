# Spec: Pickleball Settings Consolidation

**Date:** 2026-06-09
**Status:** approved

## Mục tiêu

Xóa màn hình "Cài đặt" pickleball riêng biệt. Tích hợp toàn bộ chức năng vào 2 tab có sẵn:
- Schedule config → collapsible section cuối **Tab Tổng quan**
- Member type toggle (fixed/casual) → **Tab Thành viên** (đã có, cần fix `yearMonth`)
- Member row interaction → expand-on-tap cho cả 2 loại member

---

## 1. Tab Tổng quan — Collapsible Schedule Config

### Điều kiện hiển thị
Chỉ hiển thị khi `isTreasurer === true`. Viewer/member không thấy section này.

### Layout

```
[collapsed — default]
┌──────────────────────────────────┐
│ ⚙ Cài đặt lịch                  │  ← tap để expand
│ T2 T4 T6 · 19:00–21:00 · 13 buổi│  ← summary row
└──────────────────────────────────┘

[expanded]
┌──────────────────────────────────┐
│ ⚙ Cài đặt lịch              [▲] │
│ Ngày trong tuần:                 │
│ [T2][T3][T4][T5][T6][T7][CN]    │
│ Giờ chơi: 19:00 – 21:00         │
│ Ngày bắt đầu: 01/06/2026        │
│ ☑ Tự tạo buổi cuối tháng        │
│ [💾 Lưu cài đặt]                │
└──────────────────────────────────┘
```

### Fields (giữ nguyên từ PickleballSettings)
- Tên CLB (text input)
- Ngày trong tuần (multi-select: T2–CN)
- Giờ bắt đầu / kết thúc (time inputs)
- Ngày bắt đầu tháng (date input)
- Toggle "Tự tạo buổi cuối tháng"
- Button "💾 Lưu cài đặt" → dispatch `saveSettings`

### Month isolation
Config lưu vào `pickleball_monthly_config` theo `yearMonth` hiện tại của MonthNav — không update global. Action `saveSettings` đã có sẵn, giữ nguyên behavior.

---

## 2. Tab Thành viên — Expand-on-tap + Month-aware Toggle

### Layout member row

```
[collapsed — default, cả fixed lẫn casual]
┌─────────────────────────────────────┐
│ [LT] Lê Tuấn       Cố định   [→ V] │
└─────────────────────────────────────┘

[tap row → expand, chỉ 1 row expanded tại 1 thời điểm]
┌─────────────────────────────────────┐
│ [LT] Lê Tuấn       Cố định   [→ V] │
│      [✏️ Sửa]     [🗑 Xóa]         │
└─────────────────────────────────────┘
```

- Tap row → expand inline actions (Sửa, Xóa)
- Tap row đang expanded → collapse
- Mở row mới → tự đóng row cũ (accordion behavior)
- Nút toggle type `[→ V]` / `[→ C]` vẫn nằm trên row chính (không ẩn)

### Month isolation — CRITICAL
Toggle `setMemberType` **bắt buộc** truyền `yearMonth: d.currentYearMonth`.

```js
// PickleballMembers.jsx — hiện tại (SAI)
onAction?.('setMemberType', { memberId: member.id, type, groupId: d.groupId })

// Sau fix (ĐÚNG)
onAction?.('setMemberType', { memberId: member.id, type, groupId: d.groupId, yearMonth: d.currentYearMonth })
```

`d.currentYearMonth` lấy từ MonthNav state — tháng đang xem trên màn hình.

Handler trong `app-v2.jsx` đã đúng: upsert vào `pickleball_monthly_config` theo `yearMonth` riêng biệt. Không chạm `members.member_type` global khi là pickleball group.

**Verification:** Toggle tháng 5 → không ảnh hưởng tháng 6 và ngược lại.

---

## 3. Xóa

| Item | Action |
|---|---|
| `src/screens/PickleballSettings.jsx` | Xóa file |
| Route `pickleball-settings` trong `app-v2.jsx` | Xóa case |
| `⚙️` IconButton trong `PickleballOverview` header | Xóa |
| `onAction('settings')` handler trong `app-v2.jsx` | Xóa |
| `getPickleballSettingsData()` trong `useScreenData.js` | Xóa function + caller |
| `buildPickleballSettingsData()` trong `useScreenData.js` | Xóa function |
| `getPickleballSettingsData` import/usage trong `app-v2.jsx` | Xóa |

---

## 4. Data flow — Month isolation summary

```
MonthNav (Tháng N)
    │
    ├─ Tab Thành viên
    │    └─ toggle → setMemberType({ yearMonth: "YYYY-MM" })
    │         └─ upsert pickleball_monthly_config WHERE year_month = "YYYY-MM"
    │              ← KHÔNG đụng tháng khác
    │
    └─ Tab Tổng quan (collapsible config)
         └─ saveSettings({ yearMonth: "YYYY-MM", ... })
              └─ upsert pickleball_monthly_config WHERE year_month = "YYYY-MM"
                   ← KHÔNG đụng tháng khác
```

Members global (`members.member_type`) chỉ là fallback khi không có monthly config — không bao giờ bị update bởi 2 actions trên.

---

## 5. Files cần sửa

| File | Thay đổi |
|---|---|
| `src/screens/PickleballOverview.jsx` | Xóa ⚙️ button; thêm collapsible config section cuối Tổng quan tab |
| `src/screens/PickleballMembers.jsx` | Thêm expand-on-tap state; truyền `yearMonth` vào `setMemberType` |
| `src/hooks/useScreenData.js` | Xóa `buildPickleballSettingsData` |
| `src/app-v2.jsx` | Xóa route + handler `pickleball-settings`; xóa `getPickleballSettingsData` |
| `src/screens/PickleballSettings.jsx` | Xóa file |

---

## 6. Out of scope

- Thay đổi logic tính toán tiền sân, tiền khách
- Thay đổi `pickleball-calendar` screen
- Thay đổi RLS policies
