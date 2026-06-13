# Testing Rules — SpliteasyBoss

## Lệnh Chạy Test

### Unit Tests (Vitest) — Codex chạy được
```bash
npm test
```
- Vitest `v4.1.8`, 265ms, không cần browser
- Test file: `src/hooks/useScreenData.test.js` — 9 tests cho `attendanceByMemberId`, `effectiveSessionMemberIds`, `memberWaterShare`
- Codex tự loop: fix → `npm test` → fix → `npm test`
- Khi sửa 3 functions trên → thêm test tương ứng

### E2E Tests (Playwright) — chỉ Claude main chạy được
```bash
npx playwright test --reporter=line
```
⚠️ Codex sandbox EPERM khi bind port.

**Pass condition:** `npm run build` ✅ + `npm test` ✅ + Playwright ✅

## UI Verification — Dùng localhost trước khi deploy

Với thay đổi UI, verify trên localhost trước để tránh deploy vòng:

1. Chạy dev server (background):
```bash
npm run dev
```

2. Dùng Chrome DevTools MCP navigate `http://localhost:5173` → screenshot → verify visual.

3. Chỉ deploy khi localhost đã đúng.

⚠️ Localhost không bị PIN gate như production → Claude có thể tự verify mà không cần user nhập PIN.
