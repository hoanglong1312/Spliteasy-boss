# Testing & Quality Gate — SpliteasyBoss

## Quality Gate — Bắt Buộc Trước Khi Bàn Giao User

### Bước 1: Static Audit (Codex tự làm)
Gọi Codex rà soát toàn bộ screens:
- Mọi prop screen nhận có match với data hook trả về không
- Mọi `onAction(type)` call có handler tương ứng trong `app-v2.jsx` không
- Mọi import có tồn tại không
- Form inputs có controlled (useState + onChange) không

Codex báo cáo danh sách issue → Claude main **đọc lại adversarial** (không tin báo cáo "không có issue" mà không kiểm tra) → nếu có vấn đề → gọi Codex fix → lặp lại.

### Bước 2: E2E Tests (Playwright)

⚠️ **Codex không chạy được Playwright** (sandbox bị EPERM khi bind port). Claude main phải chạy lệnh này trực tiếp:

```bash
npx playwright test --reporter=line
```

Nếu Codex báo "EPERM" hoặc "cannot listen on port" → bình thường, Claude main chạy lại từ terminal.

**Pass condition:** `vite build` ✅ + static audit ✅ + Playwright ✅

> User chỉ test: visual/UX judgment, Supabase auth thật, edge case cảm tính
