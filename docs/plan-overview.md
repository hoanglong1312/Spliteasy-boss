# Plan Overview — SpliteasyBoss

Source of truth cho task + tiến độ nhiều bước. Codex đọc file này TRƯỚC khi bắt đầu nếu không có chỉ dẫn khác từ Claude — đặc biệt khi Claude hết quota và user mở Codex trực tiếp để làm tiếp.

Format mỗi task, xem `/plan-track`:

```markdown
### Task N: [Tên]
**Status:** pending | in_progress | done | blocked
**Commit:** — hoặc [hash]
Steps:
- [ ] Step 1
```

Khi không có task nào đang chạy, file này để trống (không cần task giả). Claude tạo task ở đây thay vì (hoặc thêm vào cùng) `TaskCreate` nội bộ khi công việc có thể cần Codex tiếp tục độc lập qua nhiều turn/session.

### Task 1: Khóa khoản thanh toán khi tải QR
**Status:** done
**Commit:** 6523afe
Steps:
- [x] Điều tra root cause và impact
- [x] Viết regression test
- [x] Nối QR với settlement checkpoint
- [x] Chạy test, build và browser smoke test
- [x] Commit và push
