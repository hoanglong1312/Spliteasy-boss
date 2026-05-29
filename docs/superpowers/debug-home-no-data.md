# Debug: Home screen không hiển thị dữ liệu

**Symptom:** User vào localhost:5173, Home screen không thấy transactions/data.  
**Build:** Pass (npm run build OK).  
**Xảy ra sau:** Merge B1 (realtime toast) + Home personal balance feature.

---

## Questions — Codex phải trả lời từng câu

### Q1 — State flow: dữ liệu có load được không?
- Trong `src/store.jsx`, hàm `refresh()`: sau khi `fetchGroupData` trả về, `normalize(raw, ...)` có trả về null không?
- Điều kiện `if (groups.length === 0) return null` ở line ~395 — `raw.groups` có thể empty không?
- `state._error` có được set không? Nếu có, chuỗi error là gì?

### Q2 — Loading gate: app có bị kẹt màn hình loading không?
- Trong `src/app-v2.jsx` line ~502: `if (state._loading && members.length === 0 && expenses.length === 0)`
- Điều kiện này có thể true mãi không? (nếu `_loading` không về false)
- Trace: `refresh()` có path nào không set `_loading: false` không?

### Q3 — Realtime subscription deps: có bug re-subscribe liên tục không?
- `useEffect` ở line ~1337 có deps `[state.currentUserId, scheduleRefresh, dispatch]`
- `dispatch` được tạo với `useCallback` deps là `[state.currentUserId, state.currentGroupId, refresh, scheduleRefresh, broadcastChange]`
- Mỗi lần state update → dispatch thay đổi → effect cleanup chạy → `debounceRef.current` bị clear
- Nếu `scheduleRefresh` đang pending khi cleanup chạy → refresh bị cancel → data không load
- Xác nhận: có case nào cleanup chạy trong khi initial refresh đang pending không?

### Q4 — `recentActivity` crash potential
- `src/data.jsx` hàm `recentActivity`: `for (const e of g.expenses)` — nếu `g.expenses` undefined thì throw
- `buildTransactions` trong `useScreenData.js` gọi `recentActivity(safeGroups, 24)`
- `safeGroups` dùng `safeGroup()` → `expenses: safeArray(group?.expenses)` → luôn là array
- Nhưng: nếu có exception trong `useMemo` thì component crash silently không?
- Kiểm tra: `useMemo` trong `useScreenData` có try/catch không? Nếu không có thì React có catch error này không?

### Q5 — `PersonalBalance` crash
- `src/screens/Home.jsx` — `PersonalBalance` component: nếu `d.expenses` undefined thì `calculatePersonalBalance` có throw không?
- `safeArray(expenses)` trong `calculatePersonalBalance` có xử lý undefined không?
- `shareForMember(expense, memberId)` — function này có handle edge case không?

### Q6 — Auth state: user có đang ở JoinGroup screen không?
- `src/app-v2.jsx` line ~481: `if (!state.currentUserId)` → show JoinGroup
- Nếu `localStorage` bị clear hoặc token expired → currentUserId null → user thấy JoinGroup, không phải Home
- Kiểm tra: `src/lib/auth.js` — `getStoredAuth()` trả về gì nếu localStorage trống?

---

## Suspect files

```
src/store.jsx              — refresh(), normalize(), realtime useEffect
src/app-v2.jsx             — loading gate, auth gate (line 481, 502)
src/hooks/useScreenData.js — useMemo, buildTransactions, buildHomeExpenses
src/screens/Home.jsx       — PersonalBalance, calculatePersonalBalance, shareForMember
src/data.jsx               — recentActivity (line 101-110)
src/lib/auth.js            — getStoredAuth()
```

---

## Output format mong muốn từ Codex

Trả lời từng Q1–Q6 với:
- **Verdict:** BUG FOUND / OK / UNCERTAIN
- **Evidence:** đoạn code cụ thể (file:line)
- **Root cause** (nếu BUG FOUND): giải thích tại sao gây ra symptom

---

## Câu trả lời — Codex Phase 1 (static read, 2026-05-29)

> Lưu ý: đây là phân tích đọc code tĩnh. Môi trường này không chạy được dev server / inspect runtime nên các verdict cần `raw.groups` và giá trị `state._error` thực tế sẽ được đánh dấu UNCERTAIN.

### Q1 — State flow → **UNCERTAIN (suspect chính)**
- `src/store.jsx:928` — `const activeGroups = safeArray(groups).filter(group => !group.deleted_at && !group.deletedAt)`
- `src/store.jsx:929` — `if (activeGroups.length === 0) return null` → đây là điểm trả về null.
- Khi `normalize()` trả null, `refresh()` đi vào nhánh else `src/store.jsx:1443`: set `_loading: false` + `_error: 'Không tải được dữ liệu nhóm. Kiểm tra kết nối.'`
- Có 2 cách `activeGroups` rỗng: (a) `raw.groups` rỗng do RLS chặn / token sai; (b) tất cả group bị `deleted_at` (feature mới `allow admins to delete groups`, commit 8ee86c1, có soft-delete).
- **Root cause khả dĩ:** nếu group của user bị soft-delete hoặc RLS không trả group → Home không có data. Cần xác nhận runtime: `raw.groups.length` và `deleted_at` của từng group.

