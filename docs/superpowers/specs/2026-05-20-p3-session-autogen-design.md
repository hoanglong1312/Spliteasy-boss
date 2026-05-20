# P3 — Session Auto-Generation

**Goal:** Tự động tạo lịch buổi đánh từ config (weekdays + start date + time). Calendar tab hiển thị đầy đủ. Thủ quỹ có thể trigger lại khi đổi config.

---

## Cơ chế sinh session

### Điều kiện trigger (client-side, không cần cron)
Khi `PickleballOverview` mount (hoặc refresh state):
1. Đọc sessions tháng hiện tại từ state
2. Nếu `sessions.length === 0` VÀ config có `scheduleWeekdays` → gọi `generateMonthSessions()`
3. Nếu đã có sessions → skip (không regenerate)

### `generateMonthSessions(yearMonth, config)` — pure function
```
Input:
  yearMonth: '2026-05'
  config: {
    scheduleWeekdays: [1,3,5]   // ISO: 1=T2, 2=T3, ..., 7=CN
    scheduleTime: '19:00-21:00'
    startDate: '05/05'          // ngày bắt đầu (có thể không phải ngày 1)
    defaultVenue: 'Sân ABC'
  }

Output: Session[]
  { date, startTime, endTime, court, status: 'scheduled', sessionNumber }
```

Logic:
- Duyệt tất cả ngày trong tháng từ `startDate`
- Lọc các ngày có weekday trùng `scheduleWeekdays`
- Đánh số session tuần tự (1, 2, 3...)
- Trả về array — chưa insert DB

### Insert vào DB
- Gọi Supabase upsert `pickle_sessions` với `(group_id, session_date)` làm unique key
- Tránh duplicate nếu gọi lại
- Sau insert → `dispatch({ type: 'REFRESH' })` để reload state

---

## Nút "Tạo lại lịch" trong Settings

Thêm vào `PickleballSettings.jsx`, chỉ thủ quỹ thấy:
```
[🔄 Tạo lại lịch tháng này]
```
- Tap → confirm dialog: "Tạo lại sẽ xoá các buổi chưa có dữ liệu. Tiếp tục?"
- Chỉ xoá sessions có `status = 'scheduled'` và không có attendees/items
- Insert lại từ config mới

---

## Calendar Tab — hiển thị sessions

Hiện tại Calendar nhận `days[]` từ `buildPickleballCalendarData()` nhưng sessions array trống → không có ngày nào được mark.

Fix `buildPickleballCalendarData()`:
- Đọc `pickle_sessions` của tháng hiện tại từ state
- Map session → day state:
  - `completed` → 'attended' nếu user có mặt, 'missed' nếu vắng
  - `scheduled` + date <= today → 'upcoming'
  - `scheduled` + date > today → 'upcoming' (dashed)
  - `cancelled` → 'moved'
- Trả về đủ `days[]` cho Calendar render

---

## DB

`pickle_sessions` đã có đủ fields. Chỉ cần đảm bảo:
```sql
-- Unique constraint để upsert an toàn
ALTER TABLE pickle_sessions
  ADD CONSTRAINT unique_session_date UNIQUE (group_id, session_date);
```

Nếu constraint đã tồn tại → skip migration.

---

## Data flow

```
App mount
  └─ buildPickleballOverviewData() thấy sessions=[]
       └─ dispatch('AUTO_GENERATE_SESSIONS', { yearMonth, config })
            └─ store.jsx: generateMonthSessions() → upsert DB → refresh()
                 └─ state.pickle.sessions populated
                      └─ Calendar + Overview render đúng
```

---

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/store.jsx` | Thêm handler `AUTO_GENERATE_SESSIONS` + helper `generateMonthSessions()` |
| `src/hooks/useScreenData.js` | Fix `buildPickleballCalendarData()` — map sessions → days; thêm auto-gen trigger logic |
| `src/screens/PickleballSettings.jsx` | Thêm nút "Tạo lại lịch tháng này" (treasurer only) |
| `supabase/migrations/` | `UNIQUE (group_id, session_date)` nếu chưa có |

---

## Out of scope

- Session reschedule / cancel UI → đã có trong Calendar detail, không đổi
- Tạo lịch nhiều tháng trước → không làm
- Notification khi lịch được tạo → P-later
