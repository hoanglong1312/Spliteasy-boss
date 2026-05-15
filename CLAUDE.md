# SpliteasyBoss App Ver2.0 — Orchestration Guide

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
