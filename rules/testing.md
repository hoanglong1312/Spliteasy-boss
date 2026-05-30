# Testing Rules — SpliteasyBoss

## Lệnh Chạy Test

```bash
npx playwright test --reporter=line
```

⚠️ Chỉ Claude main chạy được — Codex sandbox bị EPERM khi bind port.

**Pass condition:** `npm run build` ✅ + Playwright ✅

## UI Verification — Dùng localhost trước khi deploy

Với thay đổi UI, verify trên localhost trước để tránh deploy vòng:

1. Chạy dev server (background):
```bash
npm run dev
```

2. Dùng Chrome DevTools MCP navigate `http://localhost:5173` → screenshot → verify visual.

3. Chỉ deploy khi localhost đã đúng.

⚠️ Localhost không bị PIN gate như production → Claude có thể tự verify mà không cần user nhập PIN.
