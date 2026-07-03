---
description: Chạy toàn bộ test suite của Spliteasy-boss và báo cáo kết quả. Dùng trước khi báo "xong"/commit.
---

# /verify — Run All Tests

Lệnh cụ thể + pass condition là single source ở `rules/testing.md` — file này chỉ định nghĩa thứ tự chạy.

## Steps

1. `npm run build` — compile/syntax check.
2. `npm test` — Vitest unit test (xem `rules/testing.md` cho danh sách test file).
3. `npx playwright test --reporter=line` — E2E (chỉ Claude main chạy được, Codex EPERM).
4. Nếu có DB migration trong diff → verify bằng `mcp__supabase__execute_sql` (query lại schema/data sau apply).
5. Báo cáo: X pass, Y fail. Có FAIL → show output, diagnose root cause trước khi báo done.