### Q2 — Loading gate → **OK (không kẹt)**
- Gate: `src/app-v2.jsx:1900` — `if (state._loading && members.length === 0 && (state.expenses || []).length === 0)`
- Mọi path của `refresh()` đều set `_loading: false`: success qua `normalize` trả state có `_loading: false` (`src/store.jsx:1374`); nhánh empty `src/store.jsx:1443`; nhánh catch `src/store.jsx:1447`.
- `if (!t) return` (`src/store.jsx:1414`) nằm TRƯỚC `setState(_loading: true)` nên không có case set loading rồi thoát sớm.
- Kết luận: gate không thể true mãi.

### Q3 — Realtime subscription deps → **OK (initial load không bị cancel)**
- Effect realtime `src/store.jsx:2709` deps `[state.currentUserId, scheduleRefresh, dispatch]`; cleanup clear `debounceRef`.
- `dispatch` (`src/store.jsx:1468`) deps `[state.currentUserId, state.currentGroupId, refresh, scheduleRefresh, broadcastChange]`; `refresh`/`broadcastChange` deps `[]`, `scheduleRefresh` deps `[refresh]` → đều stable. Nên `dispatch` chỉ đổi khi `currentUserId`/`currentGroupId` đổi.
- Initial load chạy bằng effect riêng `src/store.jsx:1464` gọi `refresh(storedToken)` TRỰC TIẾP (không debounce) → cleanup clear `debounceRef` KHÔNG hủy được initial refresh.
- Lưu ý phụ (không gây no-data): khi `currentGroupId` set lần đầu trong normalize → `dispatch` đổi → effect realtime re-subscribe một lần. Churn nhẹ, không mất data.

### Q4 — recentActivity crash → **OK trong path Home (cần error boundary)**
- `src/data.jsx:104` — `for (const e of g.expenses)` sẽ throw nếu `g.expenses` undefined.
- Path Home an toàn: `buildTransactions` (`src/hooks/useScreenData.js:2338`) nhận `expenseGroups` đã qua `safeGroup` (`src/hooks/useScreenData.js:3897`) → `expenses: safeArray(...)` luôn là array.
- Rủi ro hệ thống: `useScreenData` builders KHÔNG bọc try/catch và app KHÔNG có React error boundary → nếu bất kỳ builder nào throw thì màn hình trắng (giống "no data"). Đây là hardening item riêng, không phải nguyên nhân trực tiếp ở path đã kiểm.

### Q5 — PersonalBalance crash → **OBSOLETE (code đã bị gỡ)**
- Không còn `PersonalBalance` / `calculatePersonalBalance` / `shareForMember` trong `src/screens/Home.jsx` (grep toàn `src/` không có).
- `src/screens/AddExpenseHome.test.mjs` còn assert `doesNotMatch` các symbol này (đã xóa khỏi Home). → Q5 không còn áp dụng, không phải nguyên nhân.

### Q6 — Auth state → **OK nhưng có thể là triệu chứng khác**
- `getStoredAuth()` (`src/lib/auth.js:7`) bọc try/catch, localStorage trống/parse fail → trả `{ token: null, member: null }`.
- `src/app-v2.jsx:1892` — `if (!state.currentUserId)` → render JoinGroup.
- Nếu token hết hạn / localStorage bị clear → `currentUserId` null → user thấy JoinGroup chứ không phải Home. Đây là triệu chứng khác ("thấy JoinGroup"), cần hỏi lại user là họ thấy JoinGroup hay thấy Home rỗng.

---

## Kết luận & next step

- **Suspect #1: Q1** — `normalize()` trả null khi `activeGroups` rỗng (RLS chặn group hoặc group bị soft-delete). Cần runtime: log `raw.groups` + `state._error` trong DevTools / Network response của `fetchGroupData`.
- **Hardening: Q4** — cân nhắc thêm error boundary quanh screen render để tránh white screen khi builder throw.
- **Cần user xác nhận:** màn hình thực tế là "Home trống" hay "JoinGroup" hay "Không tải được dữ liệu nhóm. Kiểm tra kết nối."? Mỗi đáp án trỏ tới Q1 / Q6 / `_error` path khác nhau.
- Codex không chạy được dev server ở môi trường này (Q1 cần runtime data). `QA-FAIL: cần Claude/Chrome DevTools MCP lấy raw.groups + _error runtime để chốt root cause.`
