---
description: Gate bắt buộc trước khi báo "xong"/commit cho Spliteasy-boss — verify + review + scope + assumption + migration check.
---

# /ship — Pre-ship Checklist

Kiểm tra trước khi commit/báo done. Đây là nội dung cụ thể mà Definition of Done (`code-project.md`) yêu cầu cho project này.

## Checklist

1. `/verify` — chạy toàn bộ test, phải 0 FAIL.
2. `git diff` — Claude tự review scope, không có thứ ngoài plan.
3. `/review` — code-review + security-review nếu match path nhạy cảm.
4. Grep `ASSUMPTION:` trong staged/recent commit → nếu có, xác nhận với user + ghi `docs/superpowers/decisions.md`.
5. Diff có migration (`supabase/migrations/**`) → version đã tăng đúng thứ tự chưa, đã apply + verify qua MCP chưa.
6. Báo cáo: ✓ pass / ✗ fail với lý do cụ thể.

## Chỉ báo "sẵn sàng commit"/"xong" khi tất cả ✓.
