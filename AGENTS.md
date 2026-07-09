# Shared Agent Rules — Claude + Codex

Apply every task unless overridden by project instructions or direct user request.

## Rule 1 — Think Before Coding
State assumptions explicitly. Ask rather than guess. Push back when simpler approach exists. Stop when confused — name what's unclear.

**Anti-rationalization:**

| Bào chữa | Thực tế |
|---|---|
| "Tôi biết bug rồi, fix luôn" | Reproduce trước — 30% đoán sai |
| "Test này chắc wrong" | Verify trước khi skip |
| "Refactor nhỏ, thêm vào luôn" | Refactor + feature = review + debug đều khó hơn |

## Rule 2 — Simplicity First
Minimum code that solves the problem. No speculative features. No abstractions for single-use code.

## Rule 3 — Surgical Changes
Touch only what you must. Don't improve adjacent code. Don't refactor what's not broken. Match existing style. Dead code unrelated to task: report to user, don't delete.

## Rule 4 — Goal-Driven Execution
Define "done" before starting. Verify against it. Loop until verified.

## Rule 5 — Surface Conflicts
Two patterns contradict → pick one (more recent / more tested / more local), explain why, flag the other. Don't blend.

## Rule 6 — Read Before Write
Before adding code: read exports, immediate callers, shared utilities. "Looks orthogonal" is dangerous.

## Rule 7 — Checkpoint After Significant Steps
After each major step: summarize what's done, what's verified, what remains. Don't continue from a state you can't describe.

## Rule 8 — Match Conventions
Codebase style beats personal preference. Flag harmful conventions — don't fork silently.

## Rule 9 — Fail Loud
"Completed" is wrong if anything was silently skipped. "Tests pass" is wrong if any tests were skipped. Surface uncertainty, don't hide it.

## Rule 10 — Debug Tier Selection

Pick the lightest tool that can confirm the bug:

| Bug loại | Tool |
|---|---|
| Logic thuần / function / formatter / reducer | Unit test — nhanh nhất, run nhiều lần |
| React component / interaction / state | Inspect code + `npm run build`, unit test nhỏ nếu cần |
| UI visual / layout / navigation | In-app browser snapshot hoặc Playwright — đọc accessibility tree, verify bằng mắt |
| Console error / network / DOM / JS | In-app browser dev logs/evaluate hoặc Playwright |
| Click, fill, interact | In-app browser controls hoặc Playwright |
| Screenshot | In-app browser screenshot hoặc Playwright screenshot |
| E2E flow quan trọng (login, payment, navigation nhiều màn) | Playwright — chỉ khi flow dễ regression |

Default với React/Vite project:
```
Đọc file liên quan → sửa scoped → npm run build → browser verify → commit file cụ thể
```

## Rule 11 — Multi-Agent

Dùng multi-agent khi có 2+ việc độc lập chạy song song được (fix A + fix B, feature + test).

## Rule 12 — Subagent for Exploration
When fixing bugs or investigating issues requiring 3+ file reads: spawn a subagent (Explore or general-purpose) to investigate, grep, and trace. Main context receives summary only — no raw file dumps. Edit/fix happens in main context after summary received.

Exception: code projects with code-project.md — follow token discipline rules there instead.

## Rule 13 — Clarify Before Execute

Nếu có bất kỳ điều gì mơ hồ trong yêu cầu — hỏi user trong **1 lần duy nhất** trước khi ghi file, chạy code, hoặc thực thi bất kỳ action nào. Không đoán, không ghi rồi mới hỏi.

## Rule 14 — Ground Progress Claims

Trước khi báo xong: audit từng claim dựa trên tool result thực tế trong session. Chỉ report việc có evidence; nếu chưa verify → nói rõ. Nếu test fail → báo output cụ thể. Nếu bước bị skip → nói thẳng.

## Rule 15 — End-of-Turn Check (Autonomous Mode)

Trước khi kết thúc turn, đọc lại đoạn cuối. Nếu đó là plan, phân tích, câu hỏi, danh sách next steps, hoặc lời hứa chưa làm ("I'll…", "let me know…") → làm luôn bằng tool calls. Kết thúc turn chỉ khi task xong hoặc bị block bởi input chỉ user cung cấp được.

---

# AGENTS.md — Code / Multi-Agent AI Rules

<!--
Generated project AGENTS.md must materialize shared rules above this template body.
Do not rely on @include for Codex unless Codex include expansion is verified.
Source: ~/.claude/templates/shared-agent-rules.md
-->

*File này dành cho code project hoặc project có nhiều agent cùng sửa artifact. Non-code project không bắt buộc có `AGENTS.md` trừ khi cần phối hợp nhiều tool.*

---

## Project Context

- **Tên**: SpliteasyBoss
- **Type**: code
- **Stack**: React + Vite, Supabase (PostgreSQL + RLS + Realtime), src/tokens.js, Playwright
- **Mục tiêu**: App chia tiền pickleball cho nhóm 6–15 người — thay thế Excel/Zalo

---

## Upstream Claude Context

- Superpowers is Claude-only. Codex does not invoke Superpowers skills directly.
- Claude may create specs/plans via brainstorming → writing-plans; Codex consumes generated `.md` files.
- Caveman mode, RTK hooks, statusline, and Claude memory rules are Claude-side behavior. Ignore them for code behavior unless task explicitly mentions them.
- If Claude is orchestrating, follow task list extracted from `docs/plan-overview.md` and report back for Claude review.

---

## Operating Contract

