---
description: Format task plan-overview.md, status transition, decisions.md, AGENTS sync. Dùng khi execute plan nhiều task.
---

# /plan-track — Plan tracking

## docs/ layout

```
docs/plan-overview.md                       ← source of truth: task + tiến độ (Claude)
docs/superpowers/specs/YYYY-MM-DD-*.md       ← spec (Claude)
docs/superpowers/decisions.md                ← từ ASSUMPTION: (Claude)
```

## Task format

```markdown
### Task N: [Tên]
**Status:** pending
**Commit:** —
Steps:
- [ ] Step 1...
```

Codex update bằng string replace:
- Start: `**Status:** pending` → `in_progress`
- Done: → `done` + `**Commit:** [hash]`
- Blocked: → `blocked` + `**Reason:** QA-FAIL: [lý do]`

1 commit / task. Codex commit `.md` status cùng code.

## decisions.md

Tích lũy. Codex đọc trước mỗi executing-plans (tránh lặp câu hỏi).
```
## [YYYY-MM-DD] — [feature]
- ASSUMPTION: [Codex giả định gì]
- Decision: [Claude quyết]
- Applies to: [task/file]
```

## AGENTS.md sync

| Thay đổi | Cập nhật |
|---|---|
| Workflow / ký hiệu mới | CLAUDE.md + AGENTS.md |
| Thêm/bỏ tool, stack | AGENTS.md + context/architecture.md |
| Rule chỉ Codex | AGENTS.md |
| Sửa template AGENTS.md | bump `<!-- template: YYYY-MM-DD -->` |

## Review gate (mặc định cho mọi plan có file spec)

Mọi plan feature mới có ghi file spec (`docs/superpowers/specs/*.md`) → dispatch Codex review trước execute (Codex có GitNexus MCP, tự đọc code hiện tại để đối chiếu, không chỉ đọc plan suông). Bỏ qua chỉ khi bug nhỏ/patch hẹp không cần plan chính thức.
```
Review [path]. Đối chiếu với code hiện tại qua GitNexus (query/context/impact). Check: gaps, contradictions, ambiguous req, missing error handling, plan có khớp state code thật không. Report: numbered issues + severity + fix. Concise.
```
