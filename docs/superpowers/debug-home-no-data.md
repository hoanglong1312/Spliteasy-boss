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
