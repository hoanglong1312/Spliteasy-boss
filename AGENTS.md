# AGENTS.md — Universal AI Rules

*File này được đọc bởi: Claude Code, Codex CLI, Cursor, OpenCode*

---

## Project Context

- **Tên**: SpliteasyBoss
- **Type**: code
- **Stack**: React + Vite, Supabase (PostgreSQL + RLS + Realtime), src/tokens.js, Playwright
- **Mục tiêu**: App chia tiền pickleball cho nhóm 6–15 người — thay thế Excel/Zalo

---

## Phân Công Vai Trò

| Tool | Vai trò |
|------|---------|
| **Superpowers** (Claude plugin) | Planning: brainstorming → spec → writing-plans |
| **Claude Code** | Orchestration + Review: quyết định kiến trúc, review output, điều phối |
| **Codex** | Execution + QA: viết code, chạy test, commit |
| **Cursor** | Quick fix trong editor |

---

## Quy Tắc Chung (Mọi AI đều phải follow)

### Code Quality
- TDD bắt buộc: RED → GREEN → REFACTOR
- Commit sau mỗi task hoàn thành
- 1 task = 1 commit có thể review độc lập (không quá lớn, không quá nhỏ)
- Không thêm feature ngoài scope đã plan
- Không comment giải thích WHAT — chỉ comment WHY nếu không rõ

### Scope Control
- Không tự refactor code ngoài task
- Không thêm error handling cho cases không thể xảy ra
- Không tạo abstraction nếu chỉ dùng 1-2 lần

---

## Workflow

### Claude Code — nhận task mới
1. Check Superpowers skill có apply không
2. Task phức tạp → `brainstorming` trước → spec → lưu `docs/superpowers/specs/`
3. Gọi Codex: `writing-plans` (Codex đọc codebase + spec → technical checklist)
4. Review plan → approve hoặc feedback cụ thể
5. Nếu vấn đề → Codex revise, tối đa **2 lần** → vẫn chưa ổn → Claude sửa thẳng file `.md`
6. Gọi Codex: `executing-plans` → Codex tự parallelize task độc lập, implement + TDD + commit
7. Review output thực thi qua `git diff` + commit message

### Codex — nhận task từ Claude
1. Đọc file liên quan để lấy context (tự đọc, không cần Claude paste)
2. Viết test trước khi viết code (TDD)
3. Implement theo đúng spec
4. Nếu gặp mơ hồ (ambiguity) → ghi `ASSUMPTION:` (giả định) vào commit message: `ASSUMPTION: dùng X thay vì Y vì...`
5. Chạy Quality Gate trước khi commit:
   - Kiểm tra tĩnh (static audit): import đúng, prop match, logic nhất quán
   - Build: `npm run build` (không chạy Playwright — sandbox EPERM khi bind port)
6. Nếu QA fail → tự fix, tối đa **3 lần thử lại (retry)**
7. Sau 3 lần vẫn fail → ghi `QA-FAIL:` (kiểm thử thất bại) → báo lên Claude: `QA-FAIL: [lý do + những gì đã thử]`
8. Pass → commit + báo Claude review

### Claude Code — review output Codex
1. Đọc `git diff` + commit message
2. Xác nhận (validate) `ASSUMPTION:` (giả định) nếu có
3. Kiểm tra: đúng scope, test pass, không regression, nhất quán với spec
4. Nếu có vấn đề → gọi Codex lại với feedback cụ thể
5. Chạy Playwright trực tiếp (không qua Codex): `npx playwright test --reporter=line`

### Fallback — Codex không giải quyết được sau 3 lần thử lại (retry)
1. Claude đọc `git diff` + log `QA-FAIL:` (kiểm thử thất bại)
2. Claude viết analysis ngắn vào file `.md` tạm
3. Gọi Codex lại với file `.md` đó làm context bổ sung

---

## Do NOT

- Push code chưa pass tests
- Thử lại (retry) QA quá 3 lần mà không báo lên (escalate)
- Tự thêm dependencies không có trong plan
- Bỏ qua step review nếu có code review skill
- Yêu cầu Codex chạy `npx playwright test` hoặc khởi động dev server — sandbox bị EPERM

---

*Cập nhật: 2026-05-20 (sync workflow Claude Code — nhận task mới)*

<!-- template: 2026-05-20 -->
