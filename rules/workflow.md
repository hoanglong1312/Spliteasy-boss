# Codex Workflow Rules — SpliteasyBoss

## Phân công vai trò

| Phase | Công cụ | Việc làm |
|-------|---------|----------|
| Planning | Superpowers (Claude plugin) | brainstorming → spec → writing-plans |
| Execution | Codex MCP | Viết/sửa code, commit, chạy lệnh |
| Orchestration + QA | Claude main | Quyết định kiến trúc, review output, quality gate |

**Lưu ý:**
- `subagent-driven-development` của Claude main KHÔNG dùng → Codex thay thế hoàn toàn
- Fallback nếu Codex lỗi: dùng Claude subagent-driven-development, ghi chú lý do

## Luồng làm việc

### Feature mới
1. Superpowers `brainstorming` → spec
2. Superpowers `writing-plans` → plan
3. Gọi Codex từng task → Codex tự đọc file, implement, commit
4. Claude main review (adversarial)
5. Nếu có vấn đề: gọi Codex lại với feedback cụ thể
6. Quality Gate (xem `rules/testing.md`)
7. Chỉ khi pass → bàn giao user test

### Bug fix / small change
1. Claude main phân tích nguyên nhân (git log, git diff)
2. Gọi Codex fix trực tiếp
3. Quality Gate rút gọn: `npm run build` + Playwright

## Cách gọi Codex

```
Tool: mcp__codex__codex
sandbox: "workspace-write"
approval-policy: "never"
```

Prompt phải có: Goal + Danh sách file + Constraints + Lệnh git commit

## Token Discipline — Claude Main Session

**KHÔNG làm:**
- Đọc file source code thay cho Codex
- Paste nội dung file vào Codex prompt
- Dùng Edit/Write cho file .jsx/.js/.sql
- Dispatch Claude subagent làm middleman
- Bảo user tự chạy SQL khi đã có Supabase MCP

**CHỈ làm:**
- Đọc git log / git diff
- Viết/sửa file .md (plan, spec, rules)
- Gọi Codex: goal + file paths + constraints
- Review output Codex (adversarial)
- Quyết định kiến trúc trước khi giao Codex
- Dùng Supabase MCP cho mọi thao tác database
