# AGENTS.md — Code / Multi-Agent AI Rules

*File này dành cho code project hoặc project có nhiều agent cùng sửa artifact.*

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
| **Codex** (`codex:codex-rescue` subagent hoặc `/codex:rescue`) | Execution + QA: viết code, chạy test, commit |
| **Cursor** | Quick fix trong editor |
| **Browser / Playwright** | UI flow: reproduce, click/type, DOM assertion, screenshot |
| **Chrome DevTools MCP** | Browser internals: console, network request/response, storage, performance |

**Cơ chế gọi Codex — plugin `codex-plugin-cc`:**
- Claude dispatch qua subagent `codex:codex-rescue` hoặc dùng `/codex:rescue <task>`
- Task dài: `--background` → kiểm tra bằng `/codex:status` → lấy kết quả bằng `/codex:result`
- Review changes: `/codex:review --base main` hoặc `/codex:adversarial-review --base main`
- Codex CLI auth: ChatGPT account / OpenAI API key (KHÔNG dùng NINEROUTER_API_KEY)

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
2. Task phức tạp → `brainstorming` trước → spec → lưu `docs/superpowers/specs/YYYY-MM-DD-[feature]-design.md`
3. Gọi Codex: `writing-plans` (Codex đọc codebase + spec → technical checklist) → lưu `docs/superpowers/specs/YYYY-MM-DD-[feature]-plan.md` tách khỏi spec
4. Review plan → approve hoặc feedback cụ thể
5. Nếu vấn đề → Codex revise, tối đa **2 lần** → vẫn chưa ổn → Claude sửa thẳng file `.md`
6. Gọi Codex: `executing-plans` → Codex tự parallelize task độc lập, implement + TDD + commit
7. Review output thực thi qua `git diff` + commit message

### Bug fix / small change

| Type | Dấu hiệu | Flow |
|------|----------|------|
| S | 1-2 file, triệu chứng rõ, error message cụ thể | Codex mini root-cause → fix |
| M/L | Cross-file, unclear cause, nhiều suspect | Claude viết investigation plan hoặc tự Phase 1 nếu cần nhiều nguồn |
| SYS | Silent failure: no error + 0 rows affected + data không đổi sau action | Claude Phase 1 trực tiếp |

**Bug S — fast path:**
1. Claude đọc symptom → viết fix instruction ngắn (file + expected behavior)
2. Codex làm mini investigation trước khi fix:
   ```
   Symptom: [mô tả bug]
   Suspect file(s): [1-2 file/pattern]
   Root cause: [nguyên nhân ngắn]
   Verification: [test/build/check sẽ chạy]
   ```
3. Codex fix theo root cause đã tìm, chạy verification, commit

**Bug M/L hoặc SYS:**
- Claude giữ Phase 1 khi cần đọc đồng thời DB schema, RLS, Supabase data/state, React state/data flow, logs, hoặc MCP-only context.
- Codex làm Phase 2 tốt nhất khi Claude đã xác định root cause + approach.

### Browser Debugging Tool Rules

- Dùng **Browser / Playwright** cho flow người dùng: mở localhost, click UI, nhập form, đọc DOM, verify text, chụp screenshot.
- Dùng **Chrome DevTools MCP** khi cần soi sâu trình duyệt: console error, network request/response, payload Supabase, storage/cookies/localStorage, performance trace.
- Nếu môi trường không chạy được Playwright/dev server, dùng **Chrome DevTools MCP** để kiểm tra UI local trong Chrome riêng; vẫn phải báo rõ phần E2E nào chưa chạy được.
- Không dùng Chrome DevTools MCP để đăng nhập, dùng profile cá nhân, hoặc mở dữ liệu nhạy cảm nếu không có yêu cầu cụ thể. Cấu hình mặc định dùng Chrome profile tách biệt (`--isolated`).
- Với bug silent failure kiểu bấm nút nhưng DB không đổi, ưu tiên thu thập: console message, request URL/status, request payload, response body, rồi mới sửa code.
- Chrome DevTools MCP chạy bằng Node bundle của Codex runtime vì package yêu cầu Node `20.19.0+`.

### Codex — nhận task từ Claude
1. Đọc file liên quan để lấy context (tự đọc, không cần Claude paste)
2. Viết test trước khi viết code (TDD)
3. Implement theo đúng spec/plan đã được Claude approve
4. Nếu gặp mơ hồ (ambiguity) → ghi `ASSUMPTION:` (giả định) vào commit message: `ASSUMPTION: dùng X thay vì Y vì...`
5. Chạy Quality Gate trước khi commit:
   - Kiểm tra tĩnh (static audit): import đúng, prop match, logic nhất quán
   - Build: `npm run build`
   - Playwright / dev server: Codex được chạy nếu môi trường cho phép. Nếu gặp `EPERM`, lỗi bind port, sandbox, hoặc browser không khởi động được → ghi `QA-FAIL:` với command + lỗi chính, rồi để Claude chạy trực tiếp.
6. Nếu QA fail → tự fix, tối đa **3 lần thử lại (retry)**
7. Sau 3 lần vẫn fail → ghi `QA-FAIL:` (kiểm thử thất bại) → báo lên Claude: `QA-FAIL: [lý do + những gì đã thử]`
8. Pass → commit + báo Claude review

### Claude Code — review output Codex
1. Đọc `git diff` + commit message
2. Xác nhận (validate) `ASSUMPTION:` (giả định) nếu có
3. Kiểm tra: đúng scope, test pass, không regression, nhất quán với spec
4. Nếu có vấn đề → gọi Codex lại với feedback cụ thể
5. Nếu Codex chưa chạy được Playwright/dev server hoặc có `QA-FAIL:` liên quan sandbox → Claude chạy trực tiếp: `npx playwright test --reporter=line`

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
- Ép Codex chạy Playwright/dev server khi môi trường đã báo `EPERM`, lỗi bind port, sandbox, hoặc browser không khởi động được — chuyển bước đó cho Claude.

---

*Cập nhật: 2026-05-23 (migrate từ Codex MCP → codex-plugin-cc)*

<!-- template: 2026-05-22 -->
