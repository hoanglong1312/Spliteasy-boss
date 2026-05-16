# SpliteasyBoss App Ver2.0 — Orchestration Guide

## Quy tắc bắt buộc khi bắt đầu dự án (Project Onboarding Rules)

Trước khi làm bất kỳ việc gì trong dự án này, Claude PHẢI:

1. **Đọc và hiểu các Superpowers (siêu năng lực) đã cài** — dùng lệnh `Skill` để xem danh sách skills có sẵn. Mỗi skill là một quy trình làm việc (workflow) bắt buộc cho từng loại task:
   - Làm tính năng mới → dùng `brainstorming` trước
   - Có spec rồi → dùng `writing-plans` để lập kế hoạch
   - Gặp lỗi (bug) → dùng `systematic-debugging`
   - Trước khi báo xong → dùng `verification-before-completion`
   - Nhận feedback code → dùng `receiving-code-review`

2. **RTK (Rust Token Killer - Công cụ tiết kiệm token) luôn được kích hoạt** qua hook tự động cho mọi lệnh Bash. Claude cần:
   - Ưu tiên dùng Bash cho các lệnh hệ thống (git, ls, grep...) thay vì đọc file thủ công — RTK sẽ tự lọc output thừa
   - Không dùng `cat` để đọc file lớn — dùng tool `Read` hoặc Bash với `head`/`grep` để RTK tối ưu được
   - Kiểm tra hiệu quả tiết kiệm bằng `rtk gain` khi cần báo cáo

3. **Đọc spec và plan hiện có** trước khi bắt đầu task mới:
   - Specs: `docs/superpowers/specs/`
   - Plans: `docs/superpowers/plans/`
   - Data shapes: `docs/data-shapes.md`

## Quy tắc review code (Code Review Rules)

- **Bắt buộc review chéo trước khi báo cáo kết quả** — bất kỳ việc gì liên quan đến code, database schema, kiến trúc (architecture):
  1. Codex làm/viết trước
  2. Claude review lại output của Codex (hoặc ngược lại)
  3. Nếu có vấn đề → sửa → review lại
  4. Chỉ khi cả hai đồng thuận mới tổng hợp gửi cho người dùng
- **Người dùng chỉ nhận bản tóm tắt cuối** — không cần đọc toàn bộ output thô của từng agent
- **Phân công mặc định:**
  - Codex: đọc file, viết code, tạo migration, implement tính năng
  - Claude: phân tích, review, tổng hợp, commit

## Quy tắc giao tiếp (Communication Rules)

- **Luôn dùng tiếng Việt** khi giải thích với người dùng
- **Từ chuyên ngành kỹ thuật**: phải viết tiếng Việt trước, kèm tiếng Anh trong ngoặc
  - Ví dụ: "Kho lưu trữ trạng thái (state store)", "Thành phần giao diện (component)", "Hàm xử lý sự kiện (event handler)"
- **Tên file, tên hàm, tên biến**: giữ nguyên tiếng Anh (vì đó là tên trong code)
- **Mục tiêu**: người dùng mới tiếp quản dự án, cần hiểu cả nghĩa lẫn thuật ngữ kỹ thuật

## Kiến trúc Multi-Agent

```
Bạn (Product Owner)
        │
        ▼
  Claude Code  ◄── Orchestrator / Đầu não
  ┌───────────────────────────────┐
  │  • Phân tích yêu cầu         │
  │  • Viết task spec             │
  │  • Gọi sub-agents             │
  │  • Review & tổng hợp kết quả │
  └───────┬───────────────┬───────┘
          │               │
          ▼               ▼
  Claude Sub-agents    Codex CLI
  (Agent tool)         (codex exec)
  • Research           • Implement code
  • Explore code       • Fix bugs
  • Phân tích          • Viết tests
```

## Agents và cách Claude Code gọi chúng

### 1. Claude Sub-agents (sẵn có, không cần API key riêng)
Claude Code tự spawn bằng Agent tool. Dùng cho:
- Tìm kiếm, đọc, phân tích codebase
- Research không cần viết code
- Cross-file consistency check

### 2. Codex CLI (cài rồi: codex-cli 0.130.0)
Claude Code gọi qua Bash: `codex exec "prompt"`
Dùng cho:
- Implement tính năng mới
- Fix bugs phức tạp
- Viết boilerplate code
- Code review: `codex exec review`

**Yêu cầu**: Cần set `OPENAI_API_KEY` trong environment.

## Quy trình Claude Code orchestrate

Khi bạn giao task, Claude Code sẽ:
1. **Phân tích** — tự đọc code để hiểu context
2. **Spawn Explorer** — dùng Claude sub-agent để map codebase nếu cần
3. **Gọi Codex** — `codex exec` với spec chi tiết để implement
4. **Review** — đọc output, kiểm tra quality
5. **Báo cáo** — tổng hợp kết quả cho bạn

## Git Task Protocol (lưu trữ specs)

```
tasks/pending/     → Task specs Claude Code viết ra trước khi delegate
tasks/in-progress/ → Task đang được agent xử lý
tasks/done/        → Task hoàn thành, có kết quả
```

Template: `tasks/TEMPLATE.md`

## Project Context

- **Stack**: React (JSX), Vite, CSS tokens — không có build step phức tạp
- **Entry**: `index.html` → `src/app.jsx`
- **Screens**: `src/screen-home.jsx`, `src/screen-pickleball.jsx`, `src/screen-profile.jsx`
- **Components**: `src/components.jsx`
- **Data**: `src/data.jsx`
- **Styles**: `src/vb-tokens.css`
- **Domain**: Chia tiền nhóm chơi pickleball (SpliteasyBoss), UI tiếng Việt
