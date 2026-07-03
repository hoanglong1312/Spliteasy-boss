---
description: Dispatch code task cho Codex — companion resume, Agent codex-rescue, foreground/background, wakeup loop, prompt template. Dùng khi giao code change cho Codex.
---

# /codex-exec — Dispatch Codex

## Trước mỗi task

1. Chạy helper resume:
   ```bash
   CODEX_COMPANION=$(ls -d "$HOME/.claude/plugins/cache/openai-codex/codex/"*/scripts/codex-companion.mjs 2>/dev/null | sort -V | tail -1)
   node "$CODEX_COMPANION" task-resume-candidate --json
   ```
2. `available: true` → hỏi user tiếp thread cũ hay tạo mới.

## Dispatch

- `Agent` tool, `subagent_type: codex:codex-rescue`.
- **Default foreground:** prompt bắt đầu `--wait`. Background (>10 phút): `--background`.
- Prompt CHỈ gồm: goal + file/spec path + constraints + verification. KHÔNG paste source (Codex tự đọc).

## Wakeup loop (BẮT BUỘC)

`Agent` LUÔN async → result trả `agentId` ngay dù `--wait`. Sau dispatch:
1. **`ScheduleWakeup(120s)` ngay trong cùng response.**
2. Wake → `SendMessage` tới `agentId` hỏi status:
   - **Xong:**
     1. `git diff HEAD` — nếu Codex edit chưa commit: syntax check → `git add <files> && git commit -m "<task> (codex-autocommit)"`.
     2. `git diff HEAD~1 HEAD` — Claude review committed diff, **so khớp với plan/spec đã giao Codex** (đúng scope, đúng thiết kế, không lệch/thiếu so với goal ban đầu) — không chỉ nhìn code có chạy được.
     3. `npm run build` + `npm test`.
     4. Diff đụng `src/screens/**/*.jsx` hoặc UI khác → **bắt buộc thêm `/frontend-verify`** (browser thật, không chỉ unit test) trước khi báo done cho user.
     5. Diff đụng `supabase/migrations/**` → verify bằng `mcp__supabase__execute_sql` sau apply (xem `/db-migrate`).
   - **Chưa:** `ScheduleWakeup(120s)` lại.
3. Loop tới done/fail.

## Prompt template — executing-plans

```
Tasks: [extract ### Task headings + steps từ docs/plan-overview.md]
Decisions: docs/superpowers/decisions.md  ← đọc trước
Constraints: [từ writing-plans]
Goal: execute theo task list, parallelize task độc lập
Start task: **Status:** pending → in_progress trong plan-overview.md
Done: → done + **Commit:** [hash]
Blocked: → blocked + **Reason:** QA-FAIL: [lý do]
Mơ hồ: ghi ASSUMPTION: vào commit message
```

## Codex capabilities (xem AGENTS.md)

- GitNexus MCP (`.codex/config.toml`) → tự `query/context/impact/detect_changes`.
- cmux browser qua bash (`cmux browser ...`).
- `detect_changes` trước mỗi commit (self blast-radius check).

## Fallback

Codex fail 2+ lần cùng symptom / không tạo diff → Claude direct fix, ghi rõ lý do. Sau 3 lần: `<!-- claude-override: direct-fix after 3 Codex retries [date] -->`.

## Không dùng

- `Skill("codex:rescue")` để execute (chỉ wrapper).
- `mcp__codex__codex` trừ khi OpenAI credential active.
- `/codex:status` trong shell.