- Start by reading the current task/spec and relevant project context.
- Define success criteria before editing.
- Make minimal scoped changes; do not refactor adjacent code.
- Run verification before declaring done.
- Report changed files, exact commands run, and pass/fail results.
- If blocked, write `QA-FAIL:` with command, error, and attempted fixes.

---

## When Working Without Claude

Use this when user opens Codex directly instead of dispatching through Claude:

1. Read `AGENTS.md` first, then `context/architecture.md`.
2. Đọc `docs/plan-overview.md` — nếu có task `in_progress`/`pending`, đó là việc dở đang cần làm tiếp, không tự bịa task mới.
3. Đọc `docs/superpowers/decisions.md` — ASSUMPTION nào Claude đã quyết, tránh hỏi lại/làm khác.
4. Đọc `git log -20 --oneline` + nội dung commit gần nhất — nắm bug/feature đang xử lý dở nếu `plan-overview.md` trống (trường hợp task nhỏ không qua plan-track).
5. Nếu vẫn không rõ đang làm gì → hỏi user 1 câu cụ thể, không đoán.
6. Dùng project commands từ `rules/*.md`, `package.json`, README.
7. Keep changes surgical, verify sau mỗi bước.
8. Kết thúc: cập nhật `docs/plan-overview.md` (nếu có task ở đó) + tóm tắt files changed, verification run, next step.

---

## Phân Công Vai Trò

| Tool | Vai trò |
|------|---------|
| **Claude Code** | Orchestration + Review: plan, quyết kiến trúc, review output |
| **Codex** (`codex:codex-rescue`) | Execution + QA: viết code, test, commit |

---

## Codex — Workflow

1. Nhận task list từ Claude (extract từ `docs/plan-overview.md`). Không tự tạo plan.
2. Đọc `docs/superpowers/decisions.md` trước khi bắt đầu.
3. Nếu mơ hồ → ghi `ASSUMPTION:` vào commit message, tiếp tục.
4. Chạy Quality Gate trước commit: static audit + test suite + build.
5. QA fail → tự fix tối đa 3 retry → sau đó `QA-FAIL:` + escalate.
6. Pass → commit + báo Claude review.

**Commit signals bắt buộc:**

| Signal | Khi nào |
|---|---|
| `ASSUMPTION:` | Giả định cần Claude xác nhận |
| `ENV-REQUIRED: VAR_NAME` | Env var mới cần set trước deploy |
| `QA-FAIL:` | Test fail sau 3 retry, cần Claude |
| `SECURITY-SENSITIVE:` | Động vào auth/middleware/migration/token/session/password/api route/input handling |

---

## Code Intelligence — GitNexus MCP

Dự án dùng GitNexus (MCP `npx gitnexus mcp`) để index toàn bộ codebase. Codex gọi tools qua MCP được cấu hình trong `.codex/config.toml` (init tự tạo nếu project có gitnexus):

```toml
[mcp_servers.gitnexus]
command = "npx"
args = ["gitnexus", "mcp"]
```

**Bắt buộc trước khi sửa code:**

| Câu hỏi | Tool | Khi nào dùng |
|---------|------|-------------|
| Feature/area liên quan file/flow nào? | `query({search_query: "concept"})` | Trước khi bắt đầu bất kỳ task nào |
| Symbol X là gì, callers/callees? | `context({name: "symbolName"})` | Hiểu function trước khi sửa |
| Sửa X sẽ ảnh hưởng gì? | `impact({target: "symbolName", direction: "upstream"})` | Trước khi sửa function quan trọng |
| Trace path từ A → B | `trace({from: "A", to: "B"})` | Debug data flow |
| Thay đổi này ảnh hưởng symbol nào? | `detect_changes()` | Trước khi commit |

**Quy tắc:**
- `query` TRƯỚC khi đọc file source — trả về execution flows, process-grouped, tiết kiệm token.
- `impact` bắt buộc trước khi sửa bất kỳ function nào — biết blast radius.
- `detect_changes()` trước commit — verify chỉ sửa đúng scope (self blast-radius check).
- Index stale? Chạy `node .gitnexus/run.cjs analyze` từ project root.
- Chưa có `.gitnexus/` (chưa từng index)? Dừng, hỏi user chạy `npx gitnexus analyze` trước — không sửa code bằng grep/Read thường thay GitNexus.

## Browser Automation (Codex)

Codex dùng in-app browser connector hoặc Playwright cho UI verification và debugging.

Dùng browser verify khi: cần verify UI sau code change, debug DOM/console error, confirm layout. Không dùng cho E2E flow phức tạp (→ Playwright).

---

## Do NOT

- Push code chưa pass tests.
- Retry QA quá 3 lần mà không escalate.
- Tự thêm dependencies không có trong plan. Ghi `ASSUMPTION:` và báo Claude approve trước.
- Bỏ qua code review khi có code review skill.
- Thêm project-specific rules vào file này. Đặt vào `rules/[tool].md` trong project.
- Âm thầm lệch spec. Nếu implementation cần lệch → ghi `ASSUMPTION:` → dừng → báo Claude cập nhật spec trước.

---

*Cập nhật: 2026-07-01 (rev13: trim Claude-side workflow; Codex-only content)*

<!-- generated-from: shared-agent-rules.md + templates/AGENTS.md -->
<!-- shared-rules: 2026-06-19 -->
<!-- template: 2026-07-05 -->

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Spliteasy-boss** (3075 symbols, 8223 relationships, 250 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Spliteasy-boss/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Spliteasy-boss/clusters` | All functional areas |
| `gitnexus://repo/Spliteasy-boss/processes` | All execution flows |
| `gitnexus://repo/Spliteasy-boss/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
